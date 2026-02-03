package game

import (
	"sync"
	"time"
)

const (
	// DefaultInputDelay is the base input delay in frames (allows grouping inputs)
	DefaultInputDelay = 2
	// MaxInputDelay is the maximum input delay based on latency
	MaxInputDelay = 6
	// InputBufferSize is the size of the input buffer per player
	InputBufferSize = 256
	// JitterBufferSize is frames of jitter compensation
	JitterBufferSize = 3
	// LagCompensationMaxMs is the maximum lag compensation window (ms)
	LagCompensationMaxMs = 150
)

// NetcodeConfig holds configurable netcode parameters
type NetcodeConfig struct {
	InputDelayFrames int `json:"input_delay_frames"`
	JitterBuffer     int `json:"jitter_buffer"`
	MaxLagCompMs     int `json:"max_lag_comp_ms"`
}

// DefaultNetcodeConfig returns sensible defaults
func DefaultNetcodeConfig() NetcodeConfig {
	return NetcodeConfig{
		InputDelayFrames: DefaultInputDelay,
		JitterBuffer:     JitterBufferSize,
		MaxLagCompMs:     LagCompensationMaxMs,
	}
}

// InputBuffer is a per-player ring buffer of inputs with timing info
type InputBuffer struct {
	mu     sync.Mutex
	buffer [InputBufferSize]BufferedInput
	head   int
	count  int
}

// BufferedInput wraps a player input with receive timing
type BufferedInput struct {
	Input      PlayerInput
	ReceivedAt time.Time
	Applied    bool
}

// NewInputBuffer creates a new input buffer
func NewInputBuffer() *InputBuffer {
	return &InputBuffer{}
}

// Push adds an input to the buffer
func (ib *InputBuffer) Push(input PlayerInput) {
	ib.mu.Lock()
	defer ib.mu.Unlock()

	idx := ib.head % InputBufferSize
	ib.buffer[idx] = BufferedInput{
		Input:      input,
		ReceivedAt: time.Now(),
		Applied:    false,
	}
	ib.head++
	if ib.count < InputBufferSize {
		ib.count++
	}
}

// GetForFrame retrieves the input for a specific frame, or nil if not available
func (ib *InputBuffer) GetForFrame(frame int) *PlayerInput {
	ib.mu.Lock()
	defer ib.mu.Unlock()

	start := ib.head - ib.count
	if start < 0 {
		start = 0
	}
	for i := start; i < ib.head; i++ {
		idx := i % InputBufferSize
		if ib.buffer[idx].Input.Frame == frame && !ib.buffer[idx].Applied {
			ib.buffer[idx].Applied = true
			input := ib.buffer[idx].Input
			return &input
		}
	}
	return nil
}

// PeekLatest returns the most recent input without consuming it
func (ib *InputBuffer) PeekLatest() *PlayerInput {
	ib.mu.Lock()
	defer ib.mu.Unlock()

	if ib.count == 0 {
		return nil
	}
	idx := (ib.head - 1) % InputBufferSize
	if idx < 0 {
		idx += InputBufferSize
	}
	input := ib.buffer[idx].Input
	return &input
}

// LagCompensator handles lag compensation between players
type LagCompensator struct {
	mu sync.RWMutex

	// Per-player latency tracking (RTT in ms)
	playerRTT map[string]*LatencyTracker

	// Adaptive input delay per player
	playerInputDelay map[string]int

	config NetcodeConfig
}

// LatencyTracker tracks RTT with exponential moving average
type LatencyTracker struct {
	SamplesRTT    [32]float64 // ring buffer of RTT samples (ms)
	head          int
	count         int
	SmoothedRTT   float64 // EWMA of RTT
	JitterMs      float64 // RTT variance estimate
	LastPingTime  time.Time
	LastPongTime  time.Time
	LastPingSent  int64   // sequence number
	LastPongRecv  int64
}

// NewLagCompensator creates a new lag compensator
func NewLagCompensator(config NetcodeConfig) *LagCompensator {
	return &LagCompensator{
		playerRTT:        make(map[string]*LatencyTracker),
		playerInputDelay: make(map[string]int),
		config:           config,
	}
}

// RegisterPlayer initializes tracking for a player
func (lc *LagCompensator) RegisterPlayer(playerID string) {
	lc.mu.Lock()
	defer lc.mu.Unlock()
	lc.playerRTT[playerID] = &LatencyTracker{}
	lc.playerInputDelay[playerID] = lc.config.InputDelayFrames
}

// RecordPingSent marks when a ping was sent to a player
func (lc *LagCompensator) RecordPingSent(playerID string, seq int64) {
	lc.mu.Lock()
	defer lc.mu.Unlock()
	if tracker, ok := lc.playerRTT[playerID]; ok {
		tracker.LastPingTime = time.Now()
		tracker.LastPingSent = seq
	}
}

