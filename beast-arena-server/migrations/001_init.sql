-- Beast Arena: Initial schema
-- Run: psql -f migrations/001_init.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Players table (MVP: guest auth, no wallet)
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name VARCHAR(50) NOT NULL,
    guest_token VARCHAR(255) UNIQUE,
    wins INT NOT NULL DEFAULT 0,
    losses INT NOT NULL DEFAULT 0,
    rank_points INT NOT NULL DEFAULT 1000,
    selected_character VARCHAR(32) DEFAULT 'tiger',
    free_practice_left INT NOT NULL DEFAULT 5,
    free_practice_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player1_id UUID NOT NULL REFERENCES players(id),
    player2_id UUID REFERENCES players(id),         -- NULL for practice (AI)
    winner_id UUID REFERENCES players(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',   -- pending, active, completed, cancelled
    mode VARCHAR(20) NOT NULL DEFAULT 'practice',    -- pvp, practice
    stage_id VARCHAR(50) NOT NULL DEFAULT 'ancient_temple',
    p1_character VARCHAR(32) NOT NULL,
    p2_character VARCHAR(32) NOT NULL,
    rounds JSONB DEFAULT '[]'::jsonb,                -- round results
    final_p1_hp INT DEFAULT 0,
    final_p2_hp INT DEFAULT 0,
    duration_seconds INT DEFAULT 0,
    max_combo INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_matches_player1 ON matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_player2 ON matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_players_rank ON players(rank_points DESC);
CREATE INDEX IF NOT EXISTS idx_players_guest_token ON players(guest_token);

-- Daily leaderboard view
CREATE OR REPLACE VIEW leaderboard AS
SELECT id, display_name, wins, losses, rank_points,
       RANK() OVER (ORDER BY rank_points DESC) as rank
FROM players
WHERE wins + losses > 0
ORDER BY rank_points DESC
LIMIT 100;
