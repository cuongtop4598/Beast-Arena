package game

import (
	"math"
	"math/rand"
)

// AIDifficulty controls how smart the AI is
type AIDifficulty int

const (
	AIDifficultyEasy   AIDifficulty = 0
	AIDifficultyMedium AIDifficulty = 1
	AIDifficultyHard   AIDifficulty = 2
)

// AIPersonality influences AI behavior tendencies
type AIPersonality string

const (
	AIPersonalityAggressive AIPersonality = "aggressive"
	AIPersonalityDefensive  AIPersonality = "defensive"
	AIPersonalityBalanced   AIPersonality = "balanced"
)

// AIController runs the practice mode AI as a goroutine-safe decision maker
type AIController struct {
	PlayerID    string
	CharacterID string
	Difficulty  AIDifficulty
	Personality AIPersonality

	// Internal state
	reactionDelay int // frames before AI reacts (lower = harder)
	aggressionPct float64
	blockPct      float64
	specialPct    float64
	lastDecision  int // frame of last decision
	currentPlan   []InputType
	planFrames    int // how many frames to execute current plan
}

// NewAIController creates an AI for practice mode
func NewAIController(playerID, characterID string, difficulty AIDifficulty) *AIController {
	ai := &AIController{
		PlayerID:    playerID,
		CharacterID: characterID,
		Difficulty:  difficulty,
		Personality: AIPersonalityBalanced,
	}

	// Set parameters based on difficulty
	switch difficulty {
	case AIDifficultyEasy:
		ai.reactionDelay = 30 // 0.5s reaction time
		ai.aggressionPct = 0.3
		ai.blockPct = 0.1
		ai.specialPct = 0.05
	case AIDifficultyMedium:
		ai.reactionDelay = 15 // 0.25s
		ai.aggressionPct = 0.5
		ai.blockPct = 0.25
		ai.specialPct = 0.15
	case AIDifficultyHard:
		ai.reactionDelay = 6 // 0.1s
		ai.aggressionPct = 0.7
		ai.blockPct = 0.4
		ai.specialPct = 0.3
	}

	return ai
}

// Think produces the AI's input for the current frame
func (ai *AIController) Think(gs *GameState) *PlayerInput {
	// Find which fighter is the AI
	var self, opponent *FighterState
	if gs.Player1.PlayerID == ai.PlayerID {
		self = gs.Player1
		opponent = gs.Player2
	} else {
		self = gs.Player2
		opponent = gs.Player1
	}

	// Only make new decisions at reaction intervals
	if gs.Frame-ai.lastDecision < ai.reactionDelay && ai.planFrames > 0 {
		ai.planFrames--
		return &PlayerInput{
			PlayerID: ai.PlayerID,
			Frame:    gs.Frame,
			Inputs:   ai.currentPlan,
		}
	}

	ai.lastDecision = gs.Frame
	inputs := ai.decide(self, opponent, gs)
	ai.currentPlan = inputs
	ai.planFrames = ai.reactionDelay / 2 // execute plan for half reaction time

	return &PlayerInput{
		PlayerID: ai.PlayerID,
		Frame:    gs.Frame,
		Inputs:   inputs,
	}
}

// decide chooses actions based on game state
func (ai *AIController) decide(self, opponent *FighterState, gs *GameState) []InputType {
	dist := math.Abs(self.Position.X - opponent.Position.X)

	// If stunned, can't do anything
	if self.State == ActionStunned || self.State == ActionKnockdown {
		return []InputType{InputNone}
	}

	// Priority: if opponent is attacking, try to block (hard AI)
	if opponent.State == ActionAttacking || opponent.State == ActionSpecial {
		if rand.Float64() < ai.blockPct {
			return []InputType{InputBlock}
		}
	}

	// Close range combat
	if dist < 80 {
		return ai.closeCombat(self, opponent)
	}

	// Mid range
	if dist < 200 {
		return ai.midRange(self, opponent)
	}

	// Far range — approach
	return ai.approach(self, opponent)
}

func (ai *AIController) closeCombat(self, opponent *FighterState) []InputType {
	r := rand.Float64()

	// Use ultimate if available (hard AI is smarter about timing)
	if self.UltGauge >= 100 {
		if ai.Difficulty >= AIDifficultyMedium || rand.Float64() < 0.3 {
			return []InputType{InputUltimate}
		}
	}

	// Attack
	if r < ai.aggressionPct {
		// Special attacks
		if rand.Float64() < ai.specialPct {
			specials := []InputType{InputSpecial1, InputSpecial2, InputSpecial3, InputSpecial4}
			return []InputType{specials[rand.Intn(len(specials))]}
		}
		return []InputType{InputAttack}
	}

	// Block
	if r < ai.aggressionPct+ai.blockPct {
		return []InputType{InputBlock}
	}

	// Retreat
	if self.HP < self.MaxHP/4 {
		// Low HP — try to create distance
		if self.Position.X < opponent.Position.X {
			return []InputType{InputMoveLeft}
		}
		return []InputType{InputMoveRight}
	}

	// Mix-up: crouch or jump attack
	if rand.Float64() < 0.3 {
		return []InputType{InputJump, InputAttack}
	}

	return []InputType{InputAttack}
}

func (ai *AIController) midRange(self, opponent *FighterState) []InputType {
	r := rand.Float64()

	// Dash in for attack
	if r < ai.aggressionPct*0.5 {
		return []InputType{InputDash}
	}

	// Use projectile special if available
	if r < ai.aggressionPct*0.5+ai.specialPct {
		return []InputType{InputSpecial1} // assume special1 might be ranged
	}

	// Approach cautiously
	return ai.approach(self, opponent)
}

func (ai *AIController) approach(self, opponent *FighterState) []InputType {
	// Move toward opponent
	if self.Position.X < opponent.Position.X {
		// Sometimes dash
		if rand.Float64() < 0.2 && ai.Difficulty >= AIDifficultyMedium {
			return []InputType{InputDash}
		}
		return []InputType{InputMoveRight}
	}
	if rand.Float64() < 0.2 && ai.Difficulty >= AIDifficultyMedium {
		return []InputType{InputDash}
	}
	return []InputType{InputMoveLeft}
}
