package ws

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

// ============================================================
// WebSocket Connection / Disconnection
// ============================================================

func TestWebSocket_ConnectAndDisconnect(t *testing.T) {
	// Create a test WebSocket server (echo)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer conn.Close()
		for {
			mt, msg, err := conn.ReadMessage()
			if err != nil {
				break
			}
			conn.WriteMessage(mt, msg)
		}
	}))
	defer server.Close()

	// Connect
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")
	ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Failed to connect: %v", err)
	}

	// Send a message
	err = ws.WriteMessage(websocket.TextMessage, []byte(`{"type":"ping"}`))
	if err != nil {
		t.Fatalf("Failed to write: %v", err)
	}

	// Read echo
	_, msg, err := ws.ReadMessage()
	if err != nil {
		t.Fatalf("Failed to read: %v", err)
	}
	if string(msg) != `{"type":"ping"}` {
		t.Errorf("Expected echo, got %s", msg)
	}

	// Close cleanly
	ws.WriteMessage(websocket.CloseMessage,
		websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
	ws.Close()
}

func TestWebSocket_MultipleClients(t *testing.T) {
	// Track connected clients
	connected := make(chan struct{}, 10)
	disconnected := make(chan struct{}, 10)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		connected <- struct{}{}
		defer func() {
			disconnected <- struct{}{}
			conn.Close()
		}()
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				break
			}
		}
	}))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	// Connect 3 clients
	var clients []*websocket.Conn
	for i := 0; i < 3; i++ {
		ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
		if err != nil {
			t.Fatalf("Client %d failed to connect: %v", i, err)
		}
		clients = append(clients, ws)
	}

	// Wait for all connections
	for i := 0; i < 3; i++ {
		select {
		case <-connected:
		case <-time.After(time.Second):
			t.Fatal("Timeout waiting for connections")
		}
	}

	// Disconnect all
	for _, ws := range clients {
		ws.Close()
	}

	// Wait for disconnects
	for i := 0; i < 3; i++ {
		select {
		case <-disconnected:
		case <-time.After(time.Second):
			t.Fatal("Timeout waiting for disconnections")
		}
	}
}

// ============================================================
// Room Creation via WebSocket
// ============================================================

func TestWebSocket_RoomCreationAndJoin(t *testing.T) {
	rm := NewRoomManager()

	// Create room
	room := rm.CreateRoom("ws-room-1")
	if room == nil {
		t.Fatal("Failed to create room")
	}

	// Simulate WebSocket server with room logic
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer conn.Close()

		// Get player ID from query
		playerID := r.URL.Query().Get("player")
		roomID := r.URL.Query().Get("room")

		r2 := rm.GetRoom(roomID)
		if r2 == nil {
			conn.WriteMessage(websocket.TextMessage, []byte(`{"error":"room not found"}`))
			return
		}

		slot := r2.AddPlayer(conn, playerID)
		joinMsg, _ := json.Marshal(map[string]interface{}{
			"type": "joined",
			"slot": slot,
			"room": roomID,
		})
		conn.WriteMessage(websocket.TextMessage, joinMsg)

		// Read loop
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				break
			}
		}
	}))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	// Player 1 joins
	ws1, _, err := websocket.DefaultDialer.Dial(wsURL+"?player=p1&room=ws-room-1", nil)
	if err != nil {
		t.Fatalf("P1 connect failed: %v", err)
	}
	defer ws1.Close()

	_, msg1, _ := ws1.ReadMessage()
	var join1 map[string]interface{}
	json.Unmarshal(msg1, &join1)
	if join1["slot"].(float64) != 0 {
		t.Errorf("P1 should get slot 0, got %v", join1["slot"])
	}

	// Player 2 joins
	ws2, _, err := websocket.DefaultDialer.Dial(wsURL+"?player=p2&room=ws-room-1", nil)
	if err != nil {
		t.Fatalf("P2 connect failed: %v", err)
	}
	defer ws2.Close()

	_, msg2, _ := ws2.ReadMessage()
	var join2 map[string]interface{}
	json.Unmarshal(msg2, &join2)
	if join2["slot"].(float64) != 1 {
		t.Errorf("P2 should get slot 1, got %v", join2["slot"])
	}

	// Room should be full
	if !room.IsFull() {
		t.Error("Room should be full with 2 players")
	}
}

// ============================================================
// Game Loop Message Flow
// ============================================================

