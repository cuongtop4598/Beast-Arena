package game

import (
	"encoding/json"
	"testing"
	"time"
)

// ============================================================
// GameLoop tests
// ============================================================

func TestNewGameLoop(t *testing.T) {
	gs := NewGameState("match-1", "tiger", "p1", "lion", "p2", "ancient_temple")
	var broadcasts [][]byte
	gl := NewGameLoop(gs, func(msg []byte) {
		broadcasts = append(broadcasts, msg)
	})

	if gl == nil {
		t.Fatal("NewGameLoop returned nil")
	}
	if gl.state != gs {
		t.Error("GameLoop state not set correctly")
	}
	if gl.frame != 0 {
		t.Errorf("Expected frame 0, got %d", gl.frame)
	}
}

func TestGameLoopStartStop(t *testing.T) {
	gs := NewGameState("match-2", "tiger", "p1", "lion", "p2", "ancient_temple")
	gl := NewGameLoop(gs, func(msg []byte) {})

	gl.Start()
	if !gl.running {
		t.Error("GameLoop should be running after Start()")
	}

	// Let it run a few ticks
	time.Sleep(50 * time.Millisecond)
	frame := gl.GetFrame()
	if frame == 0 {
		t.Error("GameLoop should have advanced frames")
	}

	gl.Stop()
	// Give goroutine time to exit
	time.Sleep(20 * time.Millisecond)
	if gl.running {
		t.Error("GameLoop should not be running after Stop()")
	}
}

func TestGameLoopBroadcastsFrames(t *testing.T) {
	gs := NewGameState("match-3", "tiger", "p1", "lion", "p2", "ancient_temple")
	var broadcasts [][]byte
	gl := NewGameLoop(gs, func(msg []byte) {
		broadcasts = append(broadcasts, msg)
	})

	gl.Start()
	time.Sleep(100 * time.Millisecond) // ~6 ticks at 60fps
	gl.Stop()
	time.Sleep(20 * time.Millisecond)

	if len(broadcasts) == 0 {
		t.Error("GameLoop should have broadcast frame updates")
	}

	// Verify broadcast format
	var msg GameLoopMsg
	if err := json.Unmarshal(broadcasts[0], &msg); err != nil {
		t.Fatalf("Failed to unmarshal broadcast: %v", err)
	}
	if msg.Type != "frame" {
		t.Errorf("Expected 'frame' message type, got '%s'", msg.Type)
	}
}

func TestGameLoopQueueInput(t *testing.T) {
	gs := NewGameState("match-4", "tiger", "p1", "lion", "p2", "ancient_temple")
	gl := NewGameLoop(gs, func(msg []byte) {})

	input := json.RawMessage(`{"left":true}`)
	gl.QueueInput(0, 5, input)
	gl.QueueInput(1, 5, json.RawMessage(`{"right":true}`))

	if len(gl.inputBuffer[0]) != 1 {
		t.Errorf("Expected 1 input in slot 0 buffer, got %d", len(gl.inputBuffer[0]))
	}
	if len(gl.inputBuffer[1]) != 1 {
		t.Errorf("Expected 1 input in slot 1 buffer, got %d", len(gl.inputBuffer[1]))
	}
}

func TestGameLoopCheckRoundEnd_Timer(t *testing.T) {
	gs := NewGameState("match-5", "tiger", "p1", "lion", "p2", "ancient_temple")
	gl := NewGameLoop(gs, func(msg []byte) {})
	gl.roundTimer = 0

	if !gl.checkRoundEnd() {
		t.Error("Round should end when timer reaches 0")
	}
}

func TestGameLoopCheckRoundEnd_KO(t *testing.T) {
	gs := NewGameState("match-6", "tiger", "p1", "lion", "p2", "ancient_temple")
	gl := NewGameLoop(gs, func(msg []byte) {})
	gl.roundTimer = GameRoundTime

	gs.Player1.HP = 0
	if !gl.checkRoundEnd() {
		t.Error("Round should end when Player1 HP is 0")
	}

	gs.Player1.HP = 500
	gs.Player2.HP = 0
	if !gl.checkRoundEnd() {
		t.Error("Round should end when Player2 HP is 0")
	}
}

func TestGameLoopCheckRoundEnd_NotOver(t *testing.T) {
	gs := NewGameState("match-7", "tiger", "p1", "lion", "p2", "ancient_temple")
	gl := NewGameLoop(gs, func(msg []byte) {})
	gl.roundTimer = GameRoundTime

	if gl.checkRoundEnd() {
		t.Error("Round should not end when both players have HP and timer remaining")
	}
}

