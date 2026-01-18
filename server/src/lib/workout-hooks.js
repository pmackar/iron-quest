/**
 * Workout Completion Hooks
 * Integrates streak, club, guild, and rival updates when a workout is completed
 */

const db = require('../db/config');
const { calculateStreak, getProtectionDropRateBoost } = require('./streak-utils');

/**
 * Process all post-workout updates
 * @param {Object} client - Database client (for transaction)
 * @param {string} userId - User ID
 * @param {Object} workoutData - Workout details
 */
async function processWorkoutCompletion(client, userId, workoutData) {
    const results = {
        streak: null,
        guild: null,
        club: null,
        rivals: null,
        lootDrop: null
    };

    try {
        // Update streak
        results.streak = await updateStreak(client, userId);

        // Update guild contribution
        results.guild = await updateGuildContribution(client, userId, workoutData);

        // Update club contributions
        results.club = await updateClubContributions(client, userId, workoutData);

        // Update active rival encounters
        results.rivals = await updateRivalEncounters(client, userId, workoutData);

        // Check for loot drops with boosted rates for protection items
        results.lootDrop = await checkLootDrop(client, userId, workoutData, results.streak);

    } catch (error) {
        console.error('Error in workout hooks:', error);
        // Don't throw - these are enhancements, not critical
    }

    return results;
}

/**
 * Update user's streak after workout
 */
async function updateStreak(client, userId) {
    // Get current user streak data
    const userResult = await client.query(
        `SELECT current_streak, longest_streak, last_workout_date, streak_freeze_until
         FROM users WHERE id = $1`,
        [userId]
    );

    if (userResult.rows.length === 0) return null;

    const user = userResult.rows[0];
    const today = new Date();

    // Calculate new streak
    const streakResult = calculateStreak({
        lastWorkoutDate: user.last_workout_date,
        currentStreak: user.current_streak || 0,
        longestStreak: user.longest_streak || 0,
        streakFreezeUntil: user.streak_freeze_until
    }, today);

    // Update user's streak
    const longestStreak = Math.max(user.longest_streak || 0, streakResult.newStreak);

    await client.query(
        `UPDATE users
         SET current_streak = $1,
             longest_streak = $2,
             last_workout_date = $3::date
         WHERE id = $4`,
        [streakResult.newStreak, longestStreak, today, userId]
    );

    return {
        previousStreak: user.current_streak || 0,
        newStreak: streakResult.newStreak,
        isNewRecord: streakResult.isNewRecord,
        protectedByFreeze: streakResult.protectedByFreeze
    };
}

/**
 * Update guild contribution after workout
 */
async function updateGuildContribution(client, userId, workoutData) {
    // Find user's guild membership
    const memberResult = await client.query(
        `SELECT gm.id, gm.guild_id, gm.contribution_xp, gm.contribution_volume
         FROM guild_members gm
         WHERE gm.user_id = $1`,
        [userId]
    );

    if (memberResult.rows.length === 0) return null;

    const membership = memberResult.rows[0];
    const { totalVolume, xpEarned } = workoutData;

    // Update member contribution
    await client.query(
        `UPDATE guild_members
         SET contribution_xp = contribution_xp + $1,
             contribution_volume = contribution_volume + $2
         WHERE id = $3`,
        [xpEarned, totalVolume, membership.id]
    );

    // Update guild totals
    await client.query(
        `UPDATE archetype_guilds
         SET total_volume = total_volume + $1,
             weekly_volume = weekly_volume + $1
         WHERE id = $2`,
        [totalVolume, membership.guild_id]
    );

    return {
        guildId: membership.guild_id,
        xpContributed: xpEarned,
        volumeContributed: totalVolume
    };
}

/**
 * Update club contributions after workout
 */
async function updateClubContributions(client, userId, workoutData) {
    // Find user's club memberships
    const membershipsResult = await client.query(
        `SELECT cm.id, cm.club_id, cm.contribution_xp
         FROM club_members cm
         WHERE cm.user_id = $1`,
        [userId]
    );

    if (membershipsResult.rows.length === 0) return null;

    const { xpEarned } = workoutData;
    const updates = [];

    for (const membership of membershipsResult.rows) {
        // Update member contribution
        await client.query(
            `UPDATE club_members
             SET contribution_xp = contribution_xp + $1
             WHERE id = $2`,
            [xpEarned, membership.id]
        );

        // Update club totals and check challenges
        await client.query(
            `UPDATE clubs
             SET total_xp = total_xp + $1,
                 weekly_xp = weekly_xp + $1
             WHERE id = $2`,
            [xpEarned, membership.club_id]
        );

        // Update active club challenges
        await client.query(
            `UPDATE club_challenges
             SET current_value = current_value + $1
             WHERE club_id = $2
               AND target_type = 'xp'
               AND is_completed = false
               AND end_date > NOW()`,
            [xpEarned, membership.club_id]
        );

        updates.push({
            clubId: membership.club_id,
            xpContributed: xpEarned
        });
    }

    return updates;
}

