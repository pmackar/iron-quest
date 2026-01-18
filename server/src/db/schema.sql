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

-- ============================================
-- RLS HELPER FUNCTION
-- ============================================
-- This function retrieves the current user ID from session variables
-- Set via: SET LOCAL app.current_user_id = 'uuid-here';
CREATE OR REPLACE FUNCTION current_user_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_id', true), '')::UUID;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PHASE 1: STREAK PROTECTION SYSTEM
-- ============================================

-- Add streak freeze columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_shields INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_freeze_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_freeze_days INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_workout_date DATE;

-- Streak Wagers Table
CREATE TABLE IF NOT EXISTS streak_wagers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wager_type VARCHAR(20) NOT NULL CHECK (wager_type IN ('solo', 'head_to_head', 'group')),
    opponent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    xp_stake INTEGER NOT NULL CHECK (xp_stake > 0),
    target_days INTEGER NOT NULL CHECK (target_days > 0),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_streak_wagers_user ON streak_wagers(user_id);
CREATE INDEX IF NOT EXISTS idx_streak_wagers_opponent ON streak_wagers(opponent_id);
CREATE INDEX IF NOT EXISTS idx_streak_wagers_status ON streak_wagers(status) WHERE status = 'active';

-- Enable RLS on streak_wagers
ALTER TABLE streak_wagers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for streak_wagers
CREATE POLICY streak_wagers_select ON streak_wagers
    FOR SELECT USING (
        user_id = current_user_id() OR opponent_id = current_user_id()
    );

CREATE POLICY streak_wagers_insert ON streak_wagers
    FOR INSERT WITH CHECK (user_id = current_user_id());

CREATE POLICY streak_wagers_update ON streak_wagers
    FOR UPDATE USING (
        user_id = current_user_id() OR opponent_id = current_user_id()
    );

-- Streak Freeze Log (track usage)
CREATE TABLE IF NOT EXISTS streak_freeze_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    freeze_type VARCHAR(20) NOT NULL CHECK (freeze_type IN ('shield', 'freeze')),
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    days_protected INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_streak_freeze_log_user ON streak_freeze_log(user_id);

ALTER TABLE streak_freeze_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY streak_freeze_log_select ON streak_freeze_log
    FOR SELECT USING (user_id = current_user_id());

CREATE POLICY streak_freeze_log_insert ON streak_freeze_log
    FOR INSERT WITH CHECK (user_id = current_user_id());

-- ============================================
-- PHASE 2: CLUBS FEATURE
-- ============================================

-- Archetype Guilds (System-Managed)
CREATE TABLE IF NOT EXISTS archetype_guilds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    archetype VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(10) DEFAULT '⚔️',
    member_count INTEGER DEFAULT 0,
    total_volume BIGINT DEFAULT 0,
    weekly_volume BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_archetype_guilds_archetype ON archetype_guilds(archetype);

ALTER TABLE archetype_guilds ENABLE ROW LEVEL SECURITY;

-- Guilds are readable by everyone (system-managed)
CREATE POLICY archetype_guilds_select ON archetype_guilds
    FOR SELECT USING (true);

