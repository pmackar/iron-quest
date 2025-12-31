-- PostgreSQL Schema for Iron Quest
-- Run this to set up your database when you're ready to migrate from CSV

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar INTEGER DEFAULT 1,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    xp_to_next INTEGER DEFAULT 100,
    total_workouts INTEGER DEFAULT 0,
    total_volume INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Workouts table
CREATE TABLE workouts (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    duration INTEGER NOT NULL,
    total_sets INTEGER DEFAULT 0,
    total_volume INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    exercises JSONB DEFAULT '[]',
    completed_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_workouts_user_id ON workouts(user_id);
CREATE INDEX idx_workouts_completed_at ON workouts(completed_at DESC);

-- Personal Records table
CREATE TABLE personal_records (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id VARCHAR(100) NOT NULL,
    exercise_name VARCHAR(255) NOT NULL,
    weight DECIMAL(10,2) NOT NULL,
    achieved_at TIMESTAMPTZ NOT NULL,
    UNIQUE(user_id, exercise_id)
);

CREATE INDEX idx_personal_records_user_id ON personal_records(user_id);

-- Custom Exercises table
CREATE TABLE custom_exercises (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    muscle_group VARCHAR(100),
    equipment VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_custom_exercises_user_id ON custom_exercises(user_id);

-- Characters (game saves) table
CREATE TABLE characters (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slot_index INTEGER NOT NULL CHECK (slot_index >= 0 AND slot_index <= 3),
    name VARCHAR(100) NOT NULL,
    game_state JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, slot_index)
);

CREATE INDEX idx_characters_user_id ON characters(user_id);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_characters_updated_at
    BEFORE UPDATE ON characters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (for multi-tenant isolation)
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies should be added based on your auth strategy
-- Example policy (uncomment when using RLS):
-- CREATE POLICY workouts_user_isolation ON workouts
--     FOR ALL
--     USING (user_id = current_setting('app.current_user_id')::VARCHAR);
