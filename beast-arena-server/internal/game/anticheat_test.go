package game

import (
	"encoding/json"
	"testing"
	"time"
)

// ============================================================
// Anti-Cheat: Input Validation
// ============================================================

func TestAntiCheat_ValidInput_AllFieldsValid(t *testing.T) {
	ac := NewAntiCheat()
	input := json.RawMessage(`{"left":false,"right":true,"up":false,"down":false,"attack":2,"special":3,"block":false,"ult":false}`)

	ok, v := ac.ValidateInput(0, "p1", 1, input)
	if !ok {
		t.Errorf("Valid input should be accepted, got violation: %+v", v)
	}
}

func TestAntiCheat_InvalidInput_MalformedJSON(t *testing.T) {
	ac := NewAntiCheat()
	time.Sleep(15 * time.Millisecond) // avoid rate limit

	bad := json.RawMessage(`not json at all`)
	ok, v := ac.ValidateInput(0, "p1", 1, bad)
	if ok {
		t.Fatal("Malformed JSON should be rejected")
	}
	if v.Type != ViolationInvalidInput {
		t.Errorf("Expected ViolationInvalidInput, got %s", v.Type)
	}
	if v.Details != "malformed input JSON" {
		t.Errorf("Expected 'malformed input JSON' details, got '%s'", v.Details)
	}
}

func TestAntiCheat_InvalidInput_AttackTooHigh(t *testing.T) {
	ac := NewAntiCheat()
	time.Sleep(15 * time.Millisecond)

	input := json.RawMessage(`{"left":false,"right":false,"up":false,"down":false,"attack":4,"special":0,"block":false,"ult":false}`)
	ok, v := ac.ValidateInput(0, "p1", 1, input)
	if ok {
		t.Fatal("Attack value 4 should be rejected (max 3)")
	}
	if v.Details != "attack value out of range" {
		t.Errorf("Expected 'attack value out of range', got '%s'", v.Details)
	}
}

func TestAntiCheat_InvalidInput_AttackNegative(t *testing.T) {
	ac := NewAntiCheat()
	time.Sleep(15 * time.Millisecond)

	input := json.RawMessage(`{"left":false,"right":false,"up":false,"down":false,"attack":-1,"special":0,"block":false,"ult":false}`)
	ok, v := ac.ValidateInput(0, "p1", 1, input)
	if ok {
		t.Fatal("Negative attack value should be rejected")
	}
	if v.Type != ViolationInvalidInput {
		t.Errorf("Expected ViolationInvalidInput, got %s", v.Type)
	}
}

func TestAntiCheat_InvalidInput_SpecialTooHigh(t *testing.T) {
	ac := NewAntiCheat()
	time.Sleep(15 * time.Millisecond)

	input := json.RawMessage(`{"left":false,"right":false,"up":false,"down":false,"attack":0,"special":5,"block":false,"ult":false}`)
	ok, v := ac.ValidateInput(0, "p1", 1, input)
	if ok {
		t.Fatal("Special value 5 should be rejected (max 4)")
	}
	if v.Details != "special value out of range" {
		t.Errorf("Expected 'special value out of range', got '%s'", v.Details)
	}
}

func TestAntiCheat_InvalidInput_ContradictoryLeftRight(t *testing.T) {
	ac := NewAntiCheat()
	time.Sleep(15 * time.Millisecond)

	input := json.RawMessage(`{"left":true,"right":true,"up":false,"down":false,"attack":0,"special":0,"block":false,"ult":false}`)
	ok, v := ac.ValidateInput(0, "p1", 1, input)
	if ok {
		t.Fatal("Contradictory left+right should be rejected")
	}
	if v.Details != "contradictory left+right" {
		t.Errorf("Expected 'contradictory left+right', got '%s'", v.Details)
	}
}

func TestAntiCheat_ValidInput_BoundaryValues(t *testing.T) {
	ac := NewAntiCheat()

	// Attack=0 (min valid)
	input := json.RawMessage(`{"left":false,"right":false,"up":false,"down":false,"attack":0,"special":0,"block":false,"ult":false}`)
	ok, _ := ac.ValidateInput(0, "p1", 1, input)
	if !ok {
		t.Error("Attack=0 should be valid")
	}

	time.Sleep(15 * time.Millisecond)

	// Attack=3 (max valid)
	input = json.RawMessage(`{"left":false,"right":false,"up":false,"down":false,"attack":3,"special":4,"block":false,"ult":false}`)
	ok, _ = ac.ValidateInput(0, "p1", 2, input)
	if !ok {
		t.Error("Attack=3, Special=4 should be valid")
	}
}

// ============================================================
// Anti-Cheat: Rate Limiting
// ============================================================

func TestAntiCheat_RateLimit_NormalRate(t *testing.T) {
	ac := NewAntiCheat()
	validInput := json.RawMessage(`{"left":false,"right":false,"up":false,"down":false,"attack":0,"special":0,"block":false,"ult":false}`)

	// Send inputs at normal rate (~60/sec = 16ms apart)
	for i := 0; i < 10; i++ {
		time.Sleep(17 * time.Millisecond)
		ok, _ := ac.ValidateInput(0, "p1", i, validInput)
		if !ok {
			t.Fatalf("Normal rate input %d should be accepted", i)
		}
	}
}

