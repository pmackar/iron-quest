const express = require('express');
const db = require('../db/config');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All coach routes require authentication
router.use(authenticate);

/**
 * GET /api/coach/clients
 * Get coach's clients list
 */
router.get('/clients', async (req, res) => {
    try {
        const coachId = req.user.id;

        // Verify user is a coach
        const userCheck = await db.query(
            'SELECT role FROM users WHERE id = $1',
            [coachId]
        );

        if (userCheck.rows.length === 0 || userCheck.rows[0].role !== 'coach') {
            return res.status(403).json({ error: 'Only coaches can access this endpoint' });
        }

        const result = await db.query(
            `SELECT
                cc.id,
                cc.status,
                cc.permissions,
                cc.invited_at,
                cc.accepted_at,
                u.id as client_id,
                u.username,
                u.email,
                u.avatar,
                u.level,
                u.xp,
                u.total_workouts,
                u.total_sets,
                u.total_weight,
                (SELECT COUNT(*) FROM workouts WHERE user_id = u.id AND completed_at > NOW() - INTERVAL '7 days') as recent_workouts,
                (SELECT completed_at FROM workouts WHERE user_id = u.id ORDER BY completed_at DESC LIMIT 1) as last_workout
             FROM coach_clients cc
             JOIN users u ON cc.client_id = u.id
             WHERE cc.coach_id = $1
             ORDER BY cc.accepted_at DESC NULLS LAST, cc.invited_at DESC`,
            [coachId]
        );

        res.json({
            clients: result.rows.map(row => ({
                id: row.id,
                clientId: row.client_id,
                username: row.username,
                email: row.email,
                avatar: row.avatar,
                level: row.level,
                xp: row.xp,
                totalWorkouts: row.total_workouts,
                totalSets: row.total_sets,
                totalWeight: row.total_weight,
                recentWorkouts: parseInt(row.recent_workouts) || 0,
                lastWorkout: row.last_workout,
                status: row.status,
                permissions: row.permissions,
                invitedAt: row.invited_at,
                acceptedAt: row.accepted_at
            }))
        });

    } catch (error) {
        console.error('Get clients error:', error);
        res.status(500).json({ error: 'Failed to get clients' });
    }
});

/**
 * GET /api/coach/clients/:clientId
 * Get detailed client info
 */
router.get('/clients/:clientId', async (req, res) => {
    try {
        const coachId = req.user.id;
        const { clientId } = req.params;

        // Verify coach has access to this client
        const accessCheck = await db.query(
            `SELECT cc.*, u.role as coach_role
             FROM coach_clients cc
             JOIN users u ON u.id = cc.coach_id
             WHERE cc.coach_id = $1 AND cc.client_id = $2 AND cc.status = 'active'`,
            [coachId, clientId]
        );

        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get client details
        const clientResult = await db.query(
            `SELECT
                id, username, email, avatar, level, xp, xp_to_next,
                total_workouts, total_sets, total_weight,
                height_feet, height_inches, weight, gender,
                created_at
             FROM users WHERE id = $1`,
            [clientId]
        );

        if (clientResult.rows.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }

        const client = clientResult.rows[0];

        res.json({
            client: {
                id: client.id,
                username: client.username,
                email: client.email,
                avatar: client.avatar,
                level: client.level,
                xp: client.xp,
                xpToNext: client.xp_to_next,
                totalWorkouts: client.total_workouts,
                totalSets: client.total_sets,
                totalWeight: client.total_weight,
                heightFeet: client.height_feet,
                heightInches: client.height_inches,
                weight: client.weight,
                gender: client.gender,
                joinedAt: client.created_at
            }
        });

    } catch (error) {
        console.error('Get client detail error:', error);
        res.status(500).json({ error: 'Failed to get client details' });
    }
});

/**
 * GET /api/coach/clients/:clientId/workouts
 * Get client's workout history
 */
