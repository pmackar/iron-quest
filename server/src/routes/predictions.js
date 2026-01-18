const express = require('express');
const db = require('../db/config');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ============================================
// PR PREDICTIONS
// ============================================

// Get all PR predictions for user
router.get('/pr', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM pr_predictions
             WHERE user_id = $1 AND achieved = false
             ORDER BY confidence DESC, predicted_date ASC`,
            [req.user.id]
        );

        res.json({ predictions: result.rows });

    } catch (error) {
        console.error('Get PR predictions error:', error);
        res.status(500).json({ error: 'Failed to get PR predictions' });
    }
});

// Get PR prediction for specific exercise
router.get('/pr/:exerciseId', authenticate, async (req, res) => {
    try {
        const { exerciseId } = req.params;

        const result = await db.query(
            `SELECT * FROM pr_predictions
             WHERE user_id = $1 AND exercise_id = $2
             ORDER BY created_at DESC
             LIMIT 1`,
            [req.user.id, exerciseId]
        );

        res.json({
            prediction: result.rows.length > 0 ? result.rows[0] : null
        });

    } catch (error) {
        console.error('Get PR prediction error:', error);
        res.status(500).json({ error: 'Failed to get PR prediction' });
    }
});

// Generate PR prediction for exercise
router.post('/pr/generate', authenticate, async (req, res) => {
    try {
        const { exerciseId, exerciseName } = req.body;

        if (!exerciseId || !exerciseName) {
            return res.status(400).json({ error: 'Exercise ID and name are required' });
        }

        // Get user's history for this exercise
        const historyResult = await db.query(
            `SELECT es.weight, es.reps, w.completed_at
             FROM exercise_sets es
             JOIN workout_exercises we ON we.id = es.workout_exercise_id
             JOIN workouts w ON w.id = we.workout_id
             WHERE w.user_id = $1 AND we.exercise_id = $2
             ORDER BY w.completed_at DESC
             LIMIT 50`,
            [req.user.id, exerciseId]
        );

        if (historyResult.rows.length < 5) {
            return res.status(400).json({
                error: 'Not enough data for prediction',
                message: 'Need at least 5 sets logged for this exercise'
            });
        }

        const sets = historyResult.rows;

        // Calculate e1RM for each set using Brzycki formula
        const e1RMs = sets.map(set => {
            if (set.reps === 1) return set.weight;
            return Math.round(set.weight * (36 / (37 - set.reps)));
        });

        // Get current PR
        const currentPR = Math.max(...e1RMs);

        // Calculate trend using linear regression
        const n = e1RMs.length;
        const xSum = (n * (n - 1)) / 2;
        const xSquareSum = (n * (n - 1) * (2 * n - 1)) / 6;
        const ySum = e1RMs.reduce((a, b) => a + b, 0);
        const xySum = e1RMs.reduce((sum, y, i) => sum + i * y, 0);

        const slope = (n * xySum - xSum * ySum) / (n * xSquareSum - xSum * xSum);

        // Predict next PR (positive slope means improvement)
        let predictedWeight = currentPR;
        let confidence = 0.5;
        let weeksToPredict = 4;

        if (slope > 0) {
            // User is progressing
            predictedWeight = Math.round(currentPR + (slope * 7 * weeksToPredict)); // 7 sets per week estimate
            confidence = Math.min(0.95, 0.5 + (slope / currentPR) * 10);
        } else if (slope < 0) {
            // User regressing - still predict but lower confidence
            predictedWeight = Math.round(currentPR * 1.02); // 2% increase target
            confidence = Math.max(0.2, 0.5 + slope / currentPR);
            weeksToPredict = 6;
        } else {
            // Plateau
            predictedWeight = Math.round(currentPR * 1.025);
            confidence = 0.4;
            weeksToPredict = 8;
        }

        // Calculate predicted date
        const predictedDate = new Date();
        predictedDate.setDate(predictedDate.getDate() + (weeksToPredict * 7));

        // Save prediction
        const result = await db.query(
            `INSERT INTO pr_predictions (user_id, exercise_id, exercise_name, current_pr, predicted_weight, predicted_date, confidence, based_on_sets)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (user_id, exercise_id) DO UPDATE SET
                current_pr = EXCLUDED.current_pr,
                predicted_weight = EXCLUDED.predicted_weight,
                predicted_date = EXCLUDED.predicted_date,
                confidence = EXCLUDED.confidence,
                based_on_sets = EXCLUDED.based_on_sets,
                created_at = NOW()
             RETURNING *`,
            [req.user.id, exerciseId, exerciseName, currentPR, predictedWeight, predictedDate, confidence, sets.length]
        );

        res.json({
            prediction: result.rows[0],
            analysis: {
                currentPR,
                trend: slope > 0 ? 'improving' : slope < 0 ? 'declining' : 'plateau',
                setsAnalyzed: sets.length
            }
        });

    } catch (error) {
        console.error('Generate PR prediction error:', error);
        res.status(500).json({ error: 'Failed to generate PR prediction' });
    }
});

// Mark PR as achieved
router.post('/pr/:id/achieved', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { actualWeight } = req.body;

        const result = await db.query(
            `UPDATE pr_predictions
             SET achieved = true, achieved_at = NOW()
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Prediction not found' });
        }

        res.json({
            message: 'PR achieved!',
            prediction: result.rows[0]
        });

    } catch (error) {
        console.error('Mark PR achieved error:', error);
        res.status(500).json({ error: 'Failed to update prediction' });
    }
});