/**
 * Update active rival encounters after workout
 */
async function updateRivalEncounters(client, userId, workoutData) {
    // Find active encounters
    const encountersResult = await client.query(
        `SELECT re.id, re.rival_id, fr.rival_type, fr.phantom_stats
         FROM rival_encounters re
         JOIN fitness_rivals fr ON fr.id = re.rival_id
         WHERE fr.user_id = $1
           AND re.status = 'active'
           AND re.start_date <= CURRENT_DATE
           AND re.end_date >= CURRENT_DATE`,
        [userId]
    );

    if (encountersResult.rows.length === 0) return null;

    const { totalVolume, xpEarned } = workoutData;
    const updates = [];

    for (const encounter of encountersResult.rows) {
        // Update user stats for this encounter
        await client.query(
            `UPDATE rival_encounters
             SET user_volume = user_volume + $1,
                 user_workouts = user_workouts + 1,
                 user_xp = user_xp + $2
             WHERE id = $3`,
            [totalVolume, xpEarned, encounter.id]
        );

        // For phantom rivals, simulate their progress
        if (encounter.rival_type === 'phantom') {
            const phantomStats = encounter.phantom_stats || {};
            const dailyVolume = (phantomStats.weeklyVolume || 10000) / 7;
            const workoutChance = phantomStats.consistency || 0.7;

            // Random chance phantom also worked out today
            if (Math.random() < workoutChance) {
                const phantomVolume = Math.floor(dailyVolume * (0.8 + Math.random() * 0.4));

                await client.query(
                    `UPDATE rival_encounters
                     SET rival_volume = rival_volume + $1,
                         rival_workouts = rival_workouts + 1
                     WHERE id = $2`,
                    [phantomVolume, encounter.id]
                );
            }
        }

        updates.push({
            encounterId: encounter.id,
            rivalId: encounter.rival_id,
            volumeAdded: totalVolume
        });
    }

    return updates;
}

/**
 * Check for loot drops with streak-based boost for protection items
 */
async function checkLootDrop(client, userId, workoutData, streakResult) {
    // Base drop rates
    const baseDropRate = 0.15; // 15% chance for any drop

    // Roll for drop
    if (Math.random() > baseDropRate) return null;

    // Determine drop type
    const streakWeeks = Math.floor((streakResult?.newStreak || 0) / 7);
    const protectionBoost = getProtectionDropRateBoost(streakWeeks);

    // Drop pool with weighted chances
    const dropPool = [
        { type: 'xp_bonus', weight: 40 },
        { type: 'streak_shield', weight: Math.floor(15 * protectionBoost) },
        { type: 'streak_freeze_day', weight: Math.floor(10 * protectionBoost) },
        { type: 'cosmetic', weight: 25 },
        { type: 'title', weight: 10 }
    ];

    const totalWeight = dropPool.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * totalWeight;

    let selectedDrop = null;
    for (const item of dropPool) {
        roll -= item.weight;
        if (roll <= 0) {
            selectedDrop = item.type;
            break;
        }
    }

    // Apply the drop
    if (selectedDrop === 'streak_shield') {
        await client.query(
            `UPDATE users SET streak_shields = streak_shields + 1 WHERE id = $1`,
            [userId]
        );
        return { type: 'streak_shield', amount: 1 };
    }

    if (selectedDrop === 'streak_freeze_day') {
        await client.query(
            `UPDATE users SET streak_freeze_days = streak_freeze_days + 1 WHERE id = $1`,
            [userId]
        );
        return { type: 'streak_freeze_day', amount: 1 };
    }

    if (selectedDrop === 'xp_bonus') {
        const bonus = Math.floor(workoutData.xpEarned * 0.1);
        await client.query(
            `UPDATE users SET xp = xp + $1 WHERE id = $2`,
            [bonus, userId]
        );
        return { type: 'xp_bonus', amount: bonus };
    }

    return { type: selectedDrop, amount: 1 };
}

module.exports = {
    processWorkoutCompletion,
    updateStreak,
    updateGuildContribution,
    updateClubContributions,
    updateRivalEncounters,
    checkLootDrop
};