router.get('/clients/:clientId/workouts', async (req, res) => {
    try {
        const coachId = req.user.id;
        const { clientId } = req.params;
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        // Verify coach has access
        const accessCheck = await db.query(
            `SELECT 1 FROM coach_clients
             WHERE coach_id = $1 AND client_id = $2 AND status = 'active'
             AND 'view_workouts' = ANY(permissions)`,
            [coachId, clientId]
        );

        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const result = await db.query(
            `SELECT
                w.id, w.name, w.type, w.duration, w.total_sets,
                w.total_volume, w.xp_earned, w.notes, w.completed_at,
                json_agg(
                    json_build_object(
                        'id', we.id,
                        'exerciseId', we.exercise_id,
                        'exerciseName', we.exercise_name,
                        'sets', (
                            SELECT json_agg(
                                json_build_object(
                                    'setNumber', es.set_number,
                                    'weight', es.weight,
                                    'reps', es.reps
                                ) ORDER BY es.set_number
                            )
                            FROM exercise_sets es WHERE es.workout_exercise_id = we.id
                        )
                    ) ORDER BY we.order_index
                ) FILTER (WHERE we.id IS NOT NULL) as exercises
             FROM workouts w
             LEFT JOIN workout_exercises we ON w.id = we.workout_id
             WHERE w.user_id = $1
             GROUP BY w.id
             ORDER BY w.completed_at DESC
             LIMIT $2 OFFSET $3`,
            [clientId, limit, offset]
        );

        res.json({
            workouts: result.rows.map(w => ({
                id: w.id,
                name: w.name,
                type: w.type,
                duration: w.duration,
                totalSets: w.total_sets,
                totalVolume: w.total_volume,
                xpEarned: w.xp_earned,
                notes: w.notes,
                completedAt: w.completed_at,
                exercises: w.exercises || []
            }))
        });

    } catch (error) {
        console.error('Get client workouts error:', error);
        res.status(500).json({ error: 'Failed to get workouts' });
    }
});

/**
 * GET /api/coach/clients/:clientId/stats
 * Get client's stats and PRs
 */