-- Guild Members
CREATE TABLE IF NOT EXISTS guild_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id UUID NOT NULL REFERENCES archetype_guilds(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contribution_xp INTEGER DEFAULT 0,
    contribution_volume BIGINT DEFAULT 0,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(guild_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_guild_members_guild ON guild_members(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_user ON guild_members(user_id);

ALTER TABLE guild_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY guild_members_select ON guild_members
    FOR SELECT USING (true);

CREATE POLICY guild_members_insert ON guild_members
    FOR INSERT WITH CHECK (user_id = current_user_id());

CREATE POLICY guild_members_update ON guild_members
    FOR UPDATE USING (user_id = current_user_id());

CREATE POLICY guild_members_delete ON guild_members
    FOR DELETE USING (user_id = current_user_id());

-- Guild Messages
CREATE TABLE IF NOT EXISTS guild_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id UUID NOT NULL REFERENCES archetype_guilds(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'chat' CHECK (message_type IN ('chat', 'system', 'achievement')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_guild_messages_guild ON guild_messages(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_messages_created ON guild_messages(created_at);

ALTER TABLE guild_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY guild_messages_select ON guild_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM guild_members WHERE guild_id = guild_messages.guild_id AND user_id = current_user_id())
    );

CREATE POLICY guild_messages_insert ON guild_messages
    FOR INSERT WITH CHECK (
        user_id = current_user_id() AND
        EXISTS (SELECT 1 FROM guild_members WHERE guild_id = guild_messages.guild_id AND user_id = current_user_id())
    );

-- Custom Clubs (User-Created)
CREATE TABLE IF NOT EXISTS clubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(10) DEFAULT '🏋️',
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invite_code VARCHAR(8) UNIQUE NOT NULL,
    max_members INTEGER DEFAULT 50,
    is_public BOOLEAN DEFAULT false,
    total_xp BIGINT DEFAULT 0,
    weekly_xp INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clubs_owner ON clubs(owner_id);
CREATE INDEX IF NOT EXISTS idx_clubs_invite_code ON clubs(invite_code);

ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY clubs_select ON clubs
    FOR SELECT USING (
        is_public = true OR
        owner_id = current_user_id() OR
        EXISTS (SELECT 1 FROM club_members WHERE club_id = clubs.id AND user_id = current_user_id())
    );

CREATE POLICY clubs_insert ON clubs
    FOR INSERT WITH CHECK (owner_id = current_user_id());

CREATE POLICY clubs_update ON clubs
    FOR UPDATE USING (owner_id = current_user_id());

CREATE POLICY clubs_delete ON clubs
    FOR DELETE USING (owner_id = current_user_id());

-- Club Members
CREATE TABLE IF NOT EXISTS club_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    contribution_xp INTEGER DEFAULT 0,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(club_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_club_members_club ON club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_user ON club_members(user_id);

ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY club_members_select ON club_members
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_members.club_id AND cm.user_id = current_user_id())
        OR EXISTS (SELECT 1 FROM clubs WHERE id = club_members.club_id AND is_public = true)
    );

CREATE POLICY club_members_insert ON club_members
    FOR INSERT WITH CHECK (user_id = current_user_id());

CREATE POLICY club_members_update ON club_members
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM clubs WHERE id = club_members.club_id AND owner_id = current_user_id())
        OR EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_members.club_id AND cm.user_id = current_user_id() AND cm.role IN ('owner', 'admin'))
    );

CREATE POLICY club_members_delete ON club_members
    FOR DELETE USING (
        user_id = current_user_id() OR
        EXISTS (SELECT 1 FROM clubs WHERE id = club_members.club_id AND owner_id = current_user_id())
    );

-- Club Messages
CREATE TABLE IF NOT EXISTS club_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'chat' CHECK (message_type IN ('chat', 'system', 'announcement')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_club_messages_club ON club_messages(club_id);
CREATE INDEX IF NOT EXISTS idx_club_messages_created ON club_messages(created_at);

ALTER TABLE club_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY club_messages_select ON club_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM club_members WHERE club_id = club_messages.club_id AND user_id = current_user_id())
    );

CREATE POLICY club_messages_insert ON club_messages
    FOR INSERT WITH CHECK (
        user_id = current_user_id() AND
        EXISTS (SELECT 1 FROM club_members WHERE club_id = club_messages.club_id AND user_id = current_user_id())
    );

-- Club Challenges
CREATE TABLE IF NOT EXISTS club_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('xp', 'workouts', 'volume', 'sets')),
    target_value INTEGER NOT NULL,
    current_value INTEGER DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    reward_xp INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_club_challenges_club ON club_challenges(club_id);

ALTER TABLE club_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY club_challenges_select ON club_challenges
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM club_members WHERE club_id = club_challenges.club_id AND user_id = current_user_id())
    );

CREATE POLICY club_challenges_insert ON club_challenges
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM club_members WHERE club_id = club_challenges.club_id AND user_id = current_user_id() AND role IN ('owner', 'admin'))
    );

CREATE POLICY club_challenges_update ON club_challenges
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM club_members WHERE club_id = club_challenges.club_id AND user_id = current_user_id() AND role IN ('owner', 'admin'))
    );

-- ============================================
-- PHASE 3: MICRO-ENGAGEMENT
-- ============================================

