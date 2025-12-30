-- Iron Quest Database Schema
-- PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE, -- Nullable for Clerk SSO users without email
    password_hash VARCHAR(255), -- Nullable for Google OAuth users
    username VARCHAR(50) UNIQUE NOT NULL,
    avatar INTEGER DEFAULT 1,
    height_feet INTEGER,
    height_inches INTEGER,
    weight INTEGER,
    gender VARCHAR(20),
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    xp_to_next INTEGER DEFAULT 100,
    total_workouts INTEGER DEFAULT 0,
    total_sets INTEGER DEFAULT 0,
    total_weight BIGINT DEFAULT 0,
    achievements TEXT[] DEFAULT '{}',
    -- OAuth fields
    google_id VARCHAR(255) UNIQUE,
    google_email VARCHAR(255),
    google_avatar_url TEXT,
    clerk_id VARCHAR(255) UNIQUE, -- Clerk SSO
    auth_provider VARCHAR(20) DEFAULT 'email', -- 'email', 'google', 'clerk'
    role VARCHAR(20) DEFAULT 'user', -- 'user', 'coach'
    last_sync_at TIMESTAMP WITH TIME ZONE, -- For offline sync
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Index for OAuth lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);

-- ============================================
-- PERSONAL RECORDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS personal_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id VARCHAR(100) NOT NULL,
    weight INTEGER NOT NULL,
    achieved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, exercise_id)
);

-- ============================================
-- WORKOUTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS workouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    duration INTEGER, -- in seconds
    total_sets INTEGER DEFAULT 0,
    total_volume INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- WORKOUT EXERCISES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS workout_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id VARCHAR(100) NOT NULL,
    exercise_name VARCHAR(100) NOT NULL,
    order_index INTEGER DEFAULT 0
);

-- ============================================
-- EXERCISE SETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS exercise_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL,
    weight INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CUSTOM EXERCISES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS custom_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    muscle_group VARCHAR(50),
    equipment VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CUSTOM WORKOUTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS custom_workouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(10) DEFAULT '💪',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CUSTOM WORKOUT EXERCISES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS custom_workout_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    custom_workout_id UUID NOT NULL REFERENCES custom_workouts(id) ON DELETE CASCADE,
    exercise_id VARCHAR(100) NOT NULL,
    exercise_name VARCHAR(100) NOT NULL,
    target_sets INTEGER DEFAULT 3,
    order_index INTEGER DEFAULT 0
);

-- ============================================
-- TEAMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    avatar VARCHAR(50) DEFAULT 'shield',
    invite_code VARCHAR(8) UNIQUE NOT NULL,
    level INTEGER DEFAULT 1,
    total_xp BIGINT DEFAULT 0,
    weekly_xp INTEGER DEFAULT 0,
    captain_id UUID NOT NULL REFERENCES users(id),
    max_members INTEGER DEFAULT 20,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TEAM MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member', -- captain, co-captain, member
    contribution_xp INTEGER DEFAULT 0,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, user_id)
);

-- ============================================
-- TEAM CHALLENGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS team_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    target_type VARCHAR(50) NOT NULL, -- xp, workouts, volume, sets
    target_value INTEGER NOT NULL,
    current_value INTEGER DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    reward_xp INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ACTIVITY FEED TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS activity_feed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- workout, pr, achievement, level_up, join_team
    title VARCHAR(200) NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TEAM MESSAGES (CHAT) TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS team_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- COACH SHARES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS coach_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    share_code VARCHAR(32) UNIQUE NOT NULL,
    coach_email VARCHAR(255),
    permissions TEXT[] DEFAULT '{"view_stats", "view_history"}',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CHARACTERS TABLE (Game Save Slots)
-- ============================================
CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slot_index INTEGER NOT NULL CHECK (slot_index >= 0 AND slot_index < 4),
    character_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, slot_index)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_completed_at ON workouts(completed_at);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_workout_exercise_id ON exercise_sets(workout_exercise_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_team_id ON activity_feed(team_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_id ON activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON activity_feed(created_at);
CREATE INDEX IF NOT EXISTS idx_team_messages_team_id ON team_messages(team_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_user_id ON personal_records(user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to teams table
DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to generate invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS VARCHAR(8) AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result VARCHAR(8) := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CAMPAIGNS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE, -- NULL for personal campaigns
    title VARCHAR(100) NOT NULL,
    description TEXT,
    campaign_type VARCHAR(20) NOT NULL, -- 'personal', 'team'
    target_date DATE NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_campaigns_creator ON campaigns(creator_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_team ON campaigns(team_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_target_date ON campaigns(target_date);

-- ============================================
-- CAMPAIGN GOALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS campaign_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    exercise_id VARCHAR(100) NOT NULL,
    exercise_name VARCHAR(100) NOT NULL,
    goal_type VARCHAR(20) NOT NULL, -- '1rm', 'reps', 'tonnage'
    target_weight INTEGER, -- For 1RM and rep goals
    target_reps INTEGER, -- For rep goals (e.g., 315x5)
    target_tonnage BIGINT, -- For tonnage goals
    current_value INTEGER DEFAULT 0, -- Current progress
    is_achieved BOOLEAN DEFAULT false,
    achieved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_campaign_goals_campaign ON campaign_goals(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_goals_exercise ON campaign_goals(exercise_id);

-- ============================================
-- COACH-CLIENT RELATIONSHIPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS coach_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'revoked'
    permissions TEXT[] DEFAULT '{"view_workouts", "view_stats", "view_progress", "assign_campaigns"}',
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(coach_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_coach_clients_coach ON coach_clients(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_clients_client ON coach_clients(client_id);

-- ============================================
-- OFFLINE SYNC QUEUE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'workout', 'pr', 'campaign_progress'
    payload JSONB NOT NULL,
    client_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    synced BOOLEAN DEFAULT false,
    synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_user ON sync_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_unsynced ON sync_queue(user_id, synced) WHERE synced = false;