func TestGameLoopHandleRoundEnd(t *testing.T) {
	gs := NewGameState("match-8", "tiger", "p1", "lion", "p2", "ancient_temple")
	var broadcasts [][]byte
	gl := NewGameLoop(gs, func(msg []byte) {
		broadcasts = append(broadcasts, msg)
	})
	gl.running = true
	gs.Round = 1

	// P1 wins (higher HP)
	gs.Player1.HP = 500
	gs.Player2.HP = 0

	gl.handleRoundEnd()

	if len(broadcasts) == 0 {
		t.Fatal("Expected broadcast on round end")
	}

	var msg GameLoopMsg
	json.Unmarshal(broadcasts[0], &msg)
	if msg.Type != "round_end" {
		t.Errorf("Expected 'round_end' message, got '%s'", msg.Type)
	}

	if gs.Round != 2 {
		t.Errorf("Expected round to advance to 2, got %d", gs.Round)
	}
}

func TestGameLoopMatchEnd(t *testing.T) {
	gs := NewGameState("match-9", "tiger", "p1", "lion", "p2", "ancient_temple")
	var broadcasts [][]byte
	gl := NewGameLoop(gs, func(msg []byte) {
		broadcasts = append(broadcasts, msg)
	})
	gl.running = true
	gs.Round = MaxRounds

	gs.Player1.HP = 500
	gs.Player2.HP = 0

	gl.handleRoundEnd()

	if gl.running {
		t.Error("GameLoop should stop running after max rounds")
	}

	// Should have round_end + match_end broadcasts
	if len(broadcasts) < 2 {
		t.Fatalf("Expected at least 2 broadcasts, got %d", len(broadcasts))
	}

	var msg GameLoopMsg
	json.Unmarshal(broadcasts[1], &msg)
	if msg.Type != "match_end" {
		t.Errorf("Expected 'match_end' message, got '%s'", msg.Type)
	}
}

// ============================================================
// Rollback tests
// ============================================================

func TestNewRollbackNetcode(t *testing.T) {
	rn := NewRollbackNetcode()
	if rn == nil {
		t.Fatal("NewRollbackNetcode returned nil")
	}
	if rn.predictions == nil {
		t.Error("predictions map should be initialized")
	}
}

func TestRollbackSaveAndGetSnapshot(t *testing.T) {
	rn := NewRollbackNetcode()
	gs := *NewGameState("match-r1", "tiger", "p1", "lion", "p2", "stage")
	inputs := [2]json.RawMessage{
		json.RawMessage(`{"left":true}`),
		json.RawMessage(`{"right":true}`),
	}

	rn.SaveSnapshot(10, gs, inputs)

	snap := rn.GetSnapshot(10)
	if snap == nil {
		t.Fatal("Expected snapshot at frame 10")
	}
	if snap.Frame != 10 {
		t.Errorf("Expected frame 10, got %d", snap.Frame)
	}
	if snap.Checksum == 0 {
		t.Error("Checksum should not be 0")
	}
}

func TestRollbackGetSnapshotMiss(t *testing.T) {
	rn := NewRollbackNetcode()
	snap := rn.GetSnapshot(999)
	if snap != nil {
		t.Error("Expected nil for non-existent snapshot")
	}
}

func TestRollbackNeedRollback(t *testing.T) {
	rn := NewRollbackNetcode()

	// Store prediction
	predicted := [2]json.RawMessage{
		json.RawMessage(`{"left":true}`),
		json.RawMessage(`{"right":true}`),
	}
	rn.StorePrediction(5, predicted)

	// Same input → no rollback
	if rn.NeedRollback(5, json.RawMessage(`{"left":true}`), 0) {
		t.Error("Should not need rollback when predicted matches actual")
	}

	// Different input → need rollback
	if !rn.NeedRollback(5, json.RawMessage(`{"left":false}`), 0) {
		t.Error("Should need rollback when predicted differs from actual")
	}

	// Frame not predicted → no rollback
	if rn.NeedRollback(99, json.RawMessage(`{}`), 0) {
		t.Error("Should not need rollback for non-predicted frame")
	}
}

func TestRollbackExecute(t *testing.T) {
	rn := NewRollbackNetcode()
	gs := *NewGameState("match-r2", "tiger", "p1", "lion", "p2", "stage")

	// Save snapshots for frames 1-5
	for i := 1; i <= 5; i++ {
		gs.Frame = i
		gs.Player1.HP = 1000 - (i * 10)
		inputs := [2]json.RawMessage{
			json.RawMessage(`{}`),
			json.RawMessage(`{}`),
		}
		rn.SaveSnapshot(i, gs, inputs)
	}

	// Rollback from frame 5 to frame 2
	resimCalls := 0
	result := rn.Rollback(2, 5, func(frame int, state *GameState, inputs [2]json.RawMessage) {
		resimCalls++
		state.Frame = frame
		state.Player1.HP -= 5 // different damage on resim
	})

	if result == nil {
		t.Fatal("Rollback should return state")
	}
	if resimCalls != 3 { // frames 3, 4, 5
		t.Errorf("Expected 3 resimulation calls, got %d", resimCalls)
	}
}