// ============================================
// PLATEAU PREDICTIONS
// ============================================

// Get plateau predictions
router.get('/plateau', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM plateau_predictions
             WHERE user_id = $1 AND acknowledged = false
             ORDER BY severity DESC, predicted_date ASC`,
            [req.user.id]
        );

        res.json({ predictions: result.rows });

    } catch (error) {
        console.error('Get plateau predictions error:', error);
        res.status(500).json({ error: 'Failed to get plateau predictions' });
    }
});

// Generate plateau analysis
router.post('/plateau/analyze', authenticate, async (req, res) => {
    try {
        // Get user's workout history (last 8 weeks)
        const workoutsResult = await db.query(
            `SELECT
                DATE_TRUNC('week', completed_at) as week,
                COUNT(*) as workout_count,
                SUM(total_volume) as weekly_volume,
                AVG(total_volume) as avg_volume
             FROM workouts
             WHERE user_id = $1
               AND completed_at >= NOW() - INTERVAL '8 weeks'
             GROUP BY DATE_TRUNC('week', completed_at)
             ORDER BY week DESC`,
            [req.user.id]
        );

        if (workoutsResult.rows.length < 4) {
            return res.status(400).json({
                error: 'Not enough data',
                message: 'Need at least 4 weeks of training data'
            });
        }

        const weeks = workoutsResult.rows;
        const predictions = [];

        // Analyze volume progression
        const recentVolume = weeks.slice(0, 2).reduce((sum, w) => sum + parseInt(w.weekly_volume || 0), 0) / 2;
        const olderVolume = weeks.slice(2, 4).reduce((sum, w) => sum + parseInt(w.weekly_volume || 0), 0) / 2;
        const volumeChange = olderVolume > 0 ? (recentVolume - olderVolume) / olderVolume : 0;

        if (volumeChange < 0.02 && volumeChange > -0.05) {
            // Volume plateau detected
            const predictedDate = new Date();
            predictedDate.setDate(predictedDate.getDate() + 14);

            predictions.push({
                type: 'volume',
                severity: 'medium',
                predictedDate,
                confidence: 0.7,
                recommendation: 'Consider implementing progressive overload or a deload week followed by increased volume.',
                factors: {
                    recentAvgVolume: Math.round(recentVolume),
                    olderAvgVolume: Math.round(olderVolume),
                    changePercent: Math.round(volumeChange * 100)
                }
            });
        }

        // Analyze workout frequency
        const recentFrequency = weeks.slice(0, 2).reduce((sum, w) => sum + parseInt(w.workout_count), 0) / 2;
        const olderFrequency = weeks.slice(2, 4).reduce((sum, w) => sum + parseInt(w.workout_count), 0) / 2;

        if (recentFrequency < olderFrequency * 0.8) {
            const predictedDate = new Date();
            predictedDate.setDate(predictedDate.getDate() + 7);

            predictions.push({
                type: 'frequency',
                severity: 'high',
                predictedDate,
                confidence: 0.8,
                recommendation: 'Training frequency has dropped. This may lead to detraining if it continues.',
                factors: {
                    recentAvgWorkouts: recentFrequency.toFixed(1),
                    olderAvgWorkouts: olderFrequency.toFixed(1)
                }
            });
        }

        // Save predictions
        for (const pred of predictions) {
            await db.query(
                `INSERT INTO plateau_predictions (user_id, prediction_type, severity, predicted_date, confidence, recommendation, factors)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [req.user.id, pred.type, pred.severity, pred.predictedDate, pred.confidence, pred.recommendation, JSON.stringify(pred.factors)]
            );
        }

        res.json({
            analysis: {
                weeksAnalyzed: weeks.length,
                predictions,
                overallStatus: predictions.length === 0 ? 'progressing' : predictions.some(p => p.severity === 'high') ? 'warning' : 'monitoring'
            }
        });

    } catch (error) {
        console.error('Plateau analysis error:', error);
        res.status(500).json({ error: 'Failed to analyze plateau' });
    }
});

