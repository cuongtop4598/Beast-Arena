package game

// InputType represents a player input action
type InputType string

const (
	InputNone      InputType = "none"
	InputMoveLeft  InputType = "move_left"
	InputMoveRight InputType = "move_right"
	InputJump      InputType = "jump"
	InputCrouch    InputType = "crouch"
	InputAttack    InputType = "attack"
	InputSpecial1  InputType = "special1"
	InputSpecial2  InputType = "special2"
	InputSpecial3  InputType = "special3"
	InputSpecial4  InputType = "special4"
	InputUltimate  InputType = "ultimate"
	InputBlock     InputType = "block"
	InputDash      InputType = "dash"
)

// PlayerInput represents a single frame of player input
type PlayerInput struct {
	PlayerID  string      `json:"player_id"`
	Frame     int         `json:"frame"`
	Inputs    []InputType `json:"inputs"`
	Timestamp int64       `json:"timestamp"` // client-side timestamp (ms)
	Sequence  uint32      `json:"sequence"`  // monotonic sequence number
}

// FrameInput stores both players' inputs for a single frame
type FrameInput struct {
	Frame int          `json:"frame"`
	P1    *PlayerInput `json:"p1"`
	P2    *PlayerInput `json:"p2"`
}

// GameEvent represents a server->client event
type GameEvent struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
	Frame   int         `json:"frame"`
}

// ValidInputTypes is the set of all valid input types for validation
var ValidInputTypes = map[InputType]bool{
	InputNone:      true,
	InputMoveLeft:  true,
	InputMoveRight: true,
	InputJump:      true,
	InputCrouch:    true,
	InputAttack:    true,
	InputSpecial1:  true,
	InputSpecial2:  true,
	InputSpecial3:  true,
	InputSpecial4:  true,
	InputUltimate:  true,
	InputBlock:     true,
	InputDash:      true,
}