func TestRollbackConfirmFrame(t *testing.T) {
	rn := NewRollbackNetcode()
	rn.ConfirmFrame(42)
	if rn.GetConfirmedFrame() != 42 {
		t.Errorf("Expected confirmed frame 42, got %d", rn.GetConfirmedFrame())
	}
}

func TestRollbackDetectDesync(t *testing.T) {
	rn := NewRollbackNetcode()
	gs := *NewGameState("match-d", "tiger", "p1", "lion", "p2", "stage")
	inputs := [2]json.RawMessage{json.RawMessage(`{}`), json.RawMessage(`{}`)}
	rn.SaveSnapshot(1, gs, inputs)

	snap := rn.GetSnapshot(1)
	// Same checksum → no desync
	if rn.DetectDesync(1, snap.Checksum) {
		t.Error("Should not detect desync with matching checksum")
	}

	// Different checksum → desync
	if !rn.DetectDesync(1, snap.Checksum+1) {
		t.Error("Should detect desync with mismatched checksum")
	}

	// Non-existent frame → no desync (can't compare)
	if rn.DetectDesync(999, 12345) {
		t.Error("Should not detect desync for non-existent frame")
	}
}

func TestRollbackStorePredictionCleanup(t *testing.T) {
	rn := NewRollbackNetcode()

	// Store many predictions
	for i := 0; i < 200; i++ {
		rn.StorePrediction(i, [2]json.RawMessage{json.RawMessage(`{}`), json.RawMessage(`{}`)})
	}

	// Old predictions should be cleaned
	if _, ok := rn.predictions[0]; ok {
		t.Error("Old predictions should be cleaned up")
	}
}

// ============================================================
// AntiCheat tests
// ============================================================

func TestNewAntiCheat(t *testing.T) {
	ac := NewAntiCheat()
	if ac == nil {
		t.Fatal("NewAntiCheat returned nil")
	}
	if ac.maxViolations != 10 {
		t.Errorf("Expected maxViolations 10, got %d", ac.maxViolations)
	}
}

func TestAntiCheatValidInput(t *testing.T) {
	ac := NewAntiCheat()
	validInput := json.RawMessage(`{"left":true,"right":false,"up":false,"down":false,"attack":1,"special":0,"block":false,"ult":false}`)

	ok, v := ac.ValidateInput(0, "player1", 1, validInput)
	if !ok {
		t.Errorf("Valid input rejected: %v", v)
	}
}

func TestAntiCheatInvalidInputJSON(t *testing.T) {
	ac := NewAntiCheat()
	// Wait to avoid rate limit
	time.Sleep(15 * time.Millisecond)

	invalidJSON := json.RawMessage(`{invalid}`)
	ok, v := ac.ValidateInput(0, "player1", 1, invalidJSON)
	if ok {
		t.Error("Invalid JSON should be rejected")
	}
	if v == nil || v.Type != ViolationInvalidInput {
		t.Error("Should return ViolationInvalidInput")
	}
}

func TestAntiCheatInvalidAttackRange(t *testing.T) {
	ac := NewAntiCheat()
	// Wait to avoid rate limit
	time.Sleep(15 * time.Millisecond)

	badAttack := json.RawMessage(`{"left":false,"right":false,"up":false,"down":false,"attack":5,"special":0,"block":false,"ult":false}`)
	ok, v := ac.ValidateInput(0, "player1", 1, badAttack)
	if ok {
		t.Error("Attack value 5 should be rejected")
	}
	if v == nil || v.Type != ViolationInvalidInput {
		t.Error("Should return ViolationInvalidInput for bad attack range")
	}
}

func TestAntiCheatInvalidSpecialRange(t *testing.T) {
	ac := NewAntiCheat()
	time.Sleep(15 * time.Millisecond)

	badSpecial := json.RawMessage(`{"left":false,"right":false,"up":false,"down":false,"attack":0,"special":5,"block":false,"ult":false}`)
	ok, v := ac.ValidateInput(0, "player1", 1, badSpecial)
	if ok {
		t.Error("Special value 5 should be rejected")
	}
	if v == nil || v.Type != ViolationInvalidInput {
		t.Error("Should return ViolationInvalidInput for bad special range")
	}
}

func TestAntiCheatContradictoryInput(t *testing.T) {
	ac := NewAntiCheat()
	time.Sleep(15 * time.Millisecond)

	contra := json.RawMessage(`{"left":true,"right":true,"up":false,"down":false,"attack":0,"special":0,"block":false,"ult":false}`)
	ok, v := ac.ValidateInput(0, "player1", 1, contra)
	if ok {
		t.Error("Contradictory left+right should be rejected")
	}
	if v == nil || v.Type != ViolationInvalidInput {
		t.Error("Should return ViolationInvalidInput for contradictory input")
	}
}

