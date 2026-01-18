/**
 * Prediction System Tests
 */

const {
    calculateE1RM,
    predictNextPR,
    calculateFatigueScore,
    getTrainingReadiness,
    detectPlateauRisk
} = require('../lib/prediction-utils');

describe('Prediction System', () => {
    describe('calculateE1RM', () => {
        it('should return weight for 1 rep', () => {
            expect(calculateE1RM(225, 1)).toBe(225);
        });

        it('should calculate e1RM using Brzycki formula', () => {
            // 225 x 5 should be approximately 253
            const e1rm = calculateE1RM(225, 5);
            expect(e1rm).toBeGreaterThan(250);
            expect(e1rm).toBeLessThan(260);
        });

        it('should handle edge cases', () => {
            expect(calculateE1RM(0, 5)).toBe(0);
            expect(calculateE1RM(100, 0)).toBe(0);
        });
    });

    describe('predictNextPR', () => {
        it('should predict higher weight for improving trend', () => {
            const sets = [
                { weight: 200, reps: 5 },
                { weight: 205, reps: 5 },
                { weight: 210, reps: 5 },
                { weight: 215, reps: 5 },
                { weight: 220, reps: 5 }
            ];

            const prediction = predictNextPR(sets);

            expect(prediction.predictedWeight).toBeGreaterThan(220);
            expect(prediction.trend).toBe('improving');
            expect(prediction.confidence).toBeGreaterThan(0.5);
        });

        it('should detect plateau', () => {
            const sets = [
                { weight: 225, reps: 5 },
                { weight: 225, reps: 5 },
                { weight: 225, reps: 5 },
                { weight: 225, reps: 5 },
                { weight: 225, reps: 5 }
            ];

            const prediction = predictNextPR(sets);

            expect(prediction.trend).toBe('plateau');
        });

        it('should handle declining trend', () => {
            const sets = [
                { weight: 225, reps: 5 },
                { weight: 220, reps: 5 },
                { weight: 215, reps: 5 },
                { weight: 210, reps: 5 },
                { weight: 205, reps: 5 }
            ];

            const prediction = predictNextPR(sets);

            expect(prediction.trend).toBe('declining');
            expect(prediction.confidence).toBeLessThan(0.5);
        });
    });

    describe('calculateFatigueScore', () => {
        it('should return low fatigue for normal training', () => {
            const score = calculateFatigueScore({
                volumeSpike: 0,
                workoutCount: 4,
                sleepQuality: 4,
                sorenessLevel: 2,
                energyLevel: 4
            });

            expect(score).toBeLessThan(50);
        });

        it('should return high fatigue for overtraining signals', () => {
            const score = calculateFatigueScore({
                volumeSpike: 30, // 30% volume increase
                workoutCount: 7,
                sleepQuality: 2,
                sorenessLevel: 5,
                energyLevel: 2
            });

            expect(score).toBeGreaterThan(70);
        });

        it('should clamp score between 0 and 100', () => {
            const lowScore = calculateFatigueScore({
                volumeSpike: -50,
                workoutCount: 1,
                sleepQuality: 5,
                sorenessLevel: 1,
                energyLevel: 5
            });

            const highScore = calculateFatigueScore({
                volumeSpike: 100,
                workoutCount: 10,
                sleepQuality: 1,
                sorenessLevel: 5,
                energyLevel: 1
            });

            expect(lowScore).toBeGreaterThanOrEqual(0);
            expect(highScore).toBeLessThanOrEqual(100);
        });
    });

    describe('getTrainingReadiness', () => {
        it('should recommend push for well-recovered state', () => {
            const readiness = getTrainingReadiness({
                fatigueScore: 20,
                sleepQuality: 5,
                energyLevel: 5
            });

            expect(readiness.score).toBeGreaterThan(80);
            expect(readiness.recommendation).toBe('push');
        });

        it('should recommend deload for high fatigue', () => {
            const readiness = getTrainingReadiness({
                fatigueScore: 85,
                sleepQuality: 2,
                energyLevel: 2
            });

            expect(readiness.score).toBeLessThan(30);
            expect(readiness.recommendation).toBe('deload');
        });
    });

    describe('detectPlateauRisk', () => {
        it('should detect volume plateau', () => {
            const weeks = [
                { weeklyVolume: 50000 },
                { weeklyVolume: 50500 },
                { weeklyVolume: 51000 },
                { weeklyVolume: 50800 }
            ];

            const risk = detectPlateauRisk(weeks);

            expect(risk.volumePlateau).toBe(true);
        });

        it('should detect frequency decline', () => {
            const weeks = [
                { workoutCount: 3 },
                { workoutCount: 3 },
                { workoutCount: 5 },
                { workoutCount: 5 }
            ];

            const risk = detectPlateauRisk(weeks);

            expect(risk.frequencyDecline).toBe(true);
        });

        it('should return no risk for progressive training', () => {
            const weeks = [
                { weeklyVolume: 40000, workoutCount: 4 },
                { weeklyVolume: 42000, workoutCount: 4 },
                { weeklyVolume: 44000, workoutCount: 4 },
                { weeklyVolume: 46000, workoutCount: 5 }
            ];

            const risk = detectPlateauRisk(weeks);

            expect(risk.volumePlateau).toBe(false);
            expect(risk.frequencyDecline).toBe(false);
        });
    });
});
