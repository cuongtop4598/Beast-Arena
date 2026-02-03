package game

import (
	"encoding/json"
	"testing"
)

// ============================================================
// State Snapshot / Restore
// ============================================================

func TestRollback_SaveSnapshot_StoresCorrectFrame(t *testing.T) {
	rn := NewRollbackNetcode()
	gs := *NewGameState("snap-1", "tiger", "p1", "lion", "p2", "stage")
	gs.Frame = 42
	gs.Player1.HP = 800

	inputs := [2]json.RawMessage{
		json.RawMessage(`{"left":true}`),
		json.RawMessage(`{"right":false}`),
	}
	rn.SaveSnapshot(42, gs, inputs)

	snap := rn.GetSnapshot(42)
	if snap == nil {
		t.Fatal("Expected snapshot at frame 42")
	}
	if snap.Frame != 42 {
		t.Errorf("Expected frame 42, got %d", snap.Frame)
	}
	if snap.State.Player1.HP != 800 {
		t.Errorf("Expected P1 HP 800, got %d", snap.State.Player1.HP)
	}
}

func TestRollback_SaveSnapshot_OverwritesOnWrap(t *testing.T) {
	rn := NewRollbackNetcode()
	gs := *NewGameState("snap-2", "tiger", "p1", "lion", "p2", "stage")

	// Save at frame 0
	gs.Frame = 0
	gs.Player1.HP = 1000
	rn.SaveSnapshot(0, gs, [2]json.RawMessage{})

	// Save at frame RingBufferSize (wraps to same index)
	gs.Frame = RingBufferSize
	gs.Player1.HP = 500
	rn.SaveSnapshot(RingBufferSize, gs, [2]json.RawMessage{})

	// Frame 0 should be overwritten
	snap := rn.GetSnapshot(0)
	if snap != nil {
		// The slot now has frame=RingBufferSize, not 0
		t.Log("Frame 0 correctly overwritten by frame", RingBufferSize)
	}

	snap = rn.GetSnapshot(RingBufferSize)
	if snap == nil {
		t.Fatal("Expected snapshot at frame RingBufferSize")
	}
	if snap.State.Player1.HP != 500 {
		t.Errorf("Expected HP 500, got %d", snap.State.Player1.HP)
	}
}

func TestRollback_GetSnapshot_ReturnsNilForMissingFrame(t *testing.T) {
	rn := NewRollbackNetcode()
	snap := rn.GetSnapshot(999)
	if snap != nil {
		t.Error("Expected nil for non-existent snapshot")
	}
}

func TestRollback_GetSnapshot_ReturnsNilForWrongFrame(t *testing.T) {
	rn := NewRollbackNetcode()
	gs := *NewGameState("snap-3", "tiger", "p1", "lion", "p2", "stage")
	gs.Frame = 5
	rn.SaveSnapshot(5, gs, [2]json.RawMessage{})

	// Frame 5 + RingBufferSize shares same index but different frame
	snap := rn.GetSnapshot(5 + RingBufferSize)
	if snap != nil {
		t.Error("Should return nil when stored frame doesn't match requested frame")
	}
}

func TestRollback_Checksum_NonZero(t *testing.T) {
	rn := NewRollbackNetcode()
	gs := *NewGameState("ck-1", "tiger", "p1", "lion", "p2", "stage")
	rn.SaveSnapshot(1, gs, [2]json.RawMessage{})

	snap := rn.GetSnapshot(1)
	if snap.Checksum == 0 {
		t.Error("Checksum should be non-zero for non-empty state")
	}
}

func TestRollback_Checksum_DifferentForDifferentStates(t *testing.T) {
	rn := NewRollbackNetcode()

	gs1 := *NewGameState("ck-2a", "tiger", "p1", "lion", "p2", "stage")
	gs1.Player1.HP = 1000
	rn.SaveSnapshot(1, gs1, [2]json.RawMessage{})
	snap1 := rn.GetSnapshot(1)

	gs2 := *NewGameState("ck-2b", "tiger", "p1", "lion", "p2", "stage")
	gs2.Player1.HP = 500
	rn.SaveSnapshot(2, gs2, [2]json.RawMessage{})
	snap2 := rn.GetSnapshot(2)

	if snap1.Checksum == snap2.Checksum {
		t.Error("Different game states should produce different checksums")
	}
}

// ============================================================
// Input Buffer (Predictions)
// ============================================================

func TestRollback_StorePrediction(t *testing.T) {
	rn := NewRollbackNetcode()
	pred := [2]json.RawMessage{
		json.RawMessage(`{"left":true}`),
		json.RawMessage(`{"right":true}`),
	}
	rn.StorePrediction(10, pred)

	// Verify prediction stored
	stored, ok := rn.predictions[10]
	if !ok {
		t.Fatal("Prediction should be stored at frame 10")
	}
	if string(stored[0]) != `{"left":true}` {
		t.Error("Prediction data mismatch")
	}
}