// RecordPongReceived records a pong response and updates RTT
func (lc *LagCompensator) RecordPongReceived(playerID string, seq int64) {
	lc.mu.Lock()
	defer lc.mu.Unlock()

	tracker, ok := lc.playerRTT[playerID]
	if !ok {
		return
	}

	if seq != tracker.LastPingSent {
		return // stale pong
	}

	rtt := float64(time.Since(tracker.LastPingTime).Milliseconds())
	tracker.LastPongTime = time.Now()
	tracker.LastPongRecv = seq

	// Add to ring buffer
	idx := tracker.head % len(tracker.SamplesRTT)
	tracker.SamplesRTT[idx] = rtt
	tracker.head++
	if tracker.count < len(tracker.SamplesRTT) {
		tracker.count++
	}

	// EWMA: smoothedRTT = 0.875 * old + 0.125 * sample
	alpha := 0.125
	if tracker.SmoothedRTT == 0 {
		tracker.SmoothedRTT = rtt
	} else {
		tracker.SmoothedRTT = (1-alpha)*tracker.SmoothedRTT + alpha*rtt
	}

	// Jitter estimate
	diff := rtt - tracker.SmoothedRTT
	if diff < 0 {
		diff = -diff
	}
	tracker.JitterMs = (1-alpha)*tracker.JitterMs + alpha*diff

	// Adapt input delay based on latency
	lc.adaptInputDelay(playerID, tracker)
}

// GetRTT returns the smoothed RTT for a player (ms)
func (lc *LagCompensator) GetRTT(playerID string) float64 {
	lc.mu.RLock()
	defer lc.mu.RUnlock()
	if tracker, ok := lc.playerRTT[playerID]; ok {
		return tracker.SmoothedRTT
	}
	return 0
}

// GetJitter returns the jitter estimate for a player (ms)
func (lc *LagCompensator) GetJitter(playerID string) float64 {
	lc.mu.RLock()
	defer lc.mu.RUnlock()
	if tracker, ok := lc.playerRTT[playerID]; ok {
		return tracker.JitterMs
	}
	return 0
}

// GetInputDelay returns the adaptive input delay for a player (frames)
func (lc *LagCompensator) GetInputDelay(playerID string) int {
	lc.mu.RLock()
	defer lc.mu.RUnlock()
	if delay, ok := lc.playerInputDelay[playerID]; ok {
		return delay
	}
	return lc.config.InputDelayFrames
}

// GetLatencyInfo returns full latency info for a player (for client display)
func (lc *LagCompensator) GetLatencyInfo(playerID string) map[string]interface{} {
	lc.mu.RLock()
	defer lc.mu.RUnlock()

	info := map[string]interface{}{
		"rtt_ms":       0.0,
		"jitter_ms":    0.0,
		"input_delay":  lc.config.InputDelayFrames,
		"quality":      "unknown",
	}

	tracker, ok := lc.playerRTT[playerID]
	if !ok {
		return info
	}

	info["rtt_ms"] = tracker.SmoothedRTT
	info["jitter_ms"] = tracker.JitterMs
	if delay, ok := lc.playerInputDelay[playerID]; ok {
		info["input_delay"] = delay
	}

	// Connection quality indicator
	rtt := tracker.SmoothedRTT
	switch {
	case rtt < 50:
		info["quality"] = "excellent"
	case rtt < 100:
		info["quality"] = "good"
	case rtt < 150:
		info["quality"] = "fair"
	default:
		info["quality"] = "poor"
	}

	return info
}

// adaptInputDelay calculates optimal input delay based on latency
func (lc *LagCompensator) adaptInputDelay(playerID string, tracker *LatencyTracker) {
	// Input delay = ceil(RTT / 2 / frameDurationMs) + jitter buffer
	frameDurationMs := 16.667 // ~60fps
	oneWayMs := tracker.SmoothedRTT / 2.0
	framesOfLatency := int(oneWayMs/frameDurationMs) + 1

	delay := framesOfLatency + lc.config.JitterBuffer
	if delay < lc.config.InputDelayFrames {
		delay = lc.config.InputDelayFrames
	}
	if delay > MaxInputDelay {
		delay = MaxInputDelay
	}

	lc.playerInputDelay[playerID] = delay
}

// CalculateLagCompensationFrames returns how many frames of lag comp to apply
func (lc *LagCompensator) CalculateLagCompensationFrames(playerID string) int {
	rtt := lc.GetRTT(playerID)
	if rtt <= 0 {
		return 0
	}

	// Compensate for one-way latency (half RTT)
	oneWayMs := rtt / 2.0
	if oneWayMs > float64(lc.config.MaxLagCompMs) {
		oneWayMs = float64(lc.config.MaxLagCompMs)
	}

	frameDurationMs := 16.667
	frames := int(oneWayMs / frameDurationMs)
	return frames
}
