const express = require('express');
const db = require('../db/config');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All campaign routes require authentication
router.use(authenticate);

/**
 * GET /api/campaigns
 * Get user's campaigns (personal + team)
 */
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;

        // Get personal campaigns
        const personalCampaigns = await db.query(
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
            [userId]
        );

        // Get team campaigns for teams user is a member of
        const teamCampaigns = await db.query(
            `SELECT c.*,
                    t.name as team_name,
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
             JOIN teams t ON c.team_id = t.id
             JOIN team_members tm ON t.id = tm.team_id
             LEFT JOIN campaign_goals cg ON c.id = cg.campaign_id
             WHERE tm.user_id = $1 AND c.campaign_type = 'team'
             GROUP BY c.id, t.name
             ORDER BY c.created_at DESC`,
            [userId]
        );

        res.json({
            personal: personalCampaigns.rows.map(formatCampaign),
            team: teamCampaigns.rows.map(formatCampaign)
        });

    } catch (error) {
        console.error('Get campaigns error:', error);
        res.status(500).json({ error: 'Failed to get campaigns' });
    }
});

/**
 * GET /api/campaigns/:id
 * Get single campaign with goals
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const result = await db.query(
            `SELECT c.*,
                    t.name as team_name,
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
             LEFT JOIN teams t ON c.team_id = t.id
             LEFT JOIN campaign_goals cg ON c.id = cg.campaign_id
             WHERE c.id = $1
             GROUP BY c.id, t.name`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        const campaign = result.rows[0];

        // Check access - must be creator or team member
        if (campaign.creator_id !== userId) {
            if (campaign.team_id) {
                const memberCheck = await db.query(
                    'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
                    [campaign.team_id, userId]
                );
                if (memberCheck.rows.length === 0) {
                    return res.status(403).json({ error: 'Access denied' });
                }
            } else {
                return res.status(403).json({ error: 'Access denied' });
            }
        }

        res.json({ campaign: formatCampaign(campaign) });

    } catch (error) {
        console.error('Get campaign error:', error);
        res.status(500).json({ error: 'Failed to get campaign' });
    }
});

/**
 * POST /api/campaigns
 * Create new campaign
 */
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, description, campaignType, teamId, targetDate, goals } = req.body;

        // Validate required fields
        if (!title || !targetDate || !goals || goals.length === 0) {
            return res.status(400).json({ error: 'Title, target date, and at least one goal are required' });
        }

        // Validate campaign type
        if (!['personal', 'team'].includes(campaignType)) {
            return res.status(400).json({ error: 'Invalid campaign type' });
        }

        // For team campaigns, verify user is a member
        if (campaignType === 'team') {
            if (!teamId) {
                return res.status(400).json({ error: 'Team ID required for team campaigns' });
            }
            const memberCheck = await db.query(
                'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2',
                [teamId, userId]
            );
            if (memberCheck.rows.length === 0) {
                return res.status(403).json({ error: 'You must be a team member to create team campaigns' });
            }
        }

        // Create campaign
        const campaignResult = await db.query(
            `INSERT INTO campaigns (creator_id, team_id, title, description, campaign_type, target_date)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [userId, campaignType === 'team' ? teamId : null, title, description, campaignType, targetDate]
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
            message: 'Campaign created successfully',
            campaign: {
                ...formatCampaign(campaign),
                goals: createdGoals.map(formatGoal)
            }
        });

    } catch (error) {
        console.error('Create campaign error:', error);
        res.status(500).json({ error: 'Failed to create campaign' });
    }
});

/**
 * PUT /api/campaigns/:id
 * Update campaign
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { title, description, targetDate } = req.body;

        // Check ownership
        const campaign = await db.query(
            'SELECT creator_id FROM campaigns WHERE id = $1',
            [id]
        );

        if (campaign.rows.length === 0) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        if (campaign.rows[0].creator_id !== userId) {
            return res.status(403).json({ error: 'Only the creator can update this campaign' });
        }

        const result = await db.query(
            `UPDATE campaigns SET
                title = COALESCE($1, title),
                description = COALESCE($2, description),
                target_date = COALESCE($3, target_date),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING *`,
            [title, description, targetDate, id]
        );

        res.json({
            message: 'Campaign updated',
            campaign: formatCampaign(result.rows[0])
        });

    } catch (error) {
        console.error('Update campaign error:', error);
        res.status(500).json({ error: 'Failed to update campaign' });
    }
});

/**
 * DELETE /api/campaigns/:id
 * Delete campaign
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check ownership
        const campaign = await db.query(
            'SELECT creator_id FROM campaigns WHERE id = $1',
            [id]
        );

        if (campaign.rows.length === 0) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        if (campaign.rows[0].creator_id !== userId) {
            return res.status(403).json({ error: 'Only the creator can delete this campaign' });
        }

        await db.query('DELETE FROM campaigns WHERE id = $1', [id]);

        res.json({ message: 'Campaign deleted' });

    } catch (error) {
        console.error('Delete campaign error:', error);
        res.status(500).json({ error: 'Failed to delete campaign' });
    }
});

/**
 * POST /api/campaigns/:id/goals
 * Add goal to campaign
 */
router.post('/:id/goals', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { exerciseId, exerciseName, goalType, targetWeight, targetReps, targetTonnage } = req.body;

        // Check ownership
        const campaign = await db.query(
            'SELECT creator_id FROM campaigns WHERE id = $1',
            [id]
        );

        if (campaign.rows.length === 0) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        if (campaign.rows[0].creator_id !== userId) {
            return res.status(403).json({ error: 'Only the creator can add goals' });
        }

        const result = await db.query(
            `INSERT INTO campaign_goals (campaign_id, exercise_id, exercise_name, goal_type, target_weight, target_reps, target_tonnage)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [id, exerciseId, exerciseName, goalType, targetWeight, targetReps, targetTonnage]
        );

        res.status(201).json({
            message: 'Goal added',
            goal: formatGoal(result.rows[0])
        });

    } catch (error) {
        console.error('Add goal error:', error);
        res.status(500).json({ error: 'Failed to add goal' });
    }
});

