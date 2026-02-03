package ws

import (
	"testing"
	"time"
)

// ============================================================
// RoomManager tests
// ============================================================

func TestNewRoomManager(t *testing.T) {
	rm := NewRoomManager()
	if rm == nil {
		t.Fatal("NewRoomManager returned nil")
	}
	if rm.rooms == nil {
		t.Error("rooms map should be initialized")
	}
}

func TestRoomManagerCreateRoom(t *testing.T) {
	rm := NewRoomManager()

	room := rm.CreateRoom("room-1")
	if room == nil {
		t.Fatal("CreateRoom returned nil")
	}
	if room.ID != "room-1" {
		t.Errorf("Expected room ID 'room-1', got '%s'", room.ID)
	}
	if room.State != RoomWaiting {
		t.Errorf("Expected state RoomWaiting, got %d", room.State)
	}
	if room.done == nil {
		t.Error("done channel should be initialized")
	}
	if room.inputs == nil {
		t.Error("inputs channel should be initialized")
	}
	if room.Created.IsZero() {
		t.Error("Created time should be set")
	}
}

func TestRoomManagerGetRoom(t *testing.T) {
	rm := NewRoomManager()

	rm.CreateRoom("room-2")

	// Exists
	room := rm.GetRoom("room-2")
	if room == nil {
		t.Fatal("Expected to find room-2")
	}
	if room.ID != "room-2" {
		t.Error("Room ID mismatch")
	}

	// Doesn't exist
	room = rm.GetRoom("nonexistent")
	if room != nil {
		t.Error("Expected nil for non-existent room")
	}
}

func TestRoomManagerRemoveRoom(t *testing.T) {
	rm := NewRoomManager()

	rm.CreateRoom("room-3")
	rm.RemoveRoom("room-3")

	room := rm.GetRoom("room-3")
	if room != nil {
		t.Error("Room should be removed")
	}

	// Removing non-existent room should not panic
	rm.RemoveRoom("nonexistent")
}

func TestRoomManagerMultipleRooms(t *testing.T) {
	rm := NewRoomManager()

	rm.CreateRoom("room-a")
	rm.CreateRoom("room-b")
	rm.CreateRoom("room-c")

	if rm.GetRoom("room-a") == nil || rm.GetRoom("room-b") == nil || rm.GetRoom("room-c") == nil {
		t.Error("All three rooms should exist")
	}

	rm.RemoveRoom("room-b")
	if rm.GetRoom("room-b") != nil {
		t.Error("room-b should be removed")
	}
	if rm.GetRoom("room-a") == nil || rm.GetRoom("room-c") == nil {
		t.Error("Other rooms should still exist")
	}
}

// ============================================================
// Room tests (without real websocket connections)
// ============================================================

func TestRoomAddPlayerSlots(t *testing.T) {
	rm := NewRoomManager()
	room := rm.CreateRoom("room-slots")

	// Add first player (nil conn for testing - just testing slot logic)
	slot0 := room.AddPlayer(nil, "player-1")
	if slot0 != 0 {
		t.Errorf("First player should get slot 0, got %d", slot0)
	}

	// Add second player
	slot1 := room.AddPlayer(nil, "player-2")
	if slot1 != 1 {
		t.Errorf("Second player should get slot 1, got %d", slot1)
	}

	// Room full - third player rejected
	slot2 := room.AddPlayer(nil, "player-3")
	if slot2 != -1 {
		t.Errorf("Third player should be rejected (-1), got %d", slot2)
	}
}

func TestRoomIsFull(t *testing.T) {
	rm := NewRoomManager()
	room := rm.CreateRoom("room-full")

	if room.IsFull() {
		t.Error("Room should not be full with no players")
	}

	room.AddPlayer(nil, "player-1")
	if room.IsFull() {
		t.Error("Room should not be full with one player")
	}

	room.AddPlayer(nil, "player-2")
	if !room.IsFull() {
		t.Error("Room should be full with two players")
	}
}

func TestRoomPlayerConn(t *testing.T) {
	rm := NewRoomManager()
	room := rm.CreateRoom("room-pc")

	room.AddPlayer(nil, "player-1")

	room.mu.RLock()
	p := room.Players[0]
	room.mu.RUnlock()

	if p == nil {
		t.Fatal("Player 0 should not be nil")
	}
	if p.PlayerID != "player-1" {
		t.Errorf("Expected player ID 'player-1', got '%s'", p.PlayerID)
	}
	if p.Slot != 0 {
		t.Errorf("Expected slot 0, got %d", p.Slot)
	}
	if p.Ready {
		t.Error("Player should not be ready initially")
	}
}