-- Daily Check-ins
CREATE TABLE IF NOT EXISTS daily_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    check_date DATE NOT NULL,
    energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
    soreness_level INTEGER CHECK (soreness_level BETWEEN 1 AND 5),
    sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),
    mood VARCHAR(20) CHECK (mood IN ('great', 'good', 'okay', 'tired', 'stressed')),
    notes TEXT,
    xp_awarded INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, check_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_user ON daily_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_date ON daily_checkins(check_date);

ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY daily_checkins_select ON daily_checkins
    FOR SELECT USING (user_id = current_user_id());

CREATE POLICY daily_checkins_insert ON daily_checkins
    FOR INSERT WITH CHECK (user_id = current_user_id());

CREATE POLICY daily_checkins_update ON daily_checkins
    FOR UPDATE USING (user_id = current_user_id());

-- Quick Quests (Rest Day Challenges)
CREATE TABLE IF NOT EXISTS quick_quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(100) NOT NULL,
    description TEXT,
    quest_type VARCHAR(30) NOT NULL CHECK (quest_type IN ('REST_DAY_MOBILITY', 'REST_DAY_WALK', 'REST_DAY_RECOVERY', 'REST_DAY_HYDRATION', 'REST_DAY_STRETCH')),
    xp_reward INTEGER DEFAULT 15,
    duration_minutes INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE quick_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY quick_quests_select ON quick_quests
    FOR SELECT USING (true);

-- User Quest Completions
CREATE TABLE IF NOT EXISTS user_quest_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quest_id UUID NOT NULL REFERENCES quick_quests(id) ON DELETE CASCADE,
    completed_date DATE NOT NULL,
    xp_awarded INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, quest_id, completed_date)
);

CREATE INDEX IF NOT EXISTS idx_user_quest_completions_user ON user_quest_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quest_completions_date ON user_quest_completions(completed_date);

ALTER TABLE user_quest_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_quest_completions_select ON user_quest_completions
    FOR SELECT USING (user_id = current_user_id());

CREATE POLICY user_quest_completions_insert ON user_quest_completions
    FOR INSERT WITH CHECK (user_id = current_user_id());

-- ============================================
-- PHASE 4: RIVAL SYSTEM
-- ============================================

-- Fitness Rivals Table
CREATE TABLE IF NOT EXISTS fitness_rivals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rival_type VARCHAR(20) NOT NULL CHECK (rival_type IN ('phantom', 'friend')),
    rival_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    -- Phantom data (for AI rivals)
    phantom_name VARCHAR(50),
    phantom_archetype VARCHAR(50),
    phantom_personality VARCHAR(20) CHECK (phantom_personality IN ('friendly', 'competitive', 'trash_talker', 'stoic', 'mentor')),
    phantom_level INTEGER DEFAULT 1,
    phantom_stats JSONB,
    -- Rivalry stats
    total_encounters INTEGER DEFAULT 0,
    user_wins INTEGER DEFAULT 0,
    rival_wins INTEGER DEFAULT 0,
    current_win_streak INTEGER DEFAULT 0,
    respect_points INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'dormant', 'defeated', 'nemesis')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fitness_rivals_user ON fitness_rivals(user_id);
CREATE INDEX IF NOT EXISTS idx_fitness_rivals_rival_user ON fitness_rivals(rival_user_id);

ALTER TABLE fitness_rivals ENABLE ROW LEVEL SECURITY;

CREATE POLICY fitness_rivals_select ON fitness_rivals
    FOR SELECT USING (
        user_id = current_user_id() OR rival_user_id = current_user_id()
    );

CREATE POLICY fitness_rivals_insert ON fitness_rivals
    FOR INSERT WITH CHECK (user_id = current_user_id());

CREATE POLICY fitness_rivals_update ON fitness_rivals
    FOR UPDATE USING (user_id = current_user_id());

CREATE POLICY fitness_rivals_delete ON fitness_rivals
    FOR DELETE USING (user_id = current_user_id());

