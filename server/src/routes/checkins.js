const express = require('express');
const db = require('../db/config');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ============================================
// DAILY CHECK-INS
// ============================================

// Get today's check-in (or specified date)
router.get('/', authenticate, async (req, res) => {
    try {
        const { date } = req.query;
        const checkDate = date ? new Date(date) : new Date();

        const result = await db.query(
            `SELECT * FROM daily_checkins
             WHERE user_id = $1 AND check_date = $2::date`,
            [req.user.id, checkDate]
        );

        res.json({
            checkin: result.rows.length > 0 ? result.rows[0] : null,
            hasCheckedIn: result.rows.length > 0
        });

    } catch (error) {
        console.error('Get checkin error:', error);
        res.status(500).json({ error: 'Failed to get check-in' });
    }
});

// Get check-in history
router.get('/history', authenticate, async (req, res) => {
    try {
        const { limit = 30, offset = 0 } = req.query;

        const result = await db.query(
            `SELECT * FROM daily_checkins
             WHERE user_id = $1
             ORDER BY check_date DESC
             LIMIT $2 OFFSET $3`,
            [req.user.id, limit, offset]
        );

        // Get summary stats
        const statsResult = await db.query(
            `SELECT
                COUNT(*) as total_checkins,
                ROUND(AVG(energy_level), 1) as avg_energy,
                ROUND(AVG(soreness_level), 1) as avg_soreness,
                ROUND(AVG(sleep_quality), 1) as avg_sleep,
                SUM(xp_awarded) as total_xp_earned
             FROM daily_checkins
             WHERE user_id = $1`,
            [req.user.id]
        );

        res.json({
            checkins: result.rows,
            stats: statsResult.rows[0]
        });

    } catch (error) {
        console.error('Get checkin history error:', error);
        res.status(500).json({ error: 'Failed to get check-in history' });
    }
});

