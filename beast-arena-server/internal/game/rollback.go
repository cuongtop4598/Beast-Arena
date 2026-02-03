package game

import (
	"encoding/json"
	"sync"
)

const (
	// MaxRollbackFrames is the maximum number of frames we can roll back
	MaxRollbackFrames = 8
	// SnapshotBufferSize is the ring buffer size for state snapshots
	SnapshotBufferSize = 128
	// DesyncCheckInterval is how often we verify state hashes (frames)
	DesyncCheckInterval = 30
)

// StateSnapshot holds a serialized game state at a specific frame
type StateSnapshot struct {
	Frame     int    `json:"frame"`
	StateData []byte `json:"state_data"` // JSON-serialized GameState
	Hash      uint32 `json:"hash"`       // FNV-1a hash for desync detection
	InputP1   *PlayerInput
	InputP2   *PlayerInput
}

// RollbackManager handles deterministic simulation with rollback/resimulation
type RollbackManager struct {
	mu sync.Mutex

	// Ring buffer of state snapshots
	snapshots [SnapshotBufferSize]StateSnapshot
	head      int // next write position

	// Confirmed inputs per frame (frame -> FrameInput)
	confirmedInputs map[int]*FrameInput
	// Predicted inputs (used when remote input hasn't arrived)
	predictedInputs map[int]*FrameInput

	// Current simulation frame (may be ahead of confirmed frame)
	simulationFrame int
	// Last frame where both players' inputs are confirmed
	confirmedFrame int
	// Last frame we sent a state hash for desync detection
	lastDesyncCheck int

	// Callback to apply a single frame of simulation
	simulateFn func(gs *GameState, inputs *FrameInput)
}

// NewRollbackManager creates a new rollback netcode manager
func NewRollbackManager(simulateFn func(gs *GameState, inputs *FrameInput)) *RollbackManager {
	return &RollbackManager{
		confirmedInputs: make(map[int]*FrameInput),
		predictedInputs: make(map[int]*FrameInput),
		simulateFn:      simulateFn,
	}
}

// SaveSnapshot stores the current game state in the ring buffer
func (rm *RollbackManager) SaveSnapshot(gs *GameState) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	data, err := json.Marshal(gs)
	if err != nil {
		return
	}

	rm.snapshots[rm.head%SnapshotBufferSize] = StateSnapshot{
		Frame:     gs.Frame,
		StateData: data,
		Hash:      fnv1aHash(data),
	}
	rm.head++
}

// GetSnapshot retrieves the snapshot closest to the given frame
func (rm *RollbackManager) GetSnapshot(frame int) *StateSnapshot {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	// Search backwards from head
	for i := 0; i < SnapshotBufferSize && i < rm.head; i++ {
		idx := (rm.head - 1 - i) % SnapshotBufferSize
		if idx < 0 {
			idx += SnapshotBufferSize
		}
		if rm.snapshots[idx].Frame == frame {
			snap := rm.snapshots[idx]
			return &snap
		}
	}
	return nil
}

// AddConfirmedInput adds a confirmed (received) input for a player
func (rm *RollbackManager) AddConfirmedInput(input *PlayerInput, isP1 bool) (needsRollback bool, rollbackFrame int) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	frame := input.Frame

	fi, exists := rm.confirmedInputs[frame]
	if !exists {
		fi = &FrameInput{Frame: frame}
		rm.confirmedInputs[frame] = fi
	}

	if isP1 {
		fi.P1 = input
	} else {
		fi.P2 = input
	}

	// Check if this input differs from what we predicted
	if pred, ok := rm.predictedInputs[frame]; ok {
		var predInput *PlayerInput
		if isP1 {
			predInput = pred.P1
		} else {
			predInput = pred.P2
		}
		if predInput != nil && !inputsEqual(predInput, input) {
			// Misprediction — need rollback
			return true, frame
		}
	}

	// Update confirmed frame
	rm.updateConfirmedFrame()

	return false, 0
}

// PredictInput generates a predicted input for a missing remote player
// Strategy: repeat the last known input
func (rm *RollbackManager) PredictInput(frame int, isP1 bool, lastKnown *PlayerInput) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	fi, exists := rm.predictedInputs[frame]
	if !exists {
		fi = &FrameInput{Frame: frame}
		rm.predictedInputs[frame] = fi
	}

	predicted := &PlayerInput{
		Frame:  frame,
		Inputs: []InputType{InputNone},
	}
	if lastKnown != nil {
		predicted.PlayerID = lastKnown.PlayerID
		predicted.Inputs = lastKnown.Inputs // repeat last input
	}

	if isP1 {
		fi.P1 = predicted
	} else {
		fi.P2 = predicted
	}
}