func TestAntiCheatShouldKick(t *testing.T) {
	ac := NewAntiCheat()

	// Below threshold
	if ac.ShouldKick("player1") {
		t.Error("Should not kick player with 0 violations")
	}

	// Add violations
	for i := 0; i < 10; i++ {
		ac.violations = append(ac.violations, Violation{
			Type:     ViolationInvalidInput,
			PlayerID: "player1",
			Frame:    i,
		})
	}

	if !ac.ShouldKick("player1") {
		t.Error("Should kick player with 10 violations")
	}

	// Different player should not be kicked
	if ac.ShouldKick("player2") {
		t.Error("Should not kick player2 with 0 violations")
	}
}

func TestAntiCheatGetViolations(t *testing.T) {
	ac := NewAntiCheat()
	ac.violations = []Violation{
		{Type: ViolationInvalidInput, PlayerID: "p1", Frame: 1},
		{Type: ViolationInvalidInput, PlayerID: "p2", Frame: 2},
		{Type: ViolationTooFast, PlayerID: "p1", Frame: 3},
	}

	p1v := ac.GetViolations("p1")
	if len(p1v) != 2 {
		t.Errorf("Expected 2 violations for p1, got %d", len(p1v))
	}

	p2v := ac.GetViolations("p2")
	if len(p2v) != 1 {
		t.Errorf("Expected 1 violation for p2, got %d", len(p2v))
	}

	p3v := ac.GetViolations("p3")
	if len(p3v) != 0 {
		t.Errorf("Expected 0 violations for p3, got %d", len(p3v))
	}
}

// ============================================================
// Replay tests
// ============================================================

func TestNewReplayRecorder(t *testing.T) {
	rr := NewReplayRecorder("match-rp1", "p1", "p2", "tiger", "lion", "stage")
	if rr == nil {
		t.Fatal("NewReplayRecorder returned nil")
	}
	if !rr.enabled {
		t.Error("ReplayRecorder should start enabled")
	}
	if rr.replay.MatchID != "match-rp1" {
		t.Errorf("Expected match ID 'match-rp1', got '%s'", rr.replay.MatchID)
	}
	if rr.replay.Player1 != "p1" || rr.replay.Player2 != "p2" {
		t.Error("Player IDs not set correctly")
	}
	if rr.replay.Character1 != "tiger" || rr.replay.Character2 != "lion" {
		t.Error("Character IDs not set correctly")
	}
	if rr.replay.Version != 1 {
		t.Errorf("Expected version 1, got %d", rr.replay.Version)
	}
}

func TestReplayRecordFrame(t *testing.T) {
	rr := NewReplayRecorder("match-rp2", "p1", "p2", "tiger", "lion", "stage")

	inputs := [2]json.RawMessage{
		json.RawMessage(`{"left":true}`),
		json.RawMessage(`{"right":true}`),
	}
	rr.RecordFrame(1, inputs)
	rr.RecordFrame(2, inputs)
	rr.RecordFrame(3, inputs)

	if len(rr.replay.Frames) != 3 {
		t.Errorf("Expected 3 frames, got %d", len(rr.replay.Frames))
	}
	if rr.replay.Frames[0].Frame != 1 {
		t.Errorf("Expected frame 1, got %d", rr.replay.Frames[0].Frame)
	}
}

func TestReplayRecordFrameDisabled(t *testing.T) {
	rr := NewReplayRecorder("match-rp3", "p1", "p2", "tiger", "lion", "stage")
	rr.enabled = false

	inputs := [2]json.RawMessage{json.RawMessage(`{}`), json.RawMessage(`{}`)}
	rr.RecordFrame(1, inputs)

	if len(rr.replay.Frames) != 0 {
		t.Error("Should not record frames when disabled")
	}
}

func TestReplayRecordEvent(t *testing.T) {
	rr := NewReplayRecorder("match-rp4", "p1", "p2", "tiger", "lion", "stage")

	inputs := [2]json.RawMessage{json.RawMessage(`{}`), json.RawMessage(`{}`)}
	rr.RecordFrame(1, inputs)
	rr.RecordEvent(1, "hit", map[string]int{"damage": 50})

	if len(rr.replay.Frames[0].Events) != 1 {
		t.Fatal("Expected 1 event on frame 1")
	}
	if rr.replay.Frames[0].Events[0].Type != "hit" {
		t.Errorf("Expected event type 'hit', got '%s'", rr.replay.Frames[0].Events[0].Type)
	}
}

func TestReplayRecordEventNoFrames(t *testing.T) {
	rr := NewReplayRecorder("match-rp5", "p1", "p2", "tiger", "lion", "stage")

	// Record event without any frames → should not panic
	rr.RecordEvent(1, "hit", nil)
	// No assertion needed - just checking it doesn't panic
}

func TestReplaySetResult(t *testing.T) {
	rr := NewReplayRecorder("match-rp6", "p1", "p2", "tiger", "lion", "stage")

	result := MatchResult{
		Winner: 0,
		Scores: [2]int{2, 1},
		Rounds: []RoundResultData{
			{Round: 1, Winner: 0, P1HP: 500, P2HP: 0, FinishType: "ko", Duration: 3600},
		},
	}
	rr.SetResult(result)

	if rr.replay.Result.Winner != 0 {
		t.Errorf("Expected winner 0, got %d", rr.replay.Result.Winner)
	}
	if rr.replay.Result.Scores[0] != 2 {
		t.Errorf("Expected score[0] = 2, got %d", rr.replay.Result.Scores[0])
	}
}

