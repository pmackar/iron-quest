const express = require('express');
const db = require('../db/config');
const { authenticate } = require('../middleware/auth');
const { processWorkoutCompletion } = require('../lib/workout-hooks');

const router = express.Router();

// Get all workouts for user (with exercises for sync)
router.get('/', authenticate, async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;

        // Get workouts
        const result = await db.query(
            `SELECT id, name, type, duration, total_sets, total_volume, xp_earned, notes, completed_at
             FROM workouts
             WHERE user_id = $1
             ORDER BY completed_at DESC
             LIMIT $2 OFFSET $3`,
            [req.user.id, limit, offset]
        );

        // Get exercises for all workouts in one query
        const workoutIds = result.rows.map(w => w.id);

        if (workoutIds.length > 0) {
            const exercisesResult = await db.query(
                `SELECT we.workout_id, we.exercise_id, we.exercise_name, we.order_index,
                        COALESCE(json_agg(
                            json_build_object('weight', es.weight, 'reps', es.reps, 'set_number', es.set_number)
                            ORDER BY es.set_number
                        ) FILTER (WHERE es.id IS NOT NULL), '[]') as sets
                 FROM workout_exercises we
                 LEFT JOIN exercise_sets es ON es.workout_exercise_id = we.id
                 WHERE we.workout_id = ANY($1)
                 GROUP BY we.workout_id, we.id, we.exercise_id, we.exercise_name, we.order_index
                 ORDER BY we.order_index`,
                [workoutIds]
            );

            // Group exercises by workout
            const exercisesByWorkout = {};
            exercisesResult.rows.forEach(ex => {
                if (!exercisesByWorkout[ex.workout_id]) {
                    exercisesByWorkout[ex.workout_id] = [];
                }
                exercisesByWorkout[ex.workout_id].push({
                    id: ex.exercise_id,
                    name: ex.exercise_name,
                    sets: ex.sets
                });
            });

            // Attach exercises to workouts
            result.rows.forEach(workout => {
                workout.exercises = exercisesByWorkout[workout.id] || [];
            });
        }

        res.json({ workouts: result.rows });

    } catch (error) {
        console.error('Get workouts error:', error);
        res.status(500).json({ error: 'Failed to get workouts' });
    }
});

// Get single workout with exercises
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        // Get workout
        const workoutResult = await db.query(
            `SELECT id, name, type, duration, total_sets, total_volume, xp_earned, notes, completed_at
             FROM workouts WHERE id = $1 AND user_id = $2`,
            [id, req.user.id]
        );

        if (workoutResult.rows.length === 0) {
            return res.status(404).json({ error: 'Workout not found' });
        }

        const workout = workoutResult.rows[0];

        // Get exercises with sets
        const exercisesResult = await db.query(
            `SELECT we.id, we.exercise_id, we.exercise_name, we.order_index,
                    json_agg(json_build_object('weight', es.weight, 'reps', es.reps, 'set_number', es.set_number)
                             ORDER BY es.set_number) as sets
             FROM workout_exercises we
             LEFT JOIN exercise_sets es ON es.workout_exercise_id = we.id
             WHERE we.workout_id = $1
             GROUP BY we.id, we.exercise_id, we.exercise_name, we.order_index
             ORDER BY we.order_index`,
            [id]
        );

        workout.exercises = exercisesResult.rows.map(ex => ({
            id: ex.exercise_id,
            name: ex.exercise_name,
            sets: ex.sets.filter(s => s.weight !== null)
        }));

        res.json({ workout });

    } catch (error) {
        console.error('Get workout error:', error);
        res.status(500).json({ error: 'Failed to get workout' });
    }
});