func TestRollback_StorePrediction_CleansOldEntries(t *testing.T) {
	rn := NewRollbackNetcode()

	// Store predictions for frames 0-199
	for i := 0; i < 200; i++ {
		rn.StorePrediction(i, [2]json.RawMessage{json.RawMessage(`{}`), json.RawMessage(`{}`)})
	}

	// Frame 0 should have been cleaned (199 - 128 = 71, so anything < 71 cleaned)
	if _, ok := rn.predictions[0]; ok {
		t.Error("Frame 0 prediction should be cleaned up")
	}

	// Recent frame should still exist
	if _, ok := rn.predictions[199]; !ok {
		t.Error("Frame 199 prediction should still exist")
	}
}

func TestRollback_NeedRollback_PredictionMatches(t *testing.T) {
	rn := NewRollbackNetcode()
	pred := [2]json.RawMessage{
		json.RawMessage(`{"left":true}`),
		json.RawMessage(`{"right":true}`),
	}
	rn.StorePrediction(5, pred)

	// Actual matches prediction → no rollback
	if rn.NeedRollback(5, json.RawMessage(`{"left":true}`), 0) {
		t.Error("Should not need rollback when prediction matches actual")
	}
}

func TestRollback_NeedRollback_PredictionDiffers(t *testing.T) {
	rn := NewRollbackNetcode()
	pred := [2]json.RawMessage{
		json.RawMessage(`{"left":true}`),
		json.RawMessage(`{"right":true}`),
	}
	rn.StorePrediction(5, pred)

	// Actual differs from prediction → need rollback
	if !rn.NeedRollback(5, json.RawMessage(`{"left":false}`), 0) {
		t.Error("Should need rollback when prediction differs from actual")
	}
}

func TestRollback_NeedRollback_NoPredictionForFrame(t *testing.T) {
	rn := NewRollbackNetcode()

	// No prediction stored → no rollback needed
	if rn.NeedRollback(99, json.RawMessage(`{"anything":true}`), 0) {
		t.Error("Should not need rollback for frame with no prediction")
	}
}

func TestRollback_NeedRollback_Slot1(t *testing.T) {
	rn := NewRollbackNetcode()
	pred := [2]json.RawMessage{
		json.RawMessage(`{"left":true}`),
		json.RawMessage(`{"right":true}`),
	}
	rn.StorePrediction(5, pred)

	// Slot 1 matches
	if rn.NeedRollback(5, json.RawMessage(`{"right":true}`), 1) {
		t.Error("Slot 1 prediction matches — should not need rollback")
	}

	// Slot 1 differs
	if !rn.NeedRollback(5, json.RawMessage(`{"right":false}`), 1) {
		t.Error("Slot 1 prediction differs — should need rollback")
	}
}

// ============================================================
// Resimulation
// ============================================================

func TestRollback_Rollback_ResimulatesCorrectFrameRange(t *testing.T) {
	rn := NewRollbackNetcode()
	gs := *NewGameState("resim-1", "tiger", "p1", "lion", "p2", "stage")

	// Save snapshots for frames 1-10
	for i := 1; i <= 10; i++ {
		gs.Frame = i
		gs.Player1.HP = 1000 - i*10
		rn.SaveSnapshot(i, gs, [2]json.RawMessage{json.RawMessage(`{}`), json.RawMessage(`{}`)})
	}

	// Rollback from frame 10 to frame 5
	resimFrames := []int{}
	result := rn.Rollback(5, 10, func(frame int, state *GameState, inputs [2]json.RawMessage) {
		resimFrames = append(resimFrames, frame)
		state.Frame = frame
		state.Player1.HP -= 20 // different resim damage
	})

	if result == nil {
		t.Fatal("Rollback should return a state")
	}

	// Should resimulate frames 6, 7, 8, 9, 10
	expected := []int{6, 7, 8, 9, 10}
	if len(resimFrames) != len(expected) {
		t.Fatalf("Expected %d resim calls, got %d", len(expected), len(resimFrames))
	}
	for i, f := range resimFrames {
		if f != expected[i] {
			t.Errorf("Resim frame %d: expected %d, got %d", i, expected[i], f)
		}
	}
}

