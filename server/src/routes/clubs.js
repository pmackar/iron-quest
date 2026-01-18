const express = require('express');
const db = require('../db/config');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Generate invite code
function generateInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// ============================================
// ARCHETYPE GUILDS
// ============================================

// Get all guilds
router.get('/guilds', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT ag.*,
                    (SELECT COUNT(*) FROM guild_members WHERE guild_id = ag.id) as member_count
             FROM archetype_guilds ag
             ORDER BY member_count DESC`
        );

        res.json({ guilds: result.rows });

    } catch (error) {
        console.error('Get guilds error:', error);
        res.status(500).json({ error: 'Failed to get guilds' });
    }
});

// Get user's guild
router.get('/guilds/my', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT ag.*, gm.contribution_xp, gm.contribution_volume, gm.joined_at
             FROM guild_members gm
             JOIN archetype_guilds ag ON ag.id = gm.guild_id
             WHERE gm.user_id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.json({ guild: null });
        }

        res.json({ guild: result.rows[0] });

    } catch (error) {
        console.error('Get my guild error:', error);
        res.status(500).json({ error: 'Failed to get guild' });
    }
});

// Get single guild with details
router.get('/guilds/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        // Get guild info
        const guildResult = await db.query(
            `SELECT * FROM archetype_guilds WHERE id = $1`,
            [id]
        );

        if (guildResult.rows.length === 0) {
            return res.status(404).json({ error: 'Guild not found' });
        }

        const guild = guildResult.rows[0];

        // Get top members
        const membersResult = await db.query(
            `SELECT u.id, u.username, u.avatar, u.level,
                    gm.contribution_xp, gm.contribution_volume, gm.joined_at
             FROM guild_members gm
             JOIN users u ON u.id = gm.user_id
             WHERE gm.guild_id = $1
             ORDER BY gm.contribution_xp DESC
             LIMIT 20`,
            [id]
        );

        guild.topMembers = membersResult.rows;

        // Check if user is a member
        const memberCheck = await db.query(
            `SELECT id FROM guild_members WHERE guild_id = $1 AND user_id = $2`,
            [id, req.user.id]
        );
        guild.isMember = memberCheck.rows.length > 0;

        res.json({ guild });

    } catch (error) {
        console.error('Get guild error:', error);
        res.status(500).json({ error: 'Failed to get guild' });
    }
});

// Join guild (based on archetype)
router.post('/guilds/join', authenticate, async (req, res) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const { archetype } = req.body;

        if (!archetype) {
            return res.status(400).json({ error: 'Archetype is required' });
        }

        // Find or create guild for archetype
        let guildResult = await client.query(
            `SELECT id FROM archetype_guilds WHERE archetype = $1`,
            [archetype]
        );

        if (guildResult.rows.length === 0) {
            return res.status(404).json({ error: 'Guild not found for archetype' });
        }

        const guildId = guildResult.rows[0].id;

        // Check if already a member of any guild
        const existingMember = await client.query(
            `SELECT id FROM guild_members WHERE user_id = $1`,
            [req.user.id]
        );

        if (existingMember.rows.length > 0) {
            // Remove from previous guild
            await client.query(
                `DELETE FROM guild_members WHERE user_id = $1`,
                [req.user.id]
            );
        }

        // Add to new guild
        await client.query(
            `INSERT INTO guild_members (guild_id, user_id)
             VALUES ($1, $2)
             ON CONFLICT (guild_id, user_id) DO NOTHING`,
            [guildId, req.user.id]
        );

        // Update guild member count
        await client.query(
            `UPDATE archetype_guilds
             SET member_count = (SELECT COUNT(*) FROM guild_members WHERE guild_id = $1)
             WHERE id = $1`,
            [guildId]
        );

        await client.query('COMMIT');

        res.json({ message: 'Joined guild successfully', guildId });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Join guild error:', error);
        res.status(500).json({ error: 'Failed to join guild' });
    } finally {
        client.release();
    }
});

// Get guild messages
router.get('/guilds/:id/messages', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 50, before } = req.query;

        // Verify membership
        const memberCheck = await db.query(
            `SELECT id FROM guild_members WHERE guild_id = $1 AND user_id = $2`,
            [id, req.user.id]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Not a guild member' });
        }

        let query = `
            SELECT gm.id, gm.content, gm.message_type, gm.created_at,
                   u.id as user_id, u.username, u.avatar
            FROM guild_messages gm
            JOIN users u ON u.id = gm.user_id
            WHERE gm.guild_id = $1
        `;

        const params = [id];

        if (before) {
            query += ` AND gm.created_at < $2`;
            params.push(before);
        }

        query += ` ORDER BY gm.created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await db.query(query, params);

        res.json({ messages: result.rows.reverse() });

    } catch (error) {
        console.error('Get guild messages error:', error);
        res.status(500).json({ error: 'Failed to get messages' });
    }
});