// Create daily check-in
router.post('/', authenticate, async (req, res) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const { energyLevel, sorenessLevel, sleepQuality, mood, notes } = req.body;
        const checkDate = new Date();

        // Validate inputs
        if (energyLevel && (energyLevel < 1 || energyLevel > 5)) {
            return res.status(400).json({ error: 'Energy level must be between 1 and 5' });
        }
        if (sorenessLevel && (sorenessLevel < 1 || sorenessLevel > 5)) {
            return res.status(400).json({ error: 'Soreness level must be between 1 and 5' });
        }
        if (sleepQuality && (sleepQuality < 1 || sleepQuality > 5)) {
            return res.status(400).json({ error: 'Sleep quality must be between 1 and 5' });
        }
        if (mood && !['great', 'good', 'okay', 'tired', 'stressed'].includes(mood)) {
            return res.status(400).json({ error: 'Invalid mood value' });
        }

        // Check if already checked in today
        const existing = await client.query(
            `SELECT id FROM daily_checkins WHERE user_id = $1 AND check_date = $2::date`,
            [req.user.id, checkDate]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Already checked in today' });
        }

        // Award XP for check-in
        const xpAwarded = 5;

        // Create check-in
        const result = await client.query(
            `INSERT INTO daily_checkins (user_id, check_date, energy_level, soreness_level, sleep_quality, mood, notes, xp_awarded)
             VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [req.user.id, checkDate, energyLevel, sorenessLevel, sleepQuality, mood, notes, xpAwarded]
        );

        // Award XP to user
        await client.query(
            `UPDATE users SET xp = xp + $1 WHERE id = $2`,
            [xpAwarded, req.user.id]
        );

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Check-in recorded',
            checkin: result.rows[0],
            xpAwarded
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create checkin error:', error);
        res.status(500).json({ error: 'Failed to create check-in' });
    } finally {
        client.release();
    }
});

// Update today's check-in
router.put('/', authenticate, async (req, res) => {
    try {
        const { energyLevel, sorenessLevel, sleepQuality, mood, notes } = req.body;
        const checkDate = new Date();

        const result = await db.query(
            `UPDATE daily_checkins
             SET energy_level = COALESCE($1, energy_level),
                 soreness_level = COALESCE($2, soreness_level),
                 sleep_quality = COALESCE($3, sleep_quality),
                 mood = COALESCE($4, mood),
                 notes = COALESCE($5, notes)
             WHERE user_id = $6 AND check_date = $7::date
             RETURNING *`,
            [energyLevel, sorenessLevel, sleepQuality, mood, notes, req.user.id, checkDate]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No check-in found for today' });
        }

        res.json({ checkin: result.rows[0] });

    } catch (error) {
        console.error('Update checkin error:', error);
        res.status(500).json({ error: 'Failed to update check-in' });
    }
});

// Get check-in streak
router.get('/streak', authenticate, async (req, res) => {
    try {
        // Get consecutive check-in days
        const result = await db.query(
            `WITH dates AS (
                SELECT check_date,
                       check_date - (ROW_NUMBER() OVER (ORDER BY check_date))::int AS grp
                FROM daily_checkins
                WHERE user_id = $1
                ORDER BY check_date DESC
             ),
             streaks AS (
                SELECT MIN(check_date) as start_date,
                       MAX(check_date) as end_date,
                       COUNT(*) as streak_length
                FROM dates
                GROUP BY grp
                ORDER BY end_date DESC
             )
             SELECT * FROM streaks LIMIT 1`,
            [req.user.id]
        );

        const currentStreak = result.rows.length > 0 ? result.rows[0] : null;

        // Check if streak is current (includes today or yesterday)
        let isActive = false;
        if (currentStreak) {
            const endDate = new Date(currentStreak.end_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            isActive = endDate >= yesterday;
        }

        res.json({
            streak: {
                current: isActive && currentStreak ? parseInt(currentStreak.streak_length) : 0,
                startDate: currentStreak?.start_date,
                isActive
            }
        });

    } catch (error) {
        console.error('Get checkin streak error:', error);
        res.status(500).json({ error: 'Failed to get check-in streak' });
    }
});

// ============================================
// QUICK QUESTS
// ============================================

// Get available quests for today
router.get('/quests', authenticate, async (req, res) => {
    try {
        const today = new Date();

        // Get all active quests
        const questsResult = await db.query(
            `SELECT * FROM quick_quests WHERE is_active = true`
        );

        // Get user's completions for today
        const completionsResult = await db.query(
            `SELECT quest_id FROM user_quest_completions
             WHERE user_id = $1 AND completed_date = $2::date`,
            [req.user.id, today]
        );

        const completedIds = new Set(completionsResult.rows.map(r => r.quest_id));

        // Mark quests as completed or available
        const quests = questsResult.rows.map(quest => ({
            ...quest,
            completed: completedIds.has(quest.id)
        }));

        res.json({ quests });

    } catch (error) {
        console.error('Get quests error:', error);
        res.status(500).json({ error: 'Failed to get quests' });
    }
});

// Complete a quest
router.post('/quests/:id/complete', authenticate, async (req, res) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const today = new Date();

        // Get quest
        const questResult = await client.query(
            `SELECT * FROM quick_quests WHERE id = $1 AND is_active = true`,
            [id]
        );

        if (questResult.rows.length === 0) {
            return res.status(404).json({ error: 'Quest not found' });
        }

        const quest = questResult.rows[0];

        // Check if already completed today
        const existingCompletion = await client.query(
            `SELECT id FROM user_quest_completions
             WHERE user_id = $1 AND quest_id = $2 AND completed_date = $3::date`,
            [req.user.id, id, today]
        );

        if (existingCompletion.rows.length > 0) {
            return res.status(400).json({ error: 'Quest already completed today' });
        }

        // Record completion
        await client.query(
            `INSERT INTO user_quest_completions (user_id, quest_id, completed_date, xp_awarded)
             VALUES ($1, $2, $3::date, $4)`,
            [req.user.id, id, today, quest.xp_reward]
        );

        // Award XP to user
        await client.query(
            `UPDATE users SET xp = xp + $1 WHERE id = $2`,
            [quest.xp_reward, req.user.id]
        );

        await client.query('COMMIT');

        res.json({
            message: 'Quest completed',
            quest: {
                id: quest.id,
                title: quest.title
            },
            xpAwarded: quest.xp_reward
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Complete quest error:', error);
        res.status(500).json({ error: 'Failed to complete quest' });
    } finally {
        client.release();
    }
});

// Get quest completion history
router.get('/quests/history', authenticate, async (req, res) => {
    try {
        const { limit = 30 } = req.query;

        const result = await db.query(
            `SELECT uqc.*, qq.title, qq.description, qq.quest_type
             FROM user_quest_completions uqc
             JOIN quick_quests qq ON qq.id = uqc.quest_id
             WHERE uqc.user_id = $1
             ORDER BY uqc.completed_date DESC
             LIMIT $2`,
            [req.user.id, limit]
        );

        // Get total stats
        const statsResult = await db.query(
            `SELECT
                COUNT(*) as total_completed,
                SUM(xp_awarded) as total_xp
             FROM user_quest_completions
             WHERE user_id = $1`,
            [req.user.id]
        );

        res.json({
            completions: result.rows,
            stats: statsResult.rows[0]
        });

    } catch (error) {
        console.error('Get quest history error:', error);
        res.status(500).json({ error: 'Failed to get quest history' });
    }
});

// Get weekly wellness summary
router.get('/summary', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT
                check_date,
                energy_level,
                soreness_level,
                sleep_quality,
                mood
             FROM daily_checkins
             WHERE user_id = $1
               AND check_date >= CURRENT_DATE - INTERVAL '7 days'
             ORDER BY check_date DESC`,
            [req.user.id]
        );

        // Calculate trends
        const checkins = result.rows;
        let trends = null;

        if (checkins.length >= 2) {
            const recent = checkins.slice(0, Math.floor(checkins.length / 2));
            const older = checkins.slice(Math.floor(checkins.length / 2));

            const avgRecent = {
                energy: recent.reduce((sum, c) => sum + (c.energy_level || 0), 0) / recent.length,
                soreness: recent.reduce((sum, c) => sum + (c.soreness_level || 0), 0) / recent.length,
                sleep: recent.reduce((sum, c) => sum + (c.sleep_quality || 0), 0) / recent.length
            };

            const avgOlder = {
                energy: older.reduce((sum, c) => sum + (c.energy_level || 0), 0) / older.length,
                soreness: older.reduce((sum, c) => sum + (c.soreness_level || 0), 0) / older.length,
                sleep: older.reduce((sum, c) => sum + (c.sleep_quality || 0), 0) / older.length
            };

            trends = {
                energy: avgRecent.energy - avgOlder.energy,
                soreness: avgRecent.soreness - avgOlder.soreness,
                sleep: avgRecent.sleep - avgOlder.sleep
            };
        }

        res.json({
            checkins,
            trends,
            daysCheckedIn: checkins.length
        });

    } catch (error) {
        console.error('Get wellness summary error:', error);
        res.status(500).json({ error: 'Failed to get wellness summary' });
    }
});

module.exports = router;
