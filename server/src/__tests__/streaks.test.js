/**
 * Streak System Tests
 */

const { calculateStreak, canUseFreeze, canUseShield, validateWager } = require('../lib/streak-utils');

describe('Streak System', () => {
    describe('calculateStreak', () => {
        it('should return 1 for first workout', () => {
            const result = calculateStreak({
                lastWorkoutDate: null,
                currentStreak: 0,
                streakFreezeUntil: null
            }, new Date());

            expect(result.newStreak).toBe(1);
        });

        it('should increment streak for consecutive days', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const result = calculateStreak({
                lastWorkoutDate: yesterday,
                currentStreak: 5,
                streakFreezeUntil: null
            }, new Date());

            expect(result.newStreak).toBe(6);
        });

        it('should maintain streak for same day workout', () => {
            const today = new Date();

            const result = calculateStreak({
                lastWorkoutDate: today,
                currentStreak: 5,
                streakFreezeUntil: null
            }, new Date());

            expect(result.newStreak).toBe(5);
            expect(result.alreadyWorkedOut).toBe(true);
        });

        it('should reset streak when gap > 1 day without freeze', () => {
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

            const result = calculateStreak({
                lastWorkoutDate: threeDaysAgo,
                currentStreak: 10,
                streakFreezeUntil: null
            }, new Date());

            expect(result.newStreak).toBe(1);
            expect(result.streakBroken).toBe(true);
        });

        it('should maintain streak when frozen during gap', () => {
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

            const freezeUntil = new Date();
            freezeUntil.setDate(freezeUntil.getDate() + 1); // Still frozen

            const result = calculateStreak({
                lastWorkoutDate: threeDaysAgo,
                currentStreak: 10,
                streakFreezeUntil: freezeUntil
            }, new Date());

            expect(result.newStreak).toBe(11);
            expect(result.protectedByFreeze).toBe(true);
        });
    });

    describe('canUseFreeze', () => {
        it('should return true when user has freeze days', () => {
            expect(canUseFreeze({ streakFreezeDays: 3, streakFreezeUntil: null }, 2)).toBe(true);
        });

        it('should return false when already frozen', () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 1);

            expect(canUseFreeze({ streakFreezeDays: 3, streakFreezeUntil: futureDate }, 2)).toBe(false);
        });

        it('should return false when not enough freeze days', () => {
            expect(canUseFreeze({ streakFreezeDays: 1, streakFreezeUntil: null }, 3)).toBe(false);
        });
    });

    describe('canUseShield', () => {
        it('should return true when user has shields', () => {
            expect(canUseShield({ streakShields: 2 })).toBe(true);
        });

        it('should return false when no shields', () => {
            expect(canUseShield({ streakShields: 0 })).toBe(false);
        });
    });

    describe('validateWager', () => {
        it('should validate solo wager', () => {
            const result = validateWager({
                wagerType: 'solo',
                xpStake: 100,
                targetDays: 7,
                userXp: 500
            });

            expect(result.valid).toBe(true);
        });

        it('should reject wager with insufficient XP', () => {
            const result = validateWager({
                wagerType: 'solo',
                xpStake: 100,
                targetDays: 7,
                userXp: 50
            });

            expect(result.valid).toBe(false);
            expect(result.error).toContain('XP');
        });

        it('should reject invalid target days', () => {
            const result = validateWager({
                wagerType: 'solo',
                xpStake: 100,
                targetDays: 45,
                userXp: 500
            });

            expect(result.valid).toBe(false);
            expect(result.error).toContain('days');
        });

        it('should require opponent for head_to_head', () => {
            const result = validateWager({
                wagerType: 'head_to_head',
                xpStake: 100,
                targetDays: 7,
                userXp: 500,
                opponentId: null
            });

            expect(result.valid).toBe(false);
            expect(result.error).toContain('opponent');
        });
    });
});
