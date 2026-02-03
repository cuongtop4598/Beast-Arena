package ws

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type RoomState int

const (
	RoomWaiting RoomState = iota
	RoomCountdown
	RoomPlaying
	RoomFinished
)

type PlayerConn struct {
	Conn     *websocket.Conn
	PlayerID string
	Slot     int // 0 or 1
	Ready    bool
	LastPing time.Time
	Latency  time.Duration
}

type Room struct {
	ID        string
	State     RoomState
	Players   [2]*PlayerConn
	Spectators []*websocket.Conn
	mu        sync.RWMutex
	done      chan struct{}
	inputs    chan PlayerInput
	Created   time.Time
}

type PlayerInput struct {
	Slot  int
	Frame int
	Input json.RawMessage
}

type RoomManager struct {
	rooms map[string]*Room
	mu    sync.RWMutex
}

func NewRoomManager() *RoomManager {
	return &RoomManager{rooms: make(map[string]*Room)}
}

func (rm *RoomManager) CreateRoom(id string) *Room {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	room := &Room{
		ID:      id,
		State:   RoomWaiting,
		done:    make(chan struct{}),
		inputs:  make(chan PlayerInput, 256),
		Created: time.Now(),
	}
	rm.rooms[id] = room
	return room
}

func (rm *RoomManager) GetRoom(id string) *Room {
	rm.mu.RLock()
	defer rm.mu.RUnlock()
	return rm.rooms[id]
}

func (rm *RoomManager) RemoveRoom(id string) {
	rm.mu.Lock()
	defer rm.mu.Unlock()
	if room, ok := rm.rooms[id]; ok {
		close(room.done)
		delete(rm.rooms, id)
	}
}

func (r *Room) AddPlayer(conn *websocket.Conn, playerID string) int {
	r.mu.Lock()
	defer r.mu.Unlock()

	for i := 0; i < 2; i++ {
		if r.Players[i] == nil {
			r.Players[i] = &PlayerConn{
				Conn:     conn,
				PlayerID: playerID,
				Slot:     i,
				LastPing: time.Now(),
			}
			return i
		}
	}
	return -1 // room full
}

func (r *Room) AddSpectator(conn *websocket.Conn) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.Spectators = append(r.Spectators, conn)
}

func (r *Room) Broadcast(msg []byte) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, p := range r.Players {
		if p != nil && p.Conn != nil {
			if err := p.Conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				log.Printf("room %s: write error player %d: %v", r.ID, p.Slot, err)
			}
		}
	}
	for _, s := range r.Spectators {
		if s != nil {
			_ = s.WriteMessage(websocket.TextMessage, msg)
		}
	}
}

func (r *Room) IsFull() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.Players[0] != nil && r.Players[1] != nil
}

func (r *Room) SendTo(slot int, msg []byte) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if p := r.Players[slot]; p != nil && p.Conn != nil {
		_ = p.Conn.WriteMessage(websocket.TextMessage, msg)
	}
}

func (r *Room) UpdateLatency(slot int, latency time.Duration) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if p := r.Players[slot]; p != nil {
		p.Latency = latency
		p.LastPing = time.Now()
	}
}
