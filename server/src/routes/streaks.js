const express = require('express');
const db = require('../db/config');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ============================================
// STREAK INFO
// ============================================

// Get user's streak info
router.get('/', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT current_streak, longest_streak, streak_shields,
                    streak_freeze_until, streak_freeze_days, last_workout_date
             FROM users WHERE id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        // Check if currently frozen
        const isFrozen = user.streak_freeze_until &&
            new Date(user.streak_freeze_until) > new Date();

        res.json({
            streak: {
                current: user.current_streak || 0,
                longest: user.longest_streak || 0,
                shields: user.streak_shields || 0,
                freezeDaysRemaining: user.streak_freeze_days || 0,
                frozenUntil: user.streak_freeze_until,
                isFrozen,
                lastWorkoutDate: user.last_workout_date
            }
        });

    } catch (error) {
        console.error('Get streak error:', error);
        res.status(500).json({ error: 'Failed to get streak info' });
    }
});

// ============================================
// STREAK FREEZE
// ============================================

// Activate streak freeze
router.post('/freeze', authenticate, async (req, res) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const { days = 1 } = req.body;

        if (days < 1 || days > 7) {
            return res.status(400).json({ error: 'Freeze duration must be between 1 and 7 days' });
        }

        // Check if user has freeze available
        const userResult = await client.query(
            `SELECT streak_freeze_days, streak_freeze_until FROM users WHERE id = $1`,
            [req.user.id]
        );

        const user = userResult.rows[0];

        // Check if already frozen
        if (user.streak_freeze_until && new Date(user.streak_freeze_until) > new Date()) {
            return res.status(400).json({ error: 'Streak is already frozen' });
        }

        // Check if user has enough freeze days
        if ((user.streak_freeze_days || 0) < days) {
            return res.status(400).json({
                error: 'Not enough freeze days available',
                available: user.streak_freeze_days || 0,
                requested: days
            });
        }

        // Calculate freeze end date
        const freezeUntil = new Date();
        freezeUntil.setDate(freezeUntil.getDate() + days);

        // Activate freeze
        await client.query(
            `UPDATE users
             SET streak_freeze_until = $1,
                 streak_freeze_days = streak_freeze_days - $2
             WHERE id = $3`,
            [freezeUntil, days, req.user.id]
        );

        // Log the freeze
        await client.query(
            `INSERT INTO streak_freeze_log (user_id, freeze_type, expires_at, days_protected)
             VALUES ($1, 'freeze', $2, $3)`,
            [req.user.id, freezeUntil, days]
        );

        await client.query('COMMIT');

        res.json({
            message: 'Streak freeze activated',
            freezeUntil,
            daysUsed: days,
            daysRemaining: (user.streak_freeze_days || 0) - days
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Activate freeze error:', error);
        res.status(500).json({ error: 'Failed to activate streak freeze' });
    } finally {
        client.release();
    }
});

// Use streak shield (forgive 1 missed day)
router.post('/shield', authenticate, async (req, res) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // Check if user has shields
        const userResult = await client.query(
            `SELECT streak_shields, current_streak FROM users WHERE id = $1`,
            [req.user.id]
        );

        const user = userResult.rows[0];

        if ((user.streak_shields || 0) < 1) {
            return res.status(400).json({ error: 'No streak shields available' });
        }

        // Use shield
        await client.query(
            `UPDATE users
             SET streak_shields = streak_shields - 1
             WHERE id = $1`,
            [req.user.id]
        );

        // Log the shield usage
        await client.query(
            `INSERT INTO streak_freeze_log (user_id, freeze_type, days_protected)
             VALUES ($1, 'shield', 1)`,
            [req.user.id]
        );

        await client.query('COMMIT');

        res.json({
            message: 'Streak shield used',
            shieldsRemaining: (user.streak_shields || 0) - 1
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Use shield error:', error);
        res.status(500).json({ error: 'Failed to use streak shield' });
    } finally {
        client.release();
    }
});

