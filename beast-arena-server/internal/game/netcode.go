package game

import (
	"encoding/json"
	"sync"
	"time"
)

const (
	InputBufferSize = 8
	MaxInputDelay   = 3 // frames
)

type InputBuffer struct {
	buffer  [2][InputBufferSize]json.RawMessage
	heads   [2]int
	delays  [2]int
	mu      sync.Mutex
}

func NewInputBuffer() *InputBuffer {
	return &InputBuffer{}
}

func (ib *InputBuffer) Push(slot int, input json.RawMessage) {
	ib.mu.Lock()
	defer ib.mu.Unlock()

	idx := ib.heads[slot] % InputBufferSize
	ib.buffer[slot][idx] = input
	ib.heads[slot]++
}

func (ib *InputBuffer) Get(slot int, frame int) json.RawMessage {
	ib.mu.Lock()
	defer ib.mu.Unlock()

	delayedFrame := frame - ib.delays[slot]
	if delayedFrame < 0 {
		delayedFrame = 0
	}

	idx := delayedFrame % InputBufferSize
	return ib.buffer[slot][idx]
}

func (ib *InputBuffer) SetDelay(slot int, delay int) {
	ib.mu.Lock()
	defer ib.mu.Unlock()

	if delay > MaxInputDelay {
		delay = MaxInputDelay
	}
	ib.delays[slot] = delay
}

// LagCompensation handles latency measurement and compensation
type LagCompensation struct {
	pingHistory [2][]time.Duration
	avgLatency  [2]time.Duration
	mu          sync.RWMutex
}

func NewLagCompensation() *LagCompensation {
	return &LagCompensation{}
}

func (lc *LagCompensation) RecordPing(slot int, latency time.Duration) {
	lc.mu.Lock()
	defer lc.mu.Unlock()

	lc.pingHistory[slot] = append(lc.pingHistory[slot], latency)
	// Keep last 20 samples
	if len(lc.pingHistory[slot]) > 20 {
		lc.pingHistory[slot] = lc.pingHistory[slot][len(lc.pingHistory[slot])-20:]
	}

	// Calculate average
	var total time.Duration
	for _, p := range lc.pingHistory[slot] {
		total += p
	}
	lc.avgLatency[slot] = total / time.Duration(len(lc.pingHistory[slot]))
}

func (lc *LagCompensation) GetLatency(slot int) time.Duration {
	lc.mu.RLock()
	defer lc.mu.RUnlock()
	return lc.avgLatency[slot]
}

func (lc *LagCompensation) GetInputDelay(slot int) int {
	latency := lc.GetLatency(slot)
	// Convert latency to frame delay (1 frame = ~16.67ms)
	delay := int(latency.Milliseconds() / 17)
	if delay > MaxInputDelay {
		delay = MaxInputDelay
	}
	return delay
}

// SuggestRollbackFrames returns recommended rollback frames based on both players' latency
func (lc *LagCompensation) SuggestRollbackFrames() int {
	maxLatency := lc.GetLatency(0)
	if l1 := lc.GetLatency(1); l1 > maxLatency {
		maxLatency = l1
	}
	frames := int(maxLatency.Milliseconds()/17) + 1
	if frames > MaxRollbackFrames {
		frames = MaxRollbackFrames
	}
	return frames
}
