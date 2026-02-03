package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/beast-arena/server/internal/api"
	"github.com/beast-arena/server/internal/auth"
	"github.com/beast-arena/server/internal/db"
	"github.com/beast-arena/server/internal/game"
	"github.com/beast-arena/server/internal/matchmaking"
	"github.com/beast-arena/server/internal/ws"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Logger
	logger, _ := zap.NewProduction()
	if os.Getenv("ENV") != "production" {
		logger, _ = zap.NewDevelopment()
	}
	defer logger.Sync()
	sugar := logger.Sugar()

	// Initialize PostgreSQL
	if err := db.InitPostgres(ctx, sugar); err != nil {
		sugar.Warnf("PostgreSQL not available: %v (running without DB)", err)
	}

	// Initialize Redis
	if err := db.InitRedis(ctx, sugar); err != nil {
		sugar.Warnf("Redis not available: %v (running without matchmaking)", err)
	}

	// Load character configs
	charDir := os.Getenv("CHAR_DIR")
	if charDir == "" {
		charDir = "internal/characters/configs"
	}
	if err := game.DefaultRegistry.LoadFromDir(charDir); err != nil {
		sugar.Warnf("Failed to load characters: %v", err)
	} else {
		chars := game.DefaultRegistry.GetAll()
		sugar.Infof("Loaded %d characters", len(chars))
		for _, c := range chars {
			sugar.Infof("  → %s (%s) - HP:%d ATK:%d SPD:%d DEF:%d SPC:%d",
				c.Name, c.MartialArt, c.Stats.HP, c.Stats.ATK, c.Stats.SPD, c.Stats.DEF, c.Stats.Special)
		}
	}

	// Start matchmaking engine (background goroutine)
	if db.Redis != nil {
		mm := matchmaking.NewEngine(sugar)
		go mm.Start(ctx)
	}

	// Gin router
	r := gin.Default()

	// CORS middleware
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":     "ok",
			"game":       "Beast Arena",
			"characters": len(game.DefaultRegistry.GetAll()),
			"db":         db.Pool != nil,
			"redis":      db.Redis != nil,
		})
	})

	// === Public routes ===

	// Auth (guest login)
	r.POST("/api/auth/guest", auth.GuestLogin)

	// Characters (public)
	r.GET("/api/characters", api.ListCharacters)

	// Leaderboard (public)
	r.GET("/api/leaderboard", api.GetLeaderboard)

	// === Protected routes (require JWT) ===
	protected := r.Group("/api")
	protected.Use(auth.AuthMiddleware())
	{
		// Player profile
		protected.GET("/player/profile/:id", api.GetProfile)
		protected.PATCH("/player/profile", api.UpdateProfile)

		// Matchmaking
		protected.POST("/match/find", api.FindMatch)
		protected.POST("/match/practice", api.StartPractice)
		protected.GET("/match/:id", api.GetMatch)
		protected.GET("/match/history", api.GetMatchHistory)
	}

	// WebSocket for game (auth handled inside)
	r.GET("/ws/game", ws.HandleGameConnection)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	sugar.Infof("🐯 Beast Arena server starting on :%s", port)

	// Graceful shutdown
	go func() {
		if err := r.Run(":" + port); err != nil {
			log.Fatal(err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	sugar.Info("Shutting down...")
	cancel()
	db.Close()
	sugar.Info("Server stopped")
}
