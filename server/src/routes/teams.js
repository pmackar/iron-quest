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

// Get user's teams
router.get('/', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT t.id, t.name, t.description, t.avatar, t.level, t.total_xp, t.weekly_xp,
                    t.invite_code, t.captain_id, tm.role,
                    (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
             FROM teams t
             JOIN team_members tm ON tm.team_id = t.id
             WHERE tm.user_id = $1
             ORDER BY t.created_at DESC`,
            [req.user.id]
        );

        res.json({ teams: result.rows });

    } catch (error) {
        console.error('Get teams error:', error);
        res.status(500).json({ error: 'Failed to get teams' });
    }
});

// Get single team with members
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user is a member
        const memberCheck = await db.query(
            'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Not a member of this team' });
        }

        // Get team details
        const teamResult = await db.query(
            `SELECT id, name, description, avatar, level, total_xp, weekly_xp,
                    invite_code, captain_id, max_members, is_public, created_at
             FROM teams WHERE id = $1`,
            [id]
        );

        if (teamResult.rows.length === 0) {
            return res.status(404).json({ error: 'Team not found' });
        }

        const team = teamResult.rows[0];
        team.userRole = memberCheck.rows[0].role;

        // Get members
        const membersResult = await db.query(
            `SELECT u.id, u.username, u.avatar, u.level, tm.role, tm.contribution_xp, tm.joined_at
             FROM team_members tm
             JOIN users u ON u.id = tm.user_id
             WHERE tm.team_id = $1
             ORDER BY tm.contribution_xp DESC`,
            [id]
        );

        team.members = membersResult.rows;

        // Get active challenges
        const challengesResult = await db.query(
            `SELECT id, title, description, target_type, target_value, current_value,
                    start_date, end_date, is_completed, reward_xp
             FROM team_challenges
             WHERE team_id = $1 AND end_date > NOW()
             ORDER BY end_date ASC`,
            [id]
        );

        team.challenges = challengesResult.rows;

        res.json({ team });

    } catch (error) {
        console.error('Get team error:', error);
        res.status(500).json({ error: 'Failed to get team' });
    }
});

// Create team
router.post('/', authenticate, async (req, res) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const { name, description, avatar } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Team name is required' });
        }

        // Generate unique invite code
        let inviteCode;
        let codeExists = true;
        while (codeExists) {
            inviteCode = generateInviteCode();
            const check = await client.query(
                'SELECT id FROM teams WHERE invite_code = $1',
                [inviteCode]
            );
            codeExists = check.rows.length > 0;
        }

        // Create team
        const teamResult = await client.query(
            `INSERT INTO teams (name, description, avatar, invite_code, captain_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, name, description, avatar, invite_code, level, created_at`,
            [name, description || '', avatar || 'shield', inviteCode, req.user.id]
        );

        const team = teamResult.rows[0];

        // Add creator as captain
        await client.query(
            `INSERT INTO team_members (team_id, user_id, role)
             VALUES ($1, $2, 'captain')`,
            [team.id, req.user.id]
        );

        // Add activity
        await client.query(
            `INSERT INTO activity_feed (team_id, user_id, activity_type, title, description)
             VALUES ($1, $2, 'create_team', $3, $4)`,
            [team.id, req.user.id, `${req.user.username} created the team`, `Team "${name}" was created`]
        );

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Team created',
            team: {
                ...team,
                memberCount: 1,
                role: 'captain'
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create team error:', error);
        res.status(500).json({ error: 'Failed to create team' });
    } finally {
        client.release();
    }
});

// Join team by invite code
router.post('/join', authenticate, async (req, res) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const { inviteCode } = req.body;

        if (!inviteCode) {
            return res.status(400).json({ error: 'Invite code is required' });
        }

        // Find team
        const teamResult = await client.query(
            `SELECT id, name, max_members,
                    (SELECT COUNT(*) FROM team_members WHERE team_id = teams.id) as member_count
             FROM teams WHERE invite_code = $1`,
            [inviteCode.toUpperCase()]
        );

        if (teamResult.rows.length === 0) {
            return res.status(404).json({ error: 'Invalid invite code' });
        }

        const team = teamResult.rows[0];

        // Check if already a member
        const existingMember = await client.query(
            'SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2',
            [team.id, req.user.id]
        );

        if (existingMember.rows.length > 0) {
            return res.status(400).json({ error: 'Already a member of this team' });
        }

        // Check if team is full
        if (team.member_count >= team.max_members) {
            return res.status(400).json({ error: 'Team is full' });
        }

        // Add member
        await client.query(
            `INSERT INTO team_members (team_id, user_id, role)
             VALUES ($1, $2, 'member')`,
            [team.id, req.user.id]
        );

        // Add activity
        await client.query(
            `INSERT INTO activity_feed (team_id, user_id, activity_type, title)
             VALUES ($1, $2, 'join_team', $3)`,
            [team.id, req.user.id, `${req.user.username} joined the team`]
        );

        await client.query('COMMIT');

        res.json({
            message: 'Joined team successfully',
            team: {
                id: team.id,
                name: team.name
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Join team error:', error);
        res.status(500).json({ error: 'Failed to join team' });
    } finally {
        client.release();
    }
});

// Leave team
router.post('/:id/leave', authenticate, async (req, res) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const { id } = req.params;

        // Check if user is a member
        const memberCheck = await client.query(
            'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(400).json({ error: 'Not a member of this team' });
        }

        // Check if user is captain
        if (memberCheck.rows[0].role === 'captain') {
            // Check if there are other members
            const memberCount = await client.query(
                'SELECT COUNT(*) as count FROM team_members WHERE team_id = $1',
                [id]
            );

            if (parseInt(memberCount.rows[0].count) > 1) {
                return res.status(400).json({
                    error: 'Captain cannot leave. Transfer ownership first or remove other members.'
                });
            }

            // Delete team if captain is only member
            await client.query('DELETE FROM teams WHERE id = $1', [id]);
        } else {
            // Remove member
            await client.query(
                'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2',
                [id, req.user.id]
            );

            // Add activity
            await client.query(
                `INSERT INTO activity_feed (team_id, user_id, activity_type, title)
                 VALUES ($1, $2, 'leave_team', $3)`,
                [id, req.user.id, `${req.user.username} left the team`]
            );
        }

        await client.query('COMMIT');

        res.json({ message: 'Left team successfully' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Leave team error:', error);
        res.status(500).json({ error: 'Failed to leave team' });
    } finally {
        client.release();
    }
});

// Get team leaderboard
router.get('/:id/leaderboard', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { type = 'xp' } = req.query;

        let orderBy;
        switch (type) {
            case 'workouts':
                orderBy = 'u.total_workouts DESC';
                break;
            case 'volume':
                orderBy = 'u.total_weight DESC';
                break;
            case 'contribution':
                orderBy = 'tm.contribution_xp DESC';
                break;
            default:
                orderBy = 'u.xp DESC';
        }

        const result = await db.query(
            `SELECT u.id, u.username, u.avatar, u.level, u.xp, u.total_workouts,
                    u.total_weight, tm.contribution_xp, tm.role
             FROM team_members tm
             JOIN users u ON u.id = tm.user_id
             WHERE tm.team_id = $1
             ORDER BY ${orderBy}
             LIMIT 20`,
            [id]
        );

        res.json({ leaderboard: result.rows });

    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
});

// Get team activity feed
router.get('/:id/activity', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 20, offset = 0 } = req.query;

        const result = await db.query(
            `SELECT af.id, af.activity_type, af.title, af.description, af.metadata,
                    af.created_at, u.username, u.avatar
             FROM activity_feed af
             JOIN users u ON u.id = af.user_id
             WHERE af.team_id = $1
             ORDER BY af.created_at DESC
             LIMIT $2 OFFSET $3`,
            [id, limit, offset]
        );

        res.json({ activities: result.rows });

    } catch (error) {
        console.error('Get activity error:', error);
        res.status(500).json({ error: 'Failed to get activity feed' });
    }
});

// Create team challenge
router.post('/:id/challenges', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, targetType, targetValue, endDate, rewardXp } = req.body;

        // Check if user is captain or co-captain
        const memberCheck = await db.query(
            `SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2`,
            [id, req.user.id]
        );

        if (memberCheck.rows.length === 0 || !['captain', 'co-captain'].includes(memberCheck.rows[0].role)) {
            return res.status(403).json({ error: 'Only team leaders can create challenges' });
        }

        const result = await db.query(
            `INSERT INTO team_challenges (team_id, title, description, target_type, target_value, end_date, reward_xp)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, title, target_type, target_value, current_value, end_date`,
            [id, title, description, targetType, targetValue, endDate, rewardXp || 0]
        );

        res.status(201).json({ challenge: result.rows[0] });

    } catch (error) {
        console.error('Create challenge error:', error);
        res.status(500).json({ error: 'Failed to create challenge' });
    }
});

module.exports = router;