router.get('/clients/:clientId/stats', async (req, res) => {
    try {
        const coachId = req.user.id;
        const { clientId } = req.params;

        // Verify coach has access
        const accessCheck = await db.query(
            `SELECT 1 FROM coach_clients
             WHERE coach_id = $1 AND client_id = $2 AND status = 'active'
             AND 'view_stats' = ANY(permissions)`,
            [coachId, clientId]
        );

        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get PRs
        const prs = await db.query(
            `SELECT exercise_id, weight, achieved_at
             FROM personal_records
             WHERE user_id = $1
             ORDER BY achieved_at DESC`,
            [clientId]
        );

        // Get weekly stats
        const weeklyStats = await db.query(
            `SELECT
                COUNT(*) as workout_count,
                COALESCE(SUM(total_sets), 0) as total_sets,
                COALESCE(SUM(total_volume), 0) as total_volume,
                COALESCE(SUM(xp_earned), 0) as xp_earned
             FROM workouts
             WHERE user_id = $1 AND completed_at > NOW() - INTERVAL '7 days'`,
            [clientId]
        );

        // Get monthly trend
        const monthlyTrend = await db.query(
            `SELECT
                DATE_TRUNC('week', completed_at) as week,
                COUNT(*) as workouts,
                COALESCE(SUM(total_volume), 0) as volume
             FROM workouts
             WHERE user_id = $1 AND completed_at > NOW() - INTERVAL '4 weeks'
             GROUP BY DATE_TRUNC('week', completed_at)
             ORDER BY week`,
            [clientId]
        );

        res.json({
            personalRecords: prs.rows.map(pr => ({
                exerciseId: pr.exercise_id,
                weight: pr.weight,
                achievedAt: pr.achieved_at
            })),
            weeklyStats: {
                workouts: parseInt(weeklyStats.rows[0]?.workout_count) || 0,
                sets: parseInt(weeklyStats.rows[0]?.total_sets) || 0,
                volume: parseInt(weeklyStats.rows[0]?.total_volume) || 0,
                xp: parseInt(weeklyStats.rows[0]?.xp_earned) || 0
            },
            monthlyTrend: monthlyTrend.rows.map(w => ({
                week: w.week,
                workouts: parseInt(w.workouts),
                volume: parseInt(w.volume)
            }))
        });

    } catch (error) {
        console.error('Get client stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

/**
 * GET /api/coach/clients/:clientId/campaigns
 * Get client's campaigns
 */
router.get('/clients/:clientId/campaigns', async (req, res) => {
    try {
        const coachId = req.user.id;
        const { clientId } = req.params;

        // Verify coach has access
        const accessCheck = await db.query(
            `SELECT 1 FROM coach_clients
             WHERE coach_id = $1 AND client_id = $2 AND status = 'active'
             AND 'view_progress' = ANY(permissions)`,
            [coachId, clientId]
        );

        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const result = await db.query(
            `SELECT c.*,
                    json_agg(
                        json_build_object(
                            'id', cg.id,
                            'exerciseId', cg.exercise_id,
                            'exerciseName', cg.exercise_name,
                            'goalType', cg.goal_type,
                            'targetWeight', cg.target_weight,
                            'targetReps', cg.target_reps,
                            'targetTonnage', cg.target_tonnage,
                            'currentValue', cg.current_value,
                            'isAchieved', cg.is_achieved,
                            'achievedAt', cg.achieved_at
                        ) ORDER BY cg.created_at
                    ) FILTER (WHERE cg.id IS NOT NULL) as goals
             FROM campaigns c
             LEFT JOIN campaign_goals cg ON c.id = cg.campaign_id
             WHERE c.creator_id = $1 AND c.campaign_type = 'personal'
             GROUP BY c.id
             ORDER BY c.created_at DESC`,
            [clientId]
        );

        res.json({
            campaigns: result.rows.map(c => ({
                id: c.id,
                title: c.title,
                description: c.description,
                campaignType: c.campaign_type,
                targetDate: c.target_date,
                isCompleted: c.is_completed,
                completedAt: c.completed_at,
                createdAt: c.created_at,
                goals: c.goals || []
            }))
        });

    } catch (error) {
        console.error('Get client campaigns error:', error);
        res.status(500).json({ error: 'Failed to get campaigns' });
    }
});

/**
 * POST /api/coach/invite
 * Invite a client by email
 */
router.post('/invite', async (req, res) => {
    try {
        const coachId = req.user.id;
        const { email } = req.body;

        // Verify user is a coach
        const coachCheck = await db.query(
            'SELECT role, username FROM users WHERE id = $1',
            [coachId]
        );

        if (coachCheck.rows.length === 0 || coachCheck.rows[0].role !== 'coach') {
            return res.status(403).json({ error: 'Only coaches can invite clients' });
        }

        // Find client by email
        const clientResult = await db.query(
            'SELECT id, username FROM users WHERE email = $1 OR google_email = $1',
            [email.toLowerCase()]
        );

        if (clientResult.rows.length === 0) {
            return res.status(404).json({ error: 'No user found with that email' });
        }

        const clientId = clientResult.rows[0].id;

        // Check if already connected
        const existingCheck = await db.query(
            'SELECT id, status FROM coach_clients WHERE coach_id = $1 AND client_id = $2',
            [coachId, clientId]
        );

        if (existingCheck.rows.length > 0) {
            const existing = existingCheck.rows[0];
            if (existing.status === 'active') {
                return res.status(400).json({ error: 'Already connected to this client' });
            }
            if (existing.status === 'pending') {
                return res.status(400).json({ error: 'Invitation already pending' });
            }
            // Re-invite if previously revoked
            await db.query(
                `UPDATE coach_clients SET status = 'pending', invited_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [existing.id]
            );
            return res.json({ message: 'Invitation sent', clientUsername: clientResult.rows[0].username });
        }

        // Prevent coaches from inviting themselves
        if (coachId === clientId) {
            return res.status(400).json({ error: 'Cannot invite yourself' });
        }

        // Create invitation
        await db.query(
            `INSERT INTO coach_clients (coach_id, client_id, status)
             VALUES ($1, $2, 'pending')`,
            [coachId, clientId]
        );

        res.status(201).json({
            message: 'Invitation sent',
            clientUsername: clientResult.rows[0].username
        });

    } catch (error) {
        console.error('Invite client error:', error);
        res.status(500).json({ error: 'Failed to send invitation' });
    }
});

/**
 * GET /api/coach/invitations
 * Get pending coach invitations for the current user (as a client)
 */
router.get('/invitations', async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await db.query(
            `SELECT
                cc.id,
                cc.invited_at,
                u.id as coach_id,
                u.username as coach_username,
                u.email as coach_email,
                u.avatar as coach_avatar
             FROM coach_clients cc
             JOIN users u ON cc.coach_id = u.id
             WHERE cc.client_id = $1 AND cc.status = 'pending'
             ORDER BY cc.invited_at DESC`,
            [userId]
        );

        res.json({
            invitations: result.rows.map(inv => ({
                id: inv.id,
                coachId: inv.coach_id,
                coachUsername: inv.coach_username,
                coachEmail: inv.coach_email,
                coachAvatar: inv.coach_avatar,
                invitedAt: inv.invited_at
            }))
        });

    } catch (error) {
        console.error('Get invitations error:', error);
        res.status(500).json({ error: 'Failed to get invitations' });
    }
});

/**
 * POST /api/coach/invitations/:inviteId/accept
 * Accept a coach invitation
 */
router.post('/invitations/:inviteId/accept', async (req, res) => {
    try {
        const userId = req.user.id;
        const { inviteId } = req.params;

        const result = await db.query(
            `UPDATE coach_clients
             SET status = 'active', accepted_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND client_id = $2 AND status = 'pending'
             RETURNING *`,
            [inviteId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Invitation not found' });
        }

        // Get coach info
        const coachResult = await db.query(
            'SELECT username FROM users WHERE id = $1',
            [result.rows[0].coach_id]
        );

        res.json({
            message: 'Invitation accepted',
            coachUsername: coachResult.rows[0]?.username
        });

    } catch (error) {
        console.error('Accept invitation error:', error);
        res.status(500).json({ error: 'Failed to accept invitation' });
    }
});

/**
 * POST /api/coach/invitations/:inviteId/decline
 * Decline a coach invitation
 */
router.post('/invitations/:inviteId/decline', async (req, res) => {
    try {
        const userId = req.user.id;
        const { inviteId } = req.params;

        const result = await db.query(
            `DELETE FROM coach_clients
             WHERE id = $1 AND client_id = $2 AND status = 'pending'
             RETURNING id`,
            [inviteId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Invitation not found' });
        }

        res.json({ message: 'Invitation declined' });

    } catch (error) {
        console.error('Decline invitation error:', error);
        res.status(500).json({ error: 'Failed to decline invitation' });
    }
});

/**
 * GET /api/coach/my-coaches
 * Get list of coaches for the current user
 */
router.get('/my-coaches', async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await db.query(
            `SELECT
                cc.id,
                cc.accepted_at,
                cc.permissions,
                u.id as coach_id,
                u.username,
                u.email,
                u.avatar
             FROM coach_clients cc
             JOIN users u ON cc.coach_id = u.id
             WHERE cc.client_id = $1 AND cc.status = 'active'
             ORDER BY cc.accepted_at DESC`,
            [userId]
        );

        res.json({
            coaches: result.rows.map(row => ({
                id: row.id,
                coachId: row.coach_id,
                username: row.username,
                email: row.email,
                avatar: row.avatar,
                permissions: row.permissions,
                connectedAt: row.accepted_at
            }))
        });

    } catch (error) {
        console.error('Get my coaches error:', error);
        res.status(500).json({ error: 'Failed to get coaches' });
    }
});

/**
 * DELETE /api/coach/clients/:clientId
 * Remove a client (coach action)
 */
router.delete('/clients/:clientId', async (req, res) => {
    try {
        const coachId = req.user.id;
        const { clientId } = req.params;

        const result = await db.query(
            `DELETE FROM coach_clients
             WHERE coach_id = $1 AND client_id = $2
             RETURNING id`,
            [coachId, clientId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }

        res.json({ message: 'Client removed' });

    } catch (error) {
        console.error('Remove client error:', error);
        res.status(500).json({ error: 'Failed to remove client' });
    }
});

/**
 * DELETE /api/coach/my-coaches/:coachId
 * Disconnect from a coach (client action)
 */
router.delete('/my-coaches/:coachId', async (req, res) => {
    try {
        const clientId = req.user.id;
        const { coachId } = req.params;

        const result = await db.query(
            `DELETE FROM coach_clients
             WHERE coach_id = $1 AND client_id = $2
             RETURNING id`,
            [coachId, clientId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Coach connection not found' });
        }

        res.json({ message: 'Disconnected from coach' });

    } catch (error) {
        console.error('Disconnect from coach error:', error);
        res.status(500).json({ error: 'Failed to disconnect' });
    }
});

/**
 * POST /api/coach/clients/:clientId/assign-campaign
 * Assign a campaign to a client (creates campaign for them)
 */
router.post('/clients/:clientId/assign-campaign', async (req, res) => {
    try {
        const coachId = req.user.id;
        const { clientId } = req.params;
        const { title, description, targetDate, goals } = req.body;

        // Verify coach has assign permission
        const accessCheck = await db.query(
            `SELECT 1 FROM coach_clients
             WHERE coach_id = $1 AND client_id = $2 AND status = 'active'
             AND 'assign_campaigns' = ANY(permissions)`,
            [coachId, clientId]
        );

        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Create campaign for the client
        const campaignResult = await db.query(
            `INSERT INTO campaigns (creator_id, title, description, campaign_type, target_date)
             VALUES ($1, $2, $3, 'personal', $4)
             RETURNING *`,
            [clientId, title, description, targetDate]
        );

        const campaign = campaignResult.rows[0];

        // Create goals
        const createdGoals = [];
        for (const goal of goals) {
            const goalResult = await db.query(
                `INSERT INTO campaign_goals (campaign_id, exercise_id, exercise_name, goal_type, target_weight, target_reps, target_tonnage)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [
                    campaign.id,
                    goal.exerciseId,
                    goal.exerciseName,
                    goal.goalType,
                    goal.targetWeight || null,
                    goal.targetReps || null,
                    goal.targetTonnage || null
                ]
            );
            createdGoals.push(goalResult.rows[0]);
        }

        res.status(201).json({
            message: 'Campaign assigned',
            campaign: {
                id: campaign.id,
                title: campaign.title,
                description: campaign.description,
                targetDate: campaign.target_date,
                goals: createdGoals
            }
        });

    } catch (error) {
        console.error('Assign campaign error:', error);
        res.status(500).json({ error: 'Failed to assign campaign' });
    }
});

module.exports = router;
