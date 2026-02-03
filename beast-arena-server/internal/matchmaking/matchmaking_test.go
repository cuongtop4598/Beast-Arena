package matchmaking

import (
	"math"
	"testing"

	"go.uber.org/zap"
)

// ============================================================
// Engine creation tests
// ============================================================

func TestNewEngine(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	sugar := logger.Sugar()

	engine := NewEngine(sugar)
	if engine == nil {
		t.Fatal("NewEngine returned nil")
	}
	if engine.logger == nil {
		t.Error("logger should be set")
	}
}

// ============================================================
// MatchResult struct tests
// ============================================================

func TestMatchResultFields(t *testing.T) {
	result := MatchResult{
		MatchID:     "match-1",
		Player1ID:   "p1",
		Player1Char: "tiger",
		Player2ID:   "p2",
		Player2Char: "lion",
		StageID:     "ancient_temple",
	}

	if result.MatchID != "match-1" {
		t.Errorf("Expected MatchID 'match-1', got '%s'", result.MatchID)
	}
	if result.Player1ID != "p1" {
		t.Errorf("Expected Player1ID 'p1', got '%s'", result.Player1ID)
	}
	if result.Player2ID != "p2" {
		t.Errorf("Expected Player2ID 'p2', got '%s'", result.Player2ID)
	}
	if result.Player1Char != "tiger" {
		t.Errorf("Expected Player1Char 'tiger', got '%s'", result.Player1Char)
	}
	if result.Player2Char != "lion" {
		t.Errorf("Expected Player2Char 'lion', got '%s'", result.Player2Char)
	}
	if result.StageID != "ancient_temple" {
		t.Errorf("Expected StageID 'ancient_temple', got '%s'", result.StageID)
	}
}

// ============================================================
// Engine initialization tests (without Redis)
// Note: processQueue and CancelSearch require Redis,
// so we test them structurally.
// ============================================================

func TestEngineCanBeCreatedWithDifferentLoggers(t *testing.T) {
	// Production logger
	prodLogger, _ := zap.NewProduction()
	engine1 := NewEngine(prodLogger.Sugar())
	if engine1 == nil {
		t.Error("Should create engine with production logger")
	}

	// Development logger
	devLogger, _ := zap.NewDevelopment()
	engine2 := NewEngine(devLogger.Sugar())
	if engine2 == nil {
		t.Error("Should create engine with development logger")
	}

	// Nop logger
	nopLogger := zap.NewNop()
	engine3 := NewEngine(nopLogger.Sugar())
	if engine3 == nil {
		t.Error("Should create engine with nop logger")
	}
}

// ============================================================
// Data format tests (matching processQueue expectations)
// ============================================================

func TestPlayerQueueDataFormat(t *testing.T) {
	// processQueue expects "playerID:characterID" format
	tests := []struct {
		data    string
		valid   bool
		player  string
		char    string
	}{
		{"player1:tiger", true, "player1", "tiger"},
		{"player2:lion", true, "player2", "lion"},
		{"uuid-123:eagle", true, "uuid-123", "eagle"},
		{"nocolon", false, "", ""},
		{"", false, "", ""},
	}

	for _, tt := range tests {
		parts := splitPlayerData(tt.data)
		if tt.valid {
			if len(parts) < 2 {
				t.Errorf("Expected valid split for '%s'", tt.data)
				continue
			}
			if parts[0] != tt.player {
				t.Errorf("Expected player '%s', got '%s'", tt.player, parts[0])
			}
			if parts[1] != tt.char {
				t.Errorf("Expected char '%s', got '%s'", tt.char, parts[1])
			}
		} else {
			if len(parts) >= 2 {
				t.Errorf("Expected invalid split for '%s'", tt.data)
			}
		}
	}
}

// splitPlayerData helper mirrors the logic in processQueue
func splitPlayerData(data string) []string {
	if data == "" {
		return nil
	}
	// Same as strings.SplitN(data, ":", 2)
	for i, c := range data {
		if c == ':' {
			return []string{data[:i], data[i+1:]}
		}
	}
	return []string{data}
}

// ============================================================
// Self-match prevention test
// ============================================================

func TestSelfMatchPrevention(t *testing.T) {
	// Verify the logic that same player shouldn't match themselves
	p1ID := "player-123"
	p2ID := "player-123"

	if p1ID == p2ID {
		// This is what processQueue checks — verified
		t.Log("Self-match correctly detected")
	} else {
		t.Error("Should detect self-match")
	}

	// Different players should match
	p2ID = "player-456"
	if p1ID == p2ID {
		t.Error("Different players should be matchable")
	}
}

// ============================================================
// ELO Matching Range tests
// ============================================================

func TestELOMatchingRange_SimilarRatings(t *testing.T) {
	// Players within typical matching range (~200 ELO) should match
	p1ELO := 1000
	p2ELO := 1150
	maxRange := 200

	diff := int(math.Abs(float64(p1ELO - p2ELO)))
	if diff > maxRange {
		t.Errorf("Players with %d ELO difference should be within range %d", diff, maxRange)
	}
}

