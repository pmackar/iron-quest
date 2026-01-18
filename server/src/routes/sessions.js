const express = require('express');
const db = require('../db/config');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Generate session code
function generateSessionCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// ============================================
// WORKOUT SESSIONS (Partner Workouts)
// ============================================

// Get user's active sessions
router.get('/', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT ws.*,
                    host.username as host_username, host.avatar as host_avatar,
                    partner.username as partner_username, partner.avatar as partner_avatar
             FROM workout_sessions ws
             JOIN users host ON host.id = ws.host_user_id
             LEFT JOIN users partner ON partner.id = ws.partner_user_id
             WHERE (ws.host_user_id = $1 OR ws.partner_user_id = $1)
               AND ws.status IN ('waiting', 'active')
             ORDER BY ws.started_at DESC`,
            [req.user.id]
        );

        res.json({ sessions: result.rows });

    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ error: 'Failed to get sessions' });
    }
});

// Get session history
router.get('/history', authenticate, async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        const result = await db.query(
            `SELECT ws.*,
                    host.username as host_username, host.avatar as host_avatar,
                    partner.username as partner_username, partner.avatar as partner_avatar
             FROM workout_sessions ws
             JOIN users host ON host.id = ws.host_user_id
             LEFT JOIN users partner ON partner.id = ws.partner_user_id
             WHERE (ws.host_user_id = $1 OR ws.partner_user_id = $1)
               AND ws.status = 'completed'
             ORDER BY ws.ended_at DESC
             LIMIT $2`,
            [req.user.id, limit]
        );

        res.json({ sessions: result.rows });

    } catch (error) {
        console.error('Get session history error:', error);
        res.status(500).json({ error: 'Failed to get session history' });
    }
});

// Create new session (host a partner workout)
router.post('/', authenticate, async (req, res) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const { workoutId } = req.body;

        // Generate unique session code
        let sessionCode;
        let codeExists = true;
        while (codeExists) {
            sessionCode = generateSessionCode();
            const check = await client.query(
                `SELECT id FROM workout_sessions WHERE session_code = $1 AND status IN ('waiting', 'active')`,
                [sessionCode]
            );
            codeExists = check.rows.length > 0;
        }

        // Create session
        const result = await client.query(
            `INSERT INTO workout_sessions (host_user_id, workout_id, session_code, status)
             VALUES ($1, $2, $3, 'waiting')
             RETURNING *`,
            [req.user.id, workoutId || null, sessionCode]
        );

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Session created',
            session: {
                ...result.rows[0],
                host_username: req.user.username
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create session error:', error);
        res.status(500).json({ error: 'Failed to create session' });
    } finally {
        client.release();
    }
});

// Get session by ID
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            `SELECT ws.*,
                    host.username as host_username, host.avatar as host_avatar, host.level as host_level,
                    partner.username as partner_username, partner.avatar as partner_avatar, partner.level as partner_level
             FROM workout_sessions ws
             JOIN users host ON host.id = ws.host_user_id
             LEFT JOIN users partner ON partner.id = ws.partner_user_id
             WHERE ws.id = $1 AND (ws.host_user_id = $2 OR ws.partner_user_id = $2)`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json({ session: result.rows[0] });

    } catch (error) {
        console.error('Get session error:', error);
        res.status(500).json({ error: 'Failed to get session' });
    }
});

// Join session by code
router.post('/join', authenticate, async (req, res) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const { sessionCode } = req.body;

        if (!sessionCode) {
            return res.status(400).json({ error: 'Session code is required' });
        }

        // Find session
        const sessionResult = await client.query(
            `SELECT ws.*, u.username as host_username
             FROM workout_sessions ws
             JOIN users u ON u.id = ws.host_user_id
             WHERE ws.session_code = $1 AND ws.status = 'waiting'`,
            [sessionCode.toUpperCase()]
        );

        if (sessionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found or no longer available' });
        }

        const session = sessionResult.rows[0];

        // Check if trying to join own session
        if (session.host_user_id === req.user.id) {
            return res.status(400).json({ error: 'Cannot join your own session' });
        }

        // Check if session already has a partner
        if (session.partner_user_id) {
            return res.status(400).json({ error: 'Session already has a partner' });
        }

        // Join session
        const result = await client.query(
            `UPDATE workout_sessions
             SET partner_user_id = $1, status = 'active', last_activity_at = NOW()
             WHERE id = $2
             RETURNING *`,
            [req.user.id, session.id]
        );

        // Add system message
        await client.query(
            `INSERT INTO session_updates (session_id, user_id, update_type, data)
             VALUES ($1, $2, 'message', $3)`,
            [session.id, req.user.id, JSON.stringify({ text: `${req.user.username} joined the workout!` })]
        );

        await client.query('COMMIT');

        res.json({
            message: 'Joined session',
            session: {
                ...result.rows[0],
                host_username: session.host_username,
                partner_username: req.user.username
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Join session error:', error);
        res.status(500).json({ error: 'Failed to join session' });
    } finally {
        client.release();
    }
});

// Leave/end session
router.post('/:id/leave', authenticate, async (req, res) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const { id } = req.params;

        const sessionResult = await client.query(
            `SELECT * FROM workout_sessions WHERE id = $1`,
            [id]
        );

        if (sessionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const session = sessionResult.rows[0];

        // Check if user is part of session
        if (session.host_user_id !== req.user.id && session.partner_user_id !== req.user.id) {
            return res.status(403).json({ error: 'Not part of this session' });
        }

        if (session.host_user_id === req.user.id) {
            // Host ending session
            await client.query(
                `UPDATE workout_sessions
                 SET status = $1, ended_at = NOW()
                 WHERE id = $2`,
                [session.partner_user_id ? 'completed' : 'cancelled', id]
            );
        } else {
            // Partner leaving
            await client.query(
                `UPDATE workout_sessions
                 SET partner_user_id = NULL, status = 'waiting', last_activity_at = NOW()
                 WHERE id = $1`,
                [id]
            );

            // Add leave message
            await client.query(
                `INSERT INTO session_updates (session_id, user_id, update_type, data)
                 VALUES ($1, $2, 'message', $3)`,
                [id, req.user.id, JSON.stringify({ text: `${req.user.username} left the workout` })]
            );
        }

        await client.query('COMMIT');

        res.json({ message: 'Left session' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Leave session error:', error);
        res.status(500).json({ error: 'Failed to leave session' });
    } finally {
        client.release();
    }
});

// ============================================
// SESSION UPDATES (Real-time Progress)
// ============================================

// Get session updates (for polling)
router.get('/:id/updates', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { since } = req.query;

        // Verify access
        const accessCheck = await db.query(
            `SELECT id FROM workout_sessions
             WHERE id = $1 AND (host_user_id = $2 OR partner_user_id = $2)`,
            [id, req.user.id]
        );

        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Access denied' });
        }

        let query = `
            SELECT su.*, u.username, u.avatar
            FROM session_updates su
            JOIN users u ON u.id = su.user_id
            WHERE su.session_id = $1
        `;

        const params = [id];

        if (since) {
            query += ` AND su.created_at > $2`;
            params.push(since);
        }

        query += ` ORDER BY su.created_at ASC LIMIT 100`;

        const result = await db.query(query, params);

        // Update session last activity
        await db.query(
            `UPDATE workout_sessions SET last_activity_at = NOW() WHERE id = $1`,
            [id]
        );

        res.json({ updates: result.rows });

    } catch (error) {
        console.error('Get updates error:', error);
        res.status(500).json({ error: 'Failed to get updates' });
    }
});

// Post update (set complete, message, cheer)
router.post('/:id/updates', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { updateType, data } = req.body;

        // Validate update type
        const validTypes = ['set_complete', 'exercise_complete', 'workout_complete', 'message', 'cheer'];
        if (!validTypes.includes(updateType)) {
            return res.status(400).json({ error: 'Invalid update type' });
        }

        // Verify access
        const accessCheck = await db.query(
            `SELECT id FROM workout_sessions
             WHERE id = $1 AND (host_user_id = $2 OR partner_user_id = $2)
               AND status = 'active'`,
            [id, req.user.id]
        );

        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Session not found or not active' });
        }

        // Create update
        const result = await db.query(
            `INSERT INTO session_updates (session_id, user_id, update_type, data)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [id, req.user.id, updateType, JSON.stringify(data || {})]
        );

        // Update session activity
        await db.query(
            `UPDATE workout_sessions SET last_activity_at = NOW() WHERE id = $1`,
            [id]
        );

        res.status(201).json({
            update: {
                ...result.rows[0],
                username: req.user.username
            }
        });

    } catch (error) {
        console.error('Post update error:', error);
        res.status(500).json({ error: 'Failed to post update' });
    }
});

