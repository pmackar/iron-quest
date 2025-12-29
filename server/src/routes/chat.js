const express = require('express');
const db = require('../db/config');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get team chat messages
router.get('/team/:teamId/messages', authenticate, async (req, res) => {
    try {
        const { teamId } = req.params;
        const { limit = 50, before } = req.query;

        // Check if user is a member
        const memberCheck = await db.query(
            'SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2',
            [teamId, req.user.id]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Not a team member' });
        }

        let query = `
            SELECT tm.id, tm.message, tm.created_at,
                   u.id as user_id, u.username, u.avatar
            FROM team_messages tm
            JOIN users u ON u.id = tm.user_id
            WHERE tm.team_id = $1
        `;

        const params = [teamId];

        if (before) {
            query += ` AND tm.created_at < $2`;
            params.push(before);
        }

        query += ` ORDER BY tm.created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await db.query(query, params);

        // Return in chronological order
        res.json({ messages: result.rows.reverse() });

    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Failed to get messages' });
    }
});

// Post message (HTTP fallback for when Socket.io isn't available)
router.post('/team/:teamId/messages', authenticate, async (req, res) => {
    try {
        const { teamId } = req.params;
        const { message } = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Check if user is a member
        const memberCheck = await db.query(
            'SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2',
            [teamId, req.user.id]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Not a team member' });
        }

        const result = await db.query(
            `INSERT INTO team_messages (team_id, user_id, message)
             VALUES ($1, $2, $3)
             RETURNING id, created_at`,
            [teamId, req.user.id, message.trim()]
        );

        res.status(201).json({
            message: {
                id: result.rows[0].id,
                message: message.trim(),
                createdAt: result.rows[0].created_at,
                userId: req.user.id,
                username: req.user.username
            }
        });

    } catch (error) {
        console.error('Post message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

module.exports = router;
