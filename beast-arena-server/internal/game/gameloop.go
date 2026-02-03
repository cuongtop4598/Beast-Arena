package game

import (
	"encoding/json"
	"log"
	"time"
)

const (
	TickRate    = 60
	TickPeriod  = time.Second / TickRate
	GameRoundTime = 90 * time.Second
)

type GameLoopMsg struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

type FrameUpdate struct {
	Frame     int       `json:"frame"`
	State     GameState `json:"state"`
	Timestamp int64     `json:"timestamp"`
}

type GameLoop struct {
	state       *GameState
	frame       int
	roundTimer  time.Duration
	running     bool
	broadcast   func([]byte)
	inputBuffer [2][]InputFrame
	done        chan struct{}
}

type InputFrame struct {
	Frame int             `json:"frame"`
	Input json.RawMessage `json:"input"`
}

func NewGameLoop(state *GameState, broadcast func([]byte)) *GameLoop {
	return &GameLoop{
		state:     state,
		broadcast: broadcast,
		done:      make(chan struct{}),
	}
}

func (gl *GameLoop) Start() {
	gl.running = true
	gl.frame = 0
	gl.roundTimer = GameRoundTime

	go gl.run()
}

func (gl *GameLoop) Stop() {
	gl.running = false
	close(gl.done)
}

func (gl *GameLoop) run() {
	ticker := time.NewTicker(TickPeriod)
	defer ticker.Stop()

	for {
		select {
		case <-gl.done:
			return
		case <-ticker.C:
			if !gl.running {
				continue
			}
			gl.tick()
		}
	}
}

func (gl *GameLoop) tick() {
	gl.frame++
	gl.roundTimer -= TickPeriod

	// Process inputs for this frame
	gl.processInputs()

	// Update game state
	gl.updateState()

	// Check round end conditions
	if gl.checkRoundEnd() {
		gl.handleRoundEnd()
		return
	}

	// Broadcast state to all players
	update := FrameUpdate{
		Frame:     gl.frame,
		State:     *gl.state,
		Timestamp: time.Now().UnixMilli(),
	}

	data, err := json.Marshal(GameLoopMsg{
		Type: "frame",
		Data: mustMarshal(update),
	})
	if err != nil {
		log.Printf("gameloop: marshal error: %v", err)
		return
	}

	gl.broadcast(data)
}

func (gl *GameLoop) processInputs() {
	// Process buffered inputs for current frame
	for slot := 0; slot < 2; slot++ {
		for _, input := range gl.inputBuffer[slot] {
			if input.Frame <= gl.frame {
				gl.applyInput(slot, input.Input)
			}
		}
		// Clear processed inputs
		remaining := make([]InputFrame, 0)
		for _, input := range gl.inputBuffer[slot] {
			if input.Frame > gl.frame {
				remaining = append(remaining, input)
			}
		}
		gl.inputBuffer[slot] = remaining
	}
}

func (gl *GameLoop) applyInput(slot int, input json.RawMessage) {
	// Decode and apply input to game state
	_ = slot
	_ = input
	// TODO: integrate with combat system
}

func (gl *GameLoop) updateState() {
	// Physics update
	// Collision detection
	// Damage calculation
	// Supply drop logic
}

func (gl *GameLoop) checkRoundEnd() bool {
	if gl.roundTimer <= 0 {
		return true
	}
	if gl.state.Player1.HP <= 0 || gl.state.Player2.HP <= 0 {
		return true
	}
	return false
}

func (gl *GameLoop) handleRoundEnd() {
	winner := 0
	if gl.state.Player2.HP > gl.state.Player1.HP {
		winner = 1
	}

	msg, _ := json.Marshal(GameLoopMsg{
		Type: "round_end",
		Data: mustMarshal(map[string]interface{}{
			"round":  gl.state.Round,
			"winner": winner,
			"frame":  gl.frame,
		}),
	})
	gl.broadcast(msg)

	gl.state.Round++
	if gl.state.Round > MaxRounds {
		gl.running = false
		matchEnd, _ := json.Marshal(GameLoopMsg{
			Type: "match_end",
			Data: mustMarshal(map[string]interface{}{"winner": winner}),
		})
		gl.broadcast(matchEnd)
	} else {
		// Reset for next round
		gl.roundTimer = GameRoundTime
		gl.state.Player1.HP = gl.state.Player1.MaxHP
		gl.state.Player2.HP = gl.state.Player2.MaxHP
	}
}

func (gl *GameLoop) QueueInput(slot int, frame int, input json.RawMessage) {
	gl.inputBuffer[slot] = append(gl.inputBuffer[slot], InputFrame{
		Frame: frame,
		Input: input,
	})
}

func (gl *GameLoop) GetFrame() int {
	return gl.frame
}

func mustMarshal(v interface{}) json.RawMessage {
	data, _ := json.Marshal(v)
	return data
}