-- Rival Messages (Chat)
CREATE TABLE IF NOT EXISTS rival_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rival_id UUID NOT NULL REFERENCES fitness_rivals(id) ON DELETE CASCADE,
    sender VARCHAR(20) NOT NULL CHECK (sender IN ('user', 'rival')),
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'chat' CHECK (message_type IN ('chat', 'taunt', 'challenge', 'congratulate', 'system')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rival_messages_rival ON rival_messages(rival_id);
CREATE INDEX IF NOT EXISTS idx_rival_messages_created ON rival_messages(created_at);

ALTER TABLE rival_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY rival_messages_select ON rival_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM fitness_rivals WHERE id = rival_messages.rival_id AND (user_id = current_user_id() OR rival_user_id = current_user_id()))
    );

CREATE POLICY rival_messages_insert ON rival_messages
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM fitness_rivals WHERE id = rival_messages.rival_id AND (user_id = current_user_id() OR rival_user_id = current_user_id()))
    );

CREATE POLICY rival_messages_update ON rival_messages
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM fitness_rivals WHERE id = rival_messages.rival_id AND (user_id = current_user_id() OR rival_user_id = current_user_id()))
    );

-- Rival Encounters (Battles/Showdowns)
CREATE TABLE IF NOT EXISTS rival_encounters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rival_id UUID NOT NULL REFERENCES fitness_rivals(id) ON DELETE CASCADE,
    encounter_type VARCHAR(30) NOT NULL CHECK (encounter_type IN ('weekly_showdown', 'challenge', 'revenge')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    -- User stats for the encounter
    user_volume BIGINT DEFAULT 0,
    user_workouts INTEGER DEFAULT 0,
    user_xp INTEGER DEFAULT 0,
    -- Rival stats for the encounter
    rival_volume BIGINT DEFAULT 0,
    rival_workouts INTEGER DEFAULT 0,
    rival_xp INTEGER DEFAULT 0,
    -- Results
    winner VARCHAR(10) CHECK (winner IN ('user', 'rival', 'tie', NULL)),
    xp_reward INTEGER DEFAULT 0,
    respect_change INTEGER DEFAULT 0,
    -- Revenge tracking
    revenge_available_until TIMESTAMP WITH TIME ZONE,
    is_revenge_of UUID REFERENCES rival_encounters(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_rival_encounters_rival ON rival_encounters(rival_id);
CREATE INDEX IF NOT EXISTS idx_rival_encounters_status ON rival_encounters(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_rival_encounters_dates ON rival_encounters(start_date, end_date);

ALTER TABLE rival_encounters ENABLE ROW LEVEL SECURITY;

CREATE POLICY rival_encounters_select ON rival_encounters
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM fitness_rivals WHERE id = rival_encounters.rival_id AND (user_id = current_user_id() OR rival_user_id = current_user_id()))
    );

CREATE POLICY rival_encounters_insert ON rival_encounters
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM fitness_rivals WHERE id = rival_encounters.rival_id AND user_id = current_user_id())
    );

CREATE POLICY rival_encounters_update ON rival_encounters
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM fitness_rivals WHERE id = rival_encounters.rival_id AND user_id = current_user_id())
    );

-- ============================================
-- PHASE 5: SOCIAL LAYER
-- ============================================

-- Workout Sessions (Async Workout Partners)
CREATE TABLE IF NOT EXISTS workout_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    host_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    partner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
    session_code VARCHAR(8) UNIQUE,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'cancelled')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_host ON workout_sessions(host_user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_partner ON workout_sessions(partner_user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_code ON workout_sessions(session_code);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_status ON workout_sessions(status) WHERE status IN ('waiting', 'active');

ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY workout_sessions_select ON workout_sessions
    FOR SELECT USING (
        host_user_id = current_user_id() OR partner_user_id = current_user_id()
    );

CREATE POLICY workout_sessions_insert ON workout_sessions
    FOR INSERT WITH CHECK (host_user_id = current_user_id());

CREATE POLICY workout_sessions_update ON workout_sessions
    FOR UPDATE USING (
        host_user_id = current_user_id() OR partner_user_id = current_user_id()
    );

-- Session Updates (Progress Feed)
CREATE TABLE IF NOT EXISTS session_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    update_type VARCHAR(30) NOT NULL CHECK (update_type IN ('set_complete', 'exercise_complete', 'workout_complete', 'message', 'cheer')),
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_session_updates_session ON session_updates(session_id);
CREATE INDEX IF NOT EXISTS idx_session_updates_created ON session_updates(created_at);

ALTER TABLE session_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY session_updates_select ON session_updates
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM workout_sessions WHERE id = session_updates.session_id AND (host_user_id = current_user_id() OR partner_user_id = current_user_id()))
    );