func TestWebSocket_GameLoopMessageFlow(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer conn.Close()

		// Simulate sending game state frames
		for i := 0; i < 5; i++ {
			frame := map[string]interface{}{
				"type": "frame",
				"data": map[string]interface{}{
					"frame":     i,
					"timestamp": time.Now().UnixMilli(),
				},
			}
			msg, _ := json.Marshal(frame)
			if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
			time.Sleep(16 * time.Millisecond) // ~60fps
		}

		// Send round_end
		roundEnd, _ := json.Marshal(map[string]interface{}{
			"type": "round_end",
			"data": map[string]interface{}{"round": 1, "winner": 0},
		})
		conn.WriteMessage(websocket.TextMessage, roundEnd)
	}))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")
	ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Connect failed: %v", err)
	}
	defer ws.Close()

	frameCount := 0
	gotRoundEnd := false

	for {
		ws.SetReadDeadline(time.Now().Add(2 * time.Second))
		_, msg, err := ws.ReadMessage()
		if err != nil {
			break
		}

		var m map[string]interface{}
		json.Unmarshal(msg, &m)

		switch m["type"] {
		case "frame":
			frameCount++
		case "round_end":
			gotRoundEnd = true
		}
	}

	if frameCount != 5 {
		t.Errorf("Expected 5 frame messages, got %d", frameCount)
	}
	if !gotRoundEnd {
		t.Error("Expected round_end message")
	}
}

// ============================================================
// Reconnection Handling
// ============================================================

func TestWebSocket_ReconnectionHandling(t *testing.T) {
	rm := NewRoomManager()
	room := rm.CreateRoom("reconnect-room")

	// Add player 1 with nil conn (simulating disconnected state)
	room.AddPlayer(nil, "p1")

	// Verify player is in slot 0
	room.mu.RLock()
	p := room.Players[0]
	room.mu.RUnlock()
	if p == nil || p.PlayerID != "p1" {
		t.Fatal("P1 should be in slot 0")
	}

	// Simulate reconnection by creating a server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer conn.Close()

		// Simulate reconnection: update player's conn
		room.mu.Lock()
		if room.Players[0] != nil && room.Players[0].PlayerID == "p1" {
			room.Players[0].Conn = conn
			room.Players[0].LastPing = time.Now()
		}
		room.mu.Unlock()

		// Send state sync
		sync, _ := json.Marshal(map[string]interface{}{
			"type": "state_sync",
			"data": map[string]interface{}{"reconnected": true},
		})
		conn.WriteMessage(websocket.TextMessage, sync)

		// Keep connection alive briefly
		conn.SetReadDeadline(time.Now().Add(500 * time.Millisecond))
		conn.ReadMessage()
	}))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")
	ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Reconnect failed: %v", err)
	}
	defer ws.Close()

	// Read state sync message
	ws.SetReadDeadline(time.Now().Add(time.Second))
	_, msg, err := ws.ReadMessage()
	if err != nil {
		t.Fatalf("Failed to read sync message: %v", err)
	}

	var sync map[string]interface{}
	json.Unmarshal(msg, &sync)
	if sync["type"] != "state_sync" {
		t.Errorf("Expected state_sync message, got %s", sync["type"])
	}

	// Verify connection was updated
	room.mu.RLock()
	reconnectedConn := room.Players[0].Conn
	room.mu.RUnlock()
	if reconnectedConn == nil {
		t.Error("Player connection should be updated after reconnection")
	}
}

// ============================================================
// WebSocket Upgrader Configuration
// ============================================================

func TestWebSocket_UpgraderConfig(t *testing.T) {
	if upgrader.ReadBufferSize != 1024 {
		t.Errorf("Expected ReadBufferSize 1024, got %d", upgrader.ReadBufferSize)
	}
	if upgrader.WriteBufferSize != 1024 {
		t.Errorf("Expected WriteBufferSize 1024, got %d", upgrader.WriteBufferSize)
	}

	// CheckOrigin should allow all (for now)
	r := &http.Request{}
	if !upgrader.CheckOrigin(r) {
		t.Error("CheckOrigin should return true for any request")
	}
}

// ============================================================
// Message Format Validation
// ============================================================

func TestWebSocket_BinaryMessageHandling(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer conn.Close()

		mt, msg, err := conn.ReadMessage()
		if err != nil {
			return
		}
		// Echo back with same type
		conn.WriteMessage(mt, msg)
	}))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")
	ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Connect failed: %v", err)
	}
	defer ws.Close()

	// Send binary message
	binaryData := []byte{0x01, 0x02, 0x03, 0x04}
	ws.WriteMessage(websocket.BinaryMessage, binaryData)

	mt, msg, err := ws.ReadMessage()
	if err != nil {
		t.Fatalf("Read failed: %v", err)
	}
	if mt != websocket.BinaryMessage {
		t.Errorf("Expected binary message type, got %d", mt)
	}
	if len(msg) != 4 {
		t.Errorf("Expected 4 bytes, got %d", len(msg))
	}
}