func TestReplayFinalize(t *testing.T) {
	rr := NewReplayRecorder("match-rp7", "p1", "p2", "tiger", "lion", "stage")

	inputs := [2]json.RawMessage{json.RawMessage(`{}`), json.RawMessage(`{}`)}
	rr.RecordFrame(1, inputs)

	replay := rr.Finalize()
	if replay == nil {
		t.Fatal("Finalize should return replay")
	}
	if rr.enabled {
		t.Error("Recorder should be disabled after finalize")
	}
	if replay.MatchID != "match-rp7" {
		t.Errorf("Replay match ID mismatch")
	}
}

func TestReplayToJSON(t *testing.T) {
	rr := NewReplayRecorder("match-rp8", "p1", "p2", "tiger", "lion", "stage")

	inputs := [2]json.RawMessage{json.RawMessage(`{}`), json.RawMessage(`{}`)}
	rr.RecordFrame(1, inputs)

	data, err := rr.ToJSON()
	if err != nil {
		t.Fatalf("ToJSON failed: %v", err)
	}
	if len(data) == 0 {
		t.Error("JSON output should not be empty")
	}

	// Verify it's valid JSON
	var replay Replay
	if err := json.Unmarshal(data, &replay); err != nil {
		t.Fatalf("JSON output is not valid: %v", err)
	}
}

// ============================================================
// Training/Practice tests
// ============================================================

func TestNewTrainingDummy(t *testing.T) {
	tests := []struct {
		level       AILevel
		blockChance float64
		attackRate  float64
	}{
		{AIEasy, 0.1, 0.02},
		{AIMedium, 0.3, 0.05},
		{AIHard, 0.6, 0.1},
	}

	for _, tt := range tests {
		td := NewTrainingDummy(tt.level)
		if td.blockChance != tt.blockChance {
			t.Errorf("Level %d: expected blockChance %f, got %f", tt.level, tt.blockChance, td.blockChance)
		}
		if td.attackRate != tt.attackRate {
			t.Errorf("Level %d: expected attackRate %f, got %f", tt.level, tt.attackRate, td.attackRate)
		}
	}
}

func TestTrainingDummyGenerateInput(t *testing.T) {
	td := NewTrainingDummy(AIMedium)
	for i := 0; i < 100; i++ {
		input := td.GenerateInput(nil)
		if input == nil {
			t.Fatal("GenerateInput returned nil")
		}

		// Verify it's valid ClientInput JSON
		var ci ClientInput
		if err := json.Unmarshal(input, &ci); err != nil {
			t.Fatalf("GenerateInput produced invalid JSON: %v", err)
		}

		// Verify attack range
		if ci.Attack < 0 || ci.Attack > 3 {
			t.Errorf("Attack value out of range: %d", ci.Attack)
		}
		if ci.Special < 0 || ci.Special > 4 {
			t.Errorf("Special value out of range: %d", ci.Special)
		}
	}
}

func TestPracticeMode(t *testing.T) {
	gs := NewGameState("practice-1", "tiger", "p1", "lion", "ai", "stage")
	pm := NewPracticeMode(AIMedium, gs, func(msg []byte) {})

	if pm.TurnsRemaining() != 5 {
		t.Errorf("Expected 5 turns remaining, got %d", pm.TurnsRemaining())
	}

	started := pm.Start()
	if !started {
		t.Error("First practice should start successfully")
	}
	if pm.TurnsRemaining() != 4 {
		t.Errorf("Expected 4 turns remaining after start, got %d", pm.TurnsRemaining())
	}

	pm.Stop()
}

func TestPracticeModeTurnsExhausted(t *testing.T) {
	gs := NewGameState("practice-2", "tiger", "p1", "lion", "ai", "stage")
	pm := NewPracticeMode(AIEasy, gs, func(msg []byte) {})

	// Use all turns
	for i := 0; i < 5; i++ {
		pm.Start()
		pm.Stop()
		// Recreate game loop since Stop closes done channel
		pm.gameLoop = NewGameLoop(gs, func(msg []byte) {})
	}

	if pm.TurnsRemaining() != 0 {
		t.Errorf("Expected 0 turns remaining, got %d", pm.TurnsRemaining())
	}

	started := pm.Start()
	if started {
		t.Error("Should not start when turns exhausted")
	}
}

// ============================================================
// GameState tests
// ============================================================

