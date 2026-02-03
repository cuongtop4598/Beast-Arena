package game

// Vector2D represents a 2D position/velocity
type Vector2D struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// MatchStatus represents the current state of a match
type MatchStatus string

const (
	StatusWaiting  MatchStatus = "waiting"
	StatusFighting MatchStatus = "fighting"
	StatusRoundEnd MatchStatus = "round_end"
	StatusMatchEnd MatchStatus = "match_end"
)

// FighterAction represents the current action state
type FighterAction string

const (
	ActionIdle      FighterAction = "idle"
	ActionWalking   FighterAction = "walking"
	ActionJumping   FighterAction = "jumping"
	ActionCrouching FighterAction = "crouching"
	ActionAttacking FighterAction = "attacking"
	ActionBlocking  FighterAction = "blocking"
	ActionStunned   FighterAction = "stunned"
	ActionKnockdown FighterAction = "knockdown"
	ActionSpecial   FighterAction = "special"
	ActionUltimate  FighterAction = "ultimate"
)

// Buff represents an active buff/debuff on a fighter
type Buff struct {
	ID       string  `json:"id"`
	Type     string  `json:"type"` // speed, damage, armor, heal
	Value    float64 `json:"value"`
	Duration int     `json:"duration"` // remaining frames
}

// SupplyDrop represents an in-match supply drop
type SupplyDrop struct {
	ID       string  `json:"id"`
	Type     string  `json:"type"` // weapon, buff
	ItemID   string  `json:"item_id"`
	Position Vector2D `json:"position"`
	SpawnAt  int     `json:"spawn_at"`  // frame number when it spawns
	Warning  int     `json:"warning"`   // frames of warning before spawn
	Claimed  bool    `json:"claimed"`
}

// RoundResult stores the outcome of a single round
type RoundResult struct {
	Round    int    `json:"round"`
	WinnerID string `json:"winner_id"`
	Method   string `json:"method"` // ko, timeout
	P1HP     int    `json:"p1_hp"`
	P2HP     int    `json:"p2_hp"`
}

// FighterState represents the current state of a fighter in a match
type FighterState struct {
	CharacterID string        `json:"character_id"`
	PlayerID    string        `json:"player_id"`
	Position    Vector2D      `json:"position"`
	Velocity    Vector2D      `json:"velocity"`
	HP          int           `json:"hp"`
	MaxHP       int           `json:"max_hp"`
	State       FighterAction `json:"state"`
	Facing      string        `json:"facing"` // left, right
	ComboCount  int           `json:"combo_count"`
	UltGauge    float64       `json:"ult_gauge"` // 0.0 - 1.0
	ActiveBuffs []Buff        `json:"active_buffs"`
	Animation   string        `json:"animation"`
}

// GameState represents the full state of a match
type GameState struct {
	MatchID      string        `json:"match_id"`
	Player1      *FighterState `json:"player1"`
	Player2      *FighterState `json:"player2"`
	Timer        int           `json:"timer"` // seconds remaining
	Frame        int           `json:"frame"` // current frame number
	Round        int           `json:"round"` // current round (1-3)
	RoundResults []RoundResult `json:"round_results"`
	SupplyDrops  []SupplyDrop  `json:"supply_drops"`
	StageID      string        `json:"stage_id"`
	Status       MatchStatus   `json:"status"`
}

// NewGameState creates a new game state for a match
func NewGameState(matchID, p1CharID, p1PlayerID, p2CharID, p2PlayerID, stageID string) *GameState {
	// TODO: load stats from character registry
	return &GameState{
		MatchID: matchID,
		Player1: &FighterState{
			CharacterID: p1CharID,
			PlayerID:    p1PlayerID,
			Position:    Vector2D{X: 200, Y: 0},
			HP:          1000,
			MaxHP:       1000,
			State:       ActionIdle,
			Facing:      "right",
			UltGauge:    0,
		},
		Player2: &FighterState{
			CharacterID: p2CharID,
			PlayerID:    p2PlayerID,
			Position:    Vector2D{X: 800, Y: 0},
			HP:          1000,
			MaxHP:       1000,
			State:       ActionIdle,
			Facing:      "left",
			UltGauge:    0,
		},
		Timer:        99,
		Frame:        0,
		Round:        1,
		RoundResults: []RoundResult{},
		SupplyDrops:  []SupplyDrop{},
		StageID:      stageID,
		Status:       StatusWaiting,
	}
}
