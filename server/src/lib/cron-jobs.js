/**
 * Cron Job Utilities
 * Functions for nightly processing of wagers, encounters, and guild resets
 */

const db = require('../db/config');
const { resolveWager } = require('./streak-utils');
const { calculateEncounterWinner, evolvePhantom } = require('./rival-utils');

/**
 * Resolve all expired wagers
 * Should run nightly
 */
async function resolveExpiredWagers() {
    const client = await db.pool.connect();
    const results = { resolved: 0, errors: [] };

    try {
        await client.query('BEGIN');

        // Get all expired active wagers
        const wagersResult = await client.query(
            `SELECT sw.*,
                    u.username, u.current_streak,
                    opp.username as opponent_username, opp.current_streak as opponent_streak
             FROM streak_wagers sw
             JOIN users u ON u.id = sw.user_id
             LEFT JOIN users opp ON opp.id = sw.opponent_id
             WHERE sw.status = 'active'
               AND sw.end_date < CURRENT_DATE`
        );

        for (const wager of wagersResult.rows) {
            try {
                // Get workout count during wager period
                const userStatsResult = await client.query(
                    `SELECT COUNT(DISTINCT DATE(completed_at)) as workout_days
                     FROM workouts
                     WHERE user_id = $1
                       AND completed_at >= $2
                       AND completed_at <= $3`,
                    [wager.user_id, wager.start_date, wager.end_date]
                );

                const userStats = {
                    workoutDays: parseInt(userStatsResult.rows[0].workout_days) || 0
                };

                let opponentStats = null;
                if (wager.opponent_id) {
                    const oppStatsResult = await client.query(
                        `SELECT COUNT(DISTINCT DATE(completed_at)) as workout_days
                         FROM workouts
                         WHERE user_id = $1
                           AND completed_at >= $2
                           AND completed_at <= $3`,
                        [wager.opponent_id, wager.start_date, wager.end_date]
                    );
                    opponentStats = {
                        workoutDays: parseInt(oppStatsResult.rows[0].workout_days) || 0
                    };
                }

                // Resolve the wager
                const resolution = resolveWager(wager, userStats, opponentStats);

                // Update wager status
                const newStatus = resolution.winner === 'user' ? 'won' :
                                  resolution.winner === 'opponent' ? 'lost' :
                                  resolution.winner === 'tie' ? 'won' : 'lost';

                await client.query(
                    `UPDATE streak_wagers
                     SET status = $1, resolved_at = NOW()
                     WHERE id = $2`,
                    [newStatus, wager.id]
                );

                // Apply XP change
                if (resolution.xpChange !== 0) {
                    await client.query(
                        `UPDATE users
                         SET xp = GREATEST(0, xp + $1)
                         WHERE id = $2`,
                        [resolution.xpChange, wager.user_id]
                    );

                    // If head-to-head, also update opponent
                    if (wager.opponent_id && resolution.winner !== 'tie') {
                        await client.query(
                            `UPDATE users
                             SET xp = GREATEST(0, xp + $1)
                             WHERE id = $2`,
                            [-resolution.xpChange, wager.opponent_id]
                        );
                    }
                }

                results.resolved++;

            } catch (error) {
                results.errors.push({
                    wagerId: wager.id,
                    error: error.message
                });
            }
        }

        await client.query('COMMIT');

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }

    return results;
}

/**
 * Resolve all completed rival encounters
 * Should run nightly
 */
async function resolveCompletedEncounters() {
    const client = await db.pool.connect();
    const results = { resolved: 0, errors: [] };

    try {
        await client.query('BEGIN');

        // Get all expired active encounters
        const encountersResult = await client.query(
            `SELECT re.*, fr.user_id, fr.rival_type, fr.phantom_stats,
                    fr.user_wins, fr.rival_wins, fr.total_encounters
             FROM rival_encounters re
             JOIN fitness_rivals fr ON fr.id = re.rival_id
             WHERE re.status = 'active'
               AND re.end_date < CURRENT_DATE`
        );

        for (const encounter of encountersResult.rows) {
            try {
                // Calculate winner
                const result = calculateEncounterWinner({
                    userVolume: parseInt(encounter.user_volume) || 0,
                    userWorkouts: parseInt(encounter.user_workouts) || 0,
                    rivalVolume: parseInt(encounter.rival_volume) || 0,
                    rivalWorkouts: parseInt(encounter.rival_workouts) || 0
                });

                // Calculate revenge window (24 hours if user lost)
                const revengeUntil = result.winner === 'rival'
                    ? new Date(Date.now() + 24 * 60 * 60 * 1000)
                    : null;

                // Update encounter
                await client.query(
                    `UPDATE rival_encounters
                     SET status = 'completed',
                         completed_at = NOW(),
                         winner = $1,
                         xp_reward = $2,
                         respect_change = $3,
                         revenge_available_until = $4
                     WHERE id = $5`,
                    [result.winner, result.xpReward, result.respectChange, revengeUntil, encounter.id]
                );

                // Update rivalry stats
                const winIncrement = result.winner === 'user' ? 1 : 0;
                const lossIncrement = result.winner === 'rival' ? 1 : 0;
                const streakReset = result.winner === 'rival';

                await client.query(
                    `UPDATE fitness_rivals
                     SET user_wins = user_wins + $1,
                         rival_wins = rival_wins + $2,
                         current_win_streak = CASE WHEN $3 THEN 0 ELSE current_win_streak + $1 END,
                         respect_points = respect_points + $4,
                         updated_at = NOW()
                     WHERE id = $5`,
                    [winIncrement, lossIncrement, streakReset, result.respectChange, encounter.rival_id]
                );

                // Award XP to user
                if (result.xpReward > 0) {
                    await client.query(
                        `UPDATE users SET xp = xp + $1 WHERE id = $2`,
                        [result.xpReward, encounter.user_id]
                    );
                }

                // Evolve phantom if applicable
                if (encounter.rival_type === 'phantom') {
                    const evolved = evolvePhantom({
                        phantomLevel: 1, // Will be fetched from rivalry
                        phantomStats: encounter.phantom_stats || {},
                        userWins: (encounter.user_wins || 0) + winIncrement,
                        rivalWins: (encounter.rival_wins || 0) + lossIncrement
                    });

                    await client.query(
                        `UPDATE fitness_rivals
                         SET phantom_level = phantom_level + CASE WHEN $1 > phantom_level THEN 1 ELSE 0 END,
                             phantom_stats = $2
                         WHERE id = $3`,
                        [evolved.phantomLevel, JSON.stringify(evolved.phantomStats), encounter.rival_id]
                    );
                }

                results.resolved++;

            } catch (error) {
                results.errors.push({
                    encounterId: encounter.id,
                    error: error.message
                });
            }
        }

        await client.query('COMMIT');

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }

    return results;
}

