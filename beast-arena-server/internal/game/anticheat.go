package game

import (
	"encoding/json"
	"log"
	"time"
)

type ViolationType string

const (
	ViolationSpeedHack    ViolationType = "speed_hack"
	ViolationInvalidInput ViolationType = "invalid_input"
	ViolationTooFast      ViolationType = "input_too_fast"
	ViolationDesync       ViolationType = "desync"
)

type Violation struct {
	Type      ViolationType `json:"type"`
	PlayerID  string        `json:"player_id"`
	Frame     int           `json:"frame"`
	Details   string        `json:"details"`
	Timestamp time.Time     `json:"timestamp"`
}

type AntiCheat struct {
	violations    []Violation
	lastInputTime [2]time.Time
	inputCounts   [2]int
	maxViolations int
}

func NewAntiCheat() *AntiCheat {
	return &AntiCheat{
		maxViolations: 10,
	}
}

type ClientInput struct {
	Left    bool `json:"left"`
	Right   bool `json:"right"`
	Up      bool `json:"up"`
	Down    bool `json:"down"`
	Attack  int  `json:"attack"`  // 0-3
	Special int  `json:"special"` // 0-4
	Block   bool `json:"block"`
	Ult     bool `json:"ult"`
}

func (ac *AntiCheat) ValidateInput(slot int, playerID string, frame int, raw json.RawMessage) (bool, *Violation) {
	// Check input rate (max 60 inputs/sec)
	now := time.Now()
	if !ac.lastInputTime[slot].IsZero() {
		elapsed := now.Sub(ac.lastInputTime[slot])
		if elapsed < 10*time.Millisecond { // >100 inputs/sec = suspicious
			ac.inputCounts[slot]++
			if ac.inputCounts[slot] > 5 { // 5 strikes
				v := &Violation{
					Type:      ViolationTooFast,
					PlayerID:  playerID,
					Frame:     frame,
					Details:   "input rate exceeds 100/sec",
					Timestamp: now,
				}
				ac.violations = append(ac.violations, *v)
				return false, v
			}
		} else {
			ac.inputCounts[slot] = 0
		}
	}
	ac.lastInputTime[slot] = now

	// Validate input structure
	var input ClientInput
	if err := json.Unmarshal(raw, &input); err != nil {
		v := &Violation{
			Type:      ViolationInvalidInput,
			PlayerID:  playerID,
			Frame:     frame,
			Details:   "malformed input JSON",
			Timestamp: now,
		}
		ac.violations = append(ac.violations, *v)
		return false, v
	}

	// Validate input values
	if input.Attack < 0 || input.Attack > 3 {
		v := &Violation{
			Type:      ViolationInvalidInput,
			PlayerID:  playerID,
			Frame:     frame,
			Details:   "attack value out of range",
			Timestamp: now,
		}
		ac.violations = append(ac.violations, *v)
		return false, v
	}

	if input.Special < 0 || input.Special > 4 {
		v := &Violation{
			Type:      ViolationInvalidInput,
			PlayerID:  playerID,
			Frame:     frame,
			Details:   "special value out of range",
			Timestamp: now,
		}
		ac.violations = append(ac.violations, *v)
		return false, v
	}

	// Contradictory inputs
	if input.Left && input.Right {
		v := &Violation{
			Type:      ViolationInvalidInput,
			PlayerID:  playerID,
			Frame:     frame,
			Details:   "contradictory left+right",
			Timestamp: now,
		}
		ac.violations = append(ac.violations, *v)
		return false, v
	}

	return true, nil
}

func (ac *AntiCheat) ShouldKick(playerID string) bool {
	count := 0
	for _, v := range ac.violations {
		if v.PlayerID == playerID {
			count++
		}
	}
	return count >= ac.maxViolations
}

func (ac *AntiCheat) GetViolations(playerID string) []Violation {
	var result []Violation
	for _, v := range ac.violations {
		if v.PlayerID == playerID {
			result = append(result, v)
		}
	}
	return result
}

func (ac *AntiCheat) LogViolation(v Violation) {
	log.Printf("ANTICHEAT [%s] player=%s frame=%d: %s", v.Type, v.PlayerID, v.Frame, v.Details)
}
