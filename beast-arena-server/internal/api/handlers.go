package api

import (
	"context"
	"net/http"
	"strconv"

	"github.com/beast-arena/server/internal/db"
	"github.com/beast-arena/server/internal/game"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GetProfile returns player profile by ID
func GetProfile(c *gin.Context) {
	ctx := context.Background()
	id := c.Param("id")

	var displayName string
	var wins, losses, rankPoints, freePractice int
	var selectedChar string

	err := db.Pool.QueryRow(ctx,
		`SELECT display_name, wins, losses, rank_points, selected_character, free_practice_left
		 FROM players WHERE id = $1`, id,
	).Scan(&displayName, &wins, &losses, &rankPoints, &selectedChar, &freePractice)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "player not found"})
		return
	}

	winRate := 0.0
	if wins+losses > 0 {
		winRate = float64(wins) / float64(wins+losses) * 100
	}

	c.JSON(http.StatusOK, gin.H{
		"id":                 id,
		"display_name":       displayName,
		"wins":               wins,
		"losses":             losses,
		"rank_points":        rankPoints,
		"win_rate":           winRate,
		"selected_character": selectedChar,
		"free_practice_left": freePractice,
	})
}

// UpdateProfile updates display name or selected character
func UpdateProfile(c *gin.Context) {
	ctx := context.Background()
	playerID, _ := c.Get("player_id")

	var req struct {
		DisplayName       *string `json:"display_name,omitempty"`
		SelectedCharacter *string `json:"selected_character,omitempty"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if req.DisplayName != nil {
		if len(*req.DisplayName) < 2 || len(*req.DisplayName) > 50 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "display name must be 2-50 characters"})
			return
		}
		db.Pool.Exec(ctx, `UPDATE players SET display_name = $1, updated_at = NOW() WHERE id = $2`,
			*req.DisplayName, playerID)
	}

	if req.SelectedCharacter != nil {
		if _, ok := game.DefaultRegistry.Get(*req.SelectedCharacter); !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "unknown character"})
			return
		}
		db.Pool.Exec(ctx, `UPDATE players SET selected_character = $1, updated_at = NOW() WHERE id = $2`,
			*req.SelectedCharacter, playerID)
	}

	c.JSON(http.StatusOK, gin.H{"status": "updated"})
}

// ListCharacters returns all available characters from registry
func ListCharacters(c *gin.Context) {
	chars := game.DefaultRegistry.GetAll()
	result := make([]gin.H, len(chars))
	for i, ch := range chars {
		result[i] = gin.H{
			"id":          ch.ID,
			"name":        ch.Name,
			"title":       ch.Title,
			"martial_art": ch.MartialArt,
			"stats":       ch.Stats,
		}
	}
	c.JSON(http.StatusOK, gin.H{"characters": result})
}

// FindMatch queues player for PvP matchmaking
func FindMatch(c *gin.Context) {
	ctx := context.Background()
	playerID, _ := c.Get("player_id")
	pid := playerID.(string)

	var req struct {
		CharacterID string `json:"character_id" binding:"required"`
		StageID     string `json:"stage_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "character_id required"})
		return
	}

	// Add to Redis matchmaking queue
	err := db.Redis.RPush(ctx, "matchmaking:queue", pid+":"+req.CharacterID).Err()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "matchmaking unavailable"})
		return
	}

	// Store player matchmaking state
	db.Redis.Set(ctx, "matchmaking:player:"+pid, req.CharacterID, 0)

	c.JSON(http.StatusOK, gin.H{
		"status":  "queued",
		"message": "Finding opponent...",
	})
}