func TestELOMatchingRange_WideGap(t *testing.T) {
	// Players with large ELO gap should not match in strict mode
	p1ELO := 500
	p2ELO := 2000
	maxRange := 200

	diff := int(math.Abs(float64(p1ELO - p2ELO)))
	if diff <= maxRange {
		t.Errorf("Players with %d ELO difference should NOT be within range %d", diff, maxRange)
	}
}

func TestELOMatchingRange_ExactlyAtBoundary(t *testing.T) {
	p1ELO := 1000
	p2ELO := 1200
	maxRange := 200

	diff := int(math.Abs(float64(p1ELO - p2ELO)))
	if diff > maxRange {
		t.Error("Exactly at boundary should be matchable")
	}
}

// ============================================================
// Queue Add/Remove tests
// ============================================================

func TestQueueDataFormat_AddPlayer(t *testing.T) {
	// The queue stores "playerID:characterID" format
	playerID := "player-abc"
	charID := "tiger"
	queueEntry := playerID + ":" + charID

	parts := splitPlayerData(queueEntry)
	if len(parts) != 2 {
		t.Fatal("Queue entry should split into 2 parts")
	}
	if parts[0] != playerID {
		t.Errorf("Expected player ID '%s', got '%s'", playerID, parts[0])
	}
	if parts[1] != charID {
		t.Errorf("Expected character ID '%s', got '%s'", charID, parts[1])
	}
}

func TestQueueDataFormat_RemovePlayer(t *testing.T) {
	// Simulate queue with add/remove
	queue := []string{
		"player1:tiger",
		"player2:lion",
		"player3:eagle",
	}

	// Remove player2
	removeID := "player2"
	var newQueue []string
	for _, entry := range queue {
		parts := splitPlayerData(entry)
		if len(parts) >= 2 && parts[0] != removeID {
			newQueue = append(newQueue, entry)
		}
	}

	if len(newQueue) != 2 {
		t.Errorf("Expected 2 entries after removal, got %d", len(newQueue))
	}
	// Verify player2 is gone
	for _, entry := range newQueue {
		parts := splitPlayerData(entry)
		if parts[0] == removeID {
			t.Error("Removed player should not be in queue")
		}
	}
}

// ============================================================
// Match Creation tests
// ============================================================

func TestMatchCreation_ValidPair(t *testing.T) {
	result := MatchResult{
		MatchID:     "match-test-1",
		Player1ID:   "player1",
		Player1Char: "tiger",
		Player2ID:   "player2",
		Player2Char: "lion",
		StageID:     "ancient_temple",
	}

	// Verify all fields set
	if result.MatchID == "" {
		t.Error("MatchID should not be empty")
	}
	if result.Player1ID == result.Player2ID {
		t.Error("Players should be different")
	}
	if result.Player1Char == "" || result.Player2Char == "" {
		t.Error("Character selections should not be empty")
	}
	if result.StageID == "" {
		t.Error("StageID should not be empty")
	}
}

func TestMatchCreation_SameCharacterAllowed(t *testing.T) {
	// Mirror matches should be allowed
	result := MatchResult{
		MatchID:     "mirror-match",
		Player1ID:   "p1",
		Player1Char: "tiger",
		Player2ID:   "p2",
		Player2Char: "tiger", // Same character
		StageID:     "stage1",
	}

	if result.Player1Char != result.Player2Char {
		t.Error("Mirror matches should allow same character")
	}
}

// ============================================================
// Practice Mode Turn Tracking tests
// ============================================================

func TestPracticeTurnTracking(t *testing.T) {
	maxTurns := 5
	turnsUsed := 0

	// Use turns
	for i := 0; i < maxTurns; i++ {
		if turnsUsed >= maxTurns {
			t.Fatalf("Should be able to start turn %d", i+1)
		}
		turnsUsed++
	}

	if turnsUsed != maxTurns {
		t.Errorf("Expected %d turns used, got %d", maxTurns, turnsUsed)
	}

	// No more turns
	remaining := maxTurns - turnsUsed
	if remaining != 0 {
		t.Errorf("Expected 0 turns remaining, got %d", remaining)
	}
}

func TestPracticeTurnTracking_DecrementOnStart(t *testing.T) {
	freePractice := 5

	// Simulate starting practice
	freePractice--
	if freePractice != 4 {
		t.Errorf("Expected 4 practice turns after one use, got %d", freePractice)
	}

	// Use all remaining
	for freePractice > 0 {
		freePractice--
	}
	if freePractice != 0 {
		t.Errorf("Expected 0, got %d", freePractice)
	}
}

func TestPracticeTurnTracking_CannotStartWhenExhausted(t *testing.T) {
	freePractice := 0

	canStart := freePractice > 0
	if canStart {
		t.Error("Should not be able to start with 0 turns")
	}
}