// Rollback restores state to a snapshot and resimulates forward
func (rm *RollbackManager) Rollback(gs *GameState, targetFrame int, currentFrame int) error {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	// Find snapshot at or before target frame
	var bestSnap *StateSnapshot
	for i := 0; i < SnapshotBufferSize && i < rm.head; i++ {
		idx := (rm.head - 1 - i) % SnapshotBufferSize
		if idx < 0 {
			idx += SnapshotBufferSize
		}
		snap := &rm.snapshots[idx]
		if snap.Frame <= targetFrame {
			if bestSnap == nil || snap.Frame > bestSnap.Frame {
				bestSnap = snap
			}
		}
	}

	if bestSnap == nil {
		// Can't rollback that far — no snapshot available
		return nil
	}

	// Restore state from snapshot
	if err := json.Unmarshal(bestSnap.StateData, gs); err != nil {
		return err
	}

	// Resimulate from snapshot frame to current frame
	for f := bestSnap.Frame; f < currentFrame; f++ {
		inputs := rm.getInputsForFrame(f)
		rm.simulateFn(gs, inputs)
		gs.Frame = f + 1
	}

	return nil
}

// GetStateHash returns the hash of the current state for desync detection
func (rm *RollbackManager) GetStateHash(gs *GameState) uint32 {
	data, err := json.Marshal(gs)
	if err != nil {
		return 0
	}
	return fnv1aHash(data)
}

// CheckDesync compares local and remote state hashes
func (rm *RollbackManager) CheckDesync(localHash, remoteHash uint32) bool {
	return localHash != remoteHash
}

// ShouldCheckDesync returns true if it's time for a desync check
func (rm *RollbackManager) ShouldCheckDesync(frame int) bool {
	if frame-rm.lastDesyncCheck >= DesyncCheckInterval {
		rm.lastDesyncCheck = frame
		return true
	}
	return false
}

// GetConfirmedFrame returns the last fully confirmed frame
func (rm *RollbackManager) GetConfirmedFrame() int {
	rm.mu.Lock()
	defer rm.mu.Unlock()
	return rm.confirmedFrame
}

// CleanupOldData removes input data for frames well behind confirmed
func (rm *RollbackManager) CleanupOldData(beforeFrame int) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	for f := range rm.confirmedInputs {
		if f < beforeFrame {
			delete(rm.confirmedInputs, f)
		}
	}
	for f := range rm.predictedInputs {
		if f < beforeFrame {
			delete(rm.predictedInputs, f)
		}
	}
}

// --- internal helpers ---

func (rm *RollbackManager) updateConfirmedFrame() {
	for f := rm.confirmedFrame + 1; ; f++ {
		fi, ok := rm.confirmedInputs[f]
		if !ok || fi.P1 == nil || fi.P2 == nil {
			break
		}
		rm.confirmedFrame = f
	}
}

func (rm *RollbackManager) getInputsForFrame(frame int) *FrameInput {
	// Prefer confirmed, fall back to predicted
	if fi, ok := rm.confirmedInputs[frame]; ok {
		return fi
	}
	if fi, ok := rm.predictedInputs[frame]; ok {
		return fi
	}
	return &FrameInput{
		Frame: frame,
		P1:    &PlayerInput{Frame: frame, Inputs: []InputType{InputNone}},
		P2:    &PlayerInput{Frame: frame, Inputs: []InputType{InputNone}},
	}
}

func inputsEqual(a, b *PlayerInput) bool {
	if len(a.Inputs) != len(b.Inputs) {
		return false
	}
	for i := range a.Inputs {
		if a.Inputs[i] != b.Inputs[i] {
			return false
		}
	}
	return true
}

// fnv1aHash computes FNV-1a hash (fast, non-cryptographic)
func fnv1aHash(data []byte) uint32 {
	const (
		offset32 = uint32(2166136261)
		prime32  = uint32(16777619)
	)
	hash := offset32
	for _, b := range data {
		hash ^= uint32(b)
		hash *= prime32
	}
	return hash
}
