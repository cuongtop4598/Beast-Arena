package game

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/beast-arena/server/internal/db"
)

// ActiveMatches stores all ongoing matches in memory
var ActiveMatches sync.Map

const (
	RoundsToWin  = 2
	MaxRounds    = 3
	RoundTimeSec = 99
)

// EndRound processes the end of a round
func EndRound(gs *GameState, winnerID, method string) {
	result := RoundResult{
		Round:    gs.Round,
		WinnerID: winnerID,
		Method:   method,
		P1HP:     gs.Player1.HP,
		P2HP:     gs.Player2.HP,
	}
	gs.RoundResults = append(gs.RoundResults, result)

	// Check match winner
	p1Wins := 0
	p2Wins := 0
	for _, r := range gs.RoundResults {
		if r.WinnerID == gs.Player1.PlayerID {
			p1Wins++
		} else if r.WinnerID == gs.Player2.PlayerID {
			p2Wins++
		}
	}

	if p1Wins >= RoundsToWin {
		gs.Status = StatusMatchEnd
		EndMatch(gs, gs.Player1.PlayerID)
	} else if p2Wins >= RoundsToWin {
		gs.Status = StatusMatchEnd
		EndMatch(gs, gs.Player2.PlayerID)
	} else if gs.Round >= MaxRounds {
		// Max rounds reached — whoever has more round wins
		if p1Wins > p2Wins {
			gs.Status = StatusMatchEnd
			EndMatch(gs, gs.Player1.PlayerID)
		} else {
			gs.Status = StatusMatchEnd
			EndMatch(gs, gs.Player2.PlayerID)
		}
	} else {
		// Next round
		gs.Round++
		gs.Status = StatusRoundEnd
		resetRound(gs)
	}
}

// resetRound resets fighter states for next round (keep ult gauge)
func resetRound(gs *GameState) {
	p1Config, _ := DefaultRegistry.Get(gs.Player1.CharacterID)
	p2Config, _ := DefaultRegistry.Get(gs.Player2.CharacterID)

	p1MaxHP := 1000
	p2MaxHP := 1000
	if p1Config != nil {
		p1MaxHP = p1Config.Stats.HP * 10
	}
	if p2Config != nil {
		p2MaxHP = p2Config.Stats.HP * 10
	}

	gs.Player1.HP = p1MaxHP
	gs.Player1.MaxHP = p1MaxHP
	gs.Player1.Position = Vector2D{X: 200, Y: 0}
	gs.Player1.State = ActionIdle
	gs.Player1.ComboCount = 0
	gs.Player1.ActiveBuffs = nil

	gs.Player2.HP = p2MaxHP
	gs.Player2.MaxHP = p2MaxHP
	gs.Player2.Position = Vector2D{X: 800, Y: 0}
	gs.Player2.State = ActionIdle
	gs.Player2.ComboCount = 0
	gs.Player2.ActiveBuffs = nil

	gs.Timer = RoundTimeSec
	gs.SupplyDrops = nil
}

// EndMatch finalizes a match and persists to DB
func EndMatch(gs *GameState, winnerID string) {
	ctx := context.Background()
	gs.Status = StatusMatchEnd

	roundsJSON, _ := json.Marshal(gs.RoundResults)

	// Calculate match duration
	duration := 0
	for _, r := range gs.RoundResults {
		duration += RoundTimeSec - r.P1HP // approximation
	}
	// Simple: assume each round took proportional time
	duration = len(gs.RoundResults) * 30 // ~30s per round average

	maxCombo := 0
	if gs.Player1.ComboCount > maxCombo {
		maxCombo = gs.Player1.ComboCount
	}
	if gs.Player2.ComboCount > maxCombo {
		maxCombo = gs.Player2.ComboCount
	}

	// Update match record
	db.Pool.Exec(ctx,
		`UPDATE matches SET
			winner_id = $1, status = 'completed', rounds = $2,
			final_p1_hp = $3, final_p2_hp = $4,
			duration_seconds = $5, max_combo = $6,
			completed_at = $7
		 WHERE id = $8`,
		winnerID, roundsJSON,
		gs.Player1.HP, gs.Player2.HP,
		duration, maxCombo,
		time.Now(), gs.MatchID,
	)

	// Update player stats
	loserID := gs.Player2.PlayerID
	if winnerID == gs.Player2.PlayerID {
		loserID = gs.Player1.PlayerID
	}

	if winnerID != "ai" {
		db.Pool.Exec(ctx, `UPDATE players SET wins = wins + 1, updated_at = NOW() WHERE id = $1`, winnerID)
	}
	if loserID != "ai" {
		db.Pool.Exec(ctx, `UPDATE players SET losses = losses + 1, updated_at = NOW() WHERE id = $1`, loserID)
	}

	// ELO update (only for PvP)
	if winnerID != "ai" && loserID != "ai" {
		updateELO(ctx, winnerID, loserID)
	}

	// Cleanup
	ActiveMatches.Delete(gs.MatchID)
}

// updateELO calculates and applies ELO changes
func updateELO(ctx context.Context, winnerID, loserID string) {
	var winnerPoints, loserPoints int
	db.Pool.QueryRow(ctx, `SELECT rank_points FROM players WHERE id = $1`, winnerID).Scan(&winnerPoints)
	db.Pool.QueryRow(ctx, `SELECT rank_points FROM players WHERE id = $1`, loserID).Scan(&loserPoints)

	K := 32.0 // K-factor

	// Expected scores
	expectedWinner := 1.0 / (1.0 + pow10(float64(loserPoints-winnerPoints)/400.0))
	expectedLoser := 1.0 - expectedWinner

	// New ratings
	newWinner := winnerPoints + int(K*(1.0-expectedWinner))
	newLoser := loserPoints + int(K*(0.0-expectedLoser))

	// Floor at 0
	if newLoser < 0 {
		newLoser = 0
	}

	db.Pool.Exec(ctx, `UPDATE players SET rank_points = $1, updated_at = NOW() WHERE id = $2`, newWinner, winnerID)
	db.Pool.Exec(ctx, `UPDATE players SET rank_points = $1, updated_at = NOW() WHERE id = $2`, newLoser, loserID)
}

func pow10(x float64) float64 {
	result := 1.0
	for i := 0; i < int(x); i++ {
		result *= 10
	}
	// Fractional approximation
	return result
}