// Post guild message
router.post('/guilds/:id/messages', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Message content is required' });
        }

        // Verify membership
        const memberCheck = await db.query(
            `SELECT id FROM guild_members WHERE guild_id = $1 AND user_id = $2`,
            [id, req.user.id]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Not a guild member' });
        }

        const result = await db.query(
            `INSERT INTO guild_messages (guild_id, user_id, content)
             VALUES ($1, $2, $3)
             RETURNING id, content, message_type, created_at`,
            [id, req.user.id, content.trim()]
        );

        res.status(201).json({
            message: {
                ...result.rows[0],
                userId: req.user.id,
                username: req.user.username
            }
        });

    } catch (error) {
        console.error('Post guild message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Get guild leaderboard
router.get('/guilds/:id/leaderboard', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { type = 'xp' } = req.query;

        let orderBy;
        switch (type) {
            case 'volume':
                orderBy = 'gm.contribution_volume DESC';
                break;
            default:
                orderBy = 'gm.contribution_xp DESC';
        }

        const result = await db.query(
            `SELECT u.id, u.username, u.avatar, u.level,
                    gm.contribution_xp, gm.contribution_volume, gm.joined_at
             FROM guild_members gm
             JOIN users u ON u.id = gm.user_id
             WHERE gm.guild_id = $1
             ORDER BY ${orderBy}
             LIMIT 50`,
            [id]
        );

        res.json({ leaderboard: result.rows });

    } catch (error) {
        console.error('Get guild leaderboard error:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
});

// ============================================
// CUSTOM CLUBS
// ============================================

// Get user's clubs
router.get('/', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT c.*, cm.role, cm.contribution_xp,
                    (SELECT COUNT(*) FROM club_members WHERE club_id = c.id) as member_count
             FROM clubs c
             JOIN club_members cm ON cm.club_id = c.id
             WHERE cm.user_id = $1
             ORDER BY c.created_at DESC`,
            [req.user.id]
        );

        res.json({ clubs: result.rows });

    } catch (error) {
        console.error('Get clubs error:', error);
        res.status(500).json({ error: 'Failed to get clubs' });
    }
});

// Create club
router.post('/', authenticate, async (req, res) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const { name, description, icon, isPublic } = req.body;

        if (!name || name.trim().length < 3) {
            return res.status(400).json({ error: 'Club name must be at least 3 characters' });
        }

        // Generate unique invite code
        let inviteCode;
        let codeExists = true;
        while (codeExists) {
            inviteCode = generateInviteCode();
            const check = await client.query(
                'SELECT id FROM clubs WHERE invite_code = $1',
                [inviteCode]
            );
            codeExists = check.rows.length > 0;
        }

        // Create club
        const clubResult = await client.query(
            `INSERT INTO clubs (name, description, icon, owner_id, invite_code, is_public)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, name, description, icon, invite_code, is_public, created_at`,
            [name.trim(), description || '', icon || '🏋️', req.user.id, inviteCode, isPublic || false]
        );

        const club = clubResult.rows[0];

        // Add owner as member with owner role
        await client.query(
            `INSERT INTO club_members (club_id, user_id, role)
             VALUES ($1, $2, 'owner')`,
            [club.id, req.user.id]
        );

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Club created',
            club: {
                ...club,
                memberCount: 1,
                role: 'owner'
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create club error:', error);
        res.status(500).json({ error: 'Failed to create club' });
    } finally {
        client.release();
    }
});

// Get single club
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        // Get club info
        const clubResult = await db.query(
            `SELECT c.*,
                    (SELECT COUNT(*) FROM club_members WHERE club_id = c.id) as member_count
             FROM clubs c
             WHERE c.id = $1`,
            [id]
        );

        if (clubResult.rows.length === 0) {
            return res.status(404).json({ error: 'Club not found' });
        }

        const club = clubResult.rows[0];

        // Check membership
        const memberCheck = await db.query(
            `SELECT role FROM club_members WHERE club_id = $1 AND user_id = $2`,
            [id, req.user.id]
        );

        if (memberCheck.rows.length === 0 && !club.is_public) {
            return res.status(403).json({ error: 'Not a member of this club' });
        }

        club.userRole = memberCheck.rows.length > 0 ? memberCheck.rows[0].role : null;
        club.isMember = memberCheck.rows.length > 0;

        // Get members
        const membersResult = await db.query(
            `SELECT u.id, u.username, u.avatar, u.level, cm.role, cm.contribution_xp, cm.joined_at
             FROM club_members cm
             JOIN users u ON u.id = cm.user_id
             WHERE cm.club_id = $1
             ORDER BY cm.contribution_xp DESC`,
            [id]
        );

        club.members = membersResult.rows;

        // Get active challenges
        const challengesResult = await db.query(
            `SELECT id, title, description, target_type, target_value, current_value,
                    start_date, end_date, is_completed, reward_xp
             FROM club_challenges
             WHERE club_id = $1 AND end_date > NOW()
             ORDER BY end_date ASC`,
            [id]
        );

        club.challenges = challengesResult.rows;

        res.json({ club });

    } catch (error) {
        console.error('Get club error:', error);
        res.status(500).json({ error: 'Failed to get club' });
    }
});

// Update club
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, icon, isPublic } = req.body;

        // Verify ownership
        const clubResult = await db.query(
            `SELECT owner_id FROM clubs WHERE id = $1`,
            [id]
        );

        if (clubResult.rows.length === 0) {
            return res.status(404).json({ error: 'Club not found' });
        }

        if (clubResult.rows[0].owner_id !== req.user.id) {
            return res.status(403).json({ error: 'Only the owner can update the club' });
        }

        const result = await db.query(
            `UPDATE clubs
             SET name = COALESCE($1, name),
                 description = COALESCE($2, description),
                 icon = COALESCE($3, icon),
                 is_public = COALESCE($4, is_public)
             WHERE id = $5
             RETURNING id, name, description, icon, is_public`,
            [name, description, icon, isPublic, id]
        );

        res.json({ club: result.rows[0] });

    } catch (error) {
        console.error('Update club error:', error);
        res.status(500).json({ error: 'Failed to update club' });
    }
});

// Join club by invite code
router.post('/join', authenticate, async (req, res) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const { inviteCode } = req.body;

        if (!inviteCode) {
            return res.status(400).json({ error: 'Invite code is required' });
        }

        // Find club
        const clubResult = await client.query(
            `SELECT id, name, max_members,
                    (SELECT COUNT(*) FROM club_members WHERE club_id = clubs.id) as member_count
             FROM clubs WHERE invite_code = $1`,
            [inviteCode.toUpperCase()]
        );

        if (clubResult.rows.length === 0) {
            return res.status(404).json({ error: 'Invalid invite code' });
        }

        const club = clubResult.rows[0];

        // Check if already a member
        const existingMember = await client.query(
            `SELECT id FROM club_members WHERE club_id = $1 AND user_id = $2`,
            [club.id, req.user.id]
        );

        if (existingMember.rows.length > 0) {
            return res.status(400).json({ error: 'Already a member of this club' });
        }

        // Check if club is full
        if (club.member_count >= club.max_members) {
            return res.status(400).json({ error: 'Club is full' });
        }

        // Add member
        await client.query(
            `INSERT INTO club_members (club_id, user_id, role)
             VALUES ($1, $2, 'member')`,
            [club.id, req.user.id]
        );

        await client.query('COMMIT');

        res.json({
            message: 'Joined club successfully',
            club: {
                id: club.id,
                name: club.name
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Join club error:', error);
        res.status(500).json({ error: 'Failed to join club' });
    } finally {
        client.release();
    }
});

// Leave club
router.post('/:id/leave', authenticate, async (req, res) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const { id } = req.params;

        // Check membership
        const memberCheck = await client.query(
            `SELECT role FROM club_members WHERE club_id = $1 AND user_id = $2`,
            [id, req.user.id]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(400).json({ error: 'Not a member of this club' });
        }

        // Check if owner
        if (memberCheck.rows[0].role === 'owner') {
            // Check if there are other members
            const memberCount = await client.query(
                `SELECT COUNT(*) as count FROM club_members WHERE club_id = $1`,
                [id]
            );

            if (parseInt(memberCount.rows[0].count) > 1) {
                return res.status(400).json({
                    error: 'Owner cannot leave. Transfer ownership first or remove other members.'
                });
            }

            // Delete club if owner is only member
            await client.query('DELETE FROM clubs WHERE id = $1', [id]);
        } else {
            // Remove member
            await client.query(
                `DELETE FROM club_members WHERE club_id = $1 AND user_id = $2`,
                [id, req.user.id]
            );
        }

        await client.query('COMMIT');

        res.json({ message: 'Left club successfully' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Leave club error:', error);
        res.status(500).json({ error: 'Failed to leave club' });
    } finally {
        client.release();
    }
});

// Get club messages
router.get('/:id/messages', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 50, before } = req.query;

        // Verify membership
        const memberCheck = await db.query(
            `SELECT id FROM club_members WHERE club_id = $1 AND user_id = $2`,
            [id, req.user.id]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Not a club member' });
        }

        let query = `
            SELECT cm.id, cm.content, cm.message_type, cm.created_at,
                   u.id as user_id, u.username, u.avatar
            FROM club_messages cm
            JOIN users u ON u.id = cm.user_id
            WHERE cm.club_id = $1
        `;

        const params = [id];

        if (before) {
            query += ` AND cm.created_at < $2`;
            params.push(before);
        }

        query += ` ORDER BY cm.created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await db.query(query, params);

        res.json({ messages: result.rows.reverse() });

    } catch (error) {
        console.error('Get club messages error:', error);
        res.status(500).json({ error: 'Failed to get messages' });
    }
});

