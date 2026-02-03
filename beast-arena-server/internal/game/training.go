package game

import (
	"encoding/json"
	"math/rand"
)

type AILevel int

const (
	AIEasy   AILevel = iota
	AIMedium
	AIHard
)

type TrainingDummy struct {
	level       AILevel
	blockChance float64
	attackRate  float64
	frame       int
}

func NewTrainingDummy(level AILevel) *TrainingDummy {
	td := &TrainingDummy{level: level}
	switch level {
	case AIEasy:
		td.blockChance = 0.1
		td.attackRate = 0.02
	case AIMedium:
		td.blockChance = 0.3
		td.attackRate = 0.05
	case AIHard:
		td.blockChance = 0.6
		td.attackRate = 0.1
	}
	return td
}

func (td *TrainingDummy) GenerateInput(opponentState json.RawMessage) json.RawMessage {
	td.frame++

	input := ClientInput{}

	// Random movement
	r := rand.Float64()
	if r < 0.3 {
		input.Left = true
	} else if r < 0.6 {
		input.Right = true
	}

	// Block based on level
	if rand.Float64() < td.blockChance {
		input.Block = true
		input.Left = false
		input.Right = false
	}

	// Attack
	if !input.Block && rand.Float64() < td.attackRate {
		input.Attack = rand.Intn(3) // light, medium, heavy
	}

	// Special moves (less frequent)
	if !input.Block && rand.Float64() < td.attackRate*0.3 {
		input.Special = rand.Intn(4) + 1
	}

	// Jump occasionally
	if rand.Float64() < 0.02 {
		input.Up = true
	}

	data, _ := json.Marshal(input)
	return data
}

type PracticeMode struct {
	dummy    *TrainingDummy
	gameLoop *GameLoop
	turnsUsed int
	maxTurns  int
}

func NewPracticeMode(level AILevel, state *GameState, broadcast func([]byte)) *PracticeMode {
	return &PracticeMode{
		dummy:    NewTrainingDummy(level),
		gameLoop: NewGameLoop(state, broadcast),
		maxTurns: 5,
	}
}

func (pm *PracticeMode) Start() bool {
	if pm.turnsUsed >= pm.maxTurns {
		return false
	}
	pm.turnsUsed++
	pm.gameLoop.Start()
	return true
}

func (pm *PracticeMode) Stop() {
	pm.gameLoop.Stop()
}

func (pm *PracticeMode) TurnsRemaining() int {
	return pm.maxTurns - pm.turnsUsed
}