func TestRoomAddSpectator(t *testing.T) {
	rm := NewRoomManager()
	room := rm.CreateRoom("room-spec")

	room.AddSpectator(nil) // nil conn for testing
	room.AddSpectator(nil)

	room.mu.RLock()
	count := len(room.Spectators)
	room.mu.RUnlock()

	if count != 2 {
		t.Errorf("Expected 2 spectators, got %d", count)
	}
}

func TestRoomUpdateLatency(t *testing.T) {
	rm := NewRoomManager()
	room := rm.CreateRoom("room-lat")

	room.AddPlayer(nil, "player-1")

	latency := 50 * time.Millisecond
	room.UpdateLatency(0, latency)

	room.mu.RLock()
	p := room.Players[0]
	room.mu.RUnlock()

	if p.Latency != latency {
		t.Errorf("Expected latency %v, got %v", latency, p.Latency)
	}
	if p.LastPing.IsZero() {
		t.Error("LastPing should be updated")
	}
}

func TestRoomUpdateLatencyEmptySlot(t *testing.T) {
	rm := NewRoomManager()
	room := rm.CreateRoom("room-lat2")

	// Updating latency on empty slot should not panic
	room.UpdateLatency(0, 50*time.Millisecond)
	room.UpdateLatency(1, 50*time.Millisecond)
}

func TestRoomBroadcastNoPlayers(t *testing.T) {
	rm := NewRoomManager()
	room := rm.CreateRoom("room-bc")

	// Should not panic with no players
	room.Broadcast([]byte(`{"type":"test"}`))
}

func TestRoomSendToEmptySlot(t *testing.T) {
	rm := NewRoomManager()
	room := rm.CreateRoom("room-st")

	// Should not panic when slot is empty
	room.SendTo(0, []byte(`test`))
	room.SendTo(1, []byte(`test`))
}

// ============================================================
// Room state constants
// ============================================================

func TestRoomStateConstants(t *testing.T) {
	if RoomWaiting != 0 {
		t.Errorf("Expected RoomWaiting=0, got %d", RoomWaiting)
	}
	if RoomCountdown != 1 {
		t.Errorf("Expected RoomCountdown=1, got %d", RoomCountdown)
	}
	if RoomPlaying != 2 {
		t.Errorf("Expected RoomPlaying=2, got %d", RoomPlaying)
	}
	if RoomFinished != 3 {
		t.Errorf("Expected RoomFinished=3, got %d", RoomFinished)
	}
}

// ============================================================
// PlayerInput struct
// ============================================================

func TestPlayerInputChannel(t *testing.T) {
	rm := NewRoomManager()
	room := rm.CreateRoom("room-input")

	// Send input through channel
	go func() {
		room.inputs <- PlayerInput{Slot: 0, Frame: 1, Input: []byte(`{}`)}
	}()

	select {
	case pi := <-room.inputs:
		if pi.Slot != 0 {
			t.Errorf("Expected slot 0, got %d", pi.Slot)
		}
		if pi.Frame != 1 {
			t.Errorf("Expected frame 1, got %d", pi.Frame)
		}
	case <-time.After(100 * time.Millisecond):
		t.Fatal("Timeout waiting for input")
	}
}

// ============================================================
// Concurrency tests
// ============================================================

func TestRoomManagerConcurrency(t *testing.T) {
	rm := NewRoomManager()

	// Concurrent room creation and access
	done := make(chan struct{})
	for i := 0; i < 50; i++ {
		go func(id int) {
			defer func() { done <- struct{}{} }()
			roomID := "room-" + string(rune('a'+id%26))
			rm.CreateRoom(roomID)
			rm.GetRoom(roomID)
		}(i)
	}

	for i := 0; i < 50; i++ {
		<-done
	}
}

func TestRoomConcurrentAddPlayer(t *testing.T) {
	rm := NewRoomManager()
	room := rm.CreateRoom("room-conc")

	done := make(chan int, 10)
	for i := 0; i < 10; i++ {
		go func(id int) {
			slot := room.AddPlayer(nil, "player-"+string(rune('a'+id)))
			done <- slot
		}(i)
	}

	var slots []int
	for i := 0; i < 10; i++ {
		slots = append(slots, <-done)
	}

	// Only 2 should succeed (slots 0 and 1)
	successCount := 0
	for _, s := range slots {
		if s >= 0 {
			successCount++
		}
	}

	if successCount != 2 {
		t.Errorf("Expected exactly 2 successful adds, got %d", successCount)
	}
}