// Create/save workout
router.post('/', authenticate, async (req, res) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const { name, type, duration, exercises, notes } = req.body;

        // Calculate totals
        let totalSets = 0;
        let totalVolume = 0;

        exercises.forEach(ex => {
            ex.sets.forEach(set => {
                totalSets++;
                totalVolume += set.weight * set.reps;
            });
        });

        const xpEarned = Math.floor(totalVolume / 10);

        // Create workout
        const workoutResult = await client.query(
            `INSERT INTO workouts (user_id, name, type, duration, total_sets, total_volume, xp_earned, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, completed_at`,
            [req.user.id, name, type, duration, totalSets, totalVolume, xpEarned, notes]
        );

        const workoutId = workoutResult.rows[0].id;

        // Create exercises and sets
        for (let i = 0; i < exercises.length; i++) {
            const ex = exercises[i];

            const exerciseResult = await client.query(
                `INSERT INTO workout_exercises (workout_id, exercise_id, exercise_name, order_index)
                 VALUES ($1, $2, $3, $4) RETURNING id`,
                [workoutId, ex.id, ex.name, i]
            );

            const workoutExerciseId = exerciseResult.rows[0].id;

            // Insert sets
            for (let j = 0; j < ex.sets.length; j++) {
                const set = ex.sets[j];
                await client.query(
                    `INSERT INTO exercise_sets (workout_exercise_id, set_number, weight, reps)
                     VALUES ($1, $2, $3, $4)`,
                    [workoutExerciseId, j + 1, set.weight, set.reps]
                );

                // Update personal record if applicable
                await client.query(
                    `INSERT INTO personal_records (user_id, exercise_id, weight)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (user_id, exercise_id)
                     DO UPDATE SET weight = GREATEST(personal_records.weight, $3),
                                   achieved_at = CASE WHEN $3 > personal_records.weight
                                                      THEN CURRENT_TIMESTAMP
                                                      ELSE personal_records.achieved_at END`,
                    [req.user.id, ex.id, set.weight]
                );
            }
        }

        // Update user stats
        await client.query(
            `UPDATE users SET
                total_workouts = total_workouts + 1,
                total_sets = total_sets + $1,
                total_weight = total_weight + $2,
                xp = xp + $3
             WHERE id = $4`,
            [totalSets, totalVolume, xpEarned, req.user.id]
        );

        // Check for level up
        await client.query(
            `UPDATE users SET
                level = level + 1,
                xp = xp - xp_to_next,
                xp_to_next = FLOOR(xp_to_next * 1.5)
             WHERE id = $1 AND xp >= xp_to_next`,
            [req.user.id]
        );

        // Process workout completion hooks (streak, clubs, rivals, loot)
        const hookResults = await processWorkoutCompletion(client, req.user.id, {
            workoutId,
            totalVolume,
            totalSets,
            xpEarned
        });

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Workout saved',
            workout: {
                id: workoutId,
                name,
                type,
                totalSets,
                totalVolume,
                xpEarned,
                completedAt: workoutResult.rows[0].completed_at
            },
            // Include hook results for client display
            streak: hookResults.streak,
            lootDrop: hookResults.lootDrop,
            rivalUpdates: hookResults.rivals ? hookResults.rivals.length : 0
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Save workout error:', error);
        res.status(500).json({ error: 'Failed to save workout' });
    } finally {
        client.release();
    }
});

// Delete workout
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            'DELETE FROM workouts WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Workout not found' });
        }

        res.json({ message: 'Workout deleted' });

    } catch (error) {
        console.error('Delete workout error:', error);
        res.status(500).json({ error: 'Failed to delete workout' });
    }
});

// Get workout stats
router.get('/stats/summary', authenticate, async (req, res) => {
    try {
        // Weekly volume
        const weeklyVolume = await db.query(
            `SELECT DATE_TRUNC('week', completed_at) as week, SUM(total_volume) as volume
             FROM workouts
             WHERE user_id = $1 AND completed_at > NOW() - INTERVAL '8 weeks'
             GROUP BY DATE_TRUNC('week', completed_at)
             ORDER BY week`,
            [req.user.id]
        );

        // Personal records
        const prs = await db.query(
            `SELECT exercise_id, weight, achieved_at
             FROM personal_records
             WHERE user_id = $1
             ORDER BY weight DESC`,
            [req.user.id]
        );

        res.json({
            weeklyVolume: weeklyVolume.rows,
            personalRecords: prs.rows
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

module.exports = router;