CREATE POLICY session_updates_insert ON session_updates
    FOR INSERT WITH CHECK (
        user_id = current_user_id() AND
        EXISTS (SELECT 1 FROM workout_sessions WHERE id = session_updates.session_id AND (host_user_id = current_user_id() OR partner_user_id = current_user_id()))
    );

-- Share Templates (for social sharing)
CREATE TABLE IF NOT EXISTS share_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_type VARCHAR(30) NOT NULL CHECK (template_type IN ('workout_summary', 'achievement', 'streak', 'pr', 'level_up')),
    template_data JSONB NOT NULL,
    share_url TEXT,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_share_templates_user ON share_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_share_templates_type ON share_templates(template_type);

ALTER TABLE share_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY share_templates_select ON share_templates
    FOR SELECT USING (true);

CREATE POLICY share_templates_insert ON share_templates
    FOR INSERT WITH CHECK (user_id = current_user_id());

CREATE POLICY share_templates_update ON share_templates
    FOR UPDATE USING (user_id = current_user_id());

CREATE POLICY share_templates_delete ON share_templates
    FOR DELETE USING (user_id = current_user_id());

-- ============================================
-- PHASE 6: PREDICTIVE ANALYTICS
-- ============================================

-- PR Predictions
CREATE TABLE IF NOT EXISTS pr_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id VARCHAR(100) NOT NULL,
    exercise_name VARCHAR(100) NOT NULL,
    current_pr INTEGER,
    predicted_weight INTEGER NOT NULL,
    predicted_date DATE NOT NULL,
    confidence DECIMAL(3,2) CHECK (confidence BETWEEN 0 AND 1),
    based_on_sets INTEGER NOT NULL,
    model_version VARCHAR(20) DEFAULT 'v1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    achieved BOOLEAN DEFAULT false,
    achieved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_pr_predictions_user ON pr_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_pr_predictions_exercise ON pr_predictions(user_id, exercise_id);

ALTER TABLE pr_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY pr_predictions_select ON pr_predictions
    FOR SELECT USING (user_id = current_user_id());

CREATE POLICY pr_predictions_insert ON pr_predictions
    FOR INSERT WITH CHECK (user_id = current_user_id());

CREATE POLICY pr_predictions_update ON pr_predictions
    FOR UPDATE USING (user_id = current_user_id());

-- Plateau Predictions
CREATE TABLE IF NOT EXISTS plateau_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id VARCHAR(100),
    prediction_type VARCHAR(30) NOT NULL CHECK (prediction_type IN ('strength', 'volume', 'frequency', 'overall')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    predicted_date DATE NOT NULL,
    confidence DECIMAL(3,2) CHECK (confidence BETWEEN 0 AND 1),
    recommendation TEXT,
    factors JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_plateau_predictions_user ON plateau_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_plateau_predictions_date ON plateau_predictions(predicted_date);

ALTER TABLE plateau_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY plateau_predictions_select ON plateau_predictions
    FOR SELECT USING (user_id = current_user_id());

CREATE POLICY plateau_predictions_insert ON plateau_predictions
    FOR INSERT WITH CHECK (user_id = current_user_id());

CREATE POLICY plateau_predictions_update ON plateau_predictions
    FOR UPDATE USING (user_id = current_user_id());

-- CNS Fatigue Tracking
CREATE TABLE IF NOT EXISTS cns_fatigue_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    -- Input factors
    compound_lift_load INTEGER,
    weekly_intensity DECIMAL(5,2),
    volume_spike DECIMAL(5,2),
    sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),
    -- Calculated scores
    fatigue_score INTEGER CHECK (fatigue_score BETWEEN 0 AND 100),
    recovery_days_recommended INTEGER,
    -- Output
    recommendation TEXT,
    training_readiness INTEGER CHECK (training_readiness BETWEEN 0 AND 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_cns_fatigue_logs_user ON cns_fatigue_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_cns_fatigue_logs_date ON cns_fatigue_logs(log_date);

ALTER TABLE cns_fatigue_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY cns_fatigue_logs_select ON cns_fatigue_logs
    FOR SELECT USING (user_id = current_user_id());

CREATE POLICY cns_fatigue_logs_insert ON cns_fatigue_logs
    FOR INSERT WITH CHECK (user_id = current_user_id());

CREATE POLICY cns_fatigue_logs_update ON cns_fatigue_logs
    FOR UPDATE USING (user_id = current_user_id());

-- Recovery Recommendations
CREATE TABLE IF NOT EXISTS recovery_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recommendation_date DATE NOT NULL,
    training_readiness_score INTEGER CHECK (training_readiness_score BETWEEN 0 AND 100),
    -- Component scores
    muscle_recovery_score INTEGER,
    cns_fatigue_score INTEGER,
    sleep_score INTEGER,
    soreness_score INTEGER,
    -- Recommendations
    recommended_intensity VARCHAR(20) CHECK (recommended_intensity IN ('deload', 'light', 'moderate', 'normal', 'push')),
    recommended_muscle_groups TEXT[],
    avoid_muscle_groups TEXT[],
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, recommendation_date)
);

