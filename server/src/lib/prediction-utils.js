/**
 * Prediction System Utilities
 */

/**
 * Calculate estimated 1 rep max using Brzycki formula
 * @param {number} weight - Weight lifted
 * @param {number} reps - Reps performed
 * @returns {number} Estimated 1RM
 */
function calculateE1RM(weight, reps) {
    if (weight === 0 || reps === 0) return 0;
    if (reps === 1) return weight;

    // Brzycki formula: weight × (36 / (37 - reps))
    return Math.round(weight * (36 / (37 - reps)));
}

/**
 * Predict next PR based on set history
 * @param {Array} sets - Array of {weight, reps} objects
 * @returns {Object} Prediction result
 */
function predictNextPR(sets) {
    if (sets.length < 3) {
        return {
            predictedWeight: null,
            trend: 'insufficient_data',
            confidence: 0
        };
    }

    // Calculate e1RM for each set
    const e1RMs = sets.map(set => calculateE1RM(set.weight, set.reps));
    const currentPR = Math.max(...e1RMs);

    // Calculate linear regression for trend
    const n = e1RMs.length;
    const xSum = (n * (n - 1)) / 2;
    const xSquareSum = (n * (n - 1) * (2 * n - 1)) / 6;
    const ySum = e1RMs.reduce((a, b) => a + b, 0);
    const xySum = e1RMs.reduce((sum, y, i) => sum + i * y, 0);

    const slope = (n * xySum - xSum * ySum) / (n * xSquareSum - xSum * xSum);

    // Determine trend and prediction
    let trend, predictedWeight, confidence, weeksToPredict;

    const slopeThreshold = currentPR * 0.005; // 0.5% of current PR

    if (slope > slopeThreshold) {
        trend = 'improving';
        weeksToPredict = 4;
        predictedWeight = Math.round(currentPR + (slope * 7 * weeksToPredict));
        confidence = Math.min(0.95, 0.5 + (slope / currentPR) * 10);
    } else if (slope < -slopeThreshold) {
        trend = 'declining';
        weeksToPredict = 6;
        predictedWeight = Math.round(currentPR * 1.02);
        confidence = Math.max(0.2, 0.5 + slope / currentPR);
    } else {
        trend = 'plateau';
        weeksToPredict = 8;
        predictedWeight = Math.round(currentPR * 1.025);
        confidence = 0.4;
    }

    // Calculate predicted date
    const predictedDate = new Date();
    predictedDate.setDate(predictedDate.getDate() + (weeksToPredict * 7));

    return {
        currentPR,
        predictedWeight,
        predictedDate,
        trend,
        confidence,
        setsAnalyzed: sets.length
    };
}

/**
 * Calculate CNS fatigue score
 * @param {Object} factors - Fatigue factors
 * @returns {number} Fatigue score (0-100)
 */
function calculateFatigueScore(factors) {
    const {
        volumeSpike = 0,
        workoutCount = 0,
        sleepQuality = 3,
        sorenessLevel = 2,
        energyLevel = 3
    } = factors;

    let score = 30; // Base fatigue

    // Volume spike factor (0-25 points)
    if (volumeSpike > 20) score += 25;
    else if (volumeSpike > 10) score += 15;
    else if (volumeSpike > 0) score += 5;

    // Workout frequency factor (0-20 points)
    if (workoutCount >= 6) score += 20;
    else if (workoutCount >= 5) score += 10;
    else if (workoutCount >= 4) score += 5;

    // Sleep quality factor (0-15 points)
    if (sleepQuality <= 2) score += 15;
    else if (sleepQuality <= 3) score += 5;

    // Soreness factor (0-15 points)
    if (sorenessLevel >= 4) score += 15;
    else if (sorenessLevel >= 3) score += 5;

    // Energy factor (0-10 points)
    if (energyLevel <= 2) score += 10;
    else if (energyLevel <= 3) score += 5;

    // Clamp to 0-100
    return Math.min(100, Math.max(0, score));
}

/**
 * Get training readiness recommendation
 * @param {Object} params - Readiness parameters
 * @returns {Object} Readiness result
 */
function getTrainingReadiness(params) {
    const { fatigueScore, sleepQuality = 3, energyLevel = 3 } = params;

    // Base readiness is inverse of fatigue
    let score = 100 - fatigueScore;

    // Boost for good sleep and energy
    if (sleepQuality >= 4) score += 10;
    if (energyLevel >= 4) score += 10;

    // Penalties for poor sleep and energy
    if (sleepQuality <= 2) score -= 10;
    if (energyLevel <= 2) score -= 10;

    // Clamp to 0-100
    score = Math.min(100, Math.max(0, score));

    // Determine recommendation
    let recommendation, recoveryDays;

    if (score >= 80) {
        recommendation = 'push';
        recoveryDays = 0;
    } else if (score >= 60) {
        recommendation = 'normal';
        recoveryDays = 0;
    } else if (score >= 40) {
        recommendation = 'moderate';
        recoveryDays = 0;
    } else if (score >= 25) {
        recommendation = 'light';
        recoveryDays = 1;
    } else {
        recommendation = 'deload';
        recoveryDays = 2;
    }

    return {
        score,
        recommendation,
        recoveryDays
    };
}

/**
 * Detect plateau risk from weekly data
 * @param {Array} weeks - Array of weekly data
 * @returns {Object} Plateau risk assessment
 */
function detectPlateauRisk(weeks) {
    if (weeks.length < 4) {
        return { volumePlateau: false, frequencyDecline: false, insufficient_data: true };
    }

    // Compare recent 2 weeks to older 2 weeks
    const recent = weeks.slice(0, 2);
    const older = weeks.slice(2, 4);

    // Volume plateau detection
    const recentVolume = recent.reduce((sum, w) => sum + (w.weeklyVolume || 0), 0) / 2;
    const olderVolume = older.reduce((sum, w) => sum + (w.weeklyVolume || 0), 0) / 2;
    const volumeChange = olderVolume > 0 ? (recentVolume - olderVolume) / olderVolume : 0;

    const volumePlateau = Math.abs(volumeChange) < 0.02; // Less than 2% change

    // Frequency decline detection
    const recentFrequency = recent.reduce((sum, w) => sum + (w.workoutCount || 0), 0) / 2;
    const olderFrequency = older.reduce((sum, w) => sum + (w.workoutCount || 0), 0) / 2;

    const frequencyDecline = recentFrequency < olderFrequency * 0.8; // 20%+ decline

    return {
        volumePlateau,
        frequencyDecline,
        volumeChange: Math.round(volumeChange * 100),
        frequencyChange: olderFrequency > 0 ? Math.round(((recentFrequency - olderFrequency) / olderFrequency) * 100) : 0
    };
}

module.exports = {
    calculateE1RM,
    predictNextPR,
    calculateFatigueScore,
    getTrainingReadiness,
    detectPlateauRisk
};