// Get freeze/shield history
router.get('/history', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, freeze_type, activated_at, expires_at, days_protected
             FROM streak_freeze_log
             WHERE user_id = $1
             ORDER BY activated_at DESC
             LIMIT 20`,
            [req.user.id]
        );

        res.json({ history: result.rows });

    } catch (error) {
        console.error('Get freeze history error:', error);
        res.status(500).json({ error: 'Failed to get freeze history' });
    }
});

// ============================================
// STREAK WAGERS
// ============================================

// Create a new wager
router.post('/wagers', authenticate, async (req, res) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const { wagerType, opponentId, xpStake, targetDays } = req.body;

        // Validation
        if (!wagerType || !['solo', 'head_to_head', 'group'].includes(wagerType)) {
            return res.status(400).json({ error: 'Invalid wager type' });
        }

        if (!xpStake || xpStake < 10 || xpStake > 1000) {
            return res.status(400).json({ error: 'XP stake must be between 10 and 1000' });
        }

        if (!targetDays || targetDays < 3 || targetDays > 30) {
            return res.status(400).json({ error: 'Target days must be between 3 and 30' });
        }

        // Check if user has enough XP to stake
        const userResult = await client.query(
            `SELECT xp FROM users WHERE id = $1`,
            [req.user.id]
        );

        if (userResult.rows[0].xp < xpStake) {
            return res.status(400).json({ error: 'Not enough XP to stake' });
        }

        // For head_to_head, verify opponent exists
        if (wagerType === 'head_to_head') {
            if (!opponentId) {
                return res.status(400).json({ error: 'Opponent required for head-to-head wager' });
            }

            const opponentResult = await client.query(
                `SELECT id, xp FROM users WHERE id = $1`,
                [opponentId]
            );

            if (opponentResult.rows.length === 0) {
                return res.status(404).json({ error: 'Opponent not found' });
            }
        }

        // Calculate dates
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + targetDays);

        // Create wager
        const result = await client.query(
            `INSERT INTO streak_wagers (user_id, wager_type, opponent_id, xp_stake, target_days, start_date, end_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, wager_type, xp_stake, target_days, start_date, end_date, status`,
            [req.user.id, wagerType, opponentId || null, xpStake, targetDays, startDate, endDate]
        );

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Wager created',
            wager: result.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create wager error:', error);
        res.status(500).json({ error: 'Failed to create wager' });
    } finally {
        client.release();
    }
});

// Get active wagers
router.get('/wagers', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT sw.id, sw.wager_type, sw.xp_stake, sw.target_days,
                    sw.start_date, sw.end_date, sw.status, sw.created_at,
                    u.username as opponent_username, u.avatar as opponent_avatar
             FROM streak_wagers sw
             LEFT JOIN users u ON u.id = sw.opponent_id
             WHERE sw.user_id = $1 OR sw.opponent_id = $1
             ORDER BY sw.created_at DESC`,
            [req.user.id]
        );

        // Separate active and completed wagers
        const active = result.rows.filter(w => w.status === 'active');
        const completed = result.rows.filter(w => w.status !== 'active');

        res.json({
            wagers: {
                active,
                completed
            }
        });

    } catch (error) {
        console.error('Get wagers error:', error);
        res.status(500).json({ error: 'Failed to get wagers' });
    }
});

// Get single wager details
router.get('/wagers/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            `SELECT sw.*,
                    u1.username as user_username, u1.current_streak as user_streak,
                    u2.username as opponent_username, u2.current_streak as opponent_streak
             FROM streak_wagers sw
             JOIN users u1 ON u1.id = sw.user_id
             LEFT JOIN users u2 ON u2.id = sw.opponent_id
             WHERE sw.id = $1 AND (sw.user_id = $2 OR sw.opponent_id = $2)`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Wager not found' });
        }

        res.json({ wager: result.rows[0] });

    } catch (error) {
        console.error('Get wager error:', error);
        res.status(500).json({ error: 'Failed to get wager' });
    }
});

// Cancel a wager (only before start date or if opponent hasn't accepted)
router.post('/wagers/:id/cancel', authenticate, async (req, res) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const { id } = req.params;

        const wagerResult = await client.query(
            `SELECT * FROM streak_wagers WHERE id = $1 AND user_id = $2 AND status = 'active'`,
            [id, req.user.id]
        );

        if (wagerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Wager not found or cannot be cancelled' });
        }

        const wager = wagerResult.rows[0];

        // Can only cancel if it's the first day
        const startDate = new Date(wager.start_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);

        if (today > startDate) {
            return res.status(400).json({ error: 'Cannot cancel wager after start date' });
        }

        // Cancel the wager
        await client.query(
            `UPDATE streak_wagers SET status = 'cancelled', resolved_at = NOW() WHERE id = $1`,
            [id]
        );

        await client.query('COMMIT');

        res.json({ message: 'Wager cancelled' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Cancel wager error:', error);
        res.status(500).json({ error: 'Failed to cancel wager' });
    } finally {
        client.release();
    }
});

// ============================================
// STREAK CALCULATION HELPERS
// ============================================

// Update streak (called after workout completion)
router.post('/update', authenticate, async (req, res) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const userResult = await client.query(
            `SELECT current_streak, longest_streak, last_workout_date, streak_freeze_until
             FROM users WHERE id = $1`,
            [req.user.id]
        );

        const user = userResult.rows[0];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let newStreak = user.current_streak || 0;
        const lastWorkout = user.last_workout_date ? new Date(user.last_workout_date) : null;

        if (lastWorkout) {
            lastWorkout.setHours(0, 0, 0, 0);
            const daysDiff = Math.floor((today - lastWorkout) / (1000 * 60 * 60 * 24));

            if (daysDiff === 0) {
                // Same day, no change
            } else if (daysDiff === 1) {
                // Consecutive day
                newStreak += 1;
            } else {
                // Check if frozen during gap
                const frozenUntil = user.streak_freeze_until ? new Date(user.streak_freeze_until) : null;
                if (frozenUntil && frozenUntil > lastWorkout) {
                    // Was frozen, maintain streak
                    newStreak += 1;
                } else {
                    // Streak broken
                    newStreak = 1;
                }
            }
        } else {
            // First workout
            newStreak = 1;
        }

        const longestStreak = Math.max(user.longest_streak || 0, newStreak);

        // Update user
        await client.query(
            `UPDATE users
             SET current_streak = $1,
                 longest_streak = $2,
                 last_workout_date = $3
             WHERE id = $4`,
            [newStreak, longestStreak, today, req.user.id]
        );

        await client.query('COMMIT');

        res.json({
            streak: {
                current: newStreak,
                longest: longestStreak,
                isNewRecord: newStreak > (user.longest_streak || 0)
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update streak error:', error);
        res.status(500).json({ error: 'Failed to update streak' });
    } finally {
        client.release();
    }
});

module.exports = router;