func TestAntiCheat_RateLimit_TooFast(t *testing.T) {
	ac := NewAntiCheat()
	validInput := json.RawMessage(`{"left":false,"right":false,"up":false,"down":false,"attack":0,"special":0,"block":false,"ult":false}`)

	// First input always accepted
	ok, _ := ac.ValidateInput(0, "p1", 0, validInput)
	if !ok {
		t.Fatal("First input should be accepted")
	}

	// Rapid-fire inputs (< 10ms apart) — first few tolerated, then rejected after 5 strikes
	rejected := false
	for i := 1; i <= 10; i++ {
		// No sleep — as fast as possible
		ok, v := ac.ValidateInput(0, "p1", i, validInput)
		if !ok && v != nil && v.Type == ViolationTooFast {
			rejected = true
			break
		}
	}
	if !rejected {
		t.Error("Should reject inputs that are too fast after exceeding strike threshold")
	}
}

func TestAntiCheat_RateLimit_PerSlot(t *testing.T) {
	ac := NewAntiCheat()
	validInput := json.RawMessage(`{"left":false,"right":false,"up":false,"down":false,"attack":0,"special":0,"block":false,"ult":false}`)

	// Slot 0 gets rate limited
	ac.ValidateInput(0, "p1", 0, validInput)
	for i := 1; i <= 10; i++ {
		ac.ValidateInput(0, "p1", i, validInput)
	}

	// Slot 1 should still be fine (independent rate tracking)
	time.Sleep(15 * time.Millisecond)
	ok, _ := ac.ValidateInput(1, "p2", 0, validInput)
	if !ok {
		t.Error("Slot 1 should not be affected by slot 0 rate limiting")
	}
}

// ============================================================
// Anti-Cheat: State Verification (ShouldKick / GetViolations)
// ============================================================

func TestAntiCheat_ShouldKick_BelowThreshold(t *testing.T) {
	ac := NewAntiCheat()
	for i := 0; i < 9; i++ {
		ac.violations = append(ac.violations, Violation{Type: ViolationInvalidInput, PlayerID: "p1", Frame: i})
	}
	if ac.ShouldKick("p1") {
		t.Error("Should not kick with 9 violations (threshold is 10)")
	}
}

func TestAntiCheat_ShouldKick_AtThreshold(t *testing.T) {
	ac := NewAntiCheat()
	for i := 0; i < 10; i++ {
		ac.violations = append(ac.violations, Violation{Type: ViolationInvalidInput, PlayerID: "p1", Frame: i})
	}
	if !ac.ShouldKick("p1") {
		t.Error("Should kick player with 10 violations")
	}
}

func TestAntiCheat_ShouldKick_OnlyCountsTargetPlayer(t *testing.T) {
	ac := NewAntiCheat()
	for i := 0; i < 15; i++ {
		ac.violations = append(ac.violations, Violation{Type: ViolationInvalidInput, PlayerID: "p1", Frame: i})
	}
	if ac.ShouldKick("p2") {
		t.Error("Should not kick p2 — all violations belong to p1")
	}
}

func TestAntiCheat_GetViolations_FiltersByPlayer(t *testing.T) {
	ac := NewAntiCheat()
	ac.violations = []Violation{
		{Type: ViolationInvalidInput, PlayerID: "p1", Frame: 1},
		{Type: ViolationTooFast, PlayerID: "p2", Frame: 2},
		{Type: ViolationInvalidInput, PlayerID: "p1", Frame: 3},
		{Type: ViolationDesync, PlayerID: "p2", Frame: 4},
	}

	p1v := ac.GetViolations("p1")
	if len(p1v) != 2 {
		t.Errorf("Expected 2 violations for p1, got %d", len(p1v))
	}
	for _, v := range p1v {
		if v.PlayerID != "p1" {
			t.Error("Returned violation for wrong player")
		}
	}

	p3v := ac.GetViolations("p3")
	if len(p3v) != 0 {
		t.Errorf("Expected 0 violations for p3, got %d", len(p3v))
	}
}

func TestAntiCheat_ViolationTimestamp(t *testing.T) {
	ac := NewAntiCheat()
	time.Sleep(15 * time.Millisecond)

	before := time.Now()
	ac.ValidateInput(0, "p1", 1, json.RawMessage(`{invalid}`))
	after := time.Now()

	violations := ac.GetViolations("p1")
	if len(violations) != 1 {
		t.Fatal("Expected 1 violation")
	}
	ts := violations[0].Timestamp
	if ts.Before(before) || ts.After(after) {
		t.Error("Violation timestamp should be between before and after")
	}
}

func TestAntiCheat_LogViolation_NoPanic(t *testing.T) {
	ac := NewAntiCheat()
	v := Violation{
		Type:      ViolationSpeedHack,
		PlayerID:  "p1",
		Frame:     42,
		Details:   "test violation",
		Timestamp: time.Now(),
	}
	// Should not panic
	ac.LogViolation(v)
}
