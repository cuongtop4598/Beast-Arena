package game

import (
	"encoding/json"
	"time"
)

type ReplayFrame struct {
	Frame  int                `json:"f"`
	Inputs [2]json.RawMessage `json:"i"`
	Events []ReplayEvent      `json:"e,omitempty"`
}

type ReplayEvent struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

type Replay struct {
	MatchID    string        `json:"match_id"`
	Player1    string        `json:"player1"`
	Player2    string        `json:"player2"`
	Character1 string        `json:"char1"`
	Character2 string        `json:"char2"`
	StageID    string        `json:"stage_id"`
	Frames     []ReplayFrame `json:"frames"`
	Result     MatchResult   `json:"result"`
	RecordedAt time.Time     `json:"recorded_at"`
	Version    int           `json:"version"`
}

type MatchResult struct {
	Winner  int     `json:"winner"` // 0 or 1
	Scores  [2]int  `json:"scores"`
	Rounds  []RoundResultData `json:"rounds"`
}

type RoundResultData struct {
	Round      int    `json:"round"`
	Winner     int    `json:"winner"`
	P1HP       int    `json:"p1_hp"`
	P2HP       int    `json:"p2_hp"`
	FinishType string `json:"finish"` // "ko" or "timeout"
	Duration   int    `json:"duration_frames"`
}

type ReplayRecorder struct {
	replay  Replay
	enabled bool
}

func NewReplayRecorder(matchID, p1, p2, char1, char2, stageID string) *ReplayRecorder {
	return &ReplayRecorder{
		replay: Replay{
			MatchID:    matchID,
			Player1:    p1,
			Player2:    p2,
			Character1: char1,
			Character2: char2,
			StageID:    stageID,
			Frames:     make([]ReplayFrame, 0, 5400), // ~90sec at 60fps
			RecordedAt: time.Now(),
			Version:    1,
		},
		enabled: true,
	}
}

func (rr *ReplayRecorder) RecordFrame(frame int, inputs [2]json.RawMessage) {
	if !rr.enabled {
		return
	}
	rr.replay.Frames = append(rr.replay.Frames, ReplayFrame{
		Frame:  frame,
		Inputs: inputs,
	})
}

func (rr *ReplayRecorder) RecordEvent(frame int, eventType string, data interface{}) {
	if !rr.enabled || len(rr.replay.Frames) == 0 {
		return
	}
	last := &rr.replay.Frames[len(rr.replay.Frames)-1]
	if last.Frame == frame {
		last.Events = append(last.Events, ReplayEvent{Type: eventType, Data: data})
	}
}

func (rr *ReplayRecorder) SetResult(result MatchResult) {
	rr.replay.Result = result
}

func (rr *ReplayRecorder) Finalize() *Replay {
	rr.enabled = false
	return &rr.replay
}

func (rr *ReplayRecorder) ToJSON() ([]byte, error) {
	return json.Marshal(&rr.replay)
}
