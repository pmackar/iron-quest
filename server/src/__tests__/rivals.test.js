/**
 * Rival System Tests
 */

const {
    generatePhantomStats,
    generatePhantomResponse,
    calculateEncounterWinner,
    isRevengeAvailable,
    evolvePhantom
} = require('../lib/rival-utils');

describe('Rival System', () => {
    describe('generatePhantomStats', () => {
        it('should generate stats based on user level', () => {
            const stats = generatePhantomStats({
                level: 10,
                totalWeight: 100000,
                totalWorkouts: 50
            });

            expect(stats.weeklyVolume).toBeGreaterThan(0);
            expect(stats.weeklyWorkouts).toBeGreaterThanOrEqual(3);
            expect(stats.weeklyWorkouts).toBeLessThanOrEqual(6);
            expect(stats.consistency).toBeGreaterThanOrEqual(0.7);
            expect(stats.consistency).toBeLessThanOrEqual(0.95);
        });

        it('should scale with user performance', () => {
            const lowLevelStats = generatePhantomStats({
                level: 5,
                totalWeight: 20000,
                totalWorkouts: 10
            });

            const highLevelStats = generatePhantomStats({
                level: 50,
                totalWeight: 1000000,
                totalWorkouts: 500
            });

            expect(highLevelStats.weeklyVolume).toBeGreaterThan(lowLevelStats.weeklyVolume);
        });
    });

    describe('generatePhantomResponse', () => {
        it('should generate response based on personality', () => {
            const friendlyResponse = generatePhantomResponse({
                personality: 'friendly',
                messageType: 'chat'
            });

            expect(friendlyResponse.content).toBeDefined();
            expect(typeof friendlyResponse.content).toBe('string');
        });

        it('should generate different responses for different personalities', () => {
            const personalities = ['friendly', 'competitive', 'trash_talker', 'stoic', 'mentor'];
            const responses = personalities.map(p =>
                generatePhantomResponse({ personality: p, messageType: 'chat' }).content
            );

            // At least some should be different
            const uniqueResponses = new Set(responses);
            expect(uniqueResponses.size).toBeGreaterThan(1);
        });

        it('should handle challenge message type', () => {
            const response = generatePhantomResponse({
                personality: 'competitive',
                messageType: 'challenge'
            });

            expect(response.content).toBeDefined();
        });
    });

    describe('calculateEncounterWinner', () => {
        it('should declare user winner when volume is higher', () => {
            const result = calculateEncounterWinner({
                userVolume: 50000,
                userWorkouts: 5,
                rivalVolume: 40000,
                rivalWorkouts: 4
            });

            expect(result.winner).toBe('user');
        });

        it('should declare rival winner when their volume is higher', () => {
            const result = calculateEncounterWinner({
                userVolume: 30000,
                userWorkouts: 3,
                rivalVolume: 45000,
                rivalWorkouts: 5
            });

            expect(result.winner).toBe('rival');
        });

        it('should declare tie when volumes are close', () => {
            const result = calculateEncounterWinner({
                userVolume: 50000,
                userWorkouts: 5,
                rivalVolume: 50500,
                rivalWorkouts: 5
            });

            expect(result.winner).toBe('tie');
        });

        it('should calculate XP reward based on margin', () => {
            const closeWin = calculateEncounterWinner({
                userVolume: 50000,
                userWorkouts: 5,
                rivalVolume: 48000,
                rivalWorkouts: 5
            });

            const dominantWin = calculateEncounterWinner({
                userVolume: 70000,
                userWorkouts: 7,
                rivalVolume: 40000,
                rivalWorkouts: 4
            });

            expect(dominantWin.xpReward).toBeGreaterThan(closeWin.xpReward);
        });
    });

    describe('isRevengeAvailable', () => {
        it('should return true for recent loss with available revenge', () => {
            const revengeUntil = new Date();
            revengeUntil.setHours(revengeUntil.getHours() + 12);

            const result = isRevengeAvailable({
                winner: 'rival',
                revengeAvailableUntil: revengeUntil,
                hasRevengeBeenTaken: false
            });

            expect(result).toBe(true);
        });

        it('should return false for expired revenge window', () => {
            const revengeUntil = new Date();
            revengeUntil.setHours(revengeUntil.getHours() - 1);

            const result = isRevengeAvailable({
                winner: 'rival',
                revengeAvailableUntil: revengeUntil,
                hasRevengeBeenTaken: false
            });

            expect(result).toBe(false);
        });

        it('should return false if revenge already taken', () => {
            const revengeUntil = new Date();
            revengeUntil.setHours(revengeUntil.getHours() + 12);

            const result = isRevengeAvailable({
                winner: 'rival',
                revengeAvailableUntil: revengeUntil,
                hasRevengeBeenTaken: true
            });

            expect(result).toBe(false);
        });

        it('should return false for user wins', () => {
            const result = isRevengeAvailable({
                winner: 'user',
                revengeAvailableUntil: new Date(Date.now() + 86400000),
                hasRevengeBeenTaken: false
            });

            expect(result).toBe(false);
        });
    });

    describe('evolvePhantom', () => {
        it('should increase phantom level after user wins', () => {
            const evolved = evolvePhantom({
                phantomLevel: 10,
                phantomStats: { weeklyVolume: 50000, weeklyWorkouts: 4 },
                userWins: 5,
                rivalWins: 2
            });

            expect(evolved.phantomLevel).toBeGreaterThan(10);
            expect(evolved.phantomStats.weeklyVolume).toBeGreaterThan(50000);
        });

        it('should decrease phantom difficulty after rival dominates', () => {
            const evolved = evolvePhantom({
                phantomLevel: 10,
                phantomStats: { weeklyVolume: 50000, weeklyWorkouts: 4 },
                userWins: 1,
                rivalWins: 8
            });

            expect(evolved.phantomStats.weeklyVolume).toBeLessThan(50000);
        });

        it('should maintain balance when evenly matched', () => {
            const evolved = evolvePhantom({
                phantomLevel: 10,
                phantomStats: { weeklyVolume: 50000, weeklyWorkouts: 4 },
                userWins: 5,
                rivalWins: 5
            });

            // Should be roughly similar
            expect(Math.abs(evolved.phantomStats.weeklyVolume - 50000)).toBeLessThan(5000);
        });
    });
});