// Send cheer to partner
router.post('/:id/cheer', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { cheerType = 'general' } = req.body;

        const cheers = {
            general: ['Let\'s go! 💪', 'You got this!', 'Keep pushing!', 'Great work!'],
            pr: ['New PR incoming! 🏆', 'Beast mode activated!', 'Crushing it!'],
            encouragement: ['Don\'t give up!', 'Almost there!', 'One more rep!', 'Dig deep!']
        };

        const cheerMessages = cheers[cheerType] || cheers.general;
        const cheerMessage = cheerMessages[Math.floor(Math.random() * cheerMessages.length)];

        const result = await db.query(
            `INSERT INTO session_updates (session_id, user_id, update_type, data)
             VALUES ($1, $2, 'cheer', $3)
             RETURNING *`,
            [id, req.user.id, JSON.stringify({ message: cheerMessage, type: cheerType })]
        );

        res.status(201).json({
            update: {
                ...result.rows[0],
                username: req.user.username
            }
        });

    } catch (error) {
        console.error('Send cheer error:', error);
        res.status(500).json({ error: 'Failed to send cheer' });
    }
});

// ============================================
// SHARE TEMPLATES
// ============================================

// Create share template
router.post('/share', authenticate, async (req, res) => {
    try {
        const { templateType, templateData } = req.body;

        const validTypes = ['workout_summary', 'achievement', 'streak', 'pr', 'level_up'];
        if (!validTypes.includes(templateType)) {
            return res.status(400).json({ error: 'Invalid template type' });
        }

        // Generate share URL (in production, this would be a real shareable link)
        const shareId = require('crypto').randomBytes(8).toString('hex');
        const shareUrl = `/share/${shareId}`;

        // Set expiry (7 days)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const result = await db.query(
            `INSERT INTO share_templates (user_id, template_type, template_data, share_url, expires_at)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [req.user.id, templateType, JSON.stringify(templateData), shareUrl, expiresAt]
        );

        res.status(201).json({
            share: result.rows[0]
        });

    } catch (error) {
        console.error('Create share error:', error);
        res.status(500).json({ error: 'Failed to create share' });
    }
});

// Get share template (public)
router.get('/share/:shareUrl', async (req, res) => {
    try {
        const { shareUrl } = req.params;

        const result = await db.query(
            `SELECT st.*, u.username, u.avatar, u.level
             FROM share_templates st
             JOIN users u ON u.id = st.user_id
             WHERE st.share_url = $1
               AND (st.expires_at IS NULL OR st.expires_at > NOW())`,
            [`/share/${shareUrl}`]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Share not found or expired' });
        }

        // Increment view count
        await db.query(
            `UPDATE share_templates SET view_count = view_count + 1 WHERE id = $1`,
            [result.rows[0].id]
        );

        res.json({ share: result.rows[0] });

    } catch (error) {
        console.error('Get share error:', error);
        res.status(500).json({ error: 'Failed to get share' });
    }
});

// Get user's shares
router.get('/shares', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM share_templates
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT 20`,
            [req.user.id]
        );

        res.json({ shares: result.rows });

    } catch (error) {
        console.error('Get shares error:', error);
        res.status(500).json({ error: 'Failed to get shares' });
    }
});

// Delete share
router.delete('/share/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            `DELETE FROM share_templates WHERE id = $1 AND user_id = $2 RETURNING id`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Share not found' });
        }

        res.json({ message: 'Share deleted' });

    } catch (error) {
        console.error('Delete share error:', error);
        res.status(500).json({ error: 'Failed to delete share' });
    }
});

module.exports = router;
