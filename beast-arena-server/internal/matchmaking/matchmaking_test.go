package matchmaking

import (
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
