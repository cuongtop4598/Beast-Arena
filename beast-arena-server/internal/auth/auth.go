package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"math/big"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/beast-arena/server/internal/db"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var jwtSecret []byte

func init() {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "dev-secret-change-in-production"
	}
	jwtSecret = []byte(secret)
}

// Player represents a player record
type Player struct {
	ID                string    `json:"id"`
	DisplayName       string    `json:"display_name"`
	GuestToken        string    `json:"-"`
	Wins              int       `json:"wins"`
	Losses            int       `json:"losses"`
	RankPoints        int       `json:"rank_points"`
	SelectedCharacter string    `json:"selected_character"`
	FreePracticeLeft  int       `json:"free_practice_left"`
	CreatedAt         time.Time `json:"created_at"`
}

// Claims for JWT
type Claims struct {
	PlayerID string `json:"player_id"`
	jwt.RegisteredClaims
}

// GenerateJWT creates a JWT token for a player
func GenerateJWT(playerID string) (string, error) {
	claims := Claims{
		PlayerID: playerID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)), // 7 days
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "beast-arena",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// ValidateJWT parses and validates a JWT token
func ValidateJWT(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return claims, nil
}

// generateGuestToken creates a random guest token
func generateGuestToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// generateDisplayName creates a fun random name
func generateDisplayName() string {
	animals := []string{"Tiger", "Lion", "Croc", "Eagle", "Wolf", "Bear", "Hawk", "Shark"}
	n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(animals))))
	num, _ := rand.Int(rand.Reader, big.NewInt(9999))
	return fmt.Sprintf("%s_%04d", animals[n.Int64()], num.Int64())
}

// GuestLogin creates a new guest account or logs in with existing token
func GuestLogin(c *gin.Context) {
	ctx := context.Background()

	var req struct {
		GuestToken string `json:"guest_token,omitempty"`
	}
	c.ShouldBindJSON(&req)

	// Try to login with existing guest token
	if req.GuestToken != "" {
		var p Player
		err := db.Pool.QueryRow(ctx,
			`SELECT id, display_name, wins, losses, rank_points, selected_character, free_practice_left
			 FROM players WHERE guest_token = $1`, req.GuestToken,
		).Scan(&p.ID, &p.DisplayName, &p.Wins, &p.Losses, &p.RankPoints, &p.SelectedCharacter, &p.FreePracticeLeft)

		if err == nil {
			// Check and reset daily free practice
			resetFreePractice(ctx, p.ID)

			token, _ := GenerateJWT(p.ID)
			c.JSON(http.StatusOK, gin.H{
				"player_id":           p.ID,
				"display_name":        p.DisplayName,
				"token":               token,
				"guest_token":         req.GuestToken,
				"wins":                p.Wins,
				"losses":              p.Losses,
				"rank_points":         p.RankPoints,
				"selected_character":  p.SelectedCharacter,
				"free_practice_left":  p.FreePracticeLeft,
			})
			return
		}
	}

	// Create new guest account
	playerID := uuid.New().String()
	guestToken := generateGuestToken()
	displayName := generateDisplayName()

	_, err := db.Pool.Exec(ctx,
		`INSERT INTO players (id, display_name, guest_token, free_practice_reset_at)
		 VALUES ($1, $2, $3, $4)`,
		playerID, displayName, guestToken, time.Now().UTC().Truncate(24*time.Hour).Add(24*time.Hour),
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create account"})
		return
	}

	token, _ := GenerateJWT(playerID)
	c.JSON(http.StatusOK, gin.H{
		"player_id":          playerID,
		"display_name":       displayName,
		"token":              token,
		"guest_token":        guestToken,
		"wins":               0,
		"losses":             0,
		"rank_points":        1000,
		"selected_character": "tiger",
		"free_practice_left": 5,
		"is_new":             true,
	})
}

// resetFreePractice resets practice turns if a new day
func resetFreePractice(ctx context.Context, playerID string) {
	db.Pool.Exec(ctx,
		`UPDATE players SET free_practice_left = 5, free_practice_reset_at = $1
		 WHERE id = $2 AND free_practice_reset_at < NOW()`,
		time.Now().UTC().Truncate(24*time.Hour).Add(24*time.Hour), playerID,
	)
}

// AuthMiddleware validates JWT token from Authorization header
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing authorization"})
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		claims, err := ValidateJWT(tokenStr)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		c.Set("player_id", claims.PlayerID)
		c.Next()
	}
}