// Acknowledge plateau prediction
router.post('/plateau/:id/acknowledge', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            `UPDATE plateau_predictions
             SET acknowledged = true, acknowledged_at = NOW()
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Prediction not found' });
        }

        res.json({ message: 'Prediction acknowledged' });

    } catch (error) {
        console.error('Acknowledge plateau error:', error);
        res.status(500).json({ error: 'Failed to acknowledge prediction' });
    }
});

// ============================================
// CNS FATIGUE & RECOVERY
// ============================================

// Get today's fatigue/recovery status
router.get('/recovery', authenticate, async (req, res) => {
    try {
        const today = new Date();

        // Get latest fatigue log
        const fatigueResult = await db.query(
            `SELECT * FROM cns_fatigue_logs
             WHERE user_id = $1
             ORDER BY log_date DESC
             LIMIT 1`,
            [req.user.id]
        );

        // Get latest recovery recommendation
        const recoveryResult = await db.query(
            `SELECT * FROM recovery_recommendations
             WHERE user_id = $1
             ORDER BY recommendation_date DESC
             LIMIT 1`,
            [req.user.id]
        );

        // Get recent check-in data
        const checkinResult = await db.query(
            `SELECT AVG(energy_level) as avg_energy,
                    AVG(soreness_level) as avg_soreness,
                    AVG(sleep_quality) as avg_sleep
             FROM daily_checkins
             WHERE user_id = $1
               AND check_date >= CURRENT_DATE - INTERVAL '7 days'`,
            [req.user.id]
        );

        res.json({
            fatigue: fatigueResult.rows.length > 0 ? fatigueResult.rows[0] : null,
            recovery: recoveryResult.rows.length > 0 ? recoveryResult.rows[0] : null,
            recentWellness: checkinResult.rows[0]
        });

    } catch (error) {
        console.error('Get recovery error:', error);
        res.status(500).json({ error: 'Failed to get recovery status' });
    }
});

// Calculate and store fatigue/recovery
router.post('/recovery/calculate', authenticate, async (req, res) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const today = new Date();

        // Get recent workout data
        const workoutsResult = await client.query(
            `SELECT
                SUM(total_volume) as weekly_volume,
                COUNT(*) as workout_count
             FROM workouts
             WHERE user_id = $1
               AND completed_at >= NOW() - INTERVAL '7 days'`,
            [req.user.id]
        );

        // Get previous week for comparison
        const prevWeekResult = await client.query(
            `SELECT SUM(total_volume) as weekly_volume
             FROM workouts
             WHERE user_id = $1
               AND completed_at >= NOW() - INTERVAL '14 days'
               AND completed_at < NOW() - INTERVAL '7 days'`,
            [req.user.id]
        );

        // Get today's check-in
        const checkinResult = await client.query(
            `SELECT * FROM daily_checkins
             WHERE user_id = $1 AND check_date = $2::date`,
            [req.user.id, today]
        );

        const recentWorkouts = workoutsResult.rows[0];
        const prevWeek = prevWeekResult.rows[0];
        const checkin = checkinResult.rows.length > 0 ? checkinResult.rows[0] : null;

        // Calculate volume spike
        const currentVolume = parseInt(recentWorkouts.weekly_volume) || 0;
        const previousVolume = parseInt(prevWeek?.weekly_volume) || currentVolume;
        const volumeSpike = previousVolume > 0 ? ((currentVolume - previousVolume) / previousVolume) * 100 : 0;

        // Calculate fatigue score (0-100)
        let fatigueScore = 30; // Base fatigue

        // Volume spike factor
        if (volumeSpike > 20) fatigueScore += 25;
        else if (volumeSpike > 10) fatigueScore += 15;
        else if (volumeSpike > 0) fatigueScore += 5;

        // Workout frequency factor
        const workoutCount = parseInt(recentWorkouts.workout_count) || 0;
        if (workoutCount >= 6) fatigueScore += 20;
        else if (workoutCount >= 5) fatigueScore += 10;

        // Check-in factors
        if (checkin) {
            if (checkin.soreness_level >= 4) fatigueScore += 15;
            else if (checkin.soreness_level >= 3) fatigueScore += 5;

            if (checkin.sleep_quality <= 2) fatigueScore += 15;
            else if (checkin.sleep_quality <= 3) fatigueScore += 5;

            if (checkin.energy_level <= 2) fatigueScore += 10;
        }

        fatigueScore = Math.min(100, Math.max(0, fatigueScore));

        // Calculate training readiness (inverse of fatigue with modifiers)
        let trainingReadiness = 100 - fatigueScore;

        if (checkin) {
            if (checkin.energy_level >= 4) trainingReadiness += 10;
            if (checkin.sleep_quality >= 4) trainingReadiness += 10;
        }

        trainingReadiness = Math.min(100, Math.max(0, trainingReadiness));

        // Generate recommendation
        let recommendation;
        let recommendedIntensity;
        let recoveryDays = 0;

        if (fatigueScore >= 80) {
            recommendation = 'High fatigue detected. Consider taking 2-3 rest days or doing only light recovery work.';
            recommendedIntensity = 'deload';
            recoveryDays = 3;
        } else if (fatigueScore >= 60) {
            recommendation = 'Moderate fatigue. Consider a lighter session focusing on technique or accessory work.';
            recommendedIntensity = 'light';
            recoveryDays = 1;
        } else if (fatigueScore >= 40) {
            recommendation = 'Normal fatigue levels. You can train at moderate intensity today.';
            recommendedIntensity = 'moderate';
        } else {
            recommendation = 'Well recovered. You\'re ready for a challenging session!';
            recommendedIntensity = trainingReadiness >= 80 ? 'push' : 'normal';
        }

        // Save fatigue log
        await client.query(
            `INSERT INTO cns_fatigue_logs (user_id, log_date, compound_lift_load, weekly_intensity, volume_spike, sleep_quality, fatigue_score, recovery_days_recommended, recommendation, training_readiness)
             VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (user_id, log_date) DO UPDATE SET
                fatigue_score = EXCLUDED.fatigue_score,
                recovery_days_recommended = EXCLUDED.recovery_days_recommended,
                recommendation = EXCLUDED.recommendation,
                training_readiness = EXCLUDED.training_readiness`,
            [req.user.id, today, currentVolume, null, volumeSpike, checkin?.sleep_quality, fatigueScore, recoveryDays, recommendation, trainingReadiness]
        );

        // Save recovery recommendation
        await client.query(
            `INSERT INTO recovery_recommendations (user_id, recommendation_date, training_readiness_score, cns_fatigue_score, sleep_score, soreness_score, recommended_intensity, notes)
             VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (user_id, recommendation_date) DO UPDATE SET
                training_readiness_score = EXCLUDED.training_readiness_score,
                recommended_intensity = EXCLUDED.recommended_intensity,
                notes = EXCLUDED.notes`,
            [req.user.id, today, trainingReadiness, fatigueScore, checkin?.sleep_quality ? checkin.sleep_quality * 20 : null, checkin?.soreness_level ? (6 - checkin.soreness_level) * 20 : null, recommendedIntensity, recommendation]
        );

        await client.query('COMMIT');

        res.json({
            fatigueScore,
            trainingReadiness,
            recommendation,
            recommendedIntensity,
            recoveryDays,
            factors: {
                volumeSpike: Math.round(volumeSpike),
                workoutCount,
                sleepQuality: checkin?.sleep_quality,
                soreness: checkin?.soreness_level,
                energy: checkin?.energy_level
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Calculate recovery error:', error);
        res.status(500).json({ error: 'Failed to calculate recovery' });
    } finally {
        client.release();
    }
});

// Get recovery history
router.get('/recovery/history', authenticate, async (req, res) => {
    try {
        const { days = 30 } = req.query;

        const result = await db.query(
            `SELECT * FROM cns_fatigue_logs
             WHERE user_id = $1
               AND log_date >= CURRENT_DATE - $2::int
             ORDER BY log_date DESC`,
            [req.user.id, days]
        );

        res.json({ history: result.rows });

    } catch (error) {
        console.error('Get recovery history error:', error);
        res.status(500).json({ error: 'Failed to get recovery history' });
    }
});

// Get training readiness summary
router.get('/readiness', authenticate, async (req, res) => {
    try {
        // Get latest readiness
        const latestResult = await db.query(
            `SELECT rr.*, cf.fatigue_score
             FROM recovery_recommendations rr
             LEFT JOIN cns_fatigue_logs cf ON cf.user_id = rr.user_id AND cf.log_date = rr.recommendation_date
             WHERE rr.user_id = $1
             ORDER BY rr.recommendation_date DESC
             LIMIT 1`,
            [req.user.id]
        );

        // Get 7-day average
        const avgResult = await db.query(
            `SELECT
                ROUND(AVG(training_readiness_score)) as avg_readiness,
                ROUND(AVG(cns_fatigue_score)) as avg_fatigue
             FROM recovery_recommendations
             WHERE user_id = $1
               AND recommendation_date >= CURRENT_DATE - INTERVAL '7 days'`,
            [req.user.id]
        );

        res.json({
            current: latestResult.rows.length > 0 ? latestResult.rows[0] : null,
            weeklyAverage: avgResult.rows[0]
        });

    } catch (error) {
        console.error('Get readiness error:', error);
        res.status(500).json({ error: 'Failed to get readiness' });
    }
});

module.exports = router;
