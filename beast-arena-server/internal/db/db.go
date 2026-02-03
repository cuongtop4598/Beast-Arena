package db

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

var (
	Pool  *pgxpool.Pool
	Redis *redis.Client
	Log   *zap.SugaredLogger
)

// InitPostgres creates a connection pool to PostgreSQL
func InitPostgres(ctx context.Context, logger *zap.SugaredLogger) error {
	Log = logger
	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		dbURL = "postgres://beast:arena@localhost:5432/beast_arena?sslmode=disable"
	}

	config, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		return fmt.Errorf("parse db config: %w", err)
	}

	config.MaxConns = 20
	config.MinConns = 2
	config.MaxConnIdleTime = 5 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return fmt.Errorf("create pool: %w", err)
	}

	// Test connection
	if err := pool.Ping(ctx); err != nil {
		return fmt.Errorf("ping db: %w", err)
	}

	Pool = pool
	logger.Info("PostgreSQL connected")
	return nil
}

// InitRedis creates a Redis client
func InitRedis(ctx context.Context, logger *zap.SugaredLogger) error {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379"
	}

	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return fmt.Errorf("parse redis url: %w", err)
	}

	client := redis.NewClient(opts)
	if err := client.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("ping redis: %w", err)
	}

	Redis = client
	logger.Info("Redis connected")
	return nil
}

// Close cleanly shuts down all connections
func Close() {
	if Pool != nil {
		Pool.Close()
	}
	if Redis != nil {
		Redis.Close()
	}
}