// Post club message
router.post('/:id/messages', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Message content is required' });
        }

        // Verify membership
        const memberCheck = await db.query(
            `SELECT id FROM club_members WHERE club_id = $1 AND user_id = $2`,
            [id, req.user.id]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Not a club member' });
        }

        const result = await db.query(
            `INSERT INTO club_messages (club_id, user_id, content)
             VALUES ($1, $2, $3)
             RETURNING id, content, message_type, created_at`,
            [id, req.user.id, content.trim()]
        );

        res.status(201).json({
            message: {
                ...result.rows[0],
                userId: req.user.id,
                username: req.user.username
            }
        });

    } catch (error) {
        console.error('Post club message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Create club challenge
router.post('/:id/challenges', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, targetType, targetValue, endDate, rewardXp } = req.body;

        // Check if user is admin/owner
        const memberCheck = await db.query(
            `SELECT role FROM club_members WHERE club_id = $1 AND user_id = $2`,
            [id, req.user.id]
        );

        if (memberCheck.rows.length === 0 || !['owner', 'admin'].includes(memberCheck.rows[0].role)) {
            return res.status(403).json({ error: 'Only club leaders can create challenges' });
        }

        const result = await db.query(
            `INSERT INTO club_challenges (club_id, title, description, target_type, target_value, end_date, reward_xp, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, title, target_type, target_value, current_value, end_date`,
            [id, title, description, targetType, targetValue, endDate, rewardXp || 0, req.user.id]
        );

        res.status(201).json({ challenge: result.rows[0] });

    } catch (error) {
        console.error('Create challenge error:', error);
        res.status(500).json({ error: 'Failed to create challenge' });
    }
});

// Get club leaderboard
router.get('/:id/leaderboard', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            `SELECT u.id, u.username, u.avatar, u.level,
                    cm.role, cm.contribution_xp, cm.joined_at
             FROM club_members cm
             JOIN users u ON u.id = cm.user_id
             WHERE cm.club_id = $1
             ORDER BY cm.contribution_xp DESC
             LIMIT 50`,
            [id]
        );

        res.json({ leaderboard: result.rows });

    } catch (error) {
        console.error('Get club leaderboard error:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
});

module.exports = router;