func TestNewGameState(t *testing.T) {
	gs := NewGameState("m1", "tiger", "p1", "lion", "p2", "ancient_temple")

	if gs.MatchID != "m1" {
		t.Errorf("Expected MatchID 'm1', got '%s'", gs.MatchID)
	}
	if gs.Player1.CharacterID != "tiger" {
		t.Errorf("Expected P1 character 'tiger', got '%s'", gs.Player1.CharacterID)
	}
	if gs.Player2.CharacterID != "lion" {
		t.Errorf("Expected P2 character 'lion', got '%s'", gs.Player2.CharacterID)
	}
	if gs.Player1.HP != 1000 || gs.Player2.HP != 1000 {
		t.Error("Both players should start with 1000 HP")
	}
	if gs.Round != 1 {
		t.Errorf("Expected round 1, got %d", gs.Round)
	}
	if gs.Status != StatusWaiting {
		t.Errorf("Expected status 'waiting', got '%s'", gs.Status)
	}
	if gs.Player1.Facing != "right" {
		t.Error("Player1 should face right")
	}
	if gs.Player2.Facing != "left" {
		t.Error("Player2 should face left")
	}
}

// ============================================================
// Combat tests
// ============================================================

func TestCalculateDamage(t *testing.T) {
	attacker := &FighterState{
		CharacterID: "tiger",
		HP:          1000, MaxHP: 1000,
		State: ActionAttacking,
	}
	defender := &FighterState{
		CharacterID: "lion",
		HP:          1000, MaxHP: 1000,
		State: ActionIdle,
	}

	skill := &SkillDef{
		ID: "light_attack", Damage: 50,
		Startup: 5, Active: 3, Recovery: 8,
	}

	atkStats := &CharacterStats{HP: 20, ATK: 22, SPD: 22, DEF: 16, Special: 20}
	defStats := &CharacterStats{HP: 22, ATK: 20, SPD: 18, DEF: 22, Special: 18}

	result := CalculateDamage(attacker, defender, skill, atkStats, defStats)

	if result.FinalDamage < 1 {
		t.Error("Damage should be at least 1")
	}
	if result.RawDamage <= 0 {
		t.Error("Raw damage should be positive")
	}
	if result.HitStun <= 0 {
		t.Error("Hit stun should be positive")
	}
	if result.Knockback <= 0 {
		t.Error("Knockback should be positive")
	}
	if result.UltGainAtk <= 0 || result.UltGainDef <= 0 {
		t.Error("Ultimate gauge gain should be positive")
	}
}

func TestCalculateDamageBlocked(t *testing.T) {
	attacker := &FighterState{State: ActionAttacking, HP: 1000, MaxHP: 1000}
	defender := &FighterState{State: ActionBlocking, HP: 1000, MaxHP: 1000}

	skill := &SkillDef{Damage: 100, Active: 3}
	atkStats := &CharacterStats{ATK: 20}
	defStats := &CharacterStats{DEF: 10}

	result := CalculateDamage(attacker, defender, skill, atkStats, defStats)

	if !result.IsBlocked {
		t.Error("Should be flagged as blocked")
	}
}

func TestApplyDamage(t *testing.T) {
	gs := NewGameState("dmg-1", "tiger", "p1", "lion", "p2", "stage")
	initialHP := gs.Player1.HP

	result := DamageResult{
		FinalDamage: 100,
		Knockback:   50,
		HitStun:     5,
		UltGainAtk:  8,
		UltGainDef:  12,
	}

	ApplyDamage(gs, true, result) // target is P1

	if gs.Player1.HP != initialHP-100 {
		t.Errorf("Expected HP %d, got %d", initialHP-100, gs.Player1.HP)
	}
	if gs.Player2.ComboCount != 1 {
		t.Error("Attacker combo count should increment")
	}
	if gs.Player2.UltGauge == 0 {
		t.Error("Attacker ult gauge should increase")
	}
}

func TestCheckKO(t *testing.T) {
	gs := NewGameState("ko-1", "tiger", "p1", "lion", "p2", "stage")

	// No KO
	ko, _ := CheckKO(gs)
	if ko {
		t.Error("Should not be KO with full HP")
	}

	// P1 KO
	gs.Player1.HP = 0
	ko, winner := CheckKO(gs)
	if !ko {
		t.Error("Should detect KO")
	}
	if winner != "p2" {
		t.Errorf("Expected winner 'p2', got '%s'", winner)
	}
}

func TestCheckTimeout(t *testing.T) {
	gs := NewGameState("to-1", "tiger", "p1", "lion", "p2", "stage")

	gs.Player1.HP = 500
	gs.Player2.HP = 300
	winner := CheckTimeout(gs)
	if winner != "p1" {
		t.Errorf("Expected 'p1' wins timeout, got '%s'", winner)
	}

	gs.Player1.HP = 300
	gs.Player2.HP = 500
	winner = CheckTimeout(gs)
	if winner != "p2" {
		t.Errorf("Expected 'p2' wins timeout, got '%s'", winner)
	}

	gs.Player1.HP = 500
	gs.Player2.HP = 500
	winner = CheckTimeout(gs)
	if winner != "" {
		t.Errorf("Expected draw (empty string), got '%s'", winner)
	}
}

