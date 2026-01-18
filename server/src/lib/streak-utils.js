/**
 * Streak System Utilities
 */

/**
 * Calculate streak based on workout history
 * @param {Object} user - User data with streak info
 * @param {Date} workoutDate - Date of the workout
 * @returns {Object} Streak calculation result
 */
function calculateStreak(user, workoutDate) {
    const today = new Date(workoutDate);
    today.setHours(0, 0, 0, 0);

    const lastWorkout = user.lastWorkoutDate ? new Date(user.lastWorkoutDate) : null;
    if (lastWorkout) {
        lastWorkout.setHours(0, 0, 0, 0);
    }

    let newStreak = user.currentStreak || 0;
    let alreadyWorkedOut = false;
    let streakBroken = false;
    let protectedByFreeze = false;

    if (!lastWorkout) {
        // First workout ever
        newStreak = 1;
    } else {
        const daysDiff = Math.floor((today - lastWorkout) / (1000 * 60 * 60 * 24));

        if (daysDiff === 0) {
            // Same day workout
            alreadyWorkedOut = true;
        } else if (daysDiff === 1) {
            // Consecutive day
            newStreak += 1;
        } else {
            // Gap in workouts - check if frozen
            const frozenUntil = user.streakFreezeUntil ? new Date(user.streakFreezeUntil) : null;

            if (frozenUntil && frozenUntil > today) {
                // Still frozen, protect streak
                newStreak += 1;
                protectedByFreeze = true;
            } else if (frozenUntil && frozenUntil > lastWorkout) {
                // Was frozen during the gap
                newStreak += 1;
                protectedByFreeze = true;
            } else {
                // Streak broken
                newStreak = 1;
                streakBroken = true;
            }
        }
    }

    return {
        newStreak,
        alreadyWorkedOut,
        streakBroken,
        protectedByFreeze,
        isNewRecord: newStreak > (user.longestStreak || 0)
    };
}

/**
 * Check if user can activate a freeze
 * @param {Object} user - User data
 * @param {number} days - Days to freeze
 * @returns {boolean}
 */
function canUseFreeze(user, days) {
    // Check if already frozen
    if (user.streakFreezeUntil && new Date(user.streakFreezeUntil) > new Date()) {
        return false;
    }

    // Check if enough freeze days
    return (user.streakFreezeDays || 0) >= days;
}

/**
 * Check if user can use a shield
 * @param {Object} user - User data
 * @returns {boolean}
 */
function canUseShield(user) {
    return (user.streakShields || 0) > 0;
}

/**
 * Validate a wager request
 * @param {Object} params - Wager parameters
 * @returns {Object} Validation result
 */
function validateWager(params) {
    const { wagerType, xpStake, targetDays, userXp, opponentId } = params;

    // Validate wager type
    if (!['solo', 'head_to_head', 'group'].includes(wagerType)) {
        return { valid: false, error: 'Invalid wager type' };
    }

    // Validate XP stake
    if (xpStake < 10 || xpStake > 1000) {
        return { valid: false, error: 'XP stake must be between 10 and 1000' };
    }

    // Check if user has enough XP
    if (userXp < xpStake) {
        return { valid: false, error: 'Not enough XP to stake' };
    }

    // Validate target days
    if (targetDays < 3 || targetDays > 30) {
        return { valid: false, error: 'Target days must be between 3 and 30' };
    }

    // Head-to-head requires opponent
    if (wagerType === 'head_to_head' && !opponentId) {
        return { valid: false, error: 'Head-to-head wager requires an opponent' };
    }

    return { valid: true };
}

/**
 * Calculate drop rate boost for protection items based on streak week
 * @param {number} streakWeeks - Current streak in weeks
 * @returns {number} Drop rate multiplier
 */
function getProtectionDropRateBoost(streakWeeks) {
    // Boost protection items during weeks 1-4 of streak
    // Formula: baseRate * (1 + Math.max(0, 4 - streakWeeks) * 0.15)
    const boost = Math.max(0, 4 - streakWeeks) * 0.15;
    return 1 + boost;
}

/**
 * Resolve a wager at completion
 * @param {Object} wager - Wager data
 * @param {Object} userStats - User's stats during wager period
 * @param {Object} opponentStats - Opponent's stats (for head-to-head)
 * @returns {Object} Wager resolution result
 */
function resolveWager(wager, userStats, opponentStats = null) {
    const { wagerType, xpStake, targetDays } = wager;

    if (wagerType === 'solo') {
        // Solo wager: did user maintain streak for target days?
        const maintained = userStats.workoutDays >= targetDays;
        return {
            winner: maintained ? 'user' : 'lost',
            xpChange: maintained ? xpStake : -xpStake,
            message: maintained
                ? `Congratulations! You maintained your streak for ${targetDays} days!`
                : `Streak wager lost. You worked out ${userStats.workoutDays}/${targetDays} days.`
        };
    }

    if (wagerType === 'head_to_head' && opponentStats) {
        // Head-to-head: compare workout days
        if (userStats.workoutDays > opponentStats.workoutDays) {
            return {
                winner: 'user',
                xpChange: xpStake,
                message: `You won! ${userStats.workoutDays} vs ${opponentStats.workoutDays} workout days.`
            };
        } else if (opponentStats.workoutDays > userStats.workoutDays) {
            return {
                winner: 'opponent',
                xpChange: -xpStake,
                message: `You lost. ${userStats.workoutDays} vs ${opponentStats.workoutDays} workout days.`
            };
        } else {
            return {
                winner: 'tie',
                xpChange: 0,
                message: `It's a tie! Both had ${userStats.workoutDays} workout days.`
            };
        }
    }

    return { winner: null, xpChange: 0, message: 'Could not resolve wager' };
}

module.exports = {
    calculateStreak,
    canUseFreeze,
    canUseShield,
    validateWager,
    getProtectionDropRateBoost,
    resolveWager
};
