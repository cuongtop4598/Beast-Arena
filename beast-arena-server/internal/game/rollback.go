package game

import (
	"encoding/json"
)

const (
	MaxRollbackFrames = 7
	RingBufferSize    = 128
)

type StateSnapshot struct {
	Frame    int             `json:"frame"`
	State    GameState       `json:"state"`
	Inputs   [2]json.RawMessage `json:"inputs"`
	Checksum uint32          `json:"checksum"`
}

type RollbackNetcode struct {
	snapshots     [RingBufferSize]StateSnapshot
	writeIndex    int
	localFrame    int
	confirmedFrame int
	predictions   map[int][2]json.RawMessage
}

func NewRollbackNetcode() *RollbackNetcode {
	return &RollbackNetcode{
		predictions: make(map[int][2]json.RawMessage),
	}
}

func (rn *RollbackNetcode) SaveSnapshot(frame int, state GameState, inputs [2]json.RawMessage) {
	idx := frame % RingBufferSize
	rn.snapshots[idx] = StateSnapshot{
		Frame:    frame,
		State:    state,
		Inputs:   inputs,
		Checksum: rn.computeChecksum(&state),
	}
	rn.writeIndex = idx
}

func (rn *RollbackNetcode) GetSnapshot(frame int) *StateSnapshot {
	idx := frame % RingBufferSize
	snap := &rn.snapshots[idx]
	if snap.Frame == frame {
		return snap
	}
	return nil
}

func (rn *RollbackNetcode) NeedRollback(frame int, actualInput json.RawMessage, slot int) bool {
	predicted, ok := rn.predictions[frame]
	if !ok {
		return false
	}
	return string(predicted[slot]) != string(actualInput)
}

func (rn *RollbackNetcode) Rollback(toFrame int, currentFrame int, resimulate func(frame int, state *GameState, inputs [2]json.RawMessage)) *GameState {
	// Get snapshot at rollback point
	snap := rn.GetSnapshot(toFrame)
	if snap == nil {
		return nil
	}

	// Resimulate from snapshot to current frame
	state := snap.State
	for f := toFrame + 1; f <= currentFrame; f++ {
		frameSnap := rn.GetSnapshot(f)
		var inputs [2]json.RawMessage
		if frameSnap != nil {
			inputs = frameSnap.Inputs
		}
		resimulate(f, &state, inputs)
		rn.SaveSnapshot(f, state, inputs)
	}

	return &state
}

func (rn *RollbackNetcode) StorePrediction(frame int, inputs [2]json.RawMessage) {
	rn.predictions[frame] = inputs
	// Clean old predictions
	for f := range rn.predictions {
		if f < frame-RingBufferSize {
			delete(rn.predictions, f)
		}
	}
}

func (rn *RollbackNetcode) ConfirmFrame(frame int) {
	rn.confirmedFrame = frame
}

func (rn *RollbackNetcode) GetConfirmedFrame() int {
	return rn.confirmedFrame
}

// DetectDesync compares checksums between client and server
func (rn *RollbackNetcode) DetectDesync(frame int, clientChecksum uint32) bool {
	snap := rn.GetSnapshot(frame)
	if snap == nil {
		return false
	}
	return snap.Checksum != clientChecksum
}

func (rn *RollbackNetcode) computeChecksum(state *GameState) uint32 {
	data, _ := json.Marshal(state)
	var checksum uint32
	for _, b := range data {
		checksum = checksum*31 + uint32(b)
	}
	return checksum
}