// ============================================================
// Character Registry tests
// ============================================================

func TestCharacterRegistry(t *testing.T) {
	reg := NewCharacterRegistry()

	tiger := &CharacterConfig{
		ID:   "tiger",
		Name: "Rajah",
		Stats: CharacterStats{HP: 20, ATK: 22, SPD: 22, DEF: 16, Special: 20},
	}

	reg.Register(tiger)

	// Get existing
	got, ok := reg.Get("tiger")
	if !ok {
		t.Fatal("Expected to find tiger")
	}
	if got.Name != "Rajah" {
		t.Errorf("Expected name 'Rajah', got '%s'", got.Name)
	}

	// Get non-existing
	_, ok = reg.Get("dragon")
	if ok {
		t.Error("Should not find dragon")
	}

	// GetAll
	all := reg.GetAll()
	if len(all) != 1 {
		t.Errorf("Expected 1 character, got %d", len(all))
	}
}

func TestCharacterRegistryLoadFromDir(t *testing.T) {
	reg := NewCharacterRegistry()
	err := reg.LoadFromDir("../characters/configs")
	if err != nil {
		t.Fatalf("LoadFromDir failed: %v", err)
	}

	all := reg.GetAll()
	if len(all) == 0 {
		t.Error("Should load at least one character from configs dir")
	}

	// Verify specific characters
	tiger, ok := reg.Get("tiger")
	if !ok {
		t.Error("Expected to find tiger character")
	} else {
		if tiger.Name == "" {
			t.Error("Tiger should have a name")
		}
		// Verify stats sum to ~100
		sum := tiger.Stats.HP + tiger.Stats.ATK + tiger.Stats.SPD + tiger.Stats.DEF + tiger.Stats.Special
		if sum < 90 || sum > 110 {
			t.Errorf("Tiger stats sum should be ~100, got %d", sum)
		}
	}
}

// ============================================================
// Supply Drop tests
// ============================================================

func TestSpawnSchedule(t *testing.T) {
	s := NewSpawnSchedule()
	if s.nextSpawn != 600 {
		t.Errorf("Expected first spawn at frame 600, got %d", s.nextSpawn)
	}

	// Too early
	drop := s.CheckSpawn(100)
	if drop != nil {
		t.Error("Should not spawn before scheduled time")
	}

	// At spawn time
	drop = s.CheckSpawn(600)
	if drop == nil {
		t.Fatal("Should spawn at frame 600")
	}
	if drop.Claimed {
		t.Error("New drop should not be claimed")
	}
	if drop.Position.X < 300 || drop.Position.X > 980 {
		t.Errorf("Drop position out of expected range: %f", drop.Position.X)
	}

	// Next spawn should be scheduled further ahead
	if s.nextSpawn <= 600 {
		t.Error("Next spawn should be after current frame")
	}
}

func TestClaimDrop(t *testing.T) {
	fighter := &FighterState{
		HP: 800, MaxHP: 1000,
		UltGauge: 50,
	}

	drop := &SupplyDrop{
		ID: "test", ItemID: "heal_small", Claimed: false,
	}

	ClaimDrop(drop, fighter)

	if !drop.Claimed {
		t.Error("Drop should be claimed")
	}
	if fighter.HP != 850 { // +50 heal
		t.Errorf("Expected HP 850 after heal, got %d", fighter.HP)
	}

	// Claiming again should do nothing
	fighter.HP = 800
	ClaimDrop(drop, fighter)
	if fighter.HP != 800 {
		t.Error("Already claimed drop should not apply again")
	}
}

func TestClaimDropHealCapped(t *testing.T) {
	fighter := &FighterState{
		HP: 980, MaxHP: 1000,
	}
	drop := &SupplyDrop{ItemID: "heal_small"}
	ClaimDrop(drop, fighter)

	if fighter.HP > fighter.MaxHP {
		t.Error("HP should be capped at MaxHP")
	}
}

func TestClaimDropUltCharge(t *testing.T) {
	fighter := &FighterState{
		HP: 1000, MaxHP: 1000,
		UltGauge: 80,
	}
	drop := &SupplyDrop{ItemID: "ult_charge"}
	ClaimDrop(drop, fighter)

	if fighter.UltGauge != 100 { // 80 + 30 = 110 → capped at 100
		t.Errorf("Expected ult gauge 100, got %f", fighter.UltGauge)
	}
}

func TestClaimDropBuff(t *testing.T) {
	fighter := &FighterState{
		HP: 1000, MaxHP: 1000,
	}
	drop := &SupplyDrop{ItemID: "damage_boost"}
	ClaimDrop(drop, fighter)

	if len(fighter.ActiveBuffs) != 1 {
		t.Fatal("Expected 1 active buff")
	}
	if fighter.ActiveBuffs[0].Type != "damage_boost" {
		t.Error("Expected damage_boost buff")
	}
}

