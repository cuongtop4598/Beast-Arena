package matchmaking

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/beast-arena/server/internal/db"
	"github.com/beast-arena/server/internal/game"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// MatchResult holds a matched pair
type MatchResult struct {
	MatchID     string
	Player1ID   string
	Player1Char string
	Player2ID   string
	Player2Char string
	StageID     string
}

// Engine manages matchmaking queue
type Engine struct {
	logger *zap.SugaredLogger
}

// NewEngine creates a matchmaking engine
func NewEngine(logger *zap.SugaredLogger) *Engine {
	return &Engine{logger: logger}
}

// Start begins the matchmaking loop (run as goroutine)
func (e *Engine) Start(ctx context.Context) {
	e.logger.Info("Matchmaking engine started")

	ticker := time.NewTicker(2 * time.Second) // Check queue every 2s
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			e.logger.Info("Matchmaking engine stopped")
			return
		case <-ticker.C:
			e.processQueue(ctx)
		}
	}
}

// processQueue tries to match players from the Redis queue
func (e *Engine) processQueue(ctx context.Context) {
	// Get queue length
	length, err := db.Redis.LLen(ctx, "matchmaking:queue").Result()
	if err != nil || length < 2 {
		return
	}

	// Pop two players
	p1Data, err := db.Redis.LPop(ctx, "matchmaking:queue").Result()
	if err != nil {
		return
	}
	p2Data, err := db.Redis.LPop(ctx, "matchmaking:queue").Result()
	if err != nil {
		// Put p1 back
		db.Redis.LPush(ctx, "matchmaking:queue", p1Data)
		return
	}

	// Parse "playerID:characterID"
	p1Parts := strings.SplitN(p1Data, ":", 2)
	p2Parts := strings.SplitN(p2Data, ":", 2)

	if len(p1Parts) < 2 || len(p2Parts) < 2 {
		e.logger.Warn("Invalid matchmaking data")
		return
	}

	p1ID, p1Char := p1Parts[0], p1Parts[1]
	p2ID, p2Char := p2Parts[0], p2Parts[1]

	// Don't match player with themselves
	if p1ID == p2ID {
		db.Redis.RPush(ctx, "matchmaking:queue", p2Data)
		return
	}

	// Create match
	matchID := uuid.New().String()
	stageID := "ancient_temple" // TODO: random or preference-based

	_, err = db.Pool.Exec(ctx,
		`INSERT INTO matches (id, player1_id, player2_id, status, mode, stage_id, p1_character, p2_character)
		 VALUES ($1, $2, $3, 'active', 'pvp', $4, $5, $6)`,
		matchID, p1ID, p2ID, stageID, p1Char, p2Char,
	)
	if err != nil {
		e.logger.Errorf("Failed to create match: %v", err)
		return
	}

	// Initialize game state
	gs := game.NewGameState(matchID, p1Char, p1ID, p2Char, p2ID, stageID)
	game.ActiveMatches.Store(matchID, gs)

	// Notify players via Redis pub/sub
	matchInfo := fmt.Sprintf(`{"match_id":"%s","p1":"%s","p2":"%s","stage":"%s"}`, matchID, p1ID, p2ID, stageID)
	db.Redis.Publish(ctx, "match:created:"+p1ID, matchInfo)
	db.Redis.Publish(ctx, "match:created:"+p2ID, matchInfo)

	// Clean up matchmaking state
	db.Redis.Del(ctx, "matchmaking:player:"+p1ID)
	db.Redis.Del(ctx, "matchmaking:player:"+p2ID)

	e.logger.Infof("Match created: %s (%s vs %s)", matchID, p1ID, p2ID)
}

// CancelSearch removes a player from the queue
func (e *Engine) CancelSearch(ctx context.Context, playerID string) error {
	charID, err := db.Redis.Get(ctx, "matchmaking:player:"+playerID).Result()
	if err != nil {
		return fmt.Errorf("player not in queue")
	}

	db.Redis.LRem(ctx, "matchmaking:queue", 1, playerID+":"+charID)
	db.Redis.Del(ctx, "matchmaking:player:"+playerID)
	return nil
}