/**
 * Reset weekly stats for guilds and clubs
 * Should run weekly (e.g., Sunday midnight)
 */
async function resetWeeklyStats() {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // Reset guild weekly volume
        await client.query(`UPDATE archetype_guilds SET weekly_volume = 0`);

        // Reset club weekly XP
        await client.query(`UPDATE clubs SET weekly_xp = 0`);

        // Reset team weekly XP
        await client.query(`UPDATE teams SET weekly_xp = 0`);

        await client.query('COMMIT');

        return { success: true };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Auto-start weekly showdowns for active rivalries
 * Should run weekly (e.g., Monday morning)
 */
async function startWeeklyShowdowns() {
    const client = await db.pool.connect();
    const results = { started: 0 };

    try {
        await client.query('BEGIN');

        // Find rivalries without active encounters
        const rivalriesResult = await client.query(
            `SELECT fr.id
             FROM fitness_rivals fr
             WHERE fr.status = 'active'
               AND NOT EXISTS (
                   SELECT 1 FROM rival_encounters re
                   WHERE re.rival_id = fr.id
                     AND re.status = 'active'
               )`
        );

        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7);

        for (const rivalry of rivalriesResult.rows) {
            await client.query(
                `INSERT INTO rival_encounters (rival_id, encounter_type, start_date, end_date)
                 VALUES ($1, 'weekly_showdown', $2, $3)`,
                [rivalry.id, startDate, endDate]
            );
            results.started++;
        }

        await client.query('COMMIT');

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }

    return results;
}

/**
 * Clean up expired data
 * Should run nightly
 */
async function cleanupExpiredData() {
    const client = await db.pool.connect();
    const results = {};

    try {
        await client.query('BEGIN');

        // Delete expired share templates
        const sharesResult = await client.query(
            `DELETE FROM share_templates
             WHERE expires_at < NOW()
             RETURNING id`
        );
        results.expiredShares = sharesResult.rowCount;

        // Delete old session updates (older than 7 days)
        const updatesResult = await client.query(
            `DELETE FROM session_updates
             WHERE created_at < NOW() - INTERVAL '7 days'
             RETURNING id`
        );
        results.oldSessionUpdates = updatesResult.rowCount;

        // Mark completed workout sessions as such
        await client.query(
            `UPDATE workout_sessions
             SET status = 'completed', ended_at = NOW()
             WHERE status = 'active'
               AND last_activity_at < NOW() - INTERVAL '2 hours'`
        );

        // Cancel abandoned waiting sessions
        await client.query(
            `UPDATE workout_sessions
             SET status = 'cancelled'
             WHERE status = 'waiting'
               AND started_at < NOW() - INTERVAL '1 hour'`
        );

        await client.query('COMMIT');

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }

    return results;
}

/**
 * Run all nightly jobs
 */
async function runNightlyJobs() {
    console.log('Starting nightly jobs...');
    const results = {};

    try {
        results.wagers = await resolveExpiredWagers();
        console.log(`Resolved ${results.wagers.resolved} wagers`);

        results.encounters = await resolveCompletedEncounters();
        console.log(`Resolved ${results.encounters.resolved} encounters`);

        results.cleanup = await cleanupExpiredData();
        console.log(`Cleaned up expired data`);

        return { success: true, results };

    } catch (error) {
        console.error('Nightly jobs error:', error);
        return { success: false, error: error.message, results };
    }
}

/**
 * Run all weekly jobs
 */
async function runWeeklyJobs() {
    console.log('Starting weekly jobs...');
    const results = {};

    try {
        results.reset = await resetWeeklyStats();
        console.log('Reset weekly stats');

        results.showdowns = await startWeeklyShowdowns();
        console.log(`Started ${results.showdowns.started} weekly showdowns`);

        return { success: true, results };

    } catch (error) {
        console.error('Weekly jobs error:', error);
        return { success: false, error: error.message, results };
    }
}

module.exports = {
    resolveExpiredWagers,
    resolveCompletedEncounters,
    resetWeeklyStats,
    startWeeklyShowdowns,
    cleanupExpiredData,
    runNightlyJobs,
    runWeeklyJobs
};