CREATE INDEX IF NOT EXISTS idx_recovery_recommendations_user ON recovery_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recovery_recommendations_date ON recovery_recommendations(recommendation_date);

ALTER TABLE recovery_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY recovery_recommendations_select ON recovery_recommendations
    FOR SELECT USING (user_id = current_user_id());

CREATE POLICY recovery_recommendations_insert ON recovery_recommendations
    FOR INSERT WITH CHECK (user_id = current_user_id());

CREATE POLICY recovery_recommendations_update ON recovery_recommendations
    FOR UPDATE USING (user_id = current_user_id());

-- ============================================
-- SEED DATA: Default Quick Quests
-- ============================================
INSERT INTO quick_quests (title, description, quest_type, xp_reward, duration_minutes) VALUES
    ('Morning Stretch', 'Complete a 10-minute stretching routine to improve flexibility', 'REST_DAY_STRETCH', 15, 10),
    ('Mobility Flow', 'Work through joint mobility exercises for better range of motion', 'REST_DAY_MOBILITY', 20, 15),
    ('Recovery Walk', 'Take a 20-minute walk to promote active recovery', 'REST_DAY_WALK', 15, 20),
    ('Hydration Hero', 'Drink at least 8 glasses of water today', 'REST_DAY_HYDRATION', 10, 0),
    ('Foam Roll Session', 'Spend 15 minutes foam rolling major muscle groups', 'REST_DAY_RECOVERY', 20, 15),
    ('Deep Breathing', 'Practice 10 minutes of deep breathing exercises', 'REST_DAY_RECOVERY', 10, 10),
    ('Hip Opener Flow', 'Complete hip mobility exercises to counter sitting', 'REST_DAY_MOBILITY', 15, 10),
    ('Light Yoga', 'Follow a gentle yoga routine for recovery', 'REST_DAY_STRETCH', 25, 20)
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED DATA: Default Archetype Guilds
-- ============================================
INSERT INTO archetype_guilds (archetype, name, description, icon) VALUES
    ('powerlifter', 'The Iron Brotherhood', 'Masters of the big three: squat, bench, deadlift', '🏋️'),
    ('bodybuilder', 'Aesthetic Alliance', 'Sculptors of the perfect physique', '💪'),
    ('athlete', 'Performance Elite', 'Speed, power, and athletic excellence', '⚡'),
    ('endurance', 'The Endurance Order', 'Built for the long haul', '🏃'),
    ('hybrid', 'Balanced Warriors', 'Jack of all trades, master of adaptation', '⚔️'),
    ('functional', 'Movement Masters', 'Real-world strength and mobility', '🎯'),
    ('beginner', 'Rising Champions', 'Every master was once a beginner', '🌟')
ON CONFLICT (archetype) DO NOTHING;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update clubs updated_at
DROP TRIGGER IF EXISTS update_clubs_updated_at ON clubs;
CREATE TRIGGER update_clubs_updated_at
    BEFORE UPDATE ON clubs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update fitness_rivals updated_at
DROP TRIGGER IF EXISTS update_fitness_rivals_updated_at ON fitness_rivals;
CREATE TRIGGER update_fitness_rivals_updated_at
    BEFORE UPDATE ON fitness_rivals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