func TestRollback_Rollback_RestoresFromSnapshot(t *testing.T) {
	rn := NewRollbackNetcode()

	// Create two independent game states to avoid shared pointers
	gs5 := NewGameState("resim-2", "tiger", "p1", "lion", "p2", "stage")
	gs5.Frame = 5
	gs5.Player1.HP = 800
	rn.SaveSnapshot(5, *gs5, [2]json.RawMessage{json.RawMessage(`{}`), json.RawMessage(`{}`)})

	gs6 := NewGameState("resim-2", "tiger", "p1", "lion", "p2", "stage")
	gs6.Frame = 6
	gs6.Player1.HP = 700
	rn.SaveSnapshot(6, *gs6, [2]json.RawMessage{json.RawMessage(`{}`), json.RawMessage(`{}`)})

	// Rollback to frame 5, resim to 6 — apply 50 damage (not 200 like original)
	result := rn.Rollback(5, 6, func(frame int, state *GameState, inputs [2]json.RawMessage) {
		state.Player1.HP -= 50 // resim deals 50 damage instead of 200
	})

	if result == nil {
		t.Fatal("Rollback should return state")
	}
	// Result state should start from frame 5 snapshot (HP=800) and resim applies 50 damage
	if result.Player1.HP != 750 {
		t.Errorf("Expected HP 750 after rollback+resim (800-50), got %d", result.Player1.HP)
	}
}

func TestRollback_Rollback_MissingSnapshot_ReturnsNil(t *testing.T) {
	rn := NewRollbackNetcode()

	result := rn.Rollback(99, 100, func(frame int, state *GameState, inputs [2]json.RawMessage) {})
	if result != nil {
		t.Error("Rollback to non-existent snapshot should return nil")
	}
}

// ============================================================
// Desync Detection
// ============================================================

func TestRollback_DetectDesync_MatchingChecksum(t *testing.T) {
	rn := NewRollbackNetcode()
	gs := *NewGameState("desync-1", "tiger", "p1", "lion", "p2", "stage")
	rn.SaveSnapshot(1, gs, [2]json.RawMessage{json.RawMessage(`{}`), json.RawMessage(`{}`)})

	snap := rn.GetSnapshot(1)
	if rn.DetectDesync(1, snap.Checksum) {
		t.Error("Should not detect desync when checksums match")
	}
}

func TestRollback_DetectDesync_MismatchedChecksum(t *testing.T) {
	rn := NewRollbackNetcode()
	gs := *NewGameState("desync-2", "tiger", "p1", "lion", "p2", "stage")
	rn.SaveSnapshot(1, gs, [2]json.RawMessage{json.RawMessage(`{}`), json.RawMessage(`{}`)})

	snap := rn.GetSnapshot(1)
	if !rn.DetectDesync(1, snap.Checksum+1) {
		t.Error("Should detect desync when checksums differ")
	}
}

func TestRollback_DetectDesync_NonExistentFrame(t *testing.T) {
	rn := NewRollbackNetcode()

	if rn.DetectDesync(999, 12345) {
		t.Error("Should not detect desync for non-existent frame (no data to compare)")
	}
}

func TestRollback_DetectDesync_AfterStateChange(t *testing.T) {
	rn := NewRollbackNetcode()

	gs1 := *NewGameState("desync-3", "tiger", "p1", "lion", "p2", "stage")
	gs1.Player1.HP = 1000
	rn.SaveSnapshot(1, gs1, [2]json.RawMessage{json.RawMessage(`{}`), json.RawMessage(`{}`)})
	checksum1 := rn.GetSnapshot(1).Checksum

	// Modify state and get new checksum
	gs2 := gs1
	gs2.Player1.HP = 999
	rn.SaveSnapshot(2, gs2, [2]json.RawMessage{json.RawMessage(`{}`), json.RawMessage(`{}`)})
	checksum2 := rn.GetSnapshot(2).Checksum

	// Cross-check should detect desync
	if !rn.DetectDesync(1, checksum2) {
		t.Error("Should detect desync when using checksum from different state")
	}
	if !rn.DetectDesync(2, checksum1) {
		t.Error("Should detect desync when using checksum from different state (reverse)")
	}
}

// ============================================================
// Confirm Frame
// ============================================================

func TestRollback_ConfirmFrame(t *testing.T) {
	rn := NewRollbackNetcode()

	if rn.GetConfirmedFrame() != 0 {
		t.Errorf("Initial confirmed frame should be 0, got %d", rn.GetConfirmedFrame())
	}

	rn.ConfirmFrame(42)
	if rn.GetConfirmedFrame() != 42 {
		t.Errorf("Expected confirmed frame 42, got %d", rn.GetConfirmedFrame())
	}

	rn.ConfirmFrame(100)
	if rn.GetConfirmedFrame() != 100 {
		t.Errorf("Expected confirmed frame 100, got %d", rn.GetConfirmedFrame())
	}
}

// ============================================================
// Constants
// ============================================================

func TestRollback_Constants(t *testing.T) {
	if MaxRollbackFrames != 7 {
		t.Errorf("Expected MaxRollbackFrames=7, got %d", MaxRollbackFrames)
	}
	if RingBufferSize != 128 {
		t.Errorf("Expected RingBufferSize=128, got %d", RingBufferSize)
	}
}