// StartPractice starts a practice match vs AI
func StartPractice(c *gin.Context) {
	ctx := context.Background()
	playerID, _ := c.Get("player_id")
	pid := playerID.(string)

	var req struct {
		CharacterID string `json:"character_id" binding:"required"`
		StageID     string `json:"stage_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "character_id required"})
		return
	}

	// Check free practice turns
	var freePractice int
	err := db.Pool.QueryRow(ctx,
		`SELECT free_practice_left FROM players WHERE id = $1`, pid,
	).Scan(&freePractice)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "player not found"})
		return
	}
	if freePractice <= 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "no free practice turns left", "free_practice_left": 0})
		return
	}

	// Deduct free practice turn
	db.Pool.Exec(ctx, `UPDATE players SET free_practice_left = free_practice_left - 1 WHERE id = $1`, pid)

	// Pick AI opponent (different character)
	aiChar := "lion"
	if req.CharacterID == "lion" {
		aiChar = "tiger"
	}

	stageID := req.StageID
	if stageID == "" {
		stageID = "ancient_temple"
	}

	// Create match record
	matchID := uuid.New().String()
	_, err = db.Pool.Exec(ctx,
		`INSERT INTO matches (id, player1_id, status, mode, stage_id, p1_character, p2_character)
		 VALUES ($1, $2, 'active', 'practice', $3, $4, $5)`,
		matchID, pid, stageID, req.CharacterID, aiChar,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create match"})
		return
	}

	// Initialize game state
	gs := game.NewGameState(matchID, req.CharacterID, pid, aiChar, "ai", stageID)
	game.ActiveMatches.Store(matchID, gs)

	c.JSON(http.StatusOK, gin.H{
		"status":              "started",
		"match_id":            matchID,
		"stage_id":            stageID,
		"player_character":    req.CharacterID,
		"opponent_character":  aiChar,
		"free_practice_left":  freePractice - 1,
	})
}

// GetMatch returns match details
func GetMatch(c *gin.Context) {
	ctx := context.Background()
	id := c.Param("id")

	var status, mode, stageID, p1Char, p2Char string
	var rounds []byte
	var p1HP, p2HP, duration, maxCombo int

	err := db.Pool.QueryRow(ctx,
		`SELECT status, mode, stage_id, p1_character, p2_character, rounds,
		        COALESCE(final_p1_hp, 0), COALESCE(final_p2_hp, 0),
		        COALESCE(duration_seconds, 0), COALESCE(max_combo, 0)
		 FROM matches WHERE id = $1`, id,
	).Scan(&status, &mode, &stageID, &p1Char, &p2Char, &rounds, &p1HP, &p2HP, &duration, &maxCombo)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "match not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":               id,
		"status":           status,
		"mode":             mode,
		"stage_id":         stageID,
		"p1_character":     p1Char,
		"p2_character":     p2Char,
		"rounds":           string(rounds),
		"final_p1_hp":      p1HP,
		"final_p2_hp":      p2HP,
		"duration_seconds": duration,
		"max_combo":        maxCombo,
	})
}

// GetMatchHistory returns player match history
func GetMatchHistory(c *gin.Context) {
	ctx := context.Background()
	playerID, _ := c.Get("player_id")
	pid := playerID.(string)

	limitStr := c.DefaultQuery("limit", "20")
	limit, _ := strconv.Atoi(limitStr)
	if limit > 50 {
		limit = 50
	}

	rows, err := db.Pool.Query(ctx,
		`SELECT id, status, mode, stage_id, p1_character, p2_character,
		        winner_id, COALESCE(duration_seconds, 0), created_at
		 FROM matches
		 WHERE player1_id = $1 OR player2_id = $1
		 ORDER BY created_at DESC LIMIT $2`, pid, limit,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
		return
	}
	defer rows.Close()

	var matches []gin.H
	for rows.Next() {
		var id, status, mode, stageID, p1Char, p2Char string
		var winnerID *string
		var duration int
		var createdAt interface{}

		rows.Scan(&id, &status, &mode, &stageID, &p1Char, &p2Char, &winnerID, &duration, &createdAt)

		won := false
		if winnerID != nil && *winnerID == pid {
			won = true
		}

		matches = append(matches, gin.H{
			"id":         id,
			"status":     status,
			"mode":       mode,
			"stage_id":   stageID,
			"p1_char":    p1Char,
			"p2_char":    p2Char,
			"won":        won,
			"duration":   duration,
			"created_at": createdAt,
		})
	}

	if matches == nil {
		matches = []gin.H{}
	}

	c.JSON(http.StatusOK, gin.H{"matches": matches})
}

// GetLeaderboard returns top players by rank
func GetLeaderboard(c *gin.Context) {
	ctx := context.Background()

	limitStr := c.DefaultQuery("limit", "50")
	limit, _ := strconv.Atoi(limitStr)
	if limit > 100 {
		limit = 100
	}

	rows, err := db.Pool.Query(ctx,
		`SELECT id, display_name, wins, losses, rank_points
		 FROM players
		 WHERE wins + losses > 0
		 ORDER BY rank_points DESC
		 LIMIT $1`, limit,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
		return
	}
	defer rows.Close()

	var leaderboard []gin.H
	rank := 1
	for rows.Next() {
		var id, name string
		var wins, losses, points int
		rows.Scan(&id, &name, &wins, &losses, &points)

		winRate := 0.0
		if wins+losses > 0 {
			winRate = float64(wins) / float64(wins+losses) * 100
		}

		leaderboard = append(leaderboard, gin.H{
			"rank":        rank,
			"id":          id,
			"name":        name,
			"wins":        wins,
			"losses":      losses,
			"rank_points": points,
			"win_rate":    winRate,
		})
		rank++
	}

	if leaderboard == nil {
		leaderboard = []gin.H{}
	}

	c.JSON(http.StatusOK, gin.H{"leaderboard": leaderboard})
}