// ============================================================
// InputBuffer / Netcode tests
// ============================================================

func TestInputBuffer(t *testing.T) {
	ib := NewInputBuffer()

	input := json.RawMessage(`{"left":true}`)
	ib.Push(0, input)
	ib.Push(0, json.RawMessage(`{"right":true}`))

	got := ib.Get(0, 0)
	if got == nil {
		t.Error("Expected input from buffer")
	}
}

func TestInputBufferDelay(t *testing.T) {
	ib := NewInputBuffer()
	ib.SetDelay(0, 2)

	for i := 0; i < 5; i++ {
		ib.Push(0, json.RawMessage(`{}`))
	}

	// With delay 2, reading frame 3 should give frame 1 input
	got := ib.Get(0, 3)
	if got == nil {
		t.Error("Expected delayed input")
	}
}

func TestInputBufferMaxDelay(t *testing.T) {
	ib := NewInputBuffer()
	ib.SetDelay(0, 100) // exceeds max

	// Should be clamped to MaxInputDelay
	if ib.delays[0] != MaxInputDelay {
		t.Errorf("Expected delay clamped to %d, got %d", MaxInputDelay, ib.delays[0])
	}
}

func TestLagCompensation(t *testing.T) {
	lc := NewLagCompensation()

	lc.RecordPing(0, 30*time.Millisecond)
	lc.RecordPing(0, 40*time.Millisecond)
	lc.RecordPing(0, 50*time.Millisecond)

	avg := lc.GetLatency(0)
	if avg != 40*time.Millisecond {
		t.Errorf("Expected avg latency 40ms, got %v", avg)
	}

	delay := lc.GetInputDelay(0)
	if delay < 0 || delay > MaxInputDelay {
		t.Errorf("Input delay out of range: %d", delay)
	}
}

func TestLagCompensationSuggestRollback(t *testing.T) {
	lc := NewLagCompensation()

	// No pings → 0 latency → 1 frame
	frames := lc.SuggestRollbackFrames()
	if frames < 0 || frames > MaxRollbackFrames {
		t.Errorf("Rollback frames out of range: %d", frames)
	}

	// High latency
	for i := 0; i < 10; i++ {
		lc.RecordPing(0, 200*time.Millisecond)
		lc.RecordPing(1, 100*time.Millisecond)
	}

	frames = lc.SuggestRollbackFrames()
	if frames > MaxRollbackFrames {
		t.Errorf("Rollback frames should be capped at %d, got %d", MaxRollbackFrames, frames)
	}
}

// ============================================================
// AI Controller tests
// ============================================================

func TestNewAIController(t *testing.T) {
	ai := NewAIController("ai", "lion", AIDifficultyHard)

	if ai.PlayerID != "ai" {
		t.Errorf("Expected PlayerID 'ai', got '%s'", ai.PlayerID)
	}
	if ai.Difficulty != AIDifficultyHard {
		t.Errorf("Expected Hard difficulty")
	}
	if ai.reactionDelay != 6 {
		t.Errorf("Expected reaction delay 6, got %d", ai.reactionDelay)
	}
}

func TestAIControllerThink(t *testing.T) {
	ai := NewAIController("ai", "lion", AIDifficultyMedium)
	gs := NewGameState("ai-test", "tiger", "p1", "lion", "ai", "stage")

	for i := 0; i < 100; i++ {
		gs.Frame = i
		input := ai.Think(gs)
		if input == nil {
			t.Fatalf("AI returned nil input at frame %d", i)
		}
		if input.PlayerID != "ai" {
			t.Error("AI input should have AI player ID")
		}
		if len(input.Inputs) == 0 {
			t.Error("AI should produce at least one input")
		}

		// Verify all inputs are valid
		for _, inp := range input.Inputs {
			if !ValidInputTypes[inp] {
				t.Errorf("AI produced invalid input type: %s", inp)
			}
		}
	}
}

// ============================================================
// Input validation tests
// ============================================================

func TestValidInputTypes(t *testing.T) {
	expected := []InputType{
		InputNone, InputMoveLeft, InputMoveRight, InputJump, InputCrouch,
		InputAttack, InputSpecial1, InputSpecial2, InputSpecial3, InputSpecial4,
		InputUltimate, InputBlock, InputDash,
	}

	for _, it := range expected {
		if !ValidInputTypes[it] {
			t.Errorf("Input type '%s' should be valid", it)
		}
	}

	if ValidInputTypes["invalid_type"] {
		t.Error("Invalid input type should not be in valid set")
	}
}

// ============================================================
// mustMarshal helper test
// ============================================================

func TestMustMarshal(t *testing.T) {
	data := mustMarshal(map[string]int{"a": 1})
	if data == nil {
		t.Error("mustMarshal returned nil")
	}

	var m map[string]int
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatalf("mustMarshal produced invalid JSON: %v", err)
	}
	if m["a"] != 1 {
		t.Error("mustMarshal data mismatch")
	}
}