/**
 * PUT /api/campaigns/:id/goals/:goalId/progress
 * Update goal progress (called after workout)
 */
router.put('/:id/goals/:goalId/progress', async (req, res) => {
    try {
        const { id, goalId } = req.params;
        const { currentValue, isAchieved } = req.body;

        const result = await db.query(
            `UPDATE campaign_goals SET
                current_value = $1,
                is_achieved = $2,
                achieved_at = CASE WHEN $2 = true AND achieved_at IS NULL THEN CURRENT_TIMESTAMP ELSE achieved_at END
             WHERE id = $3 AND campaign_id = $4
             RETURNING *`,
            [currentValue, isAchieved || false, goalId, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Goal not found' });
        }

        // Check if all goals are achieved
        const allGoals = await db.query(
            'SELECT is_achieved FROM campaign_goals WHERE campaign_id = $1',
            [id]
        );

        const allAchieved = allGoals.rows.every(g => g.is_achieved);

        if (allAchieved) {
            await db.query(
                `UPDATE campaigns SET is_completed = true, completed_at = CURRENT_TIMESTAMP WHERE id = $1`,
                [id]
            );
        }

        res.json({
            goal: formatGoal(result.rows[0]),
            campaignCompleted: allAchieved
        });

    } catch (error) {
        console.error('Update progress error:', error);
        res.status(500).json({ error: 'Failed to update progress' });
    }
});

/**
 * DELETE /api/campaigns/:id/goals/:goalId
 * Remove goal from campaign
 */
router.delete('/:id/goals/:goalId', async (req, res) => {
    try {
        const { id, goalId } = req.params;
        const userId = req.user.id;

        // Check ownership
        const campaign = await db.query(
            'SELECT creator_id FROM campaigns WHERE id = $1',
            [id]
        );

        if (campaign.rows.length === 0) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        if (campaign.rows[0].creator_id !== userId) {
            return res.status(403).json({ error: 'Only the creator can remove goals' });
        }

        await db.query('DELETE FROM campaign_goals WHERE id = $1 AND campaign_id = $2', [goalId, id]);

        res.json({ message: 'Goal removed' });

    } catch (error) {
        console.error('Remove goal error:', error);
        res.status(500).json({ error: 'Failed to remove goal' });
    }
});

/**
 * Format campaign for response
 */
function formatCampaign(row) {
    return {
        id: row.id,
        creatorId: row.creator_id,
        teamId: row.team_id,
        teamName: row.team_name,
        title: row.title,
        description: row.description,
        campaignType: row.campaign_type,
        targetDate: row.target_date,
        isCompleted: row.is_completed,
        completedAt: row.completed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        goals: row.goals ? row.goals.map(formatGoal) : []
    };
}

/**
 * Format goal for response
 */
function formatGoal(goal) {
    return {
        id: goal.id,
        exerciseId: goal.exercise_id || goal.exerciseId,
        exerciseName: goal.exercise_name || goal.exerciseName,
        goalType: goal.goal_type || goal.goalType,
        targetWeight: goal.target_weight || goal.targetWeight,
        targetReps: goal.target_reps || goal.targetReps,
        targetTonnage: goal.target_tonnage || goal.targetTonnage,
        currentValue: goal.current_value || goal.currentValue || 0,
        isAchieved: goal.is_achieved || goal.isAchieved || false,
        achievedAt: goal.achieved_at || goal.achievedAt
    };
}

module.exports = router;
