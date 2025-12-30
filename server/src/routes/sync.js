const express = require('express');
const db = require('../db/config');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All sync routes require authentication
router.use(authenticate);

/**
 * POST /api/sync/push
 * Push offline actions to server
 * Body: { actions: [{ type, clientTimestamp, payload }], lastSyncTimestamp }
 */
router.post('/push', async (req, res) => {
    try {
        const { actions, lastSyncTimestamp } = req.body;
        const userId = req.user.id;

        if (!actions || !Array.isArray(actions)) {
            return res.status(400).json({ error: 'Actions array is required' });
        }

        const results = [];
        const conflicts = [];

        for (const action of actions) {
            try {
                const result = await processAction(userId, action);
                results.push({
                    clientTimestamp: action.clientTimestamp,
                    status: 'synced',
                    serverId: result.id
                });
            } catch (error) {
                if (error.code === 'CONFLICT') {
                    conflicts.push({
                        clientTimestamp: action.clientTimestamp,
                        type: action.type,
                        serverData: error.serverData,
                        clientData: action.payload
                    });
                } else {
                    results.push({
                        clientTimestamp: action.clientTimestamp,
                        status: 'error',
                        error: error.message
                    });
                }
            }
        }

        // Update user's last sync timestamp
        await db.query(
            'UPDATE users SET last_sync_at = CURRENT_TIMESTAMP WHERE id = $1',
            [userId]
        );

        res.json({
            message: 'Sync completed',
            results,
            conflicts,
            serverTimestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Sync push error:', error);
        res.status(500).json({ error: 'Sync failed' });
    }
});

/**
 * GET /api/sync/pull
 * Pull changes from server since last sync
 * Query: since (ISO timestamp)
 */
router.get('/pull', async (req, res) => {
    try {
        const userId = req.user.id;
        const since = req.query.since ? new Date(req.query.since) : new Date(0);

        // Get workouts updated since last sync
        const workouts = await db.query(
            `SELECT w.*,
                    json_agg(
                        json_build_object(
                            'id', we.id,
                            'exerciseId', we.exercise_id,
                            'exerciseName', we.exercise_name,
                            'orderIndex', we.order_index,
                            'sets', (
                                SELECT json_agg(
                                    json_build_object(
                                        'id', es.id,
                                        'setNumber', es.set_number,
                                        'weight', es.weight,
                                        'reps', es.reps
                                    ) ORDER BY es.set_number
                                )
                                FROM exercise_sets es
                                WHERE es.workout_exercise_id = we.id
                            )
                        ) ORDER BY we.order_index
                    ) FILTER (WHERE we.id IS NOT NULL) as exercises
             FROM workouts w
             LEFT JOIN workout_exercises we ON w.id = we.workout_id
             WHERE w.user_id = $1 AND w.created_at > $2
             GROUP BY w.id
             ORDER BY w.completed_at DESC`,
            [userId, since]
        );

        // Get personal records updated since last sync
        const personalRecords = await db.query(
            `SELECT exercise_id, weight, achieved_at
             FROM personal_records
             WHERE user_id = $1 AND achieved_at > $2`,
            [userId, since]
        );

        // Get user stats
        const userStats = await db.query(
            `SELECT level, xp, xp_to_next, total_workouts, total_sets, total_weight, achievements
             FROM users WHERE id = $1`,
            [userId]
        );

        res.json({
            workouts: workouts.rows.map(formatWorkout),
            personalRecords: personalRecords.rows.reduce((acc, pr) => {
                acc[pr.exercise_id] = { weight: pr.weight, achievedAt: pr.achieved_at };
                return acc;
            }, {}),
            userStats: userStats.rows[0] ? {
                level: userStats.rows[0].level,
                xp: userStats.rows[0].xp,
                xpToNext: userStats.rows[0].xp_to_next,
                totalWorkouts: userStats.rows[0].total_workouts,
                totalSets: userStats.rows[0].total_sets,
                totalWeight: userStats.rows[0].total_weight,
                achievements: userStats.rows[0].achievements
            } : null,
            serverTimestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Sync pull error:', error);
        res.status(500).json({ error: 'Failed to pull changes' });
    }
});

/**
 * POST /api/sync/resolve
 * Resolve sync conflicts
 * Body: { resolutions: [{ type, clientTimestamp, resolution: 'client' | 'server' }] }
 */
router.post('/resolve', async (req, res) => {
    try {
        const { resolutions } = req.body;
        const userId = req.user.id;

        if (!resolutions || !Array.isArray(resolutions)) {
            return res.status(400).json({ error: 'Resolutions array is required' });
        }

        const results = [];

        for (const resolution of resolutions) {
            if (resolution.resolution === 'client' && resolution.clientData) {
                // Apply client's version
                const result = await processAction(userId, {
                    type: resolution.type,
                    clientTimestamp: resolution.clientTimestamp,
                    payload: resolution.clientData
                }, true); // Force overwrite
                results.push({ clientTimestamp: resolution.clientTimestamp, status: 'resolved' });
            } else {
                // Keep server version (no action needed)
                results.push({ clientTimestamp: resolution.clientTimestamp, status: 'kept_server' });
            }
        }

        res.json({ message: 'Conflicts resolved', results });

    } catch (error) {
        console.error('Conflict resolution error:', error);
        res.status(500).json({ error: 'Failed to resolve conflicts' });
    }
});

/**
 * Process a single sync action
 */
async function processAction(userId, action, forceOverwrite = false) {
    const { type, payload, clientTimestamp } = action;

    switch (type) {
        case 'workout':
            return await processWorkoutAction(userId, payload, clientTimestamp, forceOverwrite);
        case 'pr':
            return await processPRAction(userId, payload, clientTimestamp, forceOverwrite);
        default:
            throw new Error(`Unknown action type: ${type}`);
    }
}

/**
 * Process a workout sync action
 */
async function processWorkoutAction(userId, workout, clientTimestamp, forceOverwrite) {
    // Check for existing workout with same client timestamp (duplicate prevention)
    if (!forceOverwrite) {
        const existing = await db.query(
            `SELECT id FROM sync_queue
             WHERE user_id = $1 AND action_type = 'workout'
             AND payload->>'clientId' = $2 AND synced = true`,
            [userId, workout.clientId]
        );

        if (existing.rows.length > 0) {
            return { id: existing.rows[0].id, status: 'already_synced' };
        }
    }

    // Insert the workout
    const result = await db.query(
        `INSERT INTO workouts (user_id, name, type, duration, total_sets, total_volume, xp_earned, notes, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
            userId,
            workout.name,
            workout.type,
            workout.duration,
            workout.totalSets,
            workout.totalVolume,
            workout.xpEarned,
            workout.notes,
            workout.completedAt || clientTimestamp
        ]
    );

    const workoutId = result.rows[0].id;

    // Insert exercises and sets
    if (workout.exercises && Array.isArray(workout.exercises)) {
        for (let i = 0; i < workout.exercises.length; i++) {
            const ex = workout.exercises[i];
            const exResult = await db.query(
                `INSERT INTO workout_exercises (workout_id, exercise_id, exercise_name, order_index)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id`,
                [workoutId, ex.id || ex.exerciseId, ex.name || ex.exerciseName, i]
            );

            const workoutExerciseId = exResult.rows[0].id;

            if (ex.sets && Array.isArray(ex.sets)) {
                for (let j = 0; j < ex.sets.length; j++) {
                    const set = ex.sets[j];
                    await db.query(
                        `INSERT INTO exercise_sets (workout_exercise_id, set_number, weight, reps)
                         VALUES ($1, $2, $3, $4)`,
                        [workoutExerciseId, j + 1, set.weight || 0, set.reps || 0]
                    );
                }
            }
        }
    }

    // Update user stats
    await db.query(
        `UPDATE users SET
            total_workouts = total_workouts + 1,
            total_sets = total_sets + $1,
            total_weight = total_weight + $2,
            xp = xp + $3
         WHERE id = $4`,
        [workout.totalSets || 0, workout.totalVolume || 0, workout.xpEarned || 0, userId]
    );

    // Record in sync queue
    await db.query(
        `INSERT INTO sync_queue (user_id, action_type, payload, client_timestamp, synced, synced_at)
         VALUES ($1, 'workout', $2, $3, true, CURRENT_TIMESTAMP)`,
        [userId, JSON.stringify({ ...workout, serverId: workoutId }), clientTimestamp]
    );

    return { id: workoutId };
}

/**
 * Process a personal record sync action
 */
async function processPRAction(userId, pr, clientTimestamp, forceOverwrite) {
    const { exerciseId, weight } = pr;

    // Upsert personal record (only if new weight is higher, unless forcing)
    const result = await db.query(
        `INSERT INTO personal_records (user_id, exercise_id, weight, achieved_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, exercise_id)
         DO UPDATE SET
            weight = ${forceOverwrite ? '$3' : 'GREATEST(personal_records.weight, $3)'},
            achieved_at = CASE
                WHEN ${forceOverwrite ? 'TRUE' : '$3 > personal_records.weight'}
                THEN $4
                ELSE personal_records.achieved_at
            END
         RETURNING id, weight`,
        [userId, exerciseId, weight, clientTimestamp]
    );

    return { id: result.rows[0].id, weight: result.rows[0].weight };
}

/**
 * Format workout for response
 */
function formatWorkout(row) {
    return {
        id: row.id,
        name: row.name,
        type: row.type,
        duration: row.duration,
        totalSets: row.total_sets,
        totalVolume: row.total_volume,
        xpEarned: row.xp_earned,
        notes: row.notes,
        completedAt: row.completed_at,
        createdAt: row.created_at,
        exercises: row.exercises || []
    };
}

module.exports = router;
