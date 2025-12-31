/**
 * IRON QUEST - Workout Tracker
 * PS1/Dreamcast Style Web Application
 * Version 3.0 - Custom Exercises, Custom Workouts, Character Stats
 */

// ============================================
// DATA STRUCTURES
// ============================================

// Exercise Tier System - Higher tiers = more XP
const EXERCISE_TIERS = {
    // Tier 1 - Major Compounds (3x XP multiplier)
    tier1: ['bench', 'squat', 'deadlift', 'ohp'],
    // Tier 2 - Secondary Compounds (2x XP multiplier)
    tier2: ['barbell_row', 'rows', 'pullups', 'pullup', 'dip', 'legpress', 'rdl', 'romanian_deadlift'],
    // Tier 3 - All other exercises (1x XP multiplier) - default
};

// Exercises included in the Strength Test (with swappable alternatives)
const BASELINE_TEST_EXERCISES = [
    {
        id: 'bench', name: 'Bench Press', tier: 1, icon: '🏋️', category: 'chest',
        alternatives: [
            { id: 'incline_bench', name: 'Incline Bench Press' },
            { id: 'db_bench', name: 'Dumbbell Bench Press' },
            { id: 'decline_bench', name: 'Decline Bench Press' },
            { id: 'machine_chest_press', name: 'Machine Chest Press' }
        ]
    },
    {
        id: 'squat', name: 'Squat', tier: 1, icon: '🦵', category: 'legs',
        alternatives: [
            { id: 'front_squat', name: 'Front Squat' },
            { id: 'hack_squat', name: 'Hack Squat' },
            { id: 'legpress', name: 'Leg Press' },
            { id: 'goblet_squat', name: 'Goblet Squat' }
        ]
    },
    {
        id: 'deadlift', name: 'Deadlift', tier: 1, icon: '💀', category: 'back',
        alternatives: [
            { id: 'sumo_deadlift', name: 'Sumo Deadlift' },
            { id: 'trap_bar_deadlift', name: 'Trap Bar Deadlift' },
            { id: 'rdl', name: 'Romanian Deadlift' },
            { id: 'rack_pull', name: 'Rack Pull' }
        ]
    },
    {
        id: 'ohp', name: 'Overhead Press', tier: 1, icon: '🎯', category: 'shoulders',
        alternatives: [
            { id: 'db_shoulder_press', name: 'Dumbbell Shoulder Press' },
            { id: 'arnold_press', name: 'Arnold Press' },
            { id: 'machine_shoulder_press', name: 'Machine Shoulder Press' },
            { id: 'push_press', name: 'Push Press' }
        ]
    },
    {
        id: 'rows', name: 'Barbell Row', tier: 2, icon: '🚣', category: 'back',
        alternatives: [
            { id: 'db_row', name: 'Dumbbell Row' },
            { id: 'cable_row', name: 'Cable Row' },
            { id: 't_bar_row', name: 'T-Bar Row' },
            { id: 'machine_row', name: 'Machine Row' }
        ]
    },
    {
        id: 'pullups', name: 'Pull-up', tier: 2, icon: '🧗', category: 'back',
        alternatives: [
            { id: 'chinup', name: 'Chin-up' },
            { id: 'lat_pulldown', name: 'Lat Pulldown' },
            { id: 'assisted_pullup', name: 'Assisted Pull-up' },
            { id: 'neutral_grip_pullup', name: 'Neutral Grip Pull-up' }
        ]
    },
    {
        id: 'dip', name: 'Dip', tier: 2, icon: '⬇️', category: 'chest',
        alternatives: [
            { id: 'machine_dip', name: 'Machine Dip' },
            { id: 'bench_dip', name: 'Bench Dip' },
            { id: 'close_grip_bench', name: 'Close Grip Bench Press' },
            { id: 'tricep_pushdown', name: 'Tricep Pushdown' }
        ]
    },
    {
        id: 'curls', name: 'Barbell Curl', tier: 3, icon: '💪', category: 'arms',
        alternatives: [
            { id: 'db_curl', name: 'Dumbbell Curl' },
            { id: 'hammer_curl', name: 'Hammer Curl' },
            { id: 'preacher_curl', name: 'Preacher Curl' },
            { id: 'cable_curl', name: 'Cable Curl' }
        ]
    }
];

// Track swapped exercises during test
let testExerciseSwaps = {};

// Weight suggestion formulas: maps exercise IDs to baseline references with ratios
// Ratio is the suggested working weight as a percentage of the baseline 1RM
const WEIGHT_SUGGESTION_MAP = {
    // Chest exercises - based on bench press
    'bench': { baseline: 'bench', ratio: 0.70 },  // 70% of 1RM for working sets
    'incline_bench': { baseline: 'bench', ratio: 0.60 },
    'decline_bench': { baseline: 'bench', ratio: 0.65 },
    'db_bench': { baseline: 'bench', ratio: 0.35 },  // Each dumbbell
    'db_incline_bench': { baseline: 'bench', ratio: 0.30 },
    'machine_chest_press': { baseline: 'bench', ratio: 0.65 },
    'cable_crossover': { baseline: 'bench', ratio: 0.15 },
    'pec_deck': { baseline: 'bench', ratio: 0.30 },
    'chest_fly': { baseline: 'bench', ratio: 0.15 },

    // Back exercises - based on deadlift and rows
    'deadlift': { baseline: 'deadlift', ratio: 0.70 },
    'sumo_deadlift': { baseline: 'deadlift', ratio: 0.70 },
    'trap_bar_deadlift': { baseline: 'deadlift', ratio: 0.75 },
    'rdl': { baseline: 'deadlift', ratio: 0.55 },
    'rack_pull': { baseline: 'deadlift', ratio: 0.80 },
    'rows': { baseline: 'rows', ratio: 0.70, fallback: { baseline: 'deadlift', ratio: 0.45 } },
    'db_row': { baseline: 'rows', ratio: 0.40, fallback: { baseline: 'deadlift', ratio: 0.25 } },
    'cable_row': { baseline: 'rows', ratio: 0.55, fallback: { baseline: 'deadlift', ratio: 0.35 } },
    't_bar_row': { baseline: 'rows', ratio: 0.65, fallback: { baseline: 'deadlift', ratio: 0.40 } },
    'machine_row': { baseline: 'rows', ratio: 0.60, fallback: { baseline: 'deadlift', ratio: 0.35 } },
    'lat_pulldown': { baseline: 'pullups', ratio: 0.70, fallback: { baseline: 'deadlift', ratio: 0.30 } },

    // Shoulder exercises - based on OHP
    'ohp': { baseline: 'ohp', ratio: 0.70 },
    'db_shoulder_press': { baseline: 'ohp', ratio: 0.35 },  // Each dumbbell
    'arnold_press': { baseline: 'ohp', ratio: 0.30 },
    'machine_shoulder_press': { baseline: 'ohp', ratio: 0.60 },
    'push_press': { baseline: 'ohp', ratio: 0.80 },
    'lateral_raise': { baseline: 'ohp', ratio: 0.10 },
    'front_raise': { baseline: 'ohp', ratio: 0.10 },
    'rear_delt_fly': { baseline: 'ohp', ratio: 0.08 },
    'face_pull': { baseline: 'ohp', ratio: 0.25 },

    // Leg exercises - based on squat
    'squat': { baseline: 'squat', ratio: 0.70 },
    'front_squat': { baseline: 'squat', ratio: 0.60 },
    'hack_squat': { baseline: 'squat', ratio: 0.70 },
    'legpress': { baseline: 'squat', ratio: 1.20 },  // Leg press is typically higher
    'goblet_squat': { baseline: 'squat', ratio: 0.25 },
    'leg_extension': { baseline: 'squat', ratio: 0.25 },
    'leg_curl': { baseline: 'squat', ratio: 0.20 },
    'calf_raise': { baseline: 'squat', ratio: 0.35 },
    'lunges': { baseline: 'squat', ratio: 0.30 },
    'bulgarian_split_squat': { baseline: 'squat', ratio: 0.25 },
    'hip_thrust': { baseline: 'squat', ratio: 0.60 },

    // Arm exercises - based on curls and bench (for triceps)
    'curls': { baseline: 'curls', ratio: 0.70 },
    'db_curl': { baseline: 'curls', ratio: 0.35 },
    'hammer_curl': { baseline: 'curls', ratio: 0.35 },
    'preacher_curl': { baseline: 'curls', ratio: 0.55 },
    'cable_curl': { baseline: 'curls', ratio: 0.40 },
    'concentration_curl': { baseline: 'curls', ratio: 0.30 },
    'tricep_pushdown': { baseline: 'bench', ratio: 0.25 },
    'overhead_tricep': { baseline: 'bench', ratio: 0.20 },
    'skull_crushers': { baseline: 'bench', ratio: 0.30 },
    'close_grip_bench': { baseline: 'bench', ratio: 0.55 },

    // Dip variations - based on bench
    'dip': { baseline: 'dip', ratio: 0.70, fallback: { baseline: 'bench', ratio: 0.10 } },  // Additional weight
    'machine_dip': { baseline: 'bench', ratio: 0.55 },
    'bench_dip': { baseline: 'bench', ratio: 0.15 }  // Additional weight
};

// Get suggested starting weight for an exercise
function getSuggestedWeight(exerciseId) {
    if (!gameState?.baselines) return null;

    // First check if user has a baseline for this exact exercise
    if (gameState.baselines[exerciseId]) {
        // Use best set data if available, otherwise calculate from 1RM
        if (gameState.bestSets && gameState.bestSets[exerciseId]) {
            return gameState.bestSets[exerciseId].weight;
        }
        // Suggest 70% of 1RM for working sets
        return Math.round(gameState.baselines[exerciseId] * 0.7 / 5) * 5;  // Round to nearest 5
    }

    // Look up suggestion map
    const suggestion = WEIGHT_SUGGESTION_MAP[exerciseId];
    if (!suggestion) return null;

    // Try primary baseline
    let baseline = gameState.baselines[suggestion.baseline];
    let ratio = suggestion.ratio;

    // Try fallback if primary not available
    if (!baseline && suggestion.fallback) {
        baseline = gameState.baselines[suggestion.fallback.baseline];
        ratio = suggestion.fallback.ratio;
    }

    if (!baseline) return null;

    // Calculate and round to nearest 5
    return Math.round(baseline * ratio / 5) * 5;
}

// Get suggested reps based on exercise type and user's best set data
function getSuggestedReps(exerciseId) {
    // If user has best set data, use those reps
    if (gameState?.bestSets && gameState.bestSets[exerciseId]) {
        return gameState.bestSets[exerciseId].reps;
    }

    // Default suggestion: 8-10 reps for most exercises
    return 10;
}

// Check if an exercise is bodyweight
function isBodyweightExercise(exerciseId) {
    // Check in allExercises first
    const exercise = allExercises.find(ex => ex.id === exerciseId);
    if (exercise?.equipment === 'bodyweight') return true;

    // Also check the BODYWEIGHT_EXERCISES list (handles ID variations like chinup vs chinups)
    if (BODYWEIGHT_EXERCISES.includes(exerciseId)) return true;

    // Check for common variations (singular/plural)
    const variations = [
        exerciseId,
        exerciseId + 's',  // chinup -> chinups
        exerciseId.replace(/s$/, '')  // chinups -> chinup
    ];
    return variations.some(id => BODYWEIGHT_EXERCISES.includes(id));
}

// Calculate volume for a set, accounting for bodyweight exercises
// For bodyweight exercises: (userBodyweight + additionalWeight) × reps
// For regular exercises: weight × reps
function calculateVolume(exerciseId, additionalWeight, reps) {
    const weight = additionalWeight || 0;
    const repCount = reps || 0;

    if (isBodyweightExercise(exerciseId)) {
        const userBodyweight = gameState?.weight || 0;
        return (userBodyweight + weight) * repCount;
    }
    return weight * repCount;
}

// List of bodyweight exercise IDs for quick lookup
const BODYWEIGHT_EXERCISES = [
    'pushups', 'dips_chest', 'dip', 'bench_dip', 'pullups', 'chinups', 'chinup',
    'neutral_grip_pullup', 'assisted_pullup', 'hyperextension',
    'tricep_dips', 'diamond_pushup', 'bodyweight_squat', 'lunges_bw',
    'pistol_squat', 'calf_raise_bw', 'plank', 'hanging_leg_raise',
    'leg_raise', 'ab_wheel', 'mountain_climber', 'burpees'
];

// Milestone bonuses for exceeding baseline
const MILESTONE_BONUSES = {
    100: { label: 'MATCHED PR', xp: 50, color: '#00ccff' },
    110: { label: '+10% PR!', xp: 150, color: '#ffcc00' },
    120: { label: '+20% PR!', xp: 300, color: '#ff6600' },
    130: { label: '+30% PR!', xp: 500, color: '#ff3366' }
};

// All character save slots
let saveSlots = [null, null, null, null];
let currentSlotIndex = null;

// Current active character
let gameState = null;

// Workout Templates
const workouts = {
    push: {
        name: 'PUSH DAY',
        type: 'push',
        exercises: [
            { id: 'bench', name: 'Bench Press', targetSets: 4 },
            { id: 'ohp', name: 'Overhead Press', targetSets: 3 },
            { id: 'incline', name: 'Incline Dumbbell Press', targetSets: 3 },
            { id: 'flies', name: 'Cable Flies', targetSets: 3 },
            { id: 'tricep', name: 'Tricep Pushdowns', targetSets: 3 },
            { id: 'laterals', name: 'Lateral Raises', targetSets: 3 }
        ]
    },
    pull: {
        name: 'PULL DAY',
        type: 'pull',
        exercises: [
            { id: 'deadlift', name: 'Deadlift', targetSets: 4 },
            { id: 'rows', name: 'Barbell Rows', targetSets: 4 },
            { id: 'pullups', name: 'Pull-Ups', targetSets: 3 },
            { id: 'facepull', name: 'Face Pulls', targetSets: 3 },
            { id: 'curls', name: 'Barbell Curls', targetSets: 3 },
            { id: 'hammercurl', name: 'Hammer Curls', targetSets: 3 }
        ]
    },
    legs: {
        name: 'LEG DAY',
        type: 'legs',
        exercises: [
            { id: 'squat', name: 'Barbell Squat', targetSets: 4 },
            { id: 'legpress', name: 'Leg Press', targetSets: 3 },
            { id: 'rdl', name: 'Romanian Deadlift', targetSets: 3 },
            { id: 'legcurl', name: 'Leg Curls', targetSets: 3 },
            { id: 'legext', name: 'Leg Extensions', targetSets: 3 },
            { id: 'calfraise', name: 'Calf Raises', targetSets: 4 }
        ]
    }
};

// All exercises for stats - organized by muscle group
const allExercises = [
    // CHEST (15 exercises)
    { id: 'bench', name: 'Bench Press', muscle: 'chest', equipment: 'barbell' },
    { id: 'incline_bench', name: 'Incline Bench Press', muscle: 'chest', equipment: 'barbell' },
    { id: 'decline_bench', name: 'Decline Bench Press', muscle: 'chest', equipment: 'barbell' },
    { id: 'db_bench', name: 'Dumbbell Bench Press', muscle: 'chest', equipment: 'dumbbell' },
    { id: 'incline_db', name: 'Incline Dumbbell Press', muscle: 'chest', equipment: 'dumbbell' },
    { id: 'decline_db', name: 'Decline Dumbbell Press', muscle: 'chest', equipment: 'dumbbell' },
    { id: 'db_flies', name: 'Dumbbell Flies', muscle: 'chest', equipment: 'dumbbell' },
    { id: 'incline_flies', name: 'Incline Dumbbell Flies', muscle: 'chest', equipment: 'dumbbell' },
    { id: 'cable_flies', name: 'Cable Flies', muscle: 'chest', equipment: 'cable' },
    { id: 'low_cable_flies', name: 'Low Cable Flies', muscle: 'chest', equipment: 'cable' },
    { id: 'high_cable_flies', name: 'High Cable Flies', muscle: 'chest', equipment: 'cable' },
    { id: 'chest_press_machine', name: 'Chest Press Machine', muscle: 'chest', equipment: 'machine' },
    { id: 'pec_deck', name: 'Pec Deck', muscle: 'chest', equipment: 'machine' },
    { id: 'pushups', name: 'Push-Ups', muscle: 'chest', equipment: 'bodyweight' },
    { id: 'dips_chest', name: 'Chest Dips', muscle: 'chest', equipment: 'bodyweight' },
    { id: 'dip', name: 'Dip', muscle: 'chest', equipment: 'bodyweight' },
    { id: 'bench_dip', name: 'Bench Dip', muscle: 'triceps', equipment: 'bodyweight' },

    // BACK (16 exercises)
    { id: 'deadlift', name: 'Deadlift', muscle: 'back', equipment: 'barbell' },
    { id: 'rows', name: 'Barbell Rows', muscle: 'back', equipment: 'barbell' },
    { id: 'pendlay_row', name: 'Pendlay Row', muscle: 'back', equipment: 'barbell' },
    { id: 'tbar_row', name: 'T-Bar Row', muscle: 'back', equipment: 'barbell' },
    { id: 'db_row', name: 'Dumbbell Row', muscle: 'back', equipment: 'dumbbell' },
    { id: 'pullups', name: 'Pull-Ups', muscle: 'back', equipment: 'bodyweight' },
    { id: 'chinups', name: 'Chin-Ups', muscle: 'back', equipment: 'bodyweight' },
    { id: 'lat_pulldown', name: 'Lat Pulldown', muscle: 'back', equipment: 'cable' },
    { id: 'close_grip_pulldown', name: 'Close Grip Pulldown', muscle: 'back', equipment: 'cable' },
    { id: 'seated_cable_row', name: 'Seated Cable Row', muscle: 'back', equipment: 'cable' },
    { id: 'cable_pullover', name: 'Cable Pullover', muscle: 'back', equipment: 'cable' },
    { id: 'facepull', name: 'Face Pulls', muscle: 'back', equipment: 'cable' },
    { id: 'machine_row', name: 'Machine Row', muscle: 'back', equipment: 'machine' },
    { id: 'chest_supported_row', name: 'Chest Supported Row', muscle: 'back', equipment: 'machine' },
    { id: 'hyperextension', name: 'Hyperextensions', muscle: 'back', equipment: 'bodyweight' },
    { id: 'rack_pull', name: 'Rack Pull', muscle: 'back', equipment: 'barbell' },

    // SHOULDERS (14 exercises)
    { id: 'ohp', name: 'Overhead Press', muscle: 'shoulders', equipment: 'barbell' },
    { id: 'push_press', name: 'Push Press', muscle: 'shoulders', equipment: 'barbell' },
    { id: 'db_shoulder_press', name: 'Dumbbell Shoulder Press', muscle: 'shoulders', equipment: 'dumbbell' },
    { id: 'arnold_press', name: 'Arnold Press', muscle: 'shoulders', equipment: 'dumbbell' },
    { id: 'laterals', name: 'Lateral Raises', muscle: 'shoulders', equipment: 'dumbbell' },
    { id: 'cable_lateral', name: 'Cable Lateral Raise', muscle: 'shoulders', equipment: 'cable' },
    { id: 'front_raise', name: 'Front Raises', muscle: 'shoulders', equipment: 'dumbbell' },
    { id: 'rear_delt_fly', name: 'Rear Delt Fly', muscle: 'shoulders', equipment: 'dumbbell' },
    { id: 'reverse_pec_deck', name: 'Reverse Pec Deck', muscle: 'shoulders', equipment: 'machine' },
    { id: 'upright_row', name: 'Upright Row', muscle: 'shoulders', equipment: 'barbell' },
    { id: 'shrugs_bb', name: 'Barbell Shrugs', muscle: 'shoulders', equipment: 'barbell' },
    { id: 'shrugs_db', name: 'Dumbbell Shrugs', muscle: 'shoulders', equipment: 'dumbbell' },
    { id: 'shoulder_press_machine', name: 'Shoulder Press Machine', muscle: 'shoulders', equipment: 'machine' },
    { id: 'landmine_press', name: 'Landmine Press', muscle: 'shoulders', equipment: 'barbell' },

    // BICEPS (10 exercises)
    { id: 'curls', name: 'Barbell Curls', muscle: 'biceps', equipment: 'barbell' },
    { id: 'ez_bar_curl', name: 'EZ Bar Curl', muscle: 'biceps', equipment: 'barbell' },
    { id: 'db_curl', name: 'Dumbbell Curls', muscle: 'biceps', equipment: 'dumbbell' },
    { id: 'hammercurl', name: 'Hammer Curls', muscle: 'biceps', equipment: 'dumbbell' },
    { id: 'incline_curl', name: 'Incline Dumbbell Curl', muscle: 'biceps', equipment: 'dumbbell' },
    { id: 'concentration_curl', name: 'Concentration Curl', muscle: 'biceps', equipment: 'dumbbell' },
    { id: 'preacher_curl', name: 'Preacher Curl', muscle: 'biceps', equipment: 'barbell' },
    { id: 'cable_curl', name: 'Cable Curl', muscle: 'biceps', equipment: 'cable' },
    { id: 'spider_curl', name: 'Spider Curl', muscle: 'biceps', equipment: 'dumbbell' },
    { id: 'machine_curl', name: 'Machine Curl', muscle: 'biceps', equipment: 'machine' },

    // TRICEPS (10 exercises)
    { id: 'tricep', name: 'Tricep Pushdowns', muscle: 'triceps', equipment: 'cable' },
    { id: 'rope_pushdown', name: 'Rope Pushdowns', muscle: 'triceps', equipment: 'cable' },
    { id: 'overhead_tricep', name: 'Overhead Tricep Extension', muscle: 'triceps', equipment: 'cable' },
    { id: 'skull_crushers', name: 'Skull Crushers', muscle: 'triceps', equipment: 'barbell' },
    { id: 'close_grip_bench', name: 'Close Grip Bench Press', muscle: 'triceps', equipment: 'barbell' },
    { id: 'tricep_dips', name: 'Tricep Dips', muscle: 'triceps', equipment: 'bodyweight' },
    { id: 'db_tricep_ext', name: 'Dumbbell Tricep Extension', muscle: 'triceps', equipment: 'dumbbell' },
    { id: 'kickbacks', name: 'Tricep Kickbacks', muscle: 'triceps', equipment: 'dumbbell' },
    { id: 'diamond_pushup', name: 'Diamond Push-Ups', muscle: 'triceps', equipment: 'bodyweight' },
    { id: 'tricep_machine', name: 'Tricep Machine', muscle: 'triceps', equipment: 'machine' },

    // QUADRICEPS (10 exercises)
    { id: 'squat', name: 'Barbell Squat', muscle: 'quads', equipment: 'barbell' },
    { id: 'front_squat', name: 'Front Squat', muscle: 'quads', equipment: 'barbell' },
    { id: 'goblet_squat', name: 'Goblet Squat', muscle: 'quads', equipment: 'dumbbell' },
    { id: 'legpress', name: 'Leg Press', muscle: 'quads', equipment: 'machine' },
    { id: 'hack_squat', name: 'Hack Squat', muscle: 'quads', equipment: 'machine' },
    { id: 'legext', name: 'Leg Extensions', muscle: 'quads', equipment: 'machine' },
    { id: 'lunges', name: 'Lunges', muscle: 'quads', equipment: 'bodyweight' },
    { id: 'walking_lunge', name: 'Walking Lunges', muscle: 'quads', equipment: 'dumbbell' },
    { id: 'split_squat', name: 'Bulgarian Split Squat', muscle: 'quads', equipment: 'dumbbell' },
    { id: 'step_ups', name: 'Step Ups', muscle: 'quads', equipment: 'dumbbell' },

    // HAMSTRINGS (8 exercises)
    { id: 'rdl', name: 'Romanian Deadlift', muscle: 'hamstrings', equipment: 'barbell' },
    { id: 'stiff_leg_dl', name: 'Stiff Leg Deadlift', muscle: 'hamstrings', equipment: 'barbell' },
    { id: 'db_rdl', name: 'Dumbbell RDL', muscle: 'hamstrings', equipment: 'dumbbell' },
    { id: 'legcurl', name: 'Lying Leg Curl', muscle: 'hamstrings', equipment: 'machine' },
    { id: 'seated_leg_curl', name: 'Seated Leg Curl', muscle: 'hamstrings', equipment: 'machine' },
    { id: 'nordic_curl', name: 'Nordic Curl', muscle: 'hamstrings', equipment: 'bodyweight' },
    { id: 'good_morning', name: 'Good Mornings', muscle: 'hamstrings', equipment: 'barbell' },
    { id: 'glute_ham_raise', name: 'Glute Ham Raise', muscle: 'hamstrings', equipment: 'machine' },

    // GLUTES (7 exercises)
    { id: 'hip_thrust', name: 'Hip Thrust', muscle: 'glutes', equipment: 'barbell' },
    { id: 'glute_bridge', name: 'Glute Bridge', muscle: 'glutes', equipment: 'bodyweight' },
    { id: 'cable_kickback', name: 'Cable Kickback', muscle: 'glutes', equipment: 'cable' },
    { id: 'sumo_deadlift', name: 'Sumo Deadlift', muscle: 'glutes', equipment: 'barbell' },
    { id: 'cable_pull_through', name: 'Cable Pull Through', muscle: 'glutes', equipment: 'cable' },
    { id: 'hip_abduction', name: 'Hip Abduction Machine', muscle: 'glutes', equipment: 'machine' },
    { id: 'kickback_machine', name: 'Glute Kickback Machine', muscle: 'glutes', equipment: 'machine' },

    // CALVES (4 exercises)
    { id: 'calfraise', name: 'Standing Calf Raise', muscle: 'calves', equipment: 'machine' },
    { id: 'seated_calf', name: 'Seated Calf Raise', muscle: 'calves', equipment: 'machine' },
    { id: 'donkey_calf', name: 'Donkey Calf Raise', muscle: 'calves', equipment: 'machine' },
    { id: 'smith_calf', name: 'Smith Machine Calf Raise', muscle: 'calves', equipment: 'machine' },

    // CORE (10 exercises)
    { id: 'plank', name: 'Plank', muscle: 'core', equipment: 'bodyweight' },
    { id: 'crunches', name: 'Crunches', muscle: 'core', equipment: 'bodyweight' },
    { id: 'leg_raise', name: 'Hanging Leg Raise', muscle: 'core', equipment: 'bodyweight' },
    { id: 'cable_crunch', name: 'Cable Crunch', muscle: 'core', equipment: 'cable' },
    { id: 'ab_rollout', name: 'Ab Rollout', muscle: 'core', equipment: 'other' },
    { id: 'russian_twist', name: 'Russian Twist', muscle: 'core', equipment: 'bodyweight' },
    { id: 'woodchop', name: 'Cable Woodchop', muscle: 'core', equipment: 'cable' },
    { id: 'dead_bug', name: 'Dead Bug', muscle: 'core', equipment: 'bodyweight' },
    { id: 'pallof_press', name: 'Pallof Press', muscle: 'core', equipment: 'cable' },
    { id: 'decline_situp', name: 'Decline Sit-Up', muscle: 'core', equipment: 'bodyweight' }
];

// Milestone achievements
const milestones = {
    bench: [
        { weight: 135, name: 'ONE PLATE CLUB', desc: 'Bench Press 135 lbs', icon: '🏋️', xp: 500 },
        { weight: 185, name: 'GETTING STRONG', desc: 'Bench Press 185 lbs', icon: '💪', xp: 750 },
        { weight: 225, name: 'TWO PLATE WARRIOR', desc: 'Bench Press 225 lbs', icon: '🔥', xp: 1000 },
        { weight: 315, name: 'ELITE PRESSER', desc: 'Bench Press 315 lbs', icon: '👑', xp: 2000 }
    ],
    squat: [
        { weight: 135, name: 'SQUAT INITIATE', desc: 'Squat 135 lbs', icon: '🦵', xp: 500 },
        { weight: 225, name: 'TWO PLATE SQUATTER', desc: 'Squat 225 lbs', icon: '🏆', xp: 750 },
        { weight: 315, name: 'THREE PLATE BEAST', desc: 'Squat 315 lbs', icon: '🦍', xp: 1000 },
        { weight: 405, name: 'FOUR PLATE LEGEND', desc: 'Squat 405 lbs', icon: '⚡', xp: 2000 }
    ],
    deadlift: [
        { weight: 135, name: 'DEADLIFT BEGINNER', desc: 'Deadlift 135 lbs', icon: '💀', xp: 500 },
        { weight: 225, name: 'DEADLIFT WARRIOR', desc: 'Deadlift 225 lbs', icon: '⚔️', xp: 750 },
        { weight: 315, name: 'THREE PLATE PULLER', desc: 'Deadlift 315 lbs', icon: '🔱', xp: 1000 },
        { weight: 405, name: 'FOUR PLATE TITAN', desc: 'Deadlift 405 lbs', icon: '🌟', xp: 1500 },
        { weight: 495, name: 'FIVE PLATE GOD', desc: 'Deadlift 495 lbs', icon: '👑', xp: 2500 }
    ],
    ohp: [
        { weight: 95, name: 'PRESS NOVICE', desc: 'Overhead Press 95 lbs', icon: '🎯', xp: 400 },
        { weight: 135, name: 'ONE PLATE OHP', desc: 'Overhead Press 135 lbs', icon: '🚀', xp: 800 },
        { weight: 185, name: 'SHOULDER BOULDER', desc: 'Overhead Press 185 lbs', icon: '🗿', xp: 1500 }
    ]
};

// Avatar SVGs - 32-bit style warrior characters
const avatarSVGs = {
    // Flame Warrior - Orange/Red with fire effects
    1: `<svg viewBox="0 0 60 60">
        <defs>
            <linearGradient id="flame1" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#ffcc00"/>
                <stop offset="50%" style="stop-color:#ff6600"/>
                <stop offset="100%" style="stop-color:#cc3300"/>
            </linearGradient>
            <linearGradient id="skin1" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#ffdbac"/>
                <stop offset="100%" style="stop-color:#e8b88a"/>
            </linearGradient>
            <linearGradient id="armor1" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#8b0000"/>
                <stop offset="50%" style="stop-color:#660000"/>
                <stop offset="100%" style="stop-color:#440000"/>
            </linearGradient>
        </defs>
        <!-- Fire Hair -->
        <ellipse cx="30" cy="8" rx="12" ry="6" fill="url(#flame1)"/>
        <ellipse cx="25" cy="6" rx="5" ry="4" fill="#ffcc00"/>
        <ellipse cx="35" cy="7" rx="4" ry="5" fill="#ff9900"/>
        <!-- Head -->
        <ellipse cx="30" cy="18" rx="11" ry="12" fill="url(#skin1)"/>
        <!-- Eyes -->
        <ellipse cx="25" cy="17" rx="3" ry="2.5" fill="#fff"/>
        <ellipse cx="35" cy="17" rx="3" ry="2.5" fill="#fff"/>
        <circle cx="25" cy="17" r="1.5" fill="#cc3300"/>
        <circle cx="35" cy="17" r="1.5" fill="#cc3300"/>
        <circle cx="25.5" cy="16.5" r="0.5" fill="#fff"/>
        <circle cx="35.5" cy="16.5" r="0.5" fill="#fff"/>
        <!-- Eyebrows -->
        <path d="M22 14 L28 13" stroke="#993300" stroke-width="1.5" fill="none"/>
        <path d="M32 13 L38 14" stroke="#993300" stroke-width="1.5" fill="none"/>
        <!-- Nose & Mouth -->
        <path d="M30 19 L29 22 L31 22" stroke="#d4a574" stroke-width="0.8" fill="none"/>
        <path d="M27 25 Q30 27 33 25" stroke="#c4846a" stroke-width="1" fill="none"/>
        <!-- Body Armor -->
        <path d="M18 30 Q30 28 42 30 L44 48 Q30 52 16 48 Z" fill="url(#armor1)"/>
        <path d="M22 32 L22 44" stroke="#ff6600" stroke-width="2"/>
        <path d="M38 32 L38 44" stroke="#ff6600" stroke-width="2"/>
        <circle cx="30" cy="36" r="4" fill="#ff6600" stroke="#ffcc00" stroke-width="1"/>
        <!-- Arms -->
        <ellipse cx="14" cy="36" rx="5" ry="8" fill="url(#armor1)"/>
        <ellipse cx="46" cy="36" rx="5" ry="8" fill="url(#armor1)"/>
        <ellipse cx="13" cy="44" rx="3" ry="3" fill="url(#skin1)"/>
        <ellipse cx="47" cy="44" rx="3" ry="3" fill="url(#skin1)"/>
        <!-- Legs -->
        <rect x="20" y="48" width="8" height="12" rx="2" fill="#440000"/>
        <rect x="32" y="48" width="8" height="12" rx="2" fill="#440000"/>
    </svg>`,

    // Mystic Mage - Purple with magical aura
    2: `<svg viewBox="0 0 60 60">
        <defs>
            <linearGradient id="magic2" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#cc99ff"/>
                <stop offset="100%" style="stop-color:#6633cc"/>
            </linearGradient>
            <linearGradient id="skin2" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#c4a882"/>
                <stop offset="100%" style="stop-color:#a68b6a"/>
            </linearGradient>
            <linearGradient id="robe2" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#9966ff"/>
                <stop offset="50%" style="stop-color:#6633cc"/>
                <stop offset="100%" style="stop-color:#4d2699"/>
            </linearGradient>
        </defs>
        <!-- Wizard Hat -->
        <polygon points="30,0 42,24 18,24" fill="url(#magic2)"/>
        <ellipse cx="30" cy="24" rx="14" ry="4" fill="#6633cc"/>
        <circle cx="30" cy="8" r="3" fill="#00ffcc"/>
        <!-- Head -->
        <ellipse cx="30" cy="28" rx="10" ry="9" fill="url(#skin2)"/>
        <!-- Beard -->
        <path d="M22 32 Q30 42 38 32" fill="#888"/>
        <path d="M24 34 Q30 48 36 34" fill="#aaa"/>
        <!-- Eyes -->
        <ellipse cx="26" cy="27" rx="2.5" ry="2" fill="#fff"/>
        <ellipse cx="34" cy="27" rx="2.5" ry="2" fill="#fff"/>
        <circle cx="26" cy="27" r="1.2" fill="#00ffcc"/>
        <circle cx="34" cy="27" r="1.2" fill="#00ffcc"/>
        <circle cx="26.3" cy="26.5" r="0.4" fill="#fff"/>
        <circle cx="34.3" cy="26.5" r="0.4" fill="#fff"/>
        <!-- Eyebrows -->
        <path d="M23 24 L29 25" stroke="#666" stroke-width="1.2" fill="none"/>
        <path d="M31 25 L37 24" stroke="#666" stroke-width="1.2" fill="none"/>
        <!-- Robe Body -->
        <path d="M16 36 Q30 32 44 36 L48 58 Q30 62 12 58 Z" fill="url(#robe2)"/>
        <path d="M30 38 L30 55" stroke="#00ffcc" stroke-width="2"/>
        <circle cx="30" cy="42" r="3" fill="#00ffcc"/>
        <!-- Magic Orb in hand -->
        <circle cx="50" cy="48" r="6" fill="#cc99ff" opacity="0.7"/>
        <circle cx="50" cy="48" r="4" fill="#00ffcc"/>
        <circle cx="48" cy="46" r="1.5" fill="#fff"/>
        <!-- Arms/Sleeves -->
        <path d="M16 36 Q8 44 12 52" stroke="url(#robe2)" stroke-width="8" fill="none"/>
        <path d="M44 36 Q52 44 48 52" stroke="url(#robe2)" stroke-width="8" fill="none"/>
    </svg>`,

    // Tech Knight - Blue cyber armor
    3: `<svg viewBox="0 0 60 60">
        <defs>
            <linearGradient id="cyber3" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#00ccff"/>
                <stop offset="100%" style="stop-color:#0066cc"/>
            </linearGradient>
            <linearGradient id="armor3" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#4488cc"/>
                <stop offset="50%" style="stop-color:#336699"/>
                <stop offset="100%" style="stop-color:#224466"/>
            </linearGradient>
            <linearGradient id="visor3" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#00ffcc"/>
                <stop offset="50%" style="stop-color:#00ccff"/>
                <stop offset="100%" style="stop-color:#0099ff"/>
            </linearGradient>
        </defs>
        <!-- Helmet -->
        <ellipse cx="30" cy="16" rx="14" ry="14" fill="url(#armor3)"/>
        <path d="M16 16 Q30 8 44 16" fill="#224466"/>
        <!-- Visor -->
        <rect x="18" y="14" width="24" height="8" rx="4" fill="url(#visor3)"/>
        <rect x="20" y="16" width="8" height="4" rx="1" fill="#fff" opacity="0.3"/>
        <rect x="32" y="16" width="8" height="4" rx="1" fill="#fff" opacity="0.3"/>
        <!-- Helmet Details -->
        <rect x="28" y="6" width="4" height="6" fill="#00ccff"/>
        <circle cx="30" cy="8" r="2" fill="#00ffcc"/>
        <!-- Chin Guard -->
        <path d="M20 24 Q30 30 40 24" fill="#336699"/>
        <!-- Body Armor -->
        <path d="M14 28 L46 28 L50 55 L10 55 Z" fill="url(#armor3)"/>
        <!-- Chest Plate Details -->
        <path d="M22 32 L30 38 L38 32" stroke="#00ccff" stroke-width="2" fill="none"/>
        <path d="M22 36 L30 42 L38 36" stroke="#00ccff" stroke-width="1.5" fill="none"/>
        <circle cx="30" cy="46" r="4" fill="#224466" stroke="#00ccff" stroke-width="1.5"/>
        <circle cx="30" cy="46" r="2" fill="#00ffcc"/>
        <!-- Shoulder Pads -->
        <ellipse cx="10" cy="34" rx="8" ry="6" fill="url(#armor3)"/>
        <ellipse cx="50" cy="34" rx="8" ry="6" fill="url(#armor3)"/>
        <circle cx="10" cy="34" r="3" fill="#00ccff"/>
        <circle cx="50" cy="34" r="3" fill="#00ccff"/>
        <!-- Arms -->
        <rect x="6" y="38" width="8" height="14" rx="3" fill="#336699"/>
        <rect x="46" y="38" width="8" height="14" rx="3" fill="#336699"/>
        <!-- Legs -->
        <rect x="18" y="52" width="10" height="8" rx="2" fill="#224466"/>
        <rect x="32" y="52" width="10" height="8" rx="2" fill="#224466"/>
        <rect x="20" y="54" width="6" height="2" fill="#00ccff"/>
        <rect x="34" y="54" width="6" height="2" fill="#00ccff"/>
    </svg>`,

    // Shadow Assassin - Dark with red accents
    4: `<svg viewBox="0 0 60 60">
        <defs>
            <linearGradient id="shadow4" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#2a2a3a"/>
                <stop offset="100%" style="stop-color:#1a1a2a"/>
            </linearGradient>
            <linearGradient id="skin4" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#e8d4c4"/>
                <stop offset="100%" style="stop-color:#d4baa8"/>
            </linearGradient>
            <linearGradient id="cloak4" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#3a3a4a"/>
                <stop offset="50%" style="stop-color:#2a2a3a"/>
                <stop offset="100%" style="stop-color:#1a1a2a"/>
            </linearGradient>
        </defs>
        <!-- Hood -->
        <path d="M12 20 Q30 4 48 20 Q48 32 30 36 Q12 32 12 20" fill="url(#cloak4)"/>
        <path d="M16 22 Q30 10 44 22" fill="#1a1a2a"/>
        <!-- Face in shadow -->
        <ellipse cx="30" cy="24" rx="9" ry="10" fill="url(#skin4)"/>
        <!-- Mask/Bandana -->
        <rect x="18" y="26" width="24" height="8" fill="#1a1a2a"/>
        <path d="M42 28 L52 26 L50 32 L42 30" fill="#1a1a2a"/>
        <!-- Eyes -->
        <ellipse cx="25" cy="22" rx="3" ry="2" fill="#1a1a2a"/>
        <ellipse cx="35" cy="22" rx="3" ry="2" fill="#1a1a2a"/>
        <ellipse cx="25" cy="22" rx="2" ry="1.5" fill="#ff3366"/>
        <ellipse cx="35" cy="22" rx="2" ry="1.5" fill="#ff3366"/>
        <circle cx="25.5" cy="21.5" r="0.5" fill="#fff"/>
        <circle cx="35.5" cy="21.5" r="0.5" fill="#fff"/>
        <!-- Scar -->
        <path d="M38 18 L42 24" stroke="#aa8888" stroke-width="1"/>
        <!-- Cloak Body -->
        <path d="M8 34 Q30 30 52 34 L56 60 L4 60 Z" fill="url(#cloak4)"/>
        <!-- Red accents -->
        <path d="M20 40 L20 55" stroke="#ff3366" stroke-width="1.5"/>
        <path d="M40 40 L40 55" stroke="#ff3366" stroke-width="1.5"/>
        <!-- Belt -->
        <rect x="16" y="44" width="28" height="4" fill="#1a1a2a"/>
        <rect x="28" y="43" width="4" height="6" fill="#ff3366"/>
        <!-- Hidden Blade hint -->
        <path d="M8 50 L4 58" stroke="#888" stroke-width="2"/>
        <path d="M2 58 L6 58" stroke="#ccc" stroke-width="1"/>
        <!-- Throwing stars on belt -->
        <polygon points="20,46 21,44.5 22,46 20.5,47 21.5,47" fill="#888"/>
        <polygon points="36,46 37,44.5 38,46 36.5,47 37.5,47" fill="#888"/>
    </svg>`
};

// Current workout state
let currentWorkout = null;
let currentExercise = null;
let exerciseSets = {};
let workoutStartTime = null;
let workoutMinimized = false;
let previousScreen = 'menuScreen';

// Calendar state
let calendarDate = new Date();

// Current menu tab
let currentMenuTab = 'workout';

// Custom exercises (stored globally)
let customExercises = [];

// Custom workouts (stored globally)
let customWorkouts = [];

// Custom programs (stored globally)
let customPrograms = [];

// Current program being viewed/edited
let currentProgram = null;

// Selected exercises for workout creation
let selectedWorkoutExercises = [];

// Selected exercises for program workout creation
let selectedProgramExercises = [];

// Online mode state
let isOnlineMode = false;
let currentUser = null;
let currentTeam = null;

// Rest timer state
let restTimerInterval = null;
let restTimeRemaining = 90; // Default 90 seconds
let restTimerRunning = false;
let defaultRestTime = 90;

// Current set type
let currentSetType = 'normal';

// PRs hit during current workout (for summary)
let workoutPRsHit = [];

// Superset tracking - array of arrays, each inner array is a group of exercise IDs
let supersets = [];
let supersetMode = false; // When true, user is selecting exercises to link
let supersetSelections = []; // Temp storage for superset selections

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Hide loading screen after delay
    setTimeout(() => {
        document.getElementById('loadingScreen').classList.add('hidden');
    }, 1500);

    // Check for existing auth token
    checkAuthState();

    // Initialize sync UI
    initSyncUI();

    // Load save slots
    loadSaveSlots();

    // Load custom exercises and workouts
    loadCustomData();

    // Check for coach view mode
    checkCoachMode();

    // Avatar selection in create screen
    document.querySelectorAll('.avatar-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
        });
    });

    // Icon picker for workout creation (new design)
    document.querySelectorAll('#iconPickerDropdown .icon-pick').forEach(option => {
        option.addEventListener('click', () => {
            const icon = option.dataset.icon;
            selectWorkoutIcon(icon);
        });
    });

    // Icon selection for program creation
    document.querySelectorAll('#programIconSelector .icon-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('#programIconSelector .icon-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
        });
    });

    // Initialize default programs after a short delay to ensure functions are loaded
    setTimeout(() => {
        initializeDefaultPrograms();
    }, 100);

    // Global ESC key handler for back/close navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            handleEscapeKey();
        }
    });

});

// ============================================
// ESCAPE KEY HANDLER
// ============================================

function handleEscapeKey() {
    // Check for active modals (in priority order)
    const modals = [
        { id: 'prDetailModal', close: closePRDetailModal },
        { id: 'weightEditModal', close: closeWeightEditModal },
        { id: 'setModal', close: closeSetModal },
        { id: 'workoutSummaryModal', close: closeWorkoutSummary },
        { id: 'workoutDetailModal', close: closeWorkoutDetail },
        { id: 'exerciseHistoryModal', close: closeExerciseHistory },
        { id: 'statHistoryModal', close: closeStatHistory },
        { id: 'swapExerciseModal', close: closeSwapModal },
        { id: 'createExerciseModal', close: closeCreateExerciseModal },
        { id: 'createWorkoutModal', close: closeCreateWorkoutModal },
        { id: 'createProgramModal', close: closeCreateProgramModal },
        { id: 'programDetailModal', close: closeProgramDetailModal },
        { id: 'addWorkoutToProgramModal', close: closeAddWorkoutToProgramModal },
        { id: 'createTeamModal', close: closeCreateTeamModal },
        { id: 'joinTeamModal', close: closeJoinTeamModal },
        { id: 'createChallengeModal', close: closeCreateChallengeModal },
        { id: 'teamDetailModal', close: closeTeamDetail },
        { id: 'coachImportModal', close: closeCoachImport },
        { id: 'achievementPopup', close: closeAchievement }
    ];

    // Check each modal
    for (const modal of modals) {
        const el = document.getElementById(modal.id);
        if (el && el.classList.contains('active')) {
            modal.close();
            return;
        }
    }

    // Check for dropdown/picker that might be open
    const iconPicker = document.getElementById('iconPickerDropdown');
    if (iconPicker && iconPicker.classList.contains('active')) {
        iconPicker.classList.remove('active');
        return;
    }

    // No modal open, handle screen navigation
    const activeScreen = document.querySelector('.screen.active');
    if (!activeScreen) return;

    const screenId = activeScreen.id;

    // Define back navigation map
    switch (screenId) {
        case 'workoutScreen':
            // Don't allow ESC to exit active workout easily - could lose data
            break;
        case 'menuScreen':
            showScreen('selectScreen');
            break;
        case 'profileScreen':
            showScreen('menuScreen');
            break;
        case 'testScreen':
            showScreen('selectScreen');
            break;
        case 'coachViewScreen':
            showScreen('selectScreen');
            break;
        case 'createScreen':
            showScreen('authScreen');
            break;
        case 'authScreen':
            // Already at root, do nothing
            break;
        case 'selectScreen':
            // Character select is root after auth
            break;
        default:
            // Default: try to go to menu
            if (gameState) {
                showScreen('menuScreen');
            }
    }
}

// ============================================
// AVATAR UPLOAD
// ============================================

let customAvatarData = null;

function triggerAvatarUpload() {
    document.getElementById('avatarFileInput').click();
}

function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file');
        return;
    }

    // Validate file size (max 500KB)
    if (file.size > 500 * 1024) {
        showToast('Image too large (max 500KB)');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        customAvatarData = e.target.result;

        // Update preview
        const preview = document.getElementById('avatarUploadPreview');
        preview.innerHTML = `<img src="${customAvatarData}" alt="Custom avatar">`;

        // Select this avatar option
        document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
        document.querySelector('.avatar-upload').classList.add('selected');
    };
    reader.readAsDataURL(file);
}

// ============================================
// CSV IMPORT (Strong App Format)
// ============================================

let importedWorkoutData = null;

function triggerCsvImport() {
    document.getElementById('csvFileInput').click();
}

function handleCsvImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById('importStatus');
    statusEl.innerHTML = '<span style="color: var(--text-muted);">Processing...</span>';

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvData = e.target.result;
            const result = parseStrongCsv(csvData);
            importedWorkoutData = result;

            statusEl.innerHTML = `
                <span style="color: var(--accent-green);">
                    Imported ${result.workouts.length} workouts, ${result.totalSets} sets, ${formatNumber(result.totalVolume)} lbs
                </span>
            `;
            showToast(`IMPORTED ${result.workouts.length} WORKOUTS!`);
        } catch (error) {
            console.error('CSV import error:', error);
            statusEl.innerHTML = `<span style="color: var(--accent-red);">Error: ${error.message}</span>`;
        }
    };
    reader.readAsText(file);
}

function parseStrongCsv(csvText) {
    const lines = csvText.split('\n');
    if (lines.length < 2) throw new Error('CSV file is empty');

    // Parse header
    const header = parseCSVLine(lines[0]);
    const dateIdx = header.indexOf('Date');
    const workoutNameIdx = header.indexOf('Workout Name');
    const durationIdx = header.indexOf('Duration');
    const exerciseNameIdx = header.indexOf('Exercise Name');
    const setOrderIdx = header.indexOf('Set Order');
    const weightIdx = header.indexOf('Weight');
    const repsIdx = header.indexOf('Reps');
    const notesIdx = header.indexOf('Notes');
    const workoutNotesIdx = header.indexOf('Workout Notes');

    if (dateIdx === -1 || exerciseNameIdx === -1) {
        throw new Error('Invalid CSV format. Expected Strong app export.');
    }

    // Group rows by workout (same date + workout name)
    const workoutMap = new Map();
    const personalRecords = {};
    let totalSets = 0;
    let totalVolume = 0;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = parseCSVLine(line);
        const date = cols[dateIdx];
        const workoutName = cols[workoutNameIdx] || 'Workout';
        const exerciseName = cols[exerciseNameIdx];
        const weight = parseFloat(cols[weightIdx]) || 0;
        const reps = parseInt(cols[repsIdx]) || 0;
        const setOrder = parseInt(cols[setOrderIdx]) || 1;

        if (!date || !exerciseName) continue;

        const workoutKey = `${date}_${workoutName}`;

        if (!workoutMap.has(workoutKey)) {
            workoutMap.set(workoutKey, {
                date: date,
                name: workoutName,
                duration: parseDuration(cols[durationIdx]),
                notes: cols[workoutNotesIdx] || '',
                exercises: new Map()
            });
        }

        const workout = workoutMap.get(workoutKey);
        const exerciseId = normalizeExerciseName(exerciseName);

        if (!workout.exercises.has(exerciseId)) {
            workout.exercises.set(exerciseId, {
                id: exerciseId,
                name: exerciseName,
                sets: []
            });
        }

        workout.exercises.get(exerciseId).sets.push({
            setNumber: setOrder,
            weight: Math.round(weight),
            reps: reps
        });

        // Track totals
        totalSets++;
        totalVolume += weight * reps;

        // Track PRs (highest weight for each exercise)
        if (weight > (personalRecords[exerciseId] || 0)) {
            personalRecords[exerciseId] = Math.round(weight);
        }
    }

    // Convert to workout array
    const workouts = Array.from(workoutMap.values()).map(w => ({
        id: generateId(),
        name: w.name,
        type: categorizeWorkout(w.name),
        date: w.date,
        duration: w.duration,
        notes: w.notes,
        exercises: Array.from(w.exercises.values()),
        totalSets: Array.from(w.exercises.values()).reduce((sum, ex) => sum + ex.sets.length, 0),
        totalVolume: Array.from(w.exercises.values()).reduce((sum, ex) =>
            sum + ex.sets.reduce((s, set) => s + (set.weight * set.reps), 0), 0),
        imported: true // Mark as imported for achievement tracking
    }));

    // Sort by date (oldest first)
    workouts.sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
        workouts,
        totalSets,
        totalVolume: Math.round(totalVolume),
        personalRecords
    };
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function parseDuration(durationStr) {
    if (!durationStr) return 0;
    let seconds = 0;
    const hourMatch = durationStr.match(/(\d+)\s*h/);
    const minMatch = durationStr.match(/(\d+)\s*m/);
    if (hourMatch) seconds += parseInt(hourMatch[1]) * 3600;
    if (minMatch) seconds += parseInt(minMatch[1]) * 60;
    return seconds;
}

function normalizeExerciseName(name) {
    // Convert exercise name to a consistent ID format
    return name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
}

function categorizeWorkout(name) {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('push') || nameLower.includes('chest') || nameLower.includes('bench')) return 'push';
    if (nameLower.includes('pull') || nameLower.includes('back')) return 'pull';
    if (nameLower.includes('leg') || nameLower.includes('squat')) return 'legs';
    if (nameLower.includes('upper')) return 'upper';
    if (nameLower.includes('lower')) return 'lower';
    return 'full';
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function getAvatarHTML(avatar, customAvatar = null) {
    if (avatar === 'custom' && customAvatar) {
        return `<img src="${customAvatar}" alt="Avatar" class="custom-avatar-img">`;
    }
    return avatarSVGs[avatar] || avatarSVGs[1];
}

// ============================================
// SAVE/LOAD SYSTEM
// ============================================

// Get the storage key for save slots - scoped by user when online
function getSaveSlotsKey() {
    if (isOnlineMode && currentUser) {
        return `ironquest_slots_${currentUser.id}`;
    }
    return 'ironquest_slots_offline';
}

function loadSaveSlots() {
    try {
        const key = getSaveSlotsKey();
        const saved = localStorage.getItem(key);
        if (saved) {
            saveSlots = JSON.parse(saved);
        } else {
            saveSlots = [null, null, null, null];
        }
        renderCharacterSlots();
    } catch (e) {
        console.warn('Could not load save slots:', e);
        saveSlots = [null, null, null, null];
    }
}

function saveSaveSlots() {
    try {
        const key = getSaveSlotsKey();
        localStorage.setItem(key, JSON.stringify(saveSlots));
    } catch (e) {
        console.warn('Could not save slots:', e);
    }
}

async function saveCurrentCharacter() {
    if (currentSlotIndex !== null && gameState) {
        saveSlots[currentSlotIndex] = { ...gameState };
        saveSaveSlots();

        // Sync to server immediately if online
        if (isOnlineMode && currentUser) {
            await syncCharacterToServer(currentSlotIndex, gameState);
        }
    }
}

// Sync character to server (non-blocking)
async function syncCharacterToServer(slotIndex, characterData) {
    console.log('[SYNC] Attempting to sync character:', slotIndex, 'Online:', isOnlineMode, 'User:', currentUser?.id);
    if (!isOnlineMode || !currentUser) {
        console.warn('[SYNC] Skipped - not online or no user');
        return;
    }
    try {
        const result = await API.saveCharacter(slotIndex, characterData);
        console.log('[SYNC] Character synced successfully:', slotIndex, result);
    } catch (error) {
        console.error('[SYNC] Failed to sync character:', error);
    }
}

// Load characters from server and merge with local
async function loadCharactersFromServer() {
    if (!isOnlineMode || !currentUser) return;

    try {
        const response = await API.getCharacters();
        const serverSlots = response.characters || [];

        // Merge server characters into local slots
        serverSlots.forEach((serverChar, index) => {
            if (serverChar && serverChar.onlineUserId === currentUser.id) {
                // Server character exists for this user
                const localChar = saveSlots[index];

                // Use server version if local doesn't exist or server is newer
                if (!localChar || !localChar.onlineUserId ||
                    (serverChar._savedAt && localChar._savedAt && serverChar._savedAt > localChar._savedAt)) {
                    saveSlots[index] = serverChar;
                }
            }
        });

        saveSaveSlots();
        renderCharacterSlots();
        console.log('Characters loaded from server');
    } catch (error) {
        console.warn('Failed to load characters from server:', error);
    }
}

// Load workouts from server and merge with local history
async function loadWorkoutsFromServer() {
    if (!isOnlineMode || !currentUser) return;

    try {
        // Load all workouts from server (get a large batch)
        const response = await API.getWorkouts(1000, 0);
        const serverWorkouts = response.workouts || [];

        if (serverWorkouts.length === 0) {
            console.log('No server workouts to sync');
            return;
        }

        // Get the current slot's workout history
        const slotIndex = saveSlots.findIndex(slot => slot && slot.onlineUserId === currentUser.id);
        if (slotIndex === -1) return;

        const localHistory = saveSlots[slotIndex].workoutHistory || [];

        // Create a map of local workouts by ID for quick lookup
        const localWorkoutMap = new Map();
        localHistory.forEach(w => {
            if (w.id) localWorkoutMap.set(w.id, w);
        });

        // Merge server workouts into local history
        let newWorkoutsAdded = 0;
        serverWorkouts.forEach(serverWorkout => {
            // Check if this workout exists locally
            if (!localWorkoutMap.has(serverWorkout.id)) {
                // Add server workout to local history
                localHistory.push({
                    id: serverWorkout.id,
                    name: serverWorkout.name,
                    type: serverWorkout.type,
                    date: serverWorkout.completed_at || serverWorkout.date,
                    duration: serverWorkout.duration,
                    totalSets: serverWorkout.total_sets || 0,
                    totalVolume: serverWorkout.total_volume || 0,
                    xpEarned: serverWorkout.xp_earned || 0,
                    exercises: serverWorkout.exercises || []
                });
                newWorkoutsAdded++;
            }
        });

        if (newWorkoutsAdded > 0) {
            // Sort by date (newest first)
            localHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

            // Update save slot
            saveSlots[slotIndex].workoutHistory = localHistory;

            // Recalculate totals from workout history
            const totals = localHistory.reduce((acc, w) => ({
                workouts: acc.workouts + 1,
                sets: acc.sets + (w.totalSets || 0),
                volume: acc.volume + (w.totalVolume || 0)
            }), { workouts: 0, sets: 0, volume: 0 });

            saveSlots[slotIndex].totalWorkouts = totals.workouts;
            saveSlots[slotIndex].totalSets = totals.sets;
            saveSlots[slotIndex].totalWeight = totals.volume;

            saveSaveSlots();
            console.log(`Synced ${newWorkoutsAdded} workouts from server`);
        }
    } catch (error) {
        console.warn('Failed to load workouts from server:', error);
    }
}

function loadCustomData() {
    try {
        const savedExercises = localStorage.getItem('ironquest_exercises');
        if (savedExercises) {
            customExercises = JSON.parse(savedExercises);
        }
        const savedWorkouts = localStorage.getItem('ironquest_workouts');
        if (savedWorkouts) {
            customWorkouts = JSON.parse(savedWorkouts);
        }
        const savedPrograms = localStorage.getItem('ironquest_programs');
        if (savedPrograms) {
            customPrograms = JSON.parse(savedPrograms);
        }
    } catch (e) {
        console.warn('Could not load custom data:', e);
    }
}

function saveCustomData() {
    try {
        localStorage.setItem('ironquest_exercises', JSON.stringify(customExercises));
        localStorage.setItem('ironquest_workouts', JSON.stringify(customWorkouts));
        localStorage.setItem('ironquest_programs', JSON.stringify(customPrograms));
    } catch (e) {
        console.warn('Could not save custom data:', e);
    }
}

// ============================================
// AUTHENTICATION & ONLINE MODE
// ============================================

async function checkAuthState() {
    if (API.isAuthenticated()) {
        try {
            // Verify token is still valid
            const response = await API.getProfile();
            currentUser = response.user;
            isOnlineMode = true;
            API.connectSocket();
            setupSocketListeners();
            updateOnlineUI();

            // Reload save slots with user-scoped key (data isolation)
            loadSaveSlots();

            // Load characters and workouts from server
            await loadCharactersFromServer();
            await loadWorkoutsFromServer();

            // Restore game state from slot 0 (each user has their own localStorage)
            if (saveSlots[0] && saveSlots[0].testCompletedAt) {
                currentSlotIndex = 0;
                gameState = { ...saveSlots[0] };
                updateMenuStats();
                renderCustomLists();
                showScreen('menuScreen');
                console.log('Session restored for user:', currentUser.username);
            }
        } catch (error) {
            // Token invalid, clear it
            console.warn('Auth check failed:', error);
            API.logout();
            isOnlineMode = false;
            currentUser = null;
        }
    }
}

function goToAuth() {
    showScreen('authScreen');
}

function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

// Title Screen Functions
function showAuthOptions() {
    document.getElementById('authScreen').classList.add('showing-forms');
    document.getElementById('authFormsContainer').classList.add('active');
    initGoogleSignIn();
}

function hideAuthForms() {
    document.getElementById('authFormsContainer').classList.remove('active');
    document.getElementById('authScreen').classList.remove('showing-forms');
}

// Google Sign-In
let pendingGoogleUser = null;

function initGoogleSignIn() {
    // Wait for Google Identity Services to load
    if (!window.google?.accounts?.id) {
        console.log('Google SDK not yet loaded, will retry...');
        setTimeout(initGoogleSignIn, 500);
        return;
    }

    const clientId = window.APP_CONFIG?.GOOGLE_CLIENT_ID;
    if (!clientId || clientId === 'your-google-client-id.apps.googleusercontent.com') {
        console.error('Google Client ID not configured');
        const errorEl = document.getElementById('googleSignInError');
        if (errorEl) errorEl.textContent = 'Google Sign-In not configured';
        return;
    }

    try {
        // Initialize Google Sign-In
        window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleSignIn,
            auto_select: false
        });

        // Render the Google Sign-In button
        const buttonContainer = document.getElementById('googleSignInButton');
        if (buttonContainer) {
            window.google.accounts.id.renderButton(buttonContainer, {
                theme: 'filled_black',
                size: 'large',
                width: 280,
                text: 'signin_with'
            });
        }
    } catch (error) {
        console.error('Google Sign-In init error:', error);
    }
}

async function handleGoogleSignIn(response) {
    const errorEl = document.getElementById('googleSignInError');
    if (errorEl) errorEl.textContent = '';

    try {
        // Send the ID token to our backend
        const result = await API.googleSignIn(response.credential);

        if (result.isNewUser) {
            // New user - show role selection
            pendingGoogleUser = { idToken: response.credential };
            document.getElementById('roleSelection').style.display = 'block';
        } else {
            // Existing user - proceed directly
            completeSignIn(result);
        }
    } catch (error) {
        console.error('Google sign-in error:', error);
        if (errorEl) errorEl.textContent = error.message || 'Sign-in failed. Please try again.';
    }
}

async function completeGoogleSignIn(role) {
    const errorEl = document.getElementById('googleSignInError');
    if (errorEl) errorEl.textContent = '';

    if (!pendingGoogleUser) {
        if (errorEl) errorEl.textContent = 'Session expired. Please sign in again.';
        document.getElementById('roleSelection').style.display = 'none';
        return;
    }

    try {
        const result = await API.googleSignIn(pendingGoogleUser.idToken, { role });

        pendingGoogleUser = null;
        document.getElementById('roleSelection').style.display = 'none';
        completeSignIn(result);
    } catch (error) {
        console.error('Role selection error:', error);
        if (errorEl) errorEl.textContent = error.message || 'Failed to complete sign-up.';
    }
}

async function completeSignIn(result) {
    currentUser = result.user;
    isOnlineMode = true;

    // Connect socket for real-time updates
    API.connectSocket();
    setupSocketListeners();

    // Reload save slots with user-scoped key (important for data isolation)
    loadSaveSlots();

    // Load characters from server FIRST (this ensures persistence across devices)
    await loadCharactersFromServer();

    // Load workouts from server (sync workout history across devices)
    await loadWorkoutsFromServer();

    // Sync server profile to local save slot
    if (currentUser && currentUser.username) {
        // For online mode, use slot 0 for this user (each user has their own localStorage)
        let slotIndex = 0;

        // Create or update the save slot with server data
        const existingSlot = saveSlots[slotIndex] || {};
        saveSlots[slotIndex] = {
            ...existingSlot,
            onlineUserId: currentUser.id,
            name: currentUser.username,
            playerName: currentUser.username,
            avatar: currentUser.avatar || existingSlot.avatar || 1,
            heightFeet: currentUser.heightFeet || existingSlot.heightFeet || 0,
            heightInches: currentUser.heightInches || existingSlot.heightInches || 0,
            weight: currentUser.weight || existingSlot.weight || 0,
            gender: currentUser.gender || existingSlot.gender || '',
            level: existingSlot.level || currentUser.level || 1,
            xp: existingSlot.xp || currentUser.xp || 0,
            xpToNext: existingSlot.xpToNext || currentUser.xpToNext || 100,
            totalWorkouts: existingSlot.totalWorkouts || currentUser.totalWorkouts || 0,
            totalSets: existingSlot.totalSets || currentUser.totalSets || 0,
            totalWeight: existingSlot.totalWeight || parseInt(currentUser.totalWeight) || 0,
            achievements: existingSlot.achievements || currentUser.achievements || [],
            personalRecords: existingSlot.personalRecords || currentUser.personalRecords || {},
            workoutHistory: existingSlot.workoutHistory || [],
            testCompletedAt: existingSlot.testCompletedAt || null
        };
        saveSaveSlots();

        // Sync this to server immediately (await to ensure it completes)
        await syncCharacterToServer(slotIndex, saveSlots[slotIndex]);

        // If user has completed profile, auto-select and go to menu
        if (currentUser.totalWorkouts > 0 || saveSlots[slotIndex].testCompletedAt) {
            currentSlotIndex = slotIndex;
            gameState = { ...saveSlots[slotIndex] };
            updateMenuStats();
            renderCustomLists();
            updateOnlineUI();
            showToast('LOGGED IN!');
            hideAuthForms();
            showScreen('menuScreen');
            return;
        }
    }

    updateOnlineUI();
    showToast(result.isNewUser ? 'WELCOME, WARRIOR!' : 'LOGGED IN!');
    hideAuthForms();
    showScreen('selectScreen');
}

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    errorEl.textContent = '';

    try {
        const response = await API.login(email, password);
        currentUser = response.user;
        isOnlineMode = true;

        // Connect socket for real-time updates
        API.connectSocket();
        setupSocketListeners();

        updateOnlineUI();
        showToast('LOGGED IN!');
        showScreen('selectScreen');
    } catch (error) {
        errorEl.textContent = error.message || 'Login failed';
    }
}

async function handleRegister(event) {
    event.preventDefault();

    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const errorEl = document.getElementById('registerError');

    errorEl.textContent = '';

    if (password !== confirmPassword) {
        errorEl.textContent = 'Passwords do not match';
        return;
    }

    if (password.length < 6) {
        errorEl.textContent = 'Password must be at least 6 characters';
        return;
    }

    try {
        const response = await API.register({ username, email, password });
        currentUser = response.user;
        isOnlineMode = true;

        // Connect socket for real-time updates
        API.connectSocket();
        setupSocketListeners();

        updateOnlineUI();
        showToast('ACCOUNT CREATED!');
        showScreen('selectScreen');
    } catch (error) {
        errorEl.textContent = error.message || 'Registration failed';
    }
}

function playOffline() {
    isOnlineMode = false;
    currentUser = null;
    updateOnlineUI();
    showScreen('selectScreen');
}

function handleLogout() {
    API.logout();
    isOnlineMode = false;
    currentUser = null;
    currentTeam = null;
    updateOnlineUI();
    showToast('LOGGED OUT');
    showScreen('selectScreen');
}

function updateOnlineUI() {
    const onlineBtn = document.getElementById('goOnlineBtn');
    const teamsTab = document.querySelector('.menu-nav-btn[data-tab="teams"]');
    const campaignsTab = document.querySelector('.menu-nav-btn[data-tab="campaigns"]');
    const coachTab = document.querySelector('.menu-nav-btn[data-tab="coach"]');
    const menuFooter = document.querySelector('.menu-footer');

    if (isOnlineMode && currentUser) {
        if (onlineBtn) onlineBtn.style.display = 'none';
        if (teamsTab) teamsTab.style.display = 'block';
        if (campaignsTab) campaignsTab.style.display = 'block';
        if (coachTab) coachTab.style.display = 'block';
        if (menuFooter) {
            const roleLabel = currentUser.role === 'coach' ? ' (Coach)' : '';
            menuFooter.innerHTML = `
                <span class="online-status">ONLINE: ${currentUser.username}${roleLabel}</span>
                <button class="logout-btn" onclick="handleLogout()">LOGOUT</button>
            `;
        }
    } else {
        if (onlineBtn) onlineBtn.style.display = 'block';
        if (teamsTab) teamsTab.style.display = 'none';
        // Keep campaigns visible in offline mode for testing
        // if (campaignsTab) campaignsTab.style.display = 'none';
        if (coachTab) coachTab.style.display = 'none';
        if (menuFooter) {
            menuFooter.innerHTML = '';
        }
    }

    // Update sync indicator visibility
    updateSyncIndicator();
}

// ============================================
// SYNC STATUS UI
// ============================================

function initSyncUI() {
    // Listen for sync status changes
    API.onSyncStatusChange(updateSyncIndicator);

    // Initial update
    updateSyncIndicator();
}

async function updateSyncIndicator() {
    const indicator = document.getElementById('syncIndicator');
    const icon = document.getElementById('syncIcon');
    const text = document.getElementById('syncText');

    if (!indicator) return;

    // Only show sync indicator when online mode is active
    if (!isOnlineMode || !currentUser) {
        indicator.style.display = 'none';
        return;
    }

    indicator.style.display = 'flex';

    // Remove all status classes
    indicator.classList.remove('synced', 'syncing', 'offline', 'pending');

    const status = API.syncStatus;
    const pendingCount = await API.getPendingSyncCount();

    if (!API.isOnline()) {
        indicator.classList.add('offline');
        text.textContent = 'Offline';
    } else if (status === 'syncing') {
        indicator.classList.add('syncing');
        text.textContent = 'Syncing...';
    } else if (pendingCount > 0) {
        indicator.classList.add('pending');
        text.textContent = `${pendingCount} pending`;
    } else {
        indicator.classList.add('synced');
        text.textContent = 'Synced';
    }
}

async function manualSync() {
    if (!API.isOnline()) {
        showToast('NO CONNECTION');
        return;
    }

    if (!API.isAuthenticated()) {
        showToast('NOT LOGGED IN');
        return;
    }

    showToast('SYNCING...');
    const result = await API.fullSync();

    if (result.push?.status === 'success' || result.pull?.status === 'success') {
        showToast('SYNC COMPLETE!');

        // Update local state with pulled data if any
        if (result.pull?.userStats) {
            if (gameState) {
                gameState.level = result.pull.userStats.level;
                gameState.xp = result.pull.userStats.xp;
                gameState.xpToNext = result.pull.userStats.xpToNext;
                gameState.totalWorkouts = result.pull.userStats.totalWorkouts;
                gameState.totalSets = result.pull.userStats.totalSets;
                gameState.totalWeight = result.pull.userStats.totalWeight;
                saveGame();
                updateMenuStats();
            }
        }
    } else if (result.status === 'error') {
        showToast('SYNC FAILED');
    }

    updateSyncIndicator();
}

// ============================================
// SOCKET.IO REAL-TIME
// ============================================

function setupSocketListeners() {
    if (!API.socket) return;

    // Listen for new team messages
    API.onNewMessage((data) => {
        if (currentTeam && data.teamId === currentTeam.id) {
            appendChatMessage(data);
        }
    });

    // Listen for team activity
    API.onActivity((data) => {
        if (currentTeam && data.teamId === currentTeam.id) {
            prependActivityItem(data);
        }
    });
}

function appendChatMessage(data) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    const isOwn = currentUser && data.userId === currentUser.id;
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${isOwn ? 'own' : ''}`;
    messageEl.innerHTML = `
        <div class="chat-avatar">${data.username ? data.username[0].toUpperCase() : '?'}</div>
        <div class="chat-bubble">
            <div class="chat-username">${data.username || 'Unknown'}</div>
            <div class="chat-text">${escapeHtml(data.message)}</div>
        </div>
    `;
    chatMessages.appendChild(messageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function prependActivityItem(data) {
    const activityFeed = document.getElementById('teamActivityFeed');
    if (!activityFeed) return;

    const activityEl = document.createElement('div');
    activityEl.className = 'activity-item';
    activityEl.innerHTML = `
        <div class="activity-icon">${getActivityIcon(data.type)}</div>
        <div class="activity-content">
            <strong>${data.username}</strong> ${data.description}
        </div>
        <div class="activity-time">just now</div>
    `;
    activityFeed.insertBefore(activityEl, activityFeed.firstChild);
}

function getActivityIcon(type) {
    const icons = {
        'workout': '💪',
        'pr': '🏆',
        'achievement': '⭐',
        'join': '👋',
        'challenge': '🎯'
    };
    return icons[type] || '📌';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// CHARACTER SELECTION
// ============================================

function renderCharacterSlots() {
    const container = document.getElementById('characterSlots');
    if (!container) {
        console.warn('characterSlots container not found');
        return;
    }

    // Filter slots based on login status
    // Online: only show slots belonging to current user
    // Offline: only show slots without an onlineUserId
    const filteredSlots = saveSlots.map((slot, index) => ({ slot, index })).filter(({ slot }) => {
        if (isOnlineMode && currentUser) {
            // Online: show only this user's characters
            return slot && slot.onlineUserId === currentUser.id;
        } else {
            // Offline: show only offline characters (no onlineUserId)
            return slot && !slot.onlineUserId;
        }
    });

    // If no characters found for this mode, show empty slot option
    if (filteredSlots.length === 0) {
        // Find first available slot
        const emptySlotIndex = saveSlots.findIndex(s => !s);
        const slotIndex = emptySlotIndex !== -1 ? emptySlotIndex : 0;

        container.innerHTML = `
            <div class="character-slot empty" onclick="createNewCharacter(${slotIndex})">
                <div class="empty-slot-icon">+</div>
                <div class="slot-name">CREATE WARRIOR</div>
            </div>
        `;
        return;
    }

    // Render filtered slots
    container.innerHTML = filteredSlots.map(({ slot, index }) => {
        return `
            <div class="character-slot" onclick="selectCharacter(${index})">
                <button class="delete-btn" onclick="event.stopPropagation(); deleteCharacter(${index})">×</button>
                <div class="slot-avatar">${getAvatarHTML(slot.avatar, slot.customAvatar)}</div>
                <div class="slot-name">${slot.playerName || slot.name}</div>
                <div class="slot-level">LEVEL ${slot.level || 1}</div>
                <div class="slot-stats">${slot.totalWorkouts || 0} workouts</div>
            </div>
        `;
    }).join('');

    // Add option to create additional character if logged in and has room
    if (isOnlineMode && currentUser && filteredSlots.length < 4) {
        const emptySlotIndex = saveSlots.findIndex(s => !s);
        if (emptySlotIndex !== -1) {
            container.innerHTML += `
                <div class="character-slot empty" onclick="createNewCharacter(${emptySlotIndex})">
                    <div class="empty-slot-icon">+</div>
                    <div class="slot-name">NEW WARRIOR</div>
                </div>
            `;
        }
    }
}

function selectCharacter(index) {
    currentSlotIndex = index;
    gameState = { ...saveSlots[index] };
    updateMenuStats();
    renderCustomLists();

    // Check if strength test needs to be completed
    if (!gameState.testCompletedAt) {
        renderStrengthTest();
        showScreen('testScreen');
        return;
    }

    showScreen('menuScreen');
}

function createNewCharacter(index) {
    currentSlotIndex = index;
    document.getElementById('playerName').value = '';
    document.querySelectorAll('.avatar-option').forEach((o, i) => {
        o.classList.toggle('selected', i === 0);
    });
    showScreen('createScreen');
}

async function deleteCharacter(index) {
    if (confirm('Delete this character? This cannot be undone.')) {
        // Delete from server if online
        if (isOnlineMode && currentUser) {
            try {
                await API.deleteCharacter(index);
            } catch (error) {
                console.warn('Failed to delete character from server:', error);
            }
        }

        saveSlots[index] = null;
        saveSaveSlots();
        renderCharacterSlots();
    }
}

function startGame() {
    const nameInput = document.getElementById('playerName');
    const selectedAvatar = document.querySelector('.avatar-option.selected');
    const avatarValue = selectedAvatar ? selectedAvatar.dataset.avatar : '1';
    const avatarId = avatarValue === 'custom' ? 'custom' : parseInt(avatarValue);

    // Get character stats
    const heightFeet = parseInt(document.getElementById('heightFeet').value) || 0;
    const heightInches = parseInt(document.getElementById('heightInches').value) || 0;
    const weight = parseInt(document.getElementById('playerWeight').value) || 0;
    const gender = document.getElementById('playerGender').value || '';

    // Calculate total height in inches
    const totalHeight = (heightFeet * 12) + heightInches;

    // Check if we have imported data
    const hasImport = importedWorkoutData && importedWorkoutData.workouts.length > 0;
    const importStats = hasImport ? calculateLevelFromImport(importedWorkoutData) : null;

    gameState = {
        name: nameInput.value.toUpperCase() || 'PLAYER_01',
        playerName: nameInput.value.toUpperCase() || 'PLAYER_01', // Keep for backwards compat
        avatar: avatarId,
        customAvatar: avatarId === 'custom' ? customAvatarData : null,
        height: totalHeight,
        heightFeet: heightFeet,
        heightInches: heightInches,
        weight: weight,
        gender: gender,
        level: hasImport ? importStats.level : 1,
        xp: hasImport ? importStats.xp : 0,
        xpToNext: hasImport ? importStats.xpToNext : 100,
        totalWorkouts: hasImport ? importedWorkoutData.workouts.length : 0,
        totalSets: hasImport ? importedWorkoutData.totalSets : 0,
        totalWeight: hasImport ? importedWorkoutData.totalVolume : 0,
        achievements: [],
        personalRecords: hasImport ? importedWorkoutData.personalRecords : {},
        workoutHistory: hasImport ? importedWorkoutData.workouts : [],
        createdAt: new Date().toISOString(),
        testCompletedAt: hasImport ? new Date().toISOString() : null, // Skip strength test if importing
        onlineUserId: (isOnlineMode && currentUser) ? currentUser.id : null // Tie character to account
    };

    // Clear imported data after use
    importedWorkoutData = null;
    document.getElementById('importStatus').innerHTML = '';

    saveSlots[currentSlotIndex] = gameState;
    saveSaveSlots();
    updateMenuStats();
    renderCustomLists();

    // Sync profile AND character to server if online
    if (isOnlineMode && currentUser) {
        // Save character to server immediately
        syncCharacterToServer(currentSlotIndex, gameState);

        // Also update profile
        API.updateProfile({
            username: gameState.name,
            avatar: typeof avatarId === 'number' ? avatarId : 1,
            heightFeet: heightFeet,
            heightInches: heightInches,
            weight: weight,
            gender: gender,
            level: gameState.level,
            xp: gameState.xp,
            xpToNext: gameState.xpToNext,
            totalWorkouts: gameState.totalWorkouts,
            totalSets: gameState.totalSets,
            totalWeight: gameState.totalWeight,
            achievements: gameState.achievements
        }).catch(err => console.error('Failed to sync profile:', err));
    }

    // Skip strength test if importing data, go directly to menu
    if (hasImport) {
        showToast(`WELCOME BACK, ${gameState.name}!`);
        showScreen('menuScreen');
        return;
    }

    // Go to strength test for new characters
    renderStrengthTest();
    showScreen('testScreen');
}

function calculateLevelFromImport(importData) {
    // Calculate XP based on imported stats
    // XP formula: 10 per workout + 1 per set + 0.01 per lb volume
    const workoutXp = importData.workouts.length * 10;
    const setXp = importData.totalSets;
    const volumeXp = Math.floor(importData.totalVolume * 0.01);
    const totalXp = workoutXp + setXp + volumeXp;

    // Calculate level from XP (each level requires more XP)
    let level = 1;
    let xpForLevel = 100;
    let remainingXp = totalXp;

    while (remainingXp >= xpForLevel && level < 100) {
        remainingXp -= xpForLevel;
        level++;
        xpForLevel = Math.floor(100 * Math.pow(1.1, level - 1)); // 10% more each level
    }

    return {
        level,
        xp: remainingXp,
        xpToNext: xpForLevel
    };
}

// ============================================
// STRENGTH TEST
// ============================================

function renderStrengthTest() {
    const container = document.getElementById('testExercisesList');
    if (!container) return;

    // Reset swaps for new test
    testExerciseSwaps = {};

    container.innerHTML = BASELINE_TEST_EXERCISES.map((ex, index) => {
        const multiplierText = ex.tier === 1 ? '3x' : ex.tier === 2 ? '2x' : '1x';
        const hasAlternatives = ex.alternatives && ex.alternatives.length > 0;
        const isBW = isBodyweightExercise(ex.id);

        return `
            <div class="test-exercise-row tier-${ex.tier} ${isBW ? 'bodyweight-exercise' : ''}" data-exercise="${ex.id}" data-index="${index}" data-bodyweight="${isBW}">
                <div class="test-exercise-icon">${ex.icon}</div>
                <div class="test-exercise-info">
                    <div class="test-exercise-name-row">
                        <span class="test-exercise-name" id="testName_${index}">${ex.name}</span>
                        ${hasAlternatives ? `<button class="swap-btn" onclick="openSwapModal(${index})" title="Change exercise">⇄</button>` : ''}
                    </div>
                    <div class="test-exercise-tier" id="testTier_${index}">TIER ${ex.tier} <span class="multiplier">(${multiplierText} XP)</span></div>
                </div>
                <div class="test-exercise-inputs">
                    ${isBW ? `
                    <!-- Bodyweight exercise: Max Reps input -->
                    <div class="test-input-toggle">
                        <button class="test-toggle-btn active" data-type="maxreps" disabled>Max Reps</button>
                    </div>
                    <div class="test-input-fields">
                        <div class="test-maxreps-input" id="testMaxReps_${index}">
                            <input type="number" id="testBWReps_${index}" placeholder="reps" min="1" max="500"
                                   class="dc-input numeric" inputmode="numeric"
                                   onchange="updateTestProgress(); calculateBodyweight1RM(${index})" oninput="updateTestRowStyle(${index})">
                            <span class="unit-label">reps</span>
                            <span class="test-est-1rm" id="testBWEst1rm_${index}"></span>
                        </div>
                    </div>
                    ` : `
                    <!-- Weighted exercise: 1RM or Best Set -->
                    <div class="test-input-toggle">
                        <button class="test-toggle-btn active" data-type="1rm" onclick="toggleTestInputType(${index}, '1rm')">1RM</button>
                        <button class="test-toggle-btn" data-type="best" onclick="toggleTestInputType(${index}, 'best')">Best Set</button>
                    </div>
                    <div class="test-input-fields">
                        <div class="test-1rm-input" id="test1rm_${index}">
                            <input type="number" id="test_${index}" placeholder="---" min="0" max="2000"
                                   class="dc-input numeric" inputmode="numeric"
                                   onchange="updateTestProgress()" oninput="updateTestRowStyle(${index})">
                            <span class="unit-label">lbs</span>
                        </div>
                        <div class="test-best-input" id="testBest_${index}" style="display: none;">
                            <input type="number" id="testBestWeight_${index}" placeholder="wt" min="0" max="2000"
                                   class="dc-input numeric small" inputmode="numeric"
                                   onchange="updateTestProgress(); calculateEstimated1RM(${index})" oninput="updateTestRowStyle(${index})">
                            <span class="test-x">×</span>
                            <input type="number" id="testBestReps_${index}" placeholder="reps" min="1" max="100"
                                   class="dc-input numeric small" inputmode="numeric"
                                   onchange="updateTestProgress(); calculateEstimated1RM(${index})" oninput="updateTestRowStyle(${index})">
                            <span class="test-est-1rm" id="testEst1rm_${index}"></span>
                        </div>
                    </div>
                    `}
                </div>
            </div>
        `;
    }).join('');

    updateTestProgress();
}

function toggleTestInputType(index, type) {
    const row = document.querySelector(`.test-exercise-row[data-index="${index}"]`);
    if (!row) return;

    // Toggle buttons
    row.querySelectorAll('.test-toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });

    // Toggle input visibility
    const input1rm = document.getElementById(`test1rm_${index}`);
    const inputBest = document.getElementById(`testBest_${index}`);

    if (type === '1rm') {
        input1rm.style.display = 'flex';
        inputBest.style.display = 'none';
    } else {
        input1rm.style.display = 'none';
        inputBest.style.display = 'flex';
    }

    updateTestRowStyle(index);
}

function calculateEstimated1RM(index) {
    const weight = parseFloat(document.getElementById(`testBestWeight_${index}`)?.value) || 0;
    const reps = parseInt(document.getElementById(`testBestReps_${index}`)?.value) || 0;
    const estDisplay = document.getElementById(`testEst1rm_${index}`);

    if (weight > 0 && reps > 0 && estDisplay) {
        // Epley formula: 1RM = weight × (1 + reps/30)
        const estimated1RM = Math.round(weight * (1 + reps / 30));
        estDisplay.textContent = `≈ ${estimated1RM} 1RM`;
        estDisplay.style.display = 'inline';
    } else if (estDisplay) {
        estDisplay.textContent = '';
        estDisplay.style.display = 'none';
    }
}

function calculateBodyweight1RM(index) {
    const reps = parseInt(document.getElementById(`testBWReps_${index}`)?.value) || 0;
    const estDisplay = document.getElementById(`testBWEst1rm_${index}`);
    const userBodyweight = gameState?.weight || 0;

    if (reps > 0 && userBodyweight > 0 && estDisplay) {
        // Epley formula with bodyweight: 1RM = bodyweight × (1 + reps/30)
        const estimated1RM = Math.round(userBodyweight * (1 + reps / 30));
        estDisplay.textContent = `≈ ${estimated1RM} lbs`;
        estDisplay.style.display = 'inline';
    } else if (estDisplay) {
        estDisplay.textContent = '';
        estDisplay.style.display = 'none';
    }
}

function openSwapModal(exerciseIndex) {
    const exercise = BASELINE_TEST_EXERCISES[exerciseIndex];
    if (!exercise || !exercise.alternatives) return;

    const modal = document.getElementById('swapExerciseModal');
    const listContainer = document.getElementById('swapExerciseList');

    // Build the list of alternatives (including the original)
    const allOptions = [
        { id: exercise.id, name: exercise.name, isOriginal: true },
        ...exercise.alternatives
    ];

    listContainer.innerHTML = allOptions.map(alt => `
        <div class="swap-option ${alt.isOriginal ? 'original' : ''}" onclick="selectSwapExercise(${exerciseIndex}, '${alt.id}', '${alt.name.replace(/'/g, "\\'")}', ${alt.isOriginal || false})">
            <span class="swap-option-name">${alt.name}</span>
            ${alt.isOriginal ? '<span class="swap-option-tag">DEFAULT</span>' : ''}
        </div>
    `).join('');

    // Store the current exercise index
    modal.dataset.exerciseIndex = exerciseIndex;

    // Show modal
    modal.classList.add('active');
}

function selectSwapExercise(exerciseIndex, newId, newName, isOriginal) {
    const exercise = BASELINE_TEST_EXERCISES[exerciseIndex];

    if (isOriginal) {
        // Revert to original - just close modal and reset
        delete testExerciseSwaps[exerciseIndex];
        updateTestExerciseDisplay(exerciseIndex, exercise.name, exercise.tier);
        closeSwapModal();
        return;
    }

    // Show tier selection
    showTierSelection(exerciseIndex, newId, newName, exercise.tier);
}

function showTierSelection(exerciseIndex, newId, newName, originalTier) {
    const listContainer = document.getElementById('swapExerciseList');
    const originalMultiplier = originalTier === 1 ? '3x' : originalTier === 2 ? '2x' : '1x';

    listContainer.innerHTML = `
        <div class="tier-selection">
            <div class="tier-selection-title">Is <strong>${newName}</strong> your primary lift for this movement?</div>
            <div class="tier-selection-options">
                <button class="tier-option primary" onclick="confirmSwap(${exerciseIndex}, '${newId}', '${newName.replace(/'/g, "\\'")}', ${originalTier})">
                    <div class="tier-option-label">PRIMARY</div>
                    <div class="tier-option-desc">Main compound lift (${originalMultiplier} XP)</div>
                </button>
                <button class="tier-option accessory" onclick="confirmSwap(${exerciseIndex}, '${newId}', '${newName.replace(/'/g, "\\'")}', 3)">
                    <div class="tier-option-label">ACCESSORY</div>
                    <div class="tier-option-desc">Supporting exercise (1x XP)</div>
                </button>
            </div>
            <button class="swap-back-btn" onclick="openSwapModal(${exerciseIndex})">← Back to exercises</button>
        </div>
    `;
}

function confirmSwap(exerciseIndex, newId, newName, newTier) {
    // Store the swap
    testExerciseSwaps[exerciseIndex] = {
        id: newId,
        name: newName,
        tier: newTier
    };

    // Update display
    updateTestExerciseDisplay(exerciseIndex, newName, newTier);

    closeSwapModal();
    showToast(`SWAPPED TO ${newName.toUpperCase()}`);
}

function updateTestExerciseDisplay(exerciseIndex, name, tier) {
    const nameEl = document.getElementById(`testName_${exerciseIndex}`);
    const tierEl = document.getElementById(`testTier_${exerciseIndex}`);
    const row = document.querySelector(`.test-exercise-row[data-index="${exerciseIndex}"]`);

    if (nameEl) nameEl.textContent = name;
    if (tierEl) {
        const multiplierText = tier === 1 ? '3x' : tier === 2 ? '2x' : '1x';
        tierEl.innerHTML = `TIER ${tier} <span class="multiplier">(${multiplierText} XP)</span>`;
    }
    if (row) {
        // Check if the new exercise is bodyweight
        const swap = testExerciseSwaps[exerciseIndex];
        const exerciseId = swap ? swap.id : BASELINE_TEST_EXERCISES[exerciseIndex].id;
        const isBW = isBodyweightExercise(exerciseId);
        const wasBW = row.dataset.bodyweight === 'true';

        row.className = `test-exercise-row tier-${tier}${isBW ? ' bodyweight-exercise' : ''}`;
        row.dataset.index = exerciseIndex;
        row.dataset.bodyweight = isBW;
        row.dataset.exercise = exerciseId;

        // If bodyweight status changed, update the input fields
        if (isBW !== wasBW) {
            const inputsContainer = row.querySelector('.test-exercise-inputs');
            if (inputsContainer) {
                inputsContainer.innerHTML = isBW ? `
                    <!-- Bodyweight exercise: Max Reps input -->
                    <div class="test-input-toggle">
                        <button class="test-toggle-btn active" data-type="maxreps" disabled>Max Reps</button>
                    </div>
                    <div class="test-input-fields">
                        <div class="test-maxreps-input" id="testMaxReps_${exerciseIndex}">
                            <input type="number" id="testBWReps_${exerciseIndex}" placeholder="reps" min="1" max="500"
                                   class="dc-input numeric" inputmode="numeric"
                                   onchange="updateTestProgress(); calculateBodyweight1RM(${exerciseIndex})" oninput="updateTestRowStyle(${exerciseIndex})">
                            <span class="unit-label">reps</span>
                            <span class="test-est-1rm" id="testBWEst1rm_${exerciseIndex}"></span>
                        </div>
                    </div>
                ` : `
                    <!-- Weighted exercise: 1RM or Best Set -->
                    <div class="test-input-toggle">
                        <button class="test-toggle-btn active" data-type="1rm" onclick="toggleTestInputType(${exerciseIndex}, '1rm')">1RM</button>
                        <button class="test-toggle-btn" data-type="best" onclick="toggleTestInputType(${exerciseIndex}, 'best')">Best Set</button>
                    </div>
                    <div class="test-input-fields">
                        <div class="test-1rm-input" id="test1rm_${exerciseIndex}">
                            <input type="number" id="test_${exerciseIndex}" placeholder="---" min="0" max="2000"
                                   class="dc-input numeric" inputmode="numeric"
                                   onchange="updateTestProgress()" oninput="updateTestRowStyle(${exerciseIndex})">
                            <span class="unit-label">lbs</span>
                        </div>
                        <div class="test-best-input" id="testBest_${exerciseIndex}" style="display: none;">
                            <input type="number" id="testBestWeight_${exerciseIndex}" placeholder="wt" min="0" max="2000"
                                   class="dc-input numeric small" inputmode="numeric"
                                   onchange="updateTestProgress(); calculateEstimated1RM(${exerciseIndex})" oninput="updateTestRowStyle(${exerciseIndex})">
                            <span class="test-x">×</span>
                            <input type="number" id="testBestReps_${exerciseIndex}" placeholder="reps" min="1" max="100"
                                   class="dc-input numeric small" inputmode="numeric"
                                   onchange="updateTestProgress(); calculateEstimated1RM(${exerciseIndex})" oninput="updateTestRowStyle(${exerciseIndex})">
                            <span class="test-est-1rm" id="testEst1rm_${exerciseIndex}"></span>
                        </div>
                    </div>
                `;
            }
        }

        updateTestRowStyle(exerciseIndex);
    }
}

function closeSwapModal() {
    const modal = document.getElementById('swapExerciseModal');
    modal.classList.remove('active');
}

function updateTestRowStyle(index) {
    const row = document.querySelector(`.test-exercise-row[data-index="${index}"]`);
    if (!row) return;

    const isBodyweight = row.dataset.bodyweight === 'true';
    let hasValue = false;

    if (isBodyweight) {
        // Bodyweight exercise: check max reps input
        const repsInput = document.getElementById(`testBWReps_${index}`);
        hasValue = repsInput && repsInput.value && parseInt(repsInput.value) > 0;
    } else {
        // Check if 1RM or best set mode
        const is1rmMode = document.getElementById(`test1rm_${index}`)?.style.display !== 'none';

        if (is1rmMode) {
            const input = document.getElementById(`test_${index}`);
            hasValue = input && input.value && parseInt(input.value) > 0;
        } else {
            const weight = document.getElementById(`testBestWeight_${index}`);
            const reps = document.getElementById(`testBestReps_${index}`);
            hasValue = weight && reps && parseInt(weight.value) > 0 && parseInt(reps.value) > 0;
        }
    }

    if (hasValue) {
        row.classList.add('has-value');
    } else {
        row.classList.remove('has-value');
    }
}

function getTestValue(index) {
    // Returns the 1RM value (either direct, calculated from best set, or from bodyweight reps)
    const row = document.querySelector(`.test-exercise-row[data-index="${index}"]`);
    const isBodyweight = row?.dataset.bodyweight === 'true';

    if (isBodyweight) {
        // Bodyweight exercise: calculate 1RM from bodyweight × (1 + reps/30)
        const reps = parseInt(document.getElementById(`testBWReps_${index}`)?.value) || 0;
        const userBodyweight = gameState?.weight || 0;
        if (reps > 0 && userBodyweight > 0) {
            return Math.round(userBodyweight * (1 + reps / 30));
        }
        return 0;
    }

    const is1rmMode = document.getElementById(`test1rm_${index}`)?.style.display !== 'none';

    if (is1rmMode) {
        return parseInt(document.getElementById(`test_${index}`)?.value) || 0;
    } else {
        const weight = parseFloat(document.getElementById(`testBestWeight_${index}`)?.value) || 0;
        const reps = parseInt(document.getElementById(`testBestReps_${index}`)?.value) || 0;
        if (weight > 0 && reps > 0) {
            // Epley formula: 1RM = weight × (1 + reps/30)
            return Math.round(weight * (1 + reps / 30));
        }
        return 0;
    }
}

function getBestSetData(index) {
    // Returns the best set data if entered, otherwise null
    const row = document.querySelector(`.test-exercise-row[data-index="${index}"]`);
    const isBodyweight = row?.dataset.bodyweight === 'true';

    if (isBodyweight) {
        // For bodyweight exercises, store reps with weight = 0 (means bodyweight only)
        const reps = parseInt(document.getElementById(`testBWReps_${index}`)?.value) || 0;
        if (reps > 0) {
            return { weight: 0, reps, isBodyweight: true };
        }
        return null;
    }

    const is1rmMode = document.getElementById(`test1rm_${index}`)?.style.display !== 'none';

    if (!is1rmMode) {
        const weight = parseFloat(document.getElementById(`testBestWeight_${index}`)?.value) || 0;
        const reps = parseInt(document.getElementById(`testBestReps_${index}`)?.value) || 0;
        if (weight > 0 && reps > 0) {
            return { weight, reps };
        }
    }
    return null;
}

function updateTestProgress() {
    let filled = 0;
    for (let i = 0; i < BASELINE_TEST_EXERCISES.length; i++) {
        if (getTestValue(i) > 0) {
            filled++;
        }
    }

    const progressEl = document.getElementById('testProgress');
    if (progressEl) {
        progressEl.textContent = `${filled}/${BASELINE_TEST_EXERCISES.length} entered`;
    }
}

function completeStrengthTest() {
    // Collect baseline values (handling swapped exercises)
    const baselines = {};
    const bestSets = {};
    const customTiers = {};

    BASELINE_TEST_EXERCISES.forEach((ex, index) => {
        const val = getTestValue(index);
        const bestSet = getBestSetData(index);

        if (val > 0) {
            // Check if this exercise was swapped
            const swap = testExerciseSwaps[index];
            const exerciseId = swap ? swap.id : ex.id;

            baselines[exerciseId] = val;

            // Store best set data if entered
            if (bestSet) {
                bestSets[exerciseId] = bestSet;
            }

            // Store custom tier if different from default
            if (swap && swap.tier !== ex.tier) {
                customTiers[exerciseId] = swap.tier;
            }
        }
    });

    // Store in gameState
    gameState.baselines = baselines;
    gameState.bestSets = bestSets; // Store best set data for weight suggestions
    gameState.customTiers = customTiers; // Store any custom tier assignments
    gameState.testCompletedAt = new Date().toISOString();
    gameState.achievedMilestones = {};

    saveCurrentCharacter();
    showScreen('menuScreen');

    const enteredCount = Object.keys(baselines).length;
    if (enteredCount > 0) {
        showToast(`TEST COMPLETE! ${enteredCount} BASELINES SET`);
    } else {
        showToast('TEST SKIPPED - USING DEFAULT XP');
    }
}

// Get exercise tier multiplier
function getExerciseTierMultiplier(exerciseId) {
    // Check for custom tier assignment first (from strength test swaps)
    if (gameState?.customTiers && gameState.customTiers[exerciseId]) {
        const tier = gameState.customTiers[exerciseId];
        return tier === 1 ? 3 : tier === 2 ? 2 : 1;
    }
    // Fall back to default tiers
    if (EXERCISE_TIERS.tier1.includes(exerciseId)) return 3;
    if (EXERCISE_TIERS.tier2.includes(exerciseId)) return 2;
    return 1;
}

// Check and award milestone bonuses
function checkMilestoneBonus(exerciseId, weight) {
    if (!gameState.baselines || !gameState.baselines[exerciseId]) return 0;

    const baseline = gameState.baselines[exerciseId];
    const percentage = Math.floor((weight / baseline) * 100);

    let bonusXP = 0;
    let milestone = null;

    // Check milestones (only award once per threshold)
    const milestoneKey = `milestone_${exerciseId}`;
    const achieved = gameState.achievedMilestones?.[milestoneKey] || 0;

    // Sort thresholds to check in order
    const thresholds = Object.keys(MILESTONE_BONUSES).map(Number).sort((a, b) => a - b);

    for (const thresh of thresholds) {
        if (percentage >= thresh && achieved < thresh) {
            bonusXP = MILESTONE_BONUSES[thresh].xp;
            milestone = { ...MILESTONE_BONUSES[thresh], threshold: thresh };
        }
    }

    if (milestone) {
        // Record milestone achieved
        if (!gameState.achievedMilestones) gameState.achievedMilestones = {};
        gameState.achievedMilestones[milestoneKey] = milestone.threshold;

        // Show milestone popup
        showMilestonePopup(exerciseId, milestone);
    }

    return bonusXP;
}

function showMilestonePopup(exerciseId, milestone) {
    // Find exercise name
    const exercise = BASELINE_TEST_EXERCISES.find(e => e.id === exerciseId) ||
                     allExercises.find(e => e.id === exerciseId);
    const exerciseName = exercise?.name || exerciseId;

    const popup = document.createElement('div');
    popup.className = 'milestone-popup';
    popup.innerHTML = `
        <div class="milestone-label" style="color: ${milestone.color}">${milestone.label}</div>
        <div class="milestone-exercise">${exerciseName}</div>
        <div class="milestone-xp">+${milestone.xp} XP</div>
    `;

    document.body.appendChild(popup);

    // Auto-remove after animation
    setTimeout(() => {
        popup.classList.add('fade-out');
        setTimeout(() => popup.remove(), 300);
    }, 2000);
}

function backToCharacterSelect() {
    saveCurrentCharacter();
    currentSlotIndex = null;
    gameState = null;
    renderCharacterSlots();
    showScreen('selectScreen');
}

// ============================================
// SCREEN NAVIGATION
// ============================================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');

    // Track previous screen for workout minimize feature
    if (screenId !== 'workoutScreen') {
        previousScreen = screenId;
    }
}

// ============================================
// WORKOUT MINIMIZE/EXPAND
// ============================================

function minimizeWorkout() {
    if (!currentWorkout) return;

    workoutMinimized = true;
    document.body.classList.add('workout-minimized');

    // Update minimized bar info
    updateMinimizedWorkoutBar();

    // Show minimized bar
    document.getElementById('minimizedWorkoutBar').style.display = 'block';

    // Go to previous screen (or menu)
    showScreen(previousScreen);
}

function expandWorkout() {
    if (!currentWorkout) return;

    workoutMinimized = false;
    document.body.classList.remove('workout-minimized');

    // Hide minimized bar
    document.getElementById('minimizedWorkoutBar').style.display = 'none';

    // Show workout screen
    showScreen('workoutScreen');
}

function updateMinimizedWorkoutBar() {
    if (!currentWorkout) return;

    // Update workout name
    document.getElementById('minimizedWorkoutName').textContent = currentWorkout.name;

    // Calculate progress
    const totalExercises = currentWorkout.exercises.length;
    const completedExercises = currentWorkout.exercises.filter(ex => {
        const sets = exerciseSets[ex.id] || [];
        return sets.length > 0;
    }).length;

    document.getElementById('minimizedWorkoutProgress').textContent =
        `${completedExercises}/${totalExercises} exercises`;

    // Update timer display in minimized bar
    const minimizedTimer = document.getElementById('minimizedTimerDisplay');
    if (minimizedTimer) {
        minimizedTimer.textContent = document.getElementById('timerDisplay')?.textContent || '0:00';
    }
}

function hideMinimizedWorkoutBar() {
    workoutMinimized = false;
    document.body.classList.remove('workout-minimized');
    document.getElementById('minimizedWorkoutBar').style.display = 'none';
}

// ============================================
// MENU & TABS
// ============================================

function switchMenuTab(tab) {
    currentMenuTab = tab;
    document.querySelectorAll('.menu-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.menu-tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tab}`);
    });

    // Render tab content
    if (tab === 'workout') {
        renderCustomWorkoutList();
        renderCustomExerciseList();
    } else if (tab === 'history') {
        renderHistory();
    } else if (tab === 'stats') {
        renderStats();
    } else if (tab === 'exercises') {
        renderExerciseLibrary();
    } else if (tab === 'share') {
        renderShareTab();
    } else if (tab === 'teams') {
        loadTeams();
    } else if (tab === 'campaigns') {
        loadCampaigns();
    } else if (tab === 'coach') {
        loadCoachTab();
    }
}

function renderExerciseLibrary() {
    const container = document.getElementById('exerciseLibraryGallery');
    if (!container) return;

    // Combine all exercises and get last performed info
    const workoutHistory = gameState.workoutHistory || [];
    const allExercisesList = [
        ...allExercises.map(ex => ({ ...ex, isCustom: false })),
        ...customExercises.map(ex => ({ ...ex, isCustom: true }))
    ];

    // Get last performed data for each exercise
    const exerciseData = allExercisesList.map(ex => {
        let lastPerformed = null;
        let lastSet = null;

        // Search through workout history for this exercise
        for (const workout of workoutHistory) {
            if (!workout.exercises) continue;
            const exerciseEntry = workout.exercises.find(e => e.id === ex.id);
            if (exerciseEntry && exerciseEntry.sets?.length > 0) {
                if (!lastPerformed || new Date(workout.date) > new Date(lastPerformed)) {
                    lastPerformed = workout.date;
                    lastSet = exerciseEntry.sets[exerciseEntry.sets.length - 1];
                }
            }
        }

        return {
            ...ex,
            lastPerformed,
            lastSet
        };
    });

    // Sort: recently performed first, then alphabetically
    exerciseData.sort((a, b) => {
        if (a.lastPerformed && !b.lastPerformed) return -1;
        if (!a.lastPerformed && b.lastPerformed) return 1;
        if (a.lastPerformed && b.lastPerformed) {
            return new Date(b.lastPerformed) - new Date(a.lastPerformed);
        }
        return a.name.localeCompare(b.name);
    });

    // Render as gallery
    container.innerHTML = `
        <div class="exercise-gallery">
            ${exerciseData.map(ex => {
                const lastDateText = ex.lastPerformed
                    ? formatRelativeDate(ex.lastPerformed)
                    : 'Never';
                const lastSetText = ex.lastSet
                    ? `${ex.lastSet.weight}lbs × ${ex.lastSet.reps}`
                    : '—';
                const equipmentType = getEquipmentType(ex.equipment);

                return `
                    <div class="exercise-card" onclick="openExerciseHistory('${ex.id}')">
                        <div class="exercise-card-header">
                            <span class="exercise-card-name">${ex.name}</span>
                            ${ex.isCustom ? '<span class="custom-badge">★</span>' : ''}
                        </div>
                        <div class="exercise-card-details">
                            <div class="exercise-card-row">
                                <span class="detail-label">Body</span>
                                <span class="detail-value">${capitalizeFirst(ex.muscle || 'other')}</span>
                            </div>
                            <div class="exercise-card-row">
                                <span class="detail-label">Type</span>
                                <span class="detail-value">${equipmentType}</span>
                            </div>
                            <div class="exercise-card-row">
                                <span class="detail-label">Last</span>
                                <span class="detail-value">${lastDateText}</span>
                            </div>
                            <div class="exercise-card-row">
                                <span class="detail-label">Set</span>
                                <span class="detail-value highlight">${lastSetText}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function updateMenuStats() {
    if (!gameState) return;

    document.getElementById('menuPlayerName').textContent = gameState.playerName;
    document.getElementById('menuLevel').textContent = `LVL ${gameState.level}`;
    document.getElementById('menuXpText').textContent = `${gameState.xp}/${gameState.xpToNext} XP`;
    document.getElementById('menuXpFill').style.width = `${(gameState.xp / gameState.xpToNext) * 100}%`;
    document.getElementById('totalWorkouts').textContent = gameState.totalWorkouts;
    document.getElementById('totalSets').textContent = gameState.totalSets;
    document.getElementById('totalWeight').textContent = formatNumber(gameState.totalWeight);

    // Update avatar
    document.getElementById('menuAvatar').innerHTML = getAvatarHTML(gameState.avatar, gameState.customAvatar);
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
}

function getEquipmentIcon(equipment) {
    const icons = {
        'barbell': '🏋️',
        'dumbbell': '💪',
        'cable': '🔗',
        'machine': '⚙️',
        'bodyweight': '🤸',
        'kettlebell': '🔔',
        'other': '📦'
    };
    return icons[equipment] || icons['other'];
}

// ============================================
// STAT HISTORY
// ============================================

function showStatHistory(type) {
    if (!gameState || !gameState.workoutHistory || gameState.workoutHistory.length === 0) {
        showToast('No workout history yet!');
        return;
    }

    const history = gameState.workoutHistory.slice().reverse(); // Most recent first
    const titleEl = document.getElementById('statHistoryTitle');
    const summaryEl = document.getElementById('statHistorySummary');
    const listEl = document.getElementById('statHistoryList');

    let summaryHTML = '';
    let listHTML = '';

    if (type === 'workouts') {
        titleEl.textContent = 'WORKOUT HISTORY';

        // Summary stats
        const thisWeek = history.filter(w => isThisWeek(new Date(w.date))).length;
        const thisMonth = history.filter(w => isThisMonth(new Date(w.date))).length;

        summaryHTML = `
            <div class="stat-summary-grid">
                <div class="summary-item">
                    <div class="summary-value">${history.length}</div>
                    <div class="summary-label">Total</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value">${thisWeek}</div>
                    <div class="summary-label">This Week</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value">${thisMonth}</div>
                    <div class="summary-label">This Month</div>
                </div>
            </div>
        `;

        // Table header + rows
        const tableHeader = `
            <div class="stat-table-header">
                <div class="stat-col-name">Workout</div>
                <div class="stat-col-date">Date</div>
                <div class="stat-col-ex">Ex</div>
                <div class="stat-col-sets">Sets</div>
                <div class="stat-col-vol">Volume</div>
            </div>
        `;

        const rows = history.slice(0, 20).map(w => {
            const date = new Date(w.date);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const exerciseCount = w.exercises ? w.exercises.length : 0;
            const totalSets = w.totalSets || 0;
            const volume = w.totalVolume || 0;

            return `
                <div class="stat-table-row" onclick="showWorkoutDetail('${w.id || w.date}')">
                    <div class="stat-col-name">${w.name || 'Workout'}</div>
                    <div class="stat-col-date">${dateStr}</div>
                    <div class="stat-col-ex">${exerciseCount}</div>
                    <div class="stat-col-sets">${totalSets}</div>
                    <div class="stat-col-vol">${formatNumber(volume)}</div>
                </div>
            `;
        }).join('');

        listHTML = tableHeader + `<div class="stat-table-body">${rows}</div>`;

    } else if (type === 'sets') {
        titleEl.textContent = 'SETS HISTORY';

        // Calculate sets per workout
        const setsPerWorkout = history.map(w => w.totalSets || 0);
        const avgSets = setsPerWorkout.length > 0 ? Math.round(setsPerWorkout.reduce((a, b) => a + b, 0) / setsPerWorkout.length) : 0;
        const maxSets = Math.max(...setsPerWorkout, 0);

        summaryHTML = `
            <div class="stat-summary-grid">
                <div class="summary-item">
                    <div class="summary-value">${gameState.totalSets || 0}</div>
                    <div class="summary-label">Total Sets</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value">${avgSets}</div>
                    <div class="summary-label">Avg/Workout</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value">${maxSets}</div>
                    <div class="summary-label">Max in Workout</div>
                </div>
            </div>
        `;

        // Table header + rows for sets
        const tableHeader = `
            <div class="stat-table-header sets-view">
                <div class="stat-col-name">Workout</div>
                <div class="stat-col-date">Date</div>
                <div class="stat-col-sets">Sets</div>
            </div>
        `;

        const rows = history.slice(0, 20).map(w => {
            const date = new Date(w.date);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const sets = w.totalSets || 0;

            return `
                <div class="stat-table-row sets-view">
                    <div class="stat-col-name">${w.name || 'Workout'}</div>
                    <div class="stat-col-date">${dateStr}</div>
                    <div class="stat-col-sets highlight">${sets}</div>
                </div>
            `;
        }).join('');

        listHTML = tableHeader + `<div class="stat-table-body">${rows}</div>`;

    } else if (type === 'volume') {
        titleEl.textContent = 'TONNAGE HISTORY';

        // Calculate tonnage stats
        const volumes = history.map(w => w.totalVolume || 0);
        const avgVolume = volumes.length > 0 ? Math.round(volumes.reduce((a, b) => a + b, 0) / volumes.length) : 0;
        const maxVolume = Math.max(...volumes, 0);

        summaryHTML = `
            <div class="stat-summary-grid">
                <div class="summary-item">
                    <div class="summary-value">${formatNumber(gameState.totalWeight || 0)}</div>
                    <div class="summary-label">Total Tonnage</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value">${formatNumber(avgVolume)}</div>
                    <div class="summary-label">Avg/Workout</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value">${formatNumber(maxVolume)}</div>
                    <div class="summary-label">Best Workout</div>
                </div>
            </div>
        `;

        // Table header + rows for tonnage
        const tableHeader = `
            <div class="stat-table-header volume-view">
                <div class="stat-col-name">Workout</div>
                <div class="stat-col-date">Date</div>
                <div class="stat-col-sets">Sets</div>
                <div class="stat-col-vol">Tonnage</div>
            </div>
        `;

        const rows = history.slice(0, 20).map(w => {
            const date = new Date(w.date);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const volume = w.totalVolume || 0;
            const sets = w.totalSets || 0;

            return `
                <div class="stat-table-row volume-view">
                    <div class="stat-col-name">${w.name || 'Workout'}</div>
                    <div class="stat-col-date">${dateStr}</div>
                    <div class="stat-col-sets">${sets}</div>
                    <div class="stat-col-vol highlight">${formatNumber(volume)}</div>
                </div>
            `;
        }).join('');

        listHTML = tableHeader + `<div class="stat-table-body">${rows}</div>`;
    }

    summaryEl.innerHTML = summaryHTML;
    listEl.innerHTML = listHTML || '<div class="empty-hint">No history yet</div>';

    document.getElementById('statHistoryModal').classList.add('active');
}

function closeStatHistory() {
    document.getElementById('statHistoryModal').classList.remove('active');
}

function isThisWeek(date) {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return date >= startOfWeek;
}

function isThisMonth(date) {
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

// ============================================
// WORKOUT SYSTEM
// ============================================

function startWorkout(type) {
    currentWorkout = { ...workouts[type] };
    exerciseSets = {};
    workoutStartTime = new Date();
    supersets = []; // Reset supersets for new workout
    supersetMode = false;
    supersetSelections = [];

    currentWorkout.exercises.forEach(ex => {
        exerciseSets[ex.id] = [];
    });

    document.getElementById('workoutTitle').textContent = currentWorkout.name;
    renderExercises();
    updateWorkoutXP();
    showScreen('workoutScreen');
}

function startEmptyWorkout() {
    currentWorkout = {
        name: 'CUSTOM WORKOUT',
        exercises: []
    };
    exerciseSets = {};
    workoutStartTime = new Date();
    supersets = [];
    supersetMode = false;
    supersetSelections = [];

    document.getElementById('workoutTitle').textContent = currentWorkout.name;
    renderExercises();
    updateWorkoutXP();
    showScreen('workoutScreen');
}

function addExerciseToWorkout(exerciseId) {
    // Find exercise from all available exercises
    const allExercises = getAllExercises();
    const exercise = allExercises.find(ex => ex.id === exerciseId);

    if (!exercise || !currentWorkout) return;

    // Check if already in workout
    if (currentWorkout.exercises.some(ex => ex.id === exerciseId)) {
        showToast('ALREADY IN WORKOUT');
        return;
    }

    // Add to current workout
    currentWorkout.exercises.push({
        id: exercise.id,
        name: exercise.name,
        targetSets: 3
    });
    exerciseSets[exercise.id] = [];

    renderExercises();
    closeAddExerciseToWorkoutModal();
    showToast('EXERCISE ADDED');
}

function openAddExerciseToWorkoutModal() {
    const allExercises = getAllExercises();
    const modal = document.getElementById('addExerciseToWorkoutModal');
    const list = document.getElementById('addExerciseList');

    // Filter out exercises already in workout
    const currentIds = currentWorkout.exercises.map(ex => ex.id);
    const available = allExercises.filter(ex => !currentIds.includes(ex.id));

    list.innerHTML = available.map(ex => `
        <div class="exercise-select-item" onclick="addExerciseToWorkout('${ex.id}')">
            <span class="exercise-name">${ex.name}</span>
            <span class="exercise-bodypart">${ex.bodypart || ''}</span>
        </div>
    `).join('');

    if (available.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No more exercises available</p>';
    }

    modal.classList.add('active');
}

function closeAddExerciseToWorkoutModal() {
    document.getElementById('addExerciseToWorkoutModal').classList.remove('active');
    document.getElementById('exerciseSearchInput').value = '';
}

function filterExerciseList() {
    const query = document.getElementById('exerciseSearchInput').value.toLowerCase();
    const items = document.querySelectorAll('#addExerciseList .exercise-select-item');

    items.forEach(item => {
        const name = item.querySelector('.exercise-name').textContent.toLowerCase();
        const bodypart = item.querySelector('.exercise-bodypart').textContent.toLowerCase();
        const matches = name.includes(query) || bodypart.includes(query);
        item.style.display = matches ? 'flex' : 'none';
    });
}

function renderExercises() {
    const list = document.getElementById('exerciseList');

    // Build exercise items with superset grouping
    let html = '';
    let processedIds = new Set();

    currentWorkout.exercises.forEach((ex, index) => {
        if (processedIds.has(ex.id)) return;

        const sets = exerciseSets[ex.id] || [];
        const completed = sets.length >= ex.targetSets;
        const supersetGroup = getSupersetGroup(ex.id);

        if (supersetGroup) {
            // Render superset group
            const groupExercises = supersetGroup.map(id =>
                currentWorkout.exercises.find(e => e.id === id)
            ).filter(Boolean);

            html += `<div class="superset-group">`;
            html += `<div class="superset-header">
                <span class="superset-label">SUPERSET</span>
                <button class="superset-unlink-btn" onclick="event.stopPropagation(); unlinkSuperset('${ex.id}')" title="Unlink">✕</button>
            </div>`;

            groupExercises.forEach(groupEx => {
                const groupSets = exerciseSets[groupEx.id] || [];
                const groupCompleted = groupSets.length >= groupEx.targetSets;
                processedIds.add(groupEx.id);

                html += `
                    <div class="exercise-table-row superset-exercise ${groupCompleted ? 'completed' : ''}"
                         onclick="${supersetMode ? `toggleSupersetSelection('${groupEx.id}')` : `openSetModal('${groupEx.id}')`}">
                        <div class="ex-col-name">${groupEx.name}</div>
                        <div class="ex-col-sets">${groupSets.length}/${groupEx.targetSets}</div>
                        <div class="ex-col-status ${groupCompleted ? 'complete' : ''}">${groupCompleted ? 'COMPLETE' : 'TAP TO LOG'}</div>
                    </div>
                `;
            });

            html += `</div>`;
        } else {
            // Render single exercise
            const isSelected = supersetSelections.includes(ex.id);
            processedIds.add(ex.id);

            const statusText = supersetMode
                ? (isSelected ? 'SELECTED' : 'TAP TO SELECT')
                : (completed ? 'COMPLETE' : 'TAP TO LOG');
            const statusClass = supersetMode
                ? (isSelected ? 'selected' : '')
                : (completed ? 'complete' : '');

            html += `
                <div class="exercise-table-row ${completed ? 'completed' : ''} ${isSelected ? 'superset-selected' : ''}"
                     onclick="${supersetMode ? `toggleSupersetSelection('${ex.id}')` : `openSetModal('${ex.id}')`}">
                    <div class="ex-col-name">${ex.name}</div>
                    <div class="ex-col-sets">${sets.length}/${ex.targetSets}</div>
                    <div class="ex-col-status ${statusClass}">${statusText}</div>
                </div>
            `;
        }
    });

    // Superset controls
    html += `
        <div class="superset-controls">
            ${supersetMode ? `
                <div class="superset-mode-hint">Select 2+ exercises to link as superset</div>
                <div class="superset-mode-buttons">
                    <button class="dc-button secondary small" onclick="cancelSupersetMode()">CANCEL</button>
                    <button class="dc-button small" onclick="confirmSuperset()" ${supersetSelections.length < 2 ? 'disabled' : ''}>LINK (${supersetSelections.length})</button>
                </div>
            ` : `
                <button class="dc-button secondary small superset-add-btn" onclick="enterSupersetMode()">
                    <span class="link-icon">🔗</span> CREATE SUPERSET
                </button>
            `}
        </div>
    `;

    list.innerHTML = html;
}

function getSupersetGroup(exerciseId) {
    for (const group of supersets) {
        if (group.includes(exerciseId)) {
            return group;
        }
    }
    return null;
}

function enterSupersetMode() {
    supersetMode = true;
    supersetSelections = [];
    renderExercises();
}

function cancelSupersetMode() {
    supersetMode = false;
    supersetSelections = [];
    renderExercises();
}

function toggleSupersetSelection(exerciseId) {
    // Don't allow selecting exercises already in a superset
    if (getSupersetGroup(exerciseId)) {
        showToast('Already in a superset');
        return;
    }

    const index = supersetSelections.indexOf(exerciseId);
    if (index === -1) {
        supersetSelections.push(exerciseId);
    } else {
        supersetSelections.splice(index, 1);
    }
    renderExercises();
}

function confirmSuperset() {
    if (supersetSelections.length >= 2) {
        supersets.push([...supersetSelections]);
        supersetMode = false;
        supersetSelections = [];
        renderExercises();
        showToast('Superset created!');
    }
}

function unlinkSuperset(exerciseId) {
    const groupIndex = supersets.findIndex(group => group.includes(exerciseId));
    if (groupIndex !== -1) {
        supersets.splice(groupIndex, 1);
        renderExercises();
        showToast('Superset removed');
    }
}

function openSetModal(exerciseId) {
    currentExercise = currentWorkout.exercises.find(e => e.id === exerciseId);
    document.getElementById('modalExerciseName').textContent = currentExercise.name;

    // Reset set type to normal
    currentSetType = 'normal';
    document.querySelectorAll('.set-type-btn, .set-pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === 'normal');
    });

    // Check if bodyweight exercise and toggle mode
    const isBodyweight = isBodyweightExercise(exerciseId);
    const primarySection = document.querySelector('.primary-input-section');
    const weightLabel = document.querySelector('.primary-input-group:first-child label');
    const weightInput = document.getElementById('weightInput');

    if (isBodyweight) {
        primarySection?.classList.add('bodyweight-mode');
        if (weightLabel) weightLabel.textContent = '+WEIGHT';
        if (weightInput) {
            weightInput.value = 0;  // Default to 0 additional weight
            weightInput.placeholder = '0';
        }
    } else {
        primarySection?.classList.remove('bodyweight-mode');
        if (weightLabel) weightLabel.textContent = 'WEIGHT';
    }

    // Apply weight suggestions for first-time exercises
    applyWeightSuggestion(exerciseId);

    // Show previous workout data
    showPreviousWorkoutData();

    // Update 1RM estimate (hide for bodyweight)
    if (isBodyweight) {
        const ormDisplay = document.querySelector('.orm-compact');
        if (ormDisplay) ormDisplay.style.display = 'none';
    } else {
        const ormDisplay = document.querySelector('.orm-compact');
        if (ormDisplay) ormDisplay.style.display = 'flex';
        updateOrmEstimate();
    }

    // Reset plate calculator
    document.getElementById('plateCalculator').style.display = 'none';

    renderLoggedSets();
    document.getElementById('setModal').classList.add('active');

    // Add input listeners for 1RM calculation
    document.getElementById('weightInput').addEventListener('input', updateOrmEstimate);
    document.getElementById('repsInput').addEventListener('input', updateOrmEstimate);
    document.getElementById('weightInput').addEventListener('input', updatePlateCalculator);
}

function applyWeightSuggestion(exerciseId) {
    const weightInput = document.getElementById('weightInput');
    const repsInput = document.getElementById('repsInput');

    // Check if user has previous sets for this exercise in workout history
    const hasPreviousSets = gameState.workoutHistory?.some(workout =>
        workout.exercises?.some(ex => ex.id === exerciseId && ex.sets?.length > 0)
    );

    // Check if user already logged sets this session
    const hasCurrentSets = (exerciseSets[exerciseId] || []).length > 0;

    // If no previous or current sets, apply weight suggestion
    if (!hasPreviousSets && !hasCurrentSets) {
        const suggestedWeight = getSuggestedWeight(exerciseId);
        const suggestedReps = getSuggestedReps(exerciseId);

        if (suggestedWeight && suggestedWeight > 0) {
            weightInput.value = suggestedWeight;
        }

        if (suggestedReps) {
            repsInput.value = suggestedReps;
        }
    } else if (hasCurrentSets) {
        // Use last set values from this session
        const lastSet = exerciseSets[exerciseId][exerciseSets[exerciseId].length - 1];
        weightInput.value = lastSet.weight;
        repsInput.value = lastSet.reps;
    } else if (hasPreviousSets) {
        // Use last set values from history (iterate in reverse to get most recent)
        const sortedHistory = [...(gameState.workoutHistory || [])].sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        );
        for (const workout of sortedHistory) {
            const exerciseEntry = workout.exercises?.find(ex => ex.id === exerciseId);
            if (exerciseEntry && exerciseEntry.sets?.length > 0) {
                const lastSet = exerciseEntry.sets[exerciseEntry.sets.length - 1];
                weightInput.value = lastSet.weight;
                repsInput.value = lastSet.reps;
                break;
            }
        }
    }
}

function closeSetModal() {
    document.getElementById('setModal').classList.remove('active');
    currentExercise = null;
}

function renderLoggedSets() {
    const sets = exerciseSets[currentExercise.id] || [];
    const container = document.getElementById('loggedSets');

    if (sets.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--ps1-gray); padding: 20px;">No sets logged yet</div>';
    } else {
        container.innerHTML = sets.map((set, i) => {
            const typeClass = set.type ? `set-type-${set.type}` : '';
            const typeLabel = getSetTypeLabel(set.type);
            const rpeDisplay = set.rpe ? `<span class="set-rpe">RPE ${set.rpe}</span>` : '';
            return `
                <div class="logged-set ${typeClass}">
                    <span class="set-num">${typeLabel}SET ${i + 1}</span>
                    <span class="set-details">${set.weight} lbs × ${set.reps} reps ${rpeDisplay}</span>
                    <button class="set-delete-btn" onclick="deleteSet(${i})">×</button>
                </div>
            `;
        }).join('');
    }
}

function getSetTypeLabel(type) {
    switch(type) {
        case 'warmup': return '<span class="type-badge warmup">W</span>';
        case 'drop': return '<span class="type-badge drop">D</span>';
        case 'failure': return '<span class="type-badge failure">F</span>';
        default: return '';
    }
}

function deleteSet(index) {
    if (exerciseSets[currentExercise.id]) {
        exerciseSets[currentExercise.id].splice(index, 1);
        renderLoggedSets();
        renderExercises();
    }
}

function logSet() {
    const weight = parseInt(document.getElementById('weightInput').value) || 0;
    const reps = parseInt(document.getElementById('repsInput').value) || 0;
    const rpe = document.getElementById('rpeInput').value || null;

    if (weight <= 0 || reps <= 0) return;

    exerciseSets[currentExercise.id].push({
        weight,
        reps,
        type: currentSetType,
        rpe: rpe ? parseFloat(rpe) : null,
        timestamp: new Date().toISOString()
    });

    // Check if this exercise is part of a superset
    const supersetGroup = getSupersetGroup(currentExercise.id);
    const nextExerciseInSuperset = getNextSupersetExercise(currentExercise.id, supersetGroup);

    // Start rest timer (skip for warmup sets and if there's a next superset exercise)
    if (currentSetType !== 'warmup' && !nextExerciseInSuperset) {
        startRestTimer();
    }

    // Calculate XP with tier multiplier (using bodyweight-aware volume)
    const tierMultiplier = getExerciseTierMultiplier(currentExercise.id);
    const setVolume = calculateVolume(currentExercise.id, weight, reps);
    const baseXP = Math.floor(setVolume / 10);
    const xpGain = baseXP * tierMultiplier;

    // Check for milestone bonus (percentage of baseline)
    const milestoneBonus = checkMilestoneBonus(currentExercise.id, weight);

    // Add total XP
    addXP(xpGain + milestoneBonus);

    // Update stats
    gameState.totalSets++;
    gameState.totalWeight += setVolume;

    // Check for weight milestone achievements (legacy system)
    checkMilestones(currentExercise.id, weight);

    // Update personal records (max single rep weight and max tonnage)
    const tonnage = setVolume;
    let newWeightPR = false;

    if (!gameState.personalRecords[currentExercise.id]) {
        gameState.personalRecords[currentExercise.id] = {
            maxWeight: weight,
            maxWeightDate: new Date().toISOString(),
            maxTonnage: tonnage,
            maxTonnageWeight: weight,
            maxTonnageReps: reps,
            maxTonnageDate: new Date().toISOString()
        };
        newWeightPR = true;
    } else {
        const pr = gameState.personalRecords[currentExercise.id];
        // Handle legacy format (just a number)
        if (typeof pr === 'number') {
            if (weight > pr) newWeightPR = true;
            gameState.personalRecords[currentExercise.id] = {
                maxWeight: Math.max(pr, weight),
                maxWeightDate: weight > pr ? new Date().toISOString() : null,
                maxTonnage: tonnage,
                maxTonnageWeight: weight,
                maxTonnageReps: reps,
                maxTonnageDate: new Date().toISOString()
            };
        } else {
            // Update max weight if new PR
            if (weight > (pr.maxWeight || 0)) {
                pr.maxWeight = weight;
                pr.maxWeightDate = new Date().toISOString();
                newWeightPR = true;
            }
            // Update max tonnage if new PR
            if (tonnage > (pr.maxTonnage || 0)) {
                pr.maxTonnage = tonnage;
                pr.maxTonnageWeight = weight;
                pr.maxTonnageReps = reps;
                pr.maxTonnageDate = new Date().toISOString();
            }
        }
    }

    // Track PRs hit during this workout for summary
    if (newWeightPR) {
        workoutPRsHit.push({
            exercise: currentExercise.name,
            weight: weight
        });
    }

    saveCurrentCharacter();
    renderLoggedSets();
    renderExercises();
    showXPPopup(xpGain);

    // Update minimized bar if workout is minimized
    if (workoutMinimized) {
        updateMinimizedWorkoutBar();
    }

    // If in a superset, prompt for next exercise
    if (nextExerciseInSuperset) {
        showSupersetPrompt(nextExerciseInSuperset);
    }
}

function getNextSupersetExercise(currentId, supersetGroup) {
    if (!supersetGroup || supersetGroup.length < 2) return null;

    const currentIndex = supersetGroup.indexOf(currentId);
    if (currentIndex === -1) return null;

    // Get the next exercise in the superset (wrap around to first)
    const nextIndex = (currentIndex + 1) % supersetGroup.length;
    const nextId = supersetGroup[nextIndex];

    // Return the exercise object
    return currentWorkout.exercises.find(ex => ex.id === nextId);
}

function showSupersetPrompt(nextExercise) {
    // Create a prompt overlay
    const prompt = document.createElement('div');
    prompt.className = 'superset-prompt';
    prompt.id = 'supersetPrompt';
    prompt.innerHTML = `
        <div class="superset-prompt-content">
            <div class="superset-prompt-icon">🔗</div>
            <div class="superset-prompt-text">
                <div class="prompt-label">SUPERSET - NEXT UP:</div>
                <div class="prompt-exercise">${nextExercise.name}</div>
            </div>
            <div class="superset-prompt-buttons">
                <button class="dc-button small" onclick="goToNextSupersetExercise('${nextExercise.id}')">GO</button>
                <button class="dc-button secondary small" onclick="skipSupersetPrompt()">REST</button>
            </div>
        </div>
    `;

    document.getElementById('setModal').querySelector('.modal-content').appendChild(prompt);
}

function goToNextSupersetExercise(exerciseId) {
    // Remove prompt
    const prompt = document.getElementById('supersetPrompt');
    if (prompt) prompt.remove();

    // Close current modal and open next
    closeSetModal();
    setTimeout(() => openSetModal(exerciseId), 100);
}

function skipSupersetPrompt() {
    // Remove prompt
    const prompt = document.getElementById('supersetPrompt');
    if (prompt) prompt.remove();

    // Start rest timer now
    if (currentSetType !== 'warmup') {
        startRestTimer();
    }
}

function addXP(amount) {
    gameState.xp += amount;

    while (gameState.xp >= gameState.xpToNext) {
        gameState.xp -= gameState.xpToNext;
        gameState.level++;
        gameState.xpToNext = Math.floor(gameState.xpToNext * 1.5);
    }

    updateWorkoutXP();
    updateMenuStats();
}

function updateWorkoutXP() {
    document.getElementById('workoutLevel').textContent = `LEVEL ${gameState.level}`;
    document.getElementById('workoutXpText').textContent = `${gameState.xp} / ${gameState.xpToNext} XP`;
    document.getElementById('workoutXpFill').style.width = `${(gameState.xp / gameState.xpToNext) * 100}%`;
}

function showXPPopup(amount) {
    const popup = document.createElement('div');
    popup.className = 'xp-popup';
    popup.textContent = `+${amount} XP`;
    popup.style.left = `${Math.random() * 60 + 20}%`;
    popup.style.top = '50%';
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 1500);
}

function checkMilestones(exerciseId, weight) {
    const exerciseMilestones = milestones[exerciseId];
    if (!exerciseMilestones) return;

    exerciseMilestones.forEach(milestone => {
        const achievementId = `${exerciseId}_${milestone.weight}`;
        if (weight >= milestone.weight && !gameState.achievements.includes(achievementId)) {
            gameState.achievements.push(achievementId);
            showAchievement(milestone);
            addXP(milestone.xp);
        }
    });
}

function showAchievement(milestone) {
    document.getElementById('achievementName').textContent = milestone.name;
    document.getElementById('achievementDesc').textContent = milestone.desc;
    document.getElementById('achievementXp').textContent = `+${milestone.xp} XP`;
    document.getElementById('achievementIcon').textContent = milestone.icon;
    document.getElementById('achievementOverlay').classList.add('active');
}

function closeAchievement() {
    document.getElementById('achievementOverlay').classList.remove('active');
}

// ============================================
// REST TIMER
// ============================================

function startRestTimer() {
    restTimeRemaining = defaultRestTime;
    restTimerRunning = true;
    updateTimerDisplay();
    document.getElementById('timerToggleBtn').textContent = 'PAUSE';

    if (restTimerInterval) clearInterval(restTimerInterval);

    restTimerInterval = setInterval(() => {
        if (restTimeRemaining > 0) {
            restTimeRemaining--;
            updateTimerDisplay();
        } else {
            // Timer finished
            stopRestTimer();
            playTimerSound();
        }
    }, 1000);
}

function stopRestTimer() {
    restTimerRunning = false;
    if (restTimerInterval) {
        clearInterval(restTimerInterval);
        restTimerInterval = null;
    }
    document.getElementById('timerToggleBtn').textContent = 'START';
}

function toggleTimer() {
    if (restTimerRunning) {
        stopRestTimer();
    } else {
        startRestTimer();
    }
}

function adjustTimer(seconds) {
    restTimeRemaining = Math.max(0, restTimeRemaining + seconds);
    updateTimerDisplay();
}

function setTimer(seconds) {
    defaultRestTime = seconds;
    restTimeRemaining = seconds;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const mins = Math.floor(restTimeRemaining / 60);
    const secs = restTimeRemaining % 60;
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

    document.getElementById('timerDisplay').textContent = timeStr;

    // Also update minimized workout bar timer
    const minimizedTimer = document.getElementById('minimizedTimerDisplay');
    if (minimizedTimer) {
        minimizedTimer.textContent = timeStr;
    }

    // Visual feedback when timer is low
    const display = document.getElementById('timerDisplay');
    if (restTimeRemaining <= 10 && restTimeRemaining > 0) {
        display.classList.add('timer-warning');
    } else {
        display.classList.remove('timer-warning');
    }
}

function playTimerSound() {
    // Simple beep using Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;

        oscillator.start();
        setTimeout(() => oscillator.stop(), 200);
    } catch (e) {
        console.log('Audio not supported');
    }
}

// ============================================
// SET TYPE SELECTION
// ============================================

function selectSetType(type) {
    currentSetType = type;
    // Support both old .set-type-btn and new .set-pill classes
    document.querySelectorAll('.set-type-btn, .set-pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
}

// ============================================
// PREVIOUS WORKOUT DATA
// ============================================

function showPreviousWorkoutData() {
    const prevData = document.getElementById('prevSets');
    const container = document.getElementById('previousWorkoutData');

    if (!gameState.workoutHistory || !currentExercise) {
        container.style.display = 'none';
        return;
    }

    // Find the last workout that included this exercise
    let lastSets = null;
    for (const workout of gameState.workoutHistory) {
        const exerciseEntry = workout.exercises?.find(e => e.id === currentExercise.id);
        if (exerciseEntry && exerciseEntry.sets && exerciseEntry.sets.length > 0) {
            lastSets = exerciseEntry.sets;
            break;
        }
    }

    if (lastSets) {
        container.style.display = 'block';
        prevData.innerHTML = lastSets.map((s, i) =>
            `<span class="prev-set">${s.weight}×${s.reps}</span>`
        ).join(' ');

        // Pre-fill weight input with last workout's first set weight
        document.getElementById('weightInput').value = lastSets[0].weight;
    } else {
        container.style.display = 'none';
    }
}

// ============================================
// 1RM CALCULATOR
// ============================================

function calculate1RM(weight, reps) {
    if (reps === 1) return weight;
    if (reps <= 0 || weight <= 0) return 0;

    // Use Brzycki formula for low reps, Epley for higher
    if (reps <= 6) {
        // Brzycki: weight × (36 / (37 - reps))
        return Math.round(weight * (36 / (37 - reps)));
    } else {
        // Epley: weight × (1 + reps / 30)
        return Math.round(weight * (1 + reps / 30));
    }
}

function updateOrmEstimate() {
    const weight = parseInt(document.getElementById('weightInput').value) || 0;
    const reps = parseInt(document.getElementById('repsInput').value) || 0;
    const orm = calculate1RM(weight, reps);

    document.getElementById('ormValue').textContent = orm > 0 ? `${orm} lbs` : '--';
}

// ============================================
// PLATE CALCULATOR
// ============================================

const PLATES_LBS = [45, 35, 25, 10, 5, 2.5];
const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
const BAR_WEIGHT_LBS = 45;
const BAR_WEIGHT_KG = 20;
let currentPlateUnit = 'lbs';

function togglePlateCalculator() {
    const calc = document.getElementById('plateCalculator');
    calc.style.display = calc.style.display === 'none' ? 'block' : 'none';
    if (calc.style.display === 'block') {
        updatePlateCalculator();
    }
}

function setPlateUnit(unit) {
    currentPlateUnit = unit;
    document.querySelectorAll('.plate-unit-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.unit === unit);
    });
    updatePlateCalculator();
}

function updatePlateCalculator() {
    const weightInput = parseFloat(document.getElementById('weightInput').value) || 0;

    // Convert weight if needed
    let weight = weightInput;
    let barWeight, plates, unitLabel;

    if (currentPlateUnit === 'kg') {
        weight = weightInput * 0.453592; // Convert lbs to kg
        barWeight = BAR_WEIGHT_KG;
        plates = PLATES_KG;
        unitLabel = 'kg';
    } else {
        barWeight = BAR_WEIGHT_LBS;
        plates = PLATES_LBS;
        unitLabel = 'lb';
    }

    const perSide = (weight - barWeight) / 2;

    // Update bar weight display
    const barDisplay = document.getElementById('barWeightDisplay');
    if (barDisplay) {
        barDisplay.textContent = `${barWeight} ${unitLabel}`;
    }

    const plateVisual = document.getElementById('plateVisual');
    const plateList = document.getElementById('plateList');

    if (perSide <= 0) {
        plateVisual.innerHTML = '<div class="no-plates">Bar only</div>';
        plateList.innerHTML = '';
        return;
    }

    // Calculate plates needed per side
    let remaining = perSide;
    const platesNeeded = [];

    for (const plate of plates) {
        while (remaining >= plate - 0.01) { // Small tolerance for floating point
            platesNeeded.push(plate);
            remaining -= plate;
        }
    }

    // Visual representation with Olympic colors
    const colorsLbs = {
        45: '#e74c3c', 35: '#f1c40f', 25: '#2ecc71',
        10: '#3498db', 5: '#9b59b6', 2.5: '#95a5a6'
    };
    const colorsKg = {
        25: '#e74c3c', 20: '#3498db', 15: '#f1c40f',
        10: '#2ecc71', 5: '#ffffff', 2.5: '#e74c3c', 1.25: '#95a5a6'
    };
    const colors = currentPlateUnit === 'kg' ? colorsKg : colorsLbs;

    plateVisual.innerHTML = platesNeeded.map(p => {
        const height = currentPlateUnit === 'kg' ? 20 + p * 1.5 : 20 + p * 0.8;
        const textColor = (p === 5 && currentPlateUnit === 'kg') ? '#000' : '#fff';
        return `<div class="plate-disc" style="background: ${colors[p] || '#666'}; height: ${height}px; color: ${textColor};">${p}</div>`;
    }).join('') || '<div class="no-plates">Bar only</div>';

    // Text list
    const plateCounts = {};
    platesNeeded.forEach(p => plateCounts[p] = (plateCounts[p] || 0) + 1);
    plateList.innerHTML = Object.entries(plateCounts)
        .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
        .map(([plate, count]) => `<span class="plate-count">${count}×${plate}${unitLabel}</span>`)
        .join(' ');
}

// ============================================
// EXERCISE HISTORY
// ============================================

function showExerciseHistory() {
    if (!currentExercise) return;

    document.getElementById('historyExerciseName').textContent = currentExercise.name;

    // Get all history for this exercise
    const exerciseHistory = [];
    (gameState.workoutHistory || []).forEach(workout => {
        const entry = workout.exercises?.find(e => e.id === currentExercise.id);
        if (entry && entry.sets && entry.sets.length > 0) {
            exerciseHistory.push({
                date: workout.date,
                sets: entry.sets
            });
        }
    });

    // Stats
    const statsContainer = document.getElementById('exerciseHistoryStats');
    const pr = gameState.personalRecords?.[currentExercise.id];

    if (pr) {
        const maxWeight = typeof pr === 'number' ? pr : pr.maxWeight;
        const maxTonnage = typeof pr === 'object' ? pr.maxTonnage : null;
        statsContainer.innerHTML = `
            <div class="history-stat">
                <div class="history-stat-value">${maxWeight || 0} lbs</div>
                <div class="history-stat-label">Max Weight</div>
            </div>
            <div class="history-stat">
                <div class="history-stat-value">${maxTonnage ? formatNumber(maxTonnage) : '--'}</div>
                <div class="history-stat-label">Max Tonnage</div>
            </div>
            <div class="history-stat">
                <div class="history-stat-value">${exerciseHistory.length}</div>
                <div class="history-stat-label">Sessions</div>
            </div>
        `;
    } else {
        statsContainer.innerHTML = '<div class="empty-hint">No records yet</div>';
    }

    // Chart - show weight progression
    const chartContainer = document.getElementById('exerciseHistoryChart');
    if (exerciseHistory.length >= 2) {
        const maxWeights = exerciseHistory.slice(0, 10).reverse().map(h => {
            const maxW = Math.max(...h.sets.map(s => s.weight));
            return { date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), weight: maxW };
        });

        const maxVal = Math.max(...maxWeights.map(d => d.weight));
        chartContainer.innerHTML = `
            <div class="mini-chart">
                ${maxWeights.map(d => `
                    <div class="chart-bar-container">
                        <div class="chart-bar" style="height: ${(d.weight / maxVal) * 100}%"></div>
                        <div class="chart-label">${d.date}</div>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        chartContainer.innerHTML = '<div class="empty-hint">Need more data for chart</div>';
    }

    // History list
    const listContainer = document.getElementById('exerciseHistoryList');
    if (exerciseHistory.length > 0) {
        listContainer.innerHTML = exerciseHistory.slice(0, 10).map(h => {
            const date = new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const setsStr = h.sets.map(s => `${s.weight}×${s.reps}`).join(', ');
            return `
                <div class="history-entry">
                    <div class="history-date">${date}</div>
                    <div class="history-sets">${setsStr}</div>
                </div>
            `;
        }).join('');
    } else {
        listContainer.innerHTML = '<div class="empty-hint">No history for this exercise</div>';
    }

    document.getElementById('exerciseHistoryModal').classList.add('active');
}

function closeExerciseHistory() {
    document.getElementById('exerciseHistoryModal').classList.remove('active');
}

// ============================================
// WORKOUT NOTES
// ============================================

function toggleWorkoutNotes() {
    const notes = document.getElementById('workoutNotes');
    const toggle = document.getElementById('notesToggle');
    if (notes.classList.contains('hidden')) {
        notes.classList.remove('hidden');
        toggle.textContent = '▲';
    } else {
        notes.classList.add('hidden');
        toggle.textContent = '▼';
    }
}

// ============================================
// MUSCLE HEATMAP
// ============================================

const MUSCLE_GROUPS = {
    chest: { x: 50, y: 25, label: 'Chest' },
    back: { x: 50, y: 30, label: 'Back' },
    shoulders: { x: 30, y: 20, label: 'Shoulders' },
    biceps: { x: 20, y: 35, label: 'Biceps' },
    triceps: { x: 80, y: 35, label: 'Triceps' },
    quads: { x: 40, y: 65, label: 'Quads' },
    hamstrings: { x: 60, y: 65, label: 'Hamstrings' },
    glutes: { x: 50, y: 55, label: 'Glutes' },
    calves: { x: 50, y: 85, label: 'Calves' },
    core: { x: 50, y: 45, label: 'Core' }
};

function getMusclesWorked(exercises) {
    const muscleVolume = {};

    exercises.forEach(ex => {
        const exerciseDef = allExercises.find(e => e.id === ex.id);
        if (exerciseDef && exerciseDef.muscle) {
            const volume = ex.sets.reduce((sum, s) => sum + calculateVolume(ex.id, s.weight, s.reps), 0);
            muscleVolume[exerciseDef.muscle] = (muscleVolume[exerciseDef.muscle] || 0) + volume;
        }
    });

    return muscleVolume;
}

function renderMuscleHeatmap(exerciseData) {
    const container = document.getElementById('muscleHeatmap');
    const muscleVolume = getMusclesWorked(exerciseData);
    const maxVolume = Math.max(...Object.values(muscleVolume), 1);

    // Simple grid-based heatmap
    const muscles = Object.entries(MUSCLE_GROUPS);

    container.innerHTML = `
        <div class="heatmap-grid">
            ${muscles.map(([muscle, data]) => {
                const volume = muscleVolume[muscle] || 0;
                const intensity = volume / maxVolume;
                const color = intensity > 0
                    ? `rgba(231, 76, 60, ${0.3 + intensity * 0.7})`
                    : 'rgba(100, 100, 100, 0.2)';
                return `
                    <div class="heatmap-muscle ${volume > 0 ? 'active' : ''}" style="background: ${color};">
                        <div class="muscle-name">${data.label}</div>
                        ${volume > 0 ? `<div class="muscle-volume">${formatNumber(volume)} lbs</div>` : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// ============================================
// WORKOUT SUMMARY
// ============================================

function showWorkoutSummary(duration, totalSets, totalVolume, xpEarned, exerciseData) {
    // Format duration
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    document.getElementById('summaryDuration').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    document.getElementById('summarySets').textContent = totalSets;
    document.getElementById('summaryVolume').textContent = formatNumber(totalVolume);
    document.getElementById('summaryXP').textContent = `+${xpEarned}`;

    // Render muscle heatmap
    renderMuscleHeatmap(exerciseData);

    // Show PRs hit this workout
    if (workoutPRsHit.length > 0) {
        document.getElementById('workoutPRs').style.display = 'block';
        document.getElementById('summaryPrList').innerHTML = workoutPRsHit.map(pr =>
            `<div class="pr-item">🏆 ${pr.exercise}: ${pr.weight} lbs</div>`
        ).join('');
    } else {
        document.getElementById('workoutPRs').style.display = 'none';
    }

    document.getElementById('workoutSummaryModal').classList.add('active');
}

function closeWorkoutSummary() {
    document.getElementById('workoutSummaryModal').classList.remove('active');
    workoutPRsHit = [];
    currentWorkout = null;
    exerciseSets = {};
    showScreen('menuScreen');
}

// ============================================
// CSV EXPORT
// ============================================

function exportCSV() {
    if (!gameState.workoutHistory || gameState.workoutHistory.length === 0) {
        showToast('NO DATA TO EXPORT');
        return;
    }

    let csv = 'Date,Workout,Exercise,Set,Weight (lbs),Reps,Type,RPE,Volume\n';

    gameState.workoutHistory.forEach(workout => {
        const date = new Date(workout.date).toLocaleDateString();
        workout.exercises?.forEach(ex => {
            ex.sets?.forEach((set, i) => {
                const volume = calculateVolume(ex.id, set.weight, set.reps);
                csv += `"${date}","${workout.name}","${ex.name}",${i + 1},${set.weight},${set.reps},${set.type || 'normal'},${set.rpe || ''},${volume}\n`;
            });
        });
    });

    downloadFile(csv, `ironquest_export_${Date.now()}.csv`, 'text/csv');
    showToast('CSV EXPORTED!');
}

function exportJSON() {
    const data = {
        character: {
            name: gameState.name || gameState.playerName,
            level: gameState.level,
            xp: gameState.xp,
            totalWorkouts: gameState.totalWorkouts
        },
        personalRecords: gameState.personalRecords,
        workoutHistory: gameState.workoutHistory
    };

    downloadFile(JSON.stringify(data, null, 2), `ironquest_export_${Date.now()}.json`, 'application/json');
    showToast('JSON EXPORTED!');
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function finishWorkout() {
    const duration = Math.floor((new Date() - workoutStartTime) / 1000);

    // Calculate workout stats
    let totalSets = 0;
    let totalVolume = 0;
    const exerciseData = [];

    currentWorkout.exercises.forEach(ex => {
        const sets = exerciseSets[ex.id] || [];
        if (sets.length > 0) {
            totalSets += sets.length;
            sets.forEach(s => totalVolume += calculateVolume(ex.id, s.weight, s.reps));
            exerciseData.push({
                id: ex.id,
                name: ex.name,
                sets: [...sets]
            });
        }
    });

    const xpEarned = Math.floor(totalVolume / 10);

    // Save to history
    const workoutRecord = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        type: currentWorkout.type,
        name: currentWorkout.name,
        duration,
        totalSets,
        totalVolume,
        exercises: exerciseData,
        xpEarned: xpEarned
    };

    if (!gameState.workoutHistory) {
        gameState.workoutHistory = [];
    }
    gameState.workoutHistory.unshift(workoutRecord);

    // Update stats
    gameState.totalWorkouts++;

    // Bonus XP for completing exercises
    const completedExercises = currentWorkout.exercises.filter(ex =>
        exerciseSets[ex.id].length >= ex.targetSets
    ).length;

    const bonusXP = completedExercises * 50;
    if (bonusXP > 0) {
        addXP(bonusXP);
        showXPPopup(bonusXP);
    }

    saveCurrentCharacter();
    updateMenuStats();

    // Save notes if any
    const notes = document.getElementById('workoutNotes')?.value?.trim();
    if (notes) {
        workoutRecord.notes = notes;
    }

    // Stop rest timer
    stopRestTimer();

    // Hide minimized workout bar if visible
    hideMinimizedWorkoutBar();

    // Save to backend if online
    if (isOnlineMode) {
        try {
            await API.saveWorkout({
                name: currentWorkout.name,
                type: currentWorkout.type,
                duration: duration,
                totalSets: totalSets,
                totalVolume: totalVolume,
                xpEarned: xpEarned + bonusXP,
                exercises: exerciseData
            });

            // Sync profile stats to server
            await API.updateProfile({
                level: gameState.level,
                xp: gameState.xp,
                xpToNext: gameState.xpToNext,
                totalWorkouts: gameState.totalWorkouts,
                totalSets: gameState.totalSets,
                totalWeight: gameState.totalWeight,
                achievements: gameState.achievements
            });

            // Notify team via socket
            API.notifyWorkoutCompleted(currentWorkout.name, xpEarned + bonusXP, totalVolume);

            // Update campaign progress based on workout
            await updateCampaignProgressFromWorkout(exerciseData);
        } catch (error) {
            console.error('Failed to save workout to server:', error);
        }
    }

    // Show workout summary modal
    showWorkoutSummary(duration, totalSets, totalVolume, xpEarned + bonusXP, exerciseData);

    // Clear workout notes
    const notesEl = document.getElementById('workoutNotes');
    if (notesEl) {
        notesEl.value = '';
        notesEl.classList.add('hidden');
    }
}

// ============================================
// HISTORY & CALENDAR
// ============================================

function renderHistory() {
    renderCalendar();
    renderHistoryList();
}

function renderCalendar() {
    const container = document.getElementById('calendarGrid');
    const monthLabel = document.getElementById('calendarMonth');

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    monthLabel.textContent = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const today = new Date();
    const todayStr = today.toDateString();

    // Get workout dates
    const workoutDates = new Set();
    if (gameState.workoutHistory) {
        gameState.workoutHistory.forEach(w => {
            const d = new Date(w.date).toDateString();
            workoutDates.add(d);
        });
    }

    let html = '';

    // Day headers
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(day => {
        html += `<div class="calendar-day-header">${day}</div>`;
    });

    // Previous month days
    const prevMonth = new Date(year, month, 0);
    for (let i = startDay - 1; i >= 0; i--) {
        const day = prevMonth.getDate() - i;
        html += `<div class="calendar-day other-month">${day}</div>`;
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = date.toDateString();
        const isToday = dateStr === todayStr;
        const hasWorkout = workoutDates.has(dateStr);

        let classes = 'calendar-day';
        if (isToday) classes += ' today';
        if (hasWorkout) classes += ' has-workout';

        html += `<div class="${classes}" onclick="showDayWorkouts('${dateStr}')">${day}</div>`;
    }

    // Next month days
    const totalCells = startDay + daysInMonth;
    const remaining = 42 - totalCells;
    for (let day = 1; day <= remaining && totalCells + day <= 42; day++) {
        html += `<div class="calendar-day other-month">${day}</div>`;
    }

    container.innerHTML = html;
}

function prevMonth() {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar();
}

function showDayWorkouts(dateStr) {
    if (!gameState.workoutHistory) return;

    const dayWorkouts = gameState.workoutHistory.filter(w => {
        return new Date(w.date).toDateString() === dateStr;
    });

    if (dayWorkouts.length > 0) {
        showWorkoutDetail(dayWorkouts[0].id);
    }
}

function renderHistoryList() {
    const container = document.getElementById('historyList');
    if (!container) return;

    if (!gameState.workoutHistory || gameState.workoutHistory.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <p>No workouts yet. Start your first quest!</p>
            </div>
        `;
        return;
    }

    // Group workouts by type to find previous sessions
    const workoutsByType = {};
    gameState.workoutHistory.forEach(w => {
        const key = w.type || w.name;
        if (!workoutsByType[key]) workoutsByType[key] = [];
        workoutsByType[key].push(w);
    });

    container.innerHTML = gameState.workoutHistory.slice(0, 10).map((workout, index) => {
        const date = new Date(workout.date);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        // Find previous session of same type
        const key = workout.type || workout.name;
        const sameTypeWorkouts = workoutsByType[key] || [];
        const currentIndex = sameTypeWorkouts.findIndex(w => w.id === workout.id);
        const previousSession = currentIndex < sameTypeWorkouts.length - 1 ? sameTypeWorkouts[currentIndex + 1] : null;

        // Calculate volume difference
        let vsLastHtml = '<span class="progress-badge neutral">--</span>';
        if (previousSession && previousSession.totalVolume > 0) {
            const diff = workout.totalVolume - previousSession.totalVolume;
            const pctChange = Math.round((diff / previousSession.totalVolume) * 100);
            const badgeClass = pctChange > 0 ? 'positive' : pctChange < 0 ? 'negative' : 'neutral';
            const sign = pctChange > 0 ? '+' : '';
            vsLastHtml = `<span class="progress-badge ${badgeClass}">${sign}${pctChange}%</span>`;
        }

        const typeBadge = workout.type ? `<span class="workout-type-badge ${workout.type}">${workout.type}</span>` : '';

        return `
            <div class="history-table-row" onclick="showWorkoutDetail('${workout.id}')">
                <div class="hist-col-workout">${workout.name}${typeBadge}</div>
                <div class="hist-col-date">${dateStr}</div>
                <div class="hist-col-sets">${workout.totalSets}</div>
                <div class="hist-col-volume">${formatNumber(workout.totalVolume)}</div>
                <div class="hist-col-vs">${vsLastHtml}</div>
            </div>
        `;
    }).join('');
}

function showWorkoutDetail(workoutId) {
    const workout = gameState.workoutHistory.find(w => w.id === workoutId);
    if (!workout) return;

    const date = new Date(workout.date);
    const duration = workout.duration ? `${Math.floor(workout.duration / 60)}m ${workout.duration % 60}s` : 'N/A';

    let exercisesHtml = workout.exercises.map(ex => {
        const setsHtml = ex.sets.map((s, i) => `
            <div class="workout-detail-set">
                <span class="weight">${s.weight}</span> × ${s.reps}
            </div>
        `).join('');

        return `
            <div class="workout-detail-exercise">
                <h4>${ex.name}</h4>
                <div class="workout-detail-sets">${setsHtml}</div>
            </div>
        `;
    }).join('');

    document.getElementById('workoutDetailContent').innerHTML = `
        <div class="modal-header-row">
            <h2>${workout.name}</h2>
            <button class="icon-button small" onclick="closeWorkoutDetail()">✕</button>
        </div>
        <p style="text-align: center; color: var(--text-tertiary); margin-bottom: 20px;">
            ${date.toLocaleDateString()} • ${duration} • ${workout.totalSets} sets
        </p>
        <div class="workout-detail-exercises">${exercisesHtml}</div>
        <div class="stats-grid">
            <div class="stat-box">
                <div class="stat-value">${formatNumber(workout.totalVolume)}</div>
                <div class="stat-label">Total LBS</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${workout.totalSets}</div>
                <div class="stat-label">Sets</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">+${workout.xpEarned}</div>
                <div class="stat-label">XP Earned</div>
            </div>
        </div>
        <div class="modal-buttons" style="margin-top: 20px;">
            <button class="dc-button secondary" onclick="closeWorkoutDetail()">CLOSE</button>
            <button class="dc-button" onclick="editWorkout('${workoutId}')">EDIT</button>
        </div>
    `;

    document.getElementById('workoutDetailModal').classList.add('active');
}

function closeWorkoutDetail() {
    document.getElementById('workoutDetailModal').classList.remove('active');
}

let editingWorkoutId = null;

function editWorkout(workoutId) {
    const workout = gameState.workoutHistory.find(w => w.id === workoutId);
    if (!workout) return;

    editingWorkoutId = workoutId;
    const date = new Date(workout.date);

    let exercisesHtml = workout.exercises.map((ex, exIndex) => {
        const setsHtml = ex.sets.map((s, setIndex) => `
            <div class="edit-set-row">
                <span class="edit-set-num">${setIndex + 1}</span>
                <input type="number" class="edit-set-weight" data-ex="${exIndex}" data-set="${setIndex}" value="${s.weight}" min="0">
                <span class="edit-set-x">×</span>
                <input type="number" class="edit-set-reps" data-ex="${exIndex}" data-set="${setIndex}" value="${s.reps}" min="1">
                <button class="edit-set-delete" onclick="deleteEditSet(${exIndex}, ${setIndex})">×</button>
            </div>
        `).join('');

        return `
            <div class="edit-exercise-block">
                <div class="edit-exercise-header">${ex.name}</div>
                <div class="edit-sets-list" id="editSets_${exIndex}">${setsHtml}</div>
                <button class="add-set-btn" onclick="addEditSet(${exIndex})">+ Add Set</button>
            </div>
        `;
    }).join('');

    document.getElementById('workoutDetailContent').innerHTML = `
        <div class="modal-header-row">
            <h2>Edit: ${workout.name}</h2>
            <button class="icon-button small" onclick="cancelEditWorkout()">✕</button>
        </div>
        <p style="text-align: center; color: var(--text-tertiary); margin-bottom: 20px;">
            ${date.toLocaleDateString()}
        </p>
        <div class="edit-workout-exercises">${exercisesHtml}</div>
        <div class="modal-buttons" style="margin-top: 20px;">
            <button class="dc-button secondary" onclick="cancelEditWorkout()">CANCEL</button>
            <button class="dc-button" onclick="saveWorkoutEdits()">SAVE</button>
        </div>
    `;
}

function addEditSet(exIndex) {
    const workout = gameState.workoutHistory.find(w => w.id === editingWorkoutId);
    if (!workout || !workout.exercises[exIndex]) return;

    const exercise = workout.exercises[exIndex];
    const lastSet = exercise.sets[exercise.sets.length - 1] || { weight: 0, reps: 10 };
    exercise.sets.push({ weight: lastSet.weight, reps: lastSet.reps, type: 'normal' });

    // Re-render the edit view
    editWorkout(editingWorkoutId);
}

function deleteEditSet(exIndex, setIndex) {
    const workout = gameState.workoutHistory.find(w => w.id === editingWorkoutId);
    if (!workout || !workout.exercises[exIndex]) return;

    const exercise = workout.exercises[exIndex];
    if (exercise.sets.length <= 1) {
        showToast('Cannot delete last set');
        return;
    }

    exercise.sets.splice(setIndex, 1);
    editWorkout(editingWorkoutId);
}

function cancelEditWorkout() {
    // Reload the original workout data (undo unsaved changes)
    editingWorkoutId = null;
    closeWorkoutDetail();
    renderHistory();
}

function saveWorkoutEdits() {
    const workout = gameState.workoutHistory.find(w => w.id === editingWorkoutId);
    if (!workout) return;

    // Collect all edited values from inputs
    document.querySelectorAll('.edit-set-weight').forEach(input => {
        const exIndex = parseInt(input.dataset.ex);
        const setIndex = parseInt(input.dataset.set);
        if (workout.exercises[exIndex] && workout.exercises[exIndex].sets[setIndex]) {
            workout.exercises[exIndex].sets[setIndex].weight = parseFloat(input.value) || 0;
        }
    });

    document.querySelectorAll('.edit-set-reps').forEach(input => {
        const exIndex = parseInt(input.dataset.ex);
        const setIndex = parseInt(input.dataset.set);
        if (workout.exercises[exIndex] && workout.exercises[exIndex].sets[setIndex]) {
            workout.exercises[exIndex].sets[setIndex].reps = parseInt(input.value) || 0;
        }
    });

    // Recalculate workout totals (bodyweight-aware)
    let totalSets = 0;
    let totalVolume = 0;
    workout.exercises.forEach(ex => {
        totalSets += ex.sets.length;
        ex.sets.forEach(s => {
            totalVolume += calculateVolume(ex.id, s.weight || 0, s.reps || 0);
        });
    });

    workout.totalSets = totalSets;
    workout.totalVolume = totalVolume;

    // Save to localStorage
    saveGame();
    showToast('Workout updated!');

    editingWorkoutId = null;
    closeWorkoutDetail();
    renderHistory();
}

// ============================================
// STATS & ANALYTICS
// ============================================

function renderStats() {
    populateExerciseSelect();
    renderPRList();
    updateExerciseChart();
    renderVolumeChart();
}

function populateExerciseSelect() {
    const select = document.getElementById('exerciseSelect');
    select.innerHTML = allExercises.map(ex =>
        `<option value="${ex.id}">${ex.name}</option>`
    ).join('');
}

function renderPRList() {
    const container = document.getElementById('prList');

    const prs = Object.entries(gameState.personalRecords || {}).map(([id, pr]) => {
        const exercise = allExercises.find(e => e.id === id);
        // Handle both old format (number) and new format (object)
        const maxWeight = typeof pr === 'number' ? pr : (pr.maxWeight || 0);
        const maxTonnage = typeof pr === 'object' ? pr.maxTonnage : null;
        return {
            name: exercise ? exercise.name : id,
            maxWeight,
            maxTonnage
        };
    }).sort((a, b) => b.maxWeight - a.maxWeight);

    if (prs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏆</div>
                <p>No PRs yet. Start lifting!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = prs.map(pr => `
        <div class="pr-item">
            <span class="pr-exercise">${pr.name}</span>
            <span class="pr-weight">${pr.maxWeight} lbs</span>
        </div>
    `).join('');
}

function updateExerciseChart() {
    const exerciseId = document.getElementById('exerciseSelect').value;
    const container = document.getElementById('exerciseChart');

    // Get all sets for this exercise from history
    const data = [];
    if (gameState.workoutHistory) {
        gameState.workoutHistory.slice().reverse().forEach(workout => {
            const ex = workout.exercises.find(e => e.id === exerciseId);
            if (ex && ex.sets.length > 0) {
                const maxWeight = Math.max(...ex.sets.map(s => s.weight));
                data.push({
                    date: new Date(workout.date),
                    weight: maxWeight
                });
            }
        });
    }

    if (data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <p>No data for this exercise yet</p>
            </div>
        `;
        return;
    }

    // Take last 8 data points
    const chartData = data.slice(-8);
    const maxWeight = Math.max(...chartData.map(d => d.weight));

    const bars = chartData.map(d => {
        const height = (d.weight / maxWeight) * 100;
        const label = d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `
            <div class="bar" style="height: ${height}%">
                <span class="bar-value">${d.weight}</span>
                <span class="bar-label">${label}</span>
            </div>
        `;
    }).join('');

    container.innerHTML = `<div class="bar-chart">${bars}</div>`;
}

function renderVolumeChart() {
    const container = document.getElementById('volumeChart');

    // Get weekly volume for last 8 weeks
    const weeklyVolume = {};
    const workoutCounts = {};
    const now = new Date();

    if (gameState.workoutHistory) {
        gameState.workoutHistory.forEach(workout => {
            const date = new Date(workout.date);
            const weekStart = getWeekStart(date);
            const key = weekStart.toISOString();

            if (!weeklyVolume[key]) {
                weeklyVolume[key] = { date: weekStart, volume: 0, workouts: 0, sets: 0 };
            }
            weeklyVolume[key].volume += workout.totalVolume;
            weeklyVolume[key].workouts += 1;
            weeklyVolume[key].sets += workout.totalSets || 0;
        });
    }

    const data = Object.values(weeklyVolume)
        .sort((a, b) => b.date - a.date) // Most recent first
        .slice(0, 8);

    if (data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📈</div>
                <p>Complete workouts to see volume trends</p>
            </div>
        `;
        return;
    }

    const maxVolume = Math.max(...data.map(d => d.volume));

    const rows = data.map((d, i) => {
        const weekLabel = d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const weekEnd = new Date(d.date);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const weekEndLabel = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const barWidth = maxVolume > 0 ? (d.volume / maxVolume) * 100 : 0;
        const isCurrentWeek = i === 0;

        return `
            <div class="volume-table-row ${isCurrentWeek ? 'current' : ''}">
                <div class="volume-week">${weekLabel} - ${weekEndLabel}</div>
                <div class="volume-workouts">${d.workouts}</div>
                <div class="volume-sets">${d.sets}</div>
                <div class="volume-amount">
                    <div class="volume-bar-bg">
                        <div class="volume-bar-fill" style="width: ${barWidth}%"></div>
                    </div>
                    <span class="volume-value">${formatNumber(d.volume)}</span>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="volume-table">
            <div class="volume-table-header">
                <div class="volume-week">Week</div>
                <div class="volume-workouts">Workouts</div>
                <div class="volume-sets">Sets</div>
                <div class="volume-amount">Tonnage (lbs)</div>
            </div>
            ${rows}
        </div>
    `;
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
}

// ============================================
// COACH SHARING
// ============================================

function renderShareTab() {
    // Generate share code if viewing share tab
}

function generateShareCode() {
    const shareData = {
        v: 1,
        n: gameState.playerName,
        a: gameState.avatar,
        ca: gameState.customAvatar || null,
        l: gameState.level,
        w: gameState.totalWorkouts,
        s: gameState.totalSets,
        t: gameState.totalWeight,
        pr: gameState.personalRecords,
        h: (gameState.workoutHistory || []).slice(0, 20)
    };

    const json = JSON.stringify(shareData);
    const code = btoa(encodeURIComponent(json));

    document.getElementById('shareCode').textContent = code;
    document.getElementById('shareCodeDisplay').classList.remove('hidden');
}

function copyShareCode() {
    const code = document.getElementById('shareCode').textContent;
    navigator.clipboard.writeText(code).then(() => {
        showToast('CODE COPIED!');
    }).catch(() => {
        showToast('COPY FAILED');
    });
}

function exportCSV() {
    if (!gameState.workoutHistory || gameState.workoutHistory.length === 0) {
        showToast('NO DATA TO EXPORT');
        return;
    }

    let csv = 'Date,Workout,Exercise,Set,Weight (lbs),Reps,Volume\n';

    gameState.workoutHistory.forEach(workout => {
        const date = new Date(workout.date).toLocaleDateString();
        workout.exercises.forEach(ex => {
            ex.sets.forEach((set, i) => {
                csv += `${date},${workout.name},${ex.name},${i + 1},${set.weight},${set.reps},${calculateVolume(ex.id, set.weight, set.reps)}\n`;
            });
        });
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ironquest_${gameState.playerName}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('CSV EXPORTED!');
}

function exportJSON() {
    const data = {
        exportDate: new Date().toISOString(),
        player: {
            name: gameState.playerName,
            level: gameState.level,
            xp: gameState.xp,
            totalWorkouts: gameState.totalWorkouts,
            totalSets: gameState.totalSets,
            totalWeight: gameState.totalWeight
        },
        personalRecords: gameState.personalRecords,
        achievements: gameState.achievements,
        workoutHistory: gameState.workoutHistory
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ironquest_${gameState.playerName}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('JSON EXPORTED!');
}

function openCoachImport() {
    document.getElementById('coachImportModal').classList.add('active');
}

function closeCoachImport() {
    document.getElementById('coachImportModal').classList.remove('active');
    document.getElementById('importCodeInput').value = '';
}

function importCoachCode() {
    const code = document.getElementById('importCodeInput').value.trim();
    if (!code) {
        showToast('ENTER A CODE');
        return;
    }

    try {
        const json = decodeURIComponent(atob(code));
        const data = JSON.parse(json);

        // Store in session for coach view
        sessionStorage.setItem('coachViewData', JSON.stringify(data));
        closeCoachImport();
        showCoachView(data);
    } catch (e) {
        showToast('INVALID CODE');
    }
}

function checkCoachMode() {
    const coachData = sessionStorage.getItem('coachViewData');
    if (coachData) {
        try {
            const data = JSON.parse(coachData);
            showCoachView(data);
        } catch (e) {
            sessionStorage.removeItem('coachViewData');
        }
    }
}

function showCoachView(data) {
    document.getElementById('coachPlayerName').textContent = data.n;
    document.getElementById('coachLevel').textContent = `LEVEL ${data.l}`;
    document.getElementById('coachWorkouts').textContent = data.w;
    document.getElementById('coachSets').textContent = data.s;
    document.getElementById('coachWeight').textContent = formatNumber(data.t);
    document.getElementById('coachAvatar').innerHTML = getAvatarHTML(data.a, data.ca);

    // Render PRs
    const prContainer = document.getElementById('coachPRs');
    const prs = Object.entries(data.pr || {}).map(([id, weight]) => {
        const exercise = allExercises.find(e => e.id === id);
        return { name: exercise ? exercise.name : id, weight };
    }).sort((a, b) => b.weight - a.weight);

    prContainer.innerHTML = prs.length > 0 ? prs.map(pr => `
        <div class="pr-item">
            <span class="pr-exercise">${pr.name}</span>
            <span class="pr-weight">${pr.weight} lbs</span>
        </div>
    `).join('') : '<p style="color: var(--ps1-gray); text-align: center;">No PRs recorded</p>';

    // Render recent workouts
    const historyContainer = document.getElementById('coachHistory');
    const history = data.h || [];

    historyContainer.innerHTML = history.length > 0 ? history.slice(0, 5).map(workout => {
        const date = new Date(workout.date);
        return `
            <div class="history-item">
                <div class="history-item-header">
                    <span class="history-item-type ${workout.type}">${workout.name}</span>
                    <span class="history-item-date">${date.toLocaleDateString()}</span>
                </div>
                <div class="history-item-stats">
                    <div><span>${workout.totalSets}</span> sets</div>
                    <div><span>${formatNumber(workout.totalVolume)}</span> lbs</div>
                </div>
            </div>
        `;
    }).join('') : '<p style="color: var(--ps1-gray); text-align: center;">No workout history</p>';

    showScreen('coachViewScreen');
}

function exitCoachView() {
    sessionStorage.removeItem('coachViewData');
    showScreen('selectScreen');
}

// ============================================
// UTILITIES
// ============================================

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
}

// ============================================
// CUSTOM EXERCISES
// ============================================

function openCreateExerciseModal() {
    document.getElementById('newExerciseName').value = '';
    document.getElementById('newExerciseMuscle').value = 'chest';
    document.getElementById('newExerciseEquipment').value = 'barbell';
    document.getElementById('createExerciseModal').classList.add('active');
}

function closeCreateExerciseModal() {
    document.getElementById('createExerciseModal').classList.remove('active');
}

function saveCustomExercise() {
    const name = document.getElementById('newExerciseName').value.trim();
    const muscle = document.getElementById('newExerciseMuscle').value;
    const equipment = document.getElementById('newExerciseEquipment').value;

    if (!name) {
        showToast('ENTER A NAME');
        return;
    }

    // Generate unique ID
    const id = 'custom_' + Date.now();

    const exercise = {
        id: id,
        name: name,
        muscle: muscle,
        equipment: equipment,
        isCustom: true
    };

    customExercises.push(exercise);

    // Also add to allExercises for stats tracking
    allExercises.push({ id: id, name: name });

    saveCustomData();
    closeCreateExerciseModal();
    renderCustomLists();
    showToast('EXERCISE ADDED!');
}

function deleteCustomExercise(id) {
    if (confirm('Delete this exercise?')) {
        customExercises = customExercises.filter(e => e.id !== id);
        saveCustomData();
        renderCustomLists();
        showToast('EXERCISE DELETED');
    }
}

// ============================================
// CUSTOM WORKOUTS
// ============================================

// Current filter state for workout builder
let currentMuscleFilter = 'all';
let currentSearchQuery = '';

function openCreateWorkoutModal() {
    const nameInput = document.getElementById('newWorkoutName');
    const iconBtn = document.getElementById('workoutIconBtn');
    const iconDropdown = document.getElementById('iconPickerDropdown');
    const searchInput = document.getElementById('exerciseSearch');

    if (nameInput) nameInput.value = '';
    selectedWorkoutExercises = [];
    currentMuscleFilter = 'all';
    currentSearchQuery = '';

    // Reset icon
    if (iconBtn) {
        iconBtn.textContent = '💪';
        iconBtn.dataset.icon = '💪';
    }
    if (iconDropdown) iconDropdown.classList.remove('active');

    // Reset search
    if (searchInput) searchInput.value = '';

    // Reset muscle tabs
    document.querySelectorAll('.muscle-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.muscle === 'all');
    });

    renderExerciseBrowser();
    updateSelectedExercisesList();
    updateCreateButton();
    document.getElementById('createWorkoutModal').classList.add('active');
}

function closeCreateWorkoutModal() {
    document.getElementById('createWorkoutModal').classList.remove('active');
    selectedWorkoutExercises = [];
}

function toggleWorkoutSelection() {
    const selected = document.querySelector('.builder-selected.collapsible');
    const icon = document.getElementById('workoutCollapseIcon');

    if (selected) {
        selected.classList.toggle('collapsed');
        if (icon) {
            icon.textContent = selected.classList.contains('collapsed') ? '▶' : '▼';
        }
    }
}

function toggleIconPicker() {
    document.getElementById('iconPickerDropdown').classList.toggle('active');
}

function selectWorkoutIcon(icon) {
    document.getElementById('workoutIconBtn').textContent = icon;
    document.getElementById('workoutIconBtn').dataset.icon = icon;
    document.getElementById('iconPickerDropdown').classList.remove('active');
}

function filterByMuscle(muscle) {
    currentMuscleFilter = muscle;
    document.querySelectorAll('.muscle-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.muscle === muscle);
    });
    renderExerciseBrowser();
}

function filterExercises() {
    currentSearchQuery = document.getElementById('exerciseSearch').value.toLowerCase();
    renderExerciseBrowser();
}

function renderExerciseBrowser() {
    const container = document.getElementById('exerciseBrowser');
    if (!container) return;

    // Combine all exercises
    let exercises = [...allExercises, ...customExercises.map(ex => ({ ...ex, isCustom: true }))];

    // Apply muscle filter
    if (currentMuscleFilter !== 'all') {
        if (currentMuscleFilter === 'arms') {
            exercises = exercises.filter(ex => ['biceps', 'triceps', 'forearms'].includes(ex.muscle));
        } else if (currentMuscleFilter === 'legs') {
            exercises = exercises.filter(ex => ['quads', 'hamstrings', 'glutes', 'calves'].includes(ex.muscle));
        } else if (currentMuscleFilter === 'bodyweight') {
            exercises = exercises.filter(ex => ex.equipment === 'bodyweight');
        } else {
            exercises = exercises.filter(ex => ex.muscle === currentMuscleFilter);
        }
    }

    // Apply search filter
    if (currentSearchQuery) {
        exercises = exercises.filter(ex =>
            ex.name.toLowerCase().includes(currentSearchQuery) ||
            ex.muscle.toLowerCase().includes(currentSearchQuery)
        );
    }

    // Sort alphabetically
    exercises.sort((a, b) => a.name.localeCompare(b.name));

    if (exercises.length === 0) {
        container.innerHTML = '<div class="no-results">No exercises found</div>';
        return;
    }

    // Get previous performance data
    const history = gameState.workoutHistory || [];
    const prs = gameState.personalRecords || {};

    container.innerHTML = exercises.map(ex => {
        const isSelected = selectedWorkoutExercises.some(s => s.id === ex.id);

        // Find best weight (PR)
        let bestWeight = '--';
        const pr = prs[ex.id];
        if (pr) {
            const weight = typeof pr === 'number' ? pr : (pr.weight || pr.maxWeight || 0);
            if (weight > 0) bestWeight = `${weight}`;
        }

        // Find last session data for this exercise
        let lastSession = '--';
        for (let i = history.length - 1; i >= 0; i--) {
            const workout = history[i];
            if (!workout.exercises) continue;
            const exData = workout.exercises.find(e => e.id === ex.id);
            if (exData && exData.sets && exData.sets.length > 0) {
                // Get best set from last session
                const workingSets = exData.sets.filter(s => s.type !== 'warmup');
                if (workingSets.length > 0) {
                    const best = workingSets.reduce((max, s) =>
                        (s.weight || 0) > (max.weight || 0) ? s : max, workingSets[0]);
                    lastSession = `${best.weight}×${best.reps}`;
                }
                break;
            }
        }

        return `
            <div class="browser-exercise-row ${isSelected ? 'selected' : ''}" onclick="toggleExerciseSelection('${ex.id}')">
                <div class="ex-browse-col-name">
                    <span class="exercise-name-text">${ex.name}</span>
                </div>
                <div class="ex-browse-col-pr">${bestWeight}</div>
                <div class="ex-browse-col-last">${lastSession}</div>
                <div class="ex-browse-col-action">
                    ${isSelected ? '<span class="check-icon">✓</span>' : '<span class="add-icon">+</span>'}
                </div>
            </div>
        `;
    }).join('');
}

function toggleExerciseSelection(exerciseId) {
    const existingIndex = selectedWorkoutExercises.findIndex(ex => ex.id === exerciseId);

    if (existingIndex !== -1) {
        // Remove from selection
        selectedWorkoutExercises.splice(existingIndex, 1);
    } else {
        // Add to selection
        const exercise = allExercises.find(ex => ex.id === exerciseId) ||
                         customExercises.find(ex => ex.id === exerciseId);
        if (exercise) {
            selectedWorkoutExercises.push({
                ...exercise,
                targetSets: 3
            });
        }
    }

    renderExerciseBrowser();
    updateSelectedExercisesList();
    updateCreateButton();
}

function updateCreateButton() {
    const btn = document.getElementById('createWorkoutBtn');
    if (btn) {
        btn.disabled = selectedWorkoutExercises.length === 0;
    }
}

function updateSelectedExercisesList() {
    const countEl = document.getElementById('selectedCount');
    const container = document.getElementById('selectedExercisesList');
    if (!countEl || !container) return;

    countEl.textContent = `${selectedWorkoutExercises.length} exercise${selectedWorkoutExercises.length !== 1 ? 's' : ''}`;

    if (selectedWorkoutExercises.length === 0) {
        container.innerHTML = `
            <div class="empty-workout-hint">
                <div class="hint-icon">👈</div>
                <div class="hint-text">Tap exercises to add them</div>
            </div>
        `;
        return;
    }

    container.innerHTML = selectedWorkoutExercises.map((ex, i) => `
        <div class="selected-exercise-card">
            <div class="selected-exercise-header">
                <span class="selected-exercise-name">${ex.name}</span>
                <button class="remove-exercise-btn" onclick="removeExercise(${i})">✕</button>
            </div>
            <div class="selected-exercise-controls">
                <div class="sets-adjuster">
                    <button class="adj-btn" onclick="adjustSets(${i}, -1)" ${ex.targetSets <= 1 ? 'disabled' : ''}>−</button>
                    <span class="sets-value">${ex.targetSets}</span>
                    <button class="adj-btn" onclick="adjustSets(${i}, 1)">+</button>
                </div>
                <span class="sets-label">sets</span>
            </div>
        </div>
    `).join('');
}

function adjustSets(index, delta) {
    const newSets = selectedWorkoutExercises[index].targetSets + delta;
    if (newSets >= 1 && newSets <= 10) {
        selectedWorkoutExercises[index].targetSets = newSets;
        updateSelectedExercisesList();
    }
}

function removeExercise(index) {
    selectedWorkoutExercises.splice(index, 1);
    renderExerciseBrowser();
    updateSelectedExercisesList();
    updateCreateButton();
}

function saveCustomWorkout() {
    const name = document.getElementById('newWorkoutName').value.trim();
    const iconBtn = document.getElementById('workoutIconBtn');
    const icon = iconBtn ? iconBtn.dataset.icon || '💪' : '💪';

    if (!name) {
        showToast('ENTER A NAME');
        return;
    }

    if (selectedWorkoutExercises.length === 0) {
        showToast('ADD EXERCISES');
        return;
    }

    const id = 'custom_' + Date.now();

    const workout = {
        id: id,
        name: name.toUpperCase(),
        icon: icon,
        type: 'custom',
        exercises: [...selectedWorkoutExercises],
        isCustom: true
    };

    customWorkouts.push(workout);
    saveCustomData();
    closeCreateWorkoutModal();
    renderCustomLists();
    showToast('WORKOUT CREATED!');
}

function deleteCustomWorkout(id) {
    if (confirm('Delete this workout?')) {
        customWorkouts = customWorkouts.filter(w => w.id !== id);
        saveCustomData();
        renderCustomLists();
        showToast('WORKOUT DELETED');
    }
}

function startCustomWorkout(id) {
    const workout = customWorkouts.find(w => w.id === id);
    if (!workout) return;

    currentWorkout = { ...workout };
    exerciseSets = {};
    workoutStartTime = new Date();
    supersets = []; // Reset supersets for new workout
    supersetMode = false;
    supersetSelections = [];

    currentWorkout.exercises.forEach(ex => {
        exerciseSets[ex.id] = [];
    });

    document.getElementById('workoutTitle').textContent = currentWorkout.name;
    renderExercises();
    updateWorkoutXP();
    showScreen('workoutScreen');
}

// ============================================
// RENDER CUSTOM LISTS
// ============================================

function renderCustomLists() {
    renderWorkoutGallery();
    renderCustomProgramList();
    renderCustomWorkoutList();
    renderCustomExerciseList();
}

function renderWorkoutGallery() {
    const gallery = document.getElementById('workoutGallery');
    const moreBtn = document.getElementById('moreWorkoutsBtn');
    if (!gallery) return;

    // Start with the 3 default workout tiles (already in HTML)
    // Remove any previously added custom tiles
    const existingCustomTiles = gallery.querySelectorAll('.workout-tile.custom');
    existingCustomTiles.forEach(tile => tile.remove());

    // Add custom workouts (up to 6 more for total of 9)
    const maxCustomInGallery = 6;
    const customToShow = customWorkouts.slice(0, maxCustomInGallery);

    customToShow.forEach(workout => {
        const tile = document.createElement('div');
        tile.className = 'workout-tile custom';
        tile.onclick = () => startCustomWorkout(workout.id);
        tile.innerHTML = `
            <div class="tile-icon">${workout.icon || '🏋️'}</div>
            <div class="tile-name">${workout.name}</div>
        `;
        gallery.appendChild(tile);
    });

    // Show/hide "More Workouts" button
    if (moreBtn) {
        if (customWorkouts.length > maxCustomInGallery) {
            moreBtn.style.display = 'block';
            moreBtn.textContent = `+ ${customWorkouts.length - maxCustomInGallery} MORE WORKOUTS`;
        } else {
            moreBtn.style.display = 'none';
        }
    }
}

function openAllWorkoutsModal() {
    // Create a modal showing all workouts
    const modal = document.createElement('div');
    modal.id = 'allWorkoutsModal';
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>ALL WORKOUTS</h2>
                <button class="close-btn" onclick="closeAllWorkoutsModal()">×</button>
            </div>
            <div class="modal-body">
                <div class="workout-gallery" style="max-height: 60vh; overflow-y: auto;">
                    <div class="workout-tile push" onclick="startWorkout('push'); closeAllWorkoutsModal();">
                        <div class="tile-icon">💪</div>
                        <div class="tile-name">PUSH</div>
                    </div>
                    <div class="workout-tile pull" onclick="startWorkout('pull'); closeAllWorkoutsModal();">
                        <div class="tile-icon">🏋️</div>
                        <div class="tile-name">PULL</div>
                    </div>
                    <div class="workout-tile legs" onclick="startWorkout('legs'); closeAllWorkoutsModal();">
                        <div class="tile-icon">🦵</div>
                        <div class="tile-name">LEGS</div>
                    </div>
                    ${customWorkouts.map(w => `
                        <div class="workout-tile custom" onclick="startCustomWorkout('${w.id}'); closeAllWorkoutsModal();">
                            <div class="tile-icon">${w.icon || '🏋️'}</div>
                            <div class="tile-name">${w.name}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeAllWorkoutsModal() {
    const modal = document.getElementById('allWorkoutsModal');
    if (modal) modal.remove();
}

function renderCustomWorkoutList() {
    const container = document.getElementById('customWorkoutList');
    if (!container) return;

    if (customWorkouts.length === 0) {
        container.innerHTML = '<div class="empty-hint">No custom workouts yet</div>';
        return;
    }

    // Find last session for each workout
    const workoutHistory = gameState.workoutHistory || [];

    container.innerHTML = customWorkouts.map(workout => {
        // Find last session of this workout
        const lastSession = workoutHistory.find(w => w.workoutId === workout.id || w.name === workout.name);

        // Format last done date
        let lastDoneText = '—';
        if (lastSession && lastSession.date) {
            const date = new Date(lastSession.date);
            const today = new Date();
            const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) lastDoneText = 'Today';
            else if (diffDays === 1) lastDoneText = 'Yesterday';
            else if (diffDays < 7) lastDoneText = `${diffDays}d ago`;
            else lastDoneText = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        // Calculate volume from last session (bodyweight-aware)
        let volumeText = '—';
        if (lastSession && lastSession.exercises) {
            let totalVolume = 0;
            lastSession.exercises.forEach(ex => {
                if (ex.sets) {
                    ex.sets.forEach(set => {
                        if (set.weight !== undefined && set.reps) {
                            totalVolume += calculateVolume(ex.id, set.weight, set.reps);
                        }
                    });
                }
            });
            if (totalVolume > 0) {
                volumeText = totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume.toLocaleString();
            }
        }

        return `
            <div class="workout-table-row" onclick="startCustomWorkout('${workout.id}')">
                <div class="wkt-col-name">
                    <span class="workout-icon-small">${workout.icon}</span>
                    <span class="workout-name-text">${workout.name}</span>
                </div>
                <div class="wkt-col-exercises">${workout.exercises.length}</div>
                <div class="wkt-col-last">${lastDoneText}</div>
                <div class="wkt-col-volume">${volumeText}</div>
                <button class="row-delete-btn" onclick="event.stopPropagation(); deleteCustomWorkout('${workout.id}')">×</button>
            </div>
        `;
    }).join('');
}

function renderCustomExerciseList() {
    const container = document.getElementById('customExerciseList');
    if (!container) return;

    // Combine all exercises and get last performed info
    const workoutHistory = gameState.workoutHistory || [];
    const allExercisesList = [
        ...allExercises.map(ex => ({ ...ex, isCustom: false })),
        ...customExercises.map(ex => ({ ...ex, isCustom: true }))
    ];

    // Get last performed data for each exercise
    const exerciseData = allExercisesList.map(ex => {
        let lastPerformed = null;
        let lastSet = null;

        // Search through workout history for this exercise
        for (const workout of workoutHistory) {
            if (!workout.exercises) continue;
            const exerciseEntry = workout.exercises.find(e => e.id === ex.id);
            if (exerciseEntry && exerciseEntry.sets?.length > 0) {
                if (!lastPerformed || new Date(workout.date) > new Date(lastPerformed)) {
                    lastPerformed = workout.date;
                    lastSet = exerciseEntry.sets[exerciseEntry.sets.length - 1];
                }
            }
        }

        return {
            ...ex,
            lastPerformed,
            lastSet
        };
    });

    // Sort: recently performed first, then alphabetically
    exerciseData.sort((a, b) => {
        if (a.lastPerformed && !b.lastPerformed) return -1;
        if (!a.lastPerformed && b.lastPerformed) return 1;
        if (a.lastPerformed && b.lastPerformed) {
            return new Date(b.lastPerformed) - new Date(a.lastPerformed);
        }
        return a.name.localeCompare(b.name);
    });

    // Render as gallery
    container.innerHTML = `
        <div class="exercise-gallery">
            ${exerciseData.map(ex => {
                const lastDateText = ex.lastPerformed
                    ? formatRelativeDate(ex.lastPerformed)
                    : 'Never';
                const lastSetText = ex.lastSet
                    ? `${ex.lastSet.weight}lbs × ${ex.lastSet.reps}`
                    : '—';
                const equipmentType = getEquipmentType(ex.equipment);

                return `
                    <div class="exercise-card" onclick="openExerciseHistory('${ex.id}')">
                        <div class="exercise-card-header">
                            <span class="exercise-card-name">${ex.name}</span>
                            ${ex.isCustom ? '<span class="custom-badge">★</span>' : ''}
                        </div>
                        <div class="exercise-card-details">
                            <div class="exercise-card-row">
                                <span class="detail-label">Body</span>
                                <span class="detail-value">${capitalizeFirst(ex.muscle || 'other')}</span>
                            </div>
                            <div class="exercise-card-row">
                                <span class="detail-label">Type</span>
                                <span class="detail-value">${equipmentType}</span>
                            </div>
                            <div class="exercise-card-row">
                                <span class="detail-label">Last</span>
                                <span class="detail-value">${lastDateText}</span>
                            </div>
                            <div class="exercise-card-row">
                                <span class="detail-label">Set</span>
                                <span class="detail-value highlight">${lastSetText}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function getEquipmentType(equipment) {
    const types = {
        barbell: 'Free Weight',
        dumbbell: 'Free Weight',
        kettlebell: 'Free Weight',
        cable: 'Cable',
        machine: 'Machine',
        bodyweight: 'Bodyweight',
        band: 'Band',
        other: 'Other'
    };
    return types[equipment] || 'Other';
}

function formatRelativeDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function openExerciseHistory(exerciseId) {
    // Find the exercise
    const exercise = allExercises.find(e => e.id === exerciseId) ||
                     customExercises.find(e => e.id === exerciseId);
    if (!exercise) return;

    // Get history for this exercise
    const workoutHistory = gameState.workoutHistory || [];
    const exerciseHistory = [];

    workoutHistory.forEach(workout => {
        if (!workout.exercises) return;
        const exerciseEntry = workout.exercises.find(e => e.id === exerciseId);
        if (exerciseEntry && exerciseEntry.sets?.length > 0) {
            exerciseHistory.push({
                date: workout.date,
                workoutName: workout.name,
                sets: exerciseEntry.sets
            });
        }
    });

    // Sort by date descending
    exerciseHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'exerciseHistoryModal';
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${exercise.name}</h2>
                <button class="close-btn" onclick="closeExerciseHistoryModal()">×</button>
            </div>
            <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
                ${exerciseHistory.length === 0 ? '<div class="empty-hint">No history for this exercise</div>' :
                    exerciseHistory.map(h => {
                        const date = new Date(h.date);
                        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                        const bestSet = h.sets.reduce((best, s) => (!best || s.weight > best.weight) ? s : best, null);
                        return `
                            <div class="history-entry">
                                <div class="history-entry-header">
                                    <span class="history-date">${dateStr}</span>
                                    <span class="history-workout">${h.workoutName || 'Workout'}</span>
                                </div>
                                <div class="history-sets">
                                    ${h.sets.map((s, i) => `
                                        <span class="history-set ${s === bestSet ? 'best' : ''}">
                                            ${s.weight}×${s.reps}
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')
                }
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeExerciseHistoryModal() {
    const modal = document.getElementById('exerciseHistoryModal');
    if (modal) modal.remove();
}

function toggleLibraryGroup(groupKey) {
    const group = document.getElementById(`libraryGroup_${groupKey}`);
    if (group) {
        group.classList.toggle('collapsed');
    }
}

// ============================================
// COLLAPSIBLE SECTIONS
// ============================================

function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const icon = document.getElementById(`${sectionId}-icon`);
    if (section) {
        section.classList.toggle('collapsed');
        if (icon) {
            icon.textContent = section.classList.contains('collapsed') ? '▶' : '▼';
        }
    }
}

// ============================================
// CUSTOM PROGRAMS
// ============================================

// Default program templates
const DEFAULT_PROGRAMS = {
    '531': {
        id: 'template_531',
        name: '5/3/1 PROGRAM',
        icon: '🏋️',
        workoutsPerPeriod: 4,
        period: 'week',
        description: "Jim Wendler's 5/3/1 strength program. Focus on the 4 main lifts with progressive overload.",
        isTemplate: true,
        workouts: [
            {
                id: '531_squat',
                name: 'DAY 1 - SQUAT',
                icon: '🦵',
                exercises: [
                    { id: 'squat', name: 'Barbell Squat', targetSets: 3 },
                    { id: 'legpress', name: 'Leg Press', targetSets: 5 },
                    { id: 'legcurl', name: 'Leg Curls', targetSets: 5 },
                    { id: 'legext', name: 'Leg Extensions', targetSets: 3 },
                    { id: 'hanging_leg_raise', name: 'Hanging Leg Raise', targetSets: 5 }
                ]
            },
            {
                id: '531_bench',
                name: 'DAY 2 - BENCH',
                icon: '🔥',
                exercises: [
                    { id: 'bench', name: 'Bench Press', targetSets: 3 },
                    { id: 'db_bench', name: 'Dumbbell Bench Press', targetSets: 5 },
                    { id: 'db_row', name: 'Dumbbell Row', targetSets: 5 },
                    { id: 'db_flies', name: 'Dumbbell Flies', targetSets: 3 },
                    { id: 'tricep_pushdown', name: 'Tricep Pushdowns', targetSets: 5 }
                ]
            },
            {
                id: '531_deadlift',
                name: 'DAY 3 - DEADLIFT',
                icon: '💀',
                exercises: [
                    { id: 'deadlift', name: 'Deadlift', targetSets: 3 },
                    { id: 'rdl', name: 'Romanian Deadlift', targetSets: 5 },
                    { id: 'pullups', name: 'Pull-Ups', targetSets: 5 },
                    { id: 'hyperextension', name: 'Hyperextensions', targetSets: 3 },
                    { id: 'hanging_leg_raise', name: 'Hanging Leg Raise', targetSets: 5 }
                ]
            },
            {
                id: '531_ohp',
                name: 'DAY 4 - PRESS',
                icon: '💪',
                exercises: [
                    { id: 'ohp', name: 'Overhead Press', targetSets: 3 },
                    { id: 'incline_bench', name: 'Incline Bench Press', targetSets: 5 },
                    { id: 'lat_pulldown', name: 'Lat Pulldown', targetSets: 5 },
                    { id: 'laterals', name: 'Lateral Raises', targetSets: 5 },
                    { id: 'barbell_curl', name: 'Barbell Curls', targetSets: 5 }
                ]
            }
        ]
    }
};

function initializeDefaultPrograms() {
    // Check if 5/3/1 template already exists
    const has531 = customPrograms.some(p => p.id === 'template_531');

    if (!has531) {
        customPrograms.unshift({ ...DEFAULT_PROGRAMS['531'], createdAt: new Date().toISOString() });
        saveCustomData();
    }
}

function renderCustomProgramList() {
    const container = document.getElementById('customProgramList');
    if (!container) return;

    if (customPrograms.length === 0) {
        container.innerHTML = '<div class="empty-hint">No programs yet. Create one to organize your training!</div>';
        return;
    }

    const workoutHistory = gameState.workoutHistory || [];

    container.innerHTML = customPrograms.map(program => {
        const periodLabel = getPeriodLabel(program.period);

        // Calculate workouts completed this period
        const periodStart = getPeriodStartDate(program.period);
        const workoutsThisPeriod = workoutHistory.filter(w => {
            if (!w.programId || w.programId !== program.id) return false;
            const workoutDate = new Date(w.date);
            return workoutDate >= periodStart;
        }).length;

        // Get next workout in the program
        let nextUpText = '—';
        if (program.workouts && program.workouts.length > 0) {
            // Find last completed workout index
            const lastCompleted = workoutHistory
                .filter(w => w.programId === program.id)
                .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

            if (lastCompleted) {
                const lastIndex = program.workouts.findIndex(w => w.id === lastCompleted.workoutId);
                const nextIndex = (lastIndex + 1) % program.workouts.length;
                const nextWorkout = program.workouts[nextIndex];
                nextUpText = nextWorkout ? nextWorkout.name : program.workouts[0].name;
            } else {
                nextUpText = program.workouts[0].name;
            }
        }

        // Progress bar percentage
        const progressPercent = Math.min((workoutsThisPeriod / program.workoutsPerPeriod) * 100, 100);

        return `
            <div class="program-table-row" onclick="openProgramDetail('${program.id}')">
                <div class="prog-col-name">
                    <span class="program-icon-small">${program.icon}</span>
                    <span class="program-name-text">${program.name}</span>
                </div>
                <div class="prog-col-progress">
                    <div class="progress-mini">
                        <div class="progress-mini-bar" style="width: ${progressPercent}%"></div>
                    </div>
                    <span class="progress-text">${workoutsThisPeriod}/${program.workoutsPerPeriod}</span>
                </div>
                <div class="prog-col-next">${nextUpText}</div>
            </div>
        `;
    }).join('');
}

function getPeriodStartDate(period) {
    const now = new Date();
    const start = new Date(now);

    switch(period) {
        case 'week':
            // Start of current week (Sunday)
            start.setDate(now.getDate() - now.getDay());
            break;
        case '2weeks':
            // Start of current 2-week period
            const weekNum = getISOWeek(now);
            const weeksBack = weekNum % 2;
            start.setDate(now.getDate() - now.getDay() - (weeksBack * 7));
            break;
        case 'month':
            // Start of current month
            start.setDate(1);
            break;
        default:
            start.setDate(now.getDate() - now.getDay());
    }

    start.setHours(0, 0, 0, 0);
    return start;
}

function getPeriodLabel(period) {
    switch(period) {
        case 'week': return 'week';
        case '2weeks': return '2 weeks';
        case 'month': return 'month';
        default: return 'week';
    }
}

function openCreateProgramModal() {
    document.getElementById('newProgramName').value = '';
    document.getElementById('programWorkoutsPerPeriod').value = '4';
    document.getElementById('programPeriod').value = 'week';
    document.getElementById('newProgramDescription').value = '';

    // Reset icon selection
    document.querySelectorAll('#programIconSelector .icon-option').forEach(o => o.classList.remove('selected'));
    document.querySelector('#programIconSelector .icon-option').classList.add('selected');

    document.getElementById('createProgramModal').classList.add('active');
}

function closeCreateProgramModal() {
    document.getElementById('createProgramModal').classList.remove('active');
}

function saveCustomProgram() {
    const name = document.getElementById('newProgramName').value.trim();
    const selectedIcon = document.querySelector('#programIconSelector .icon-option.selected');
    const icon = selectedIcon ? selectedIcon.dataset.icon : '📋';
    const workoutsPerPeriod = parseInt(document.getElementById('programWorkoutsPerPeriod').value) || 4;
    const period = document.getElementById('programPeriod').value;
    const description = document.getElementById('newProgramDescription').value.trim();

    if (!name) {
        showToast('ENTER A NAME');
        return;
    }

    const program = {
        id: 'program_' + Date.now(),
        name: name.toUpperCase(),
        icon: icon,
        workoutsPerPeriod: workoutsPerPeriod,
        period: period,
        description: description,
        workouts: [],
        createdAt: new Date().toISOString()
    };

    customPrograms.push(program);
    saveCustomData();
    closeCreateProgramModal();
    renderCustomLists();
    showToast('PROGRAM CREATED!');

    // Open the new program for editing
    openProgramDetail(program.id);
}

function openProgramDetail(programId) {
    const program = customPrograms.find(p => p.id === programId);
    if (!program) return;

    currentProgram = program;

    // Update modal content
    document.getElementById('programDetailIcon').textContent = program.icon;
    document.getElementById('programDetailName').textContent = program.name;
    document.getElementById('programDetailSchedule').textContent =
        `${program.workoutsPerPeriod} workouts / ${getPeriodLabel(program.period)}`;
    document.getElementById('programDetailDesc').textContent = program.description || '';
    document.getElementById('programWorkoutCount').textContent = program.workouts ? program.workouts.length : 0;
    document.getElementById('programWorkoutTarget').textContent = program.workoutsPerPeriod;

    // Render workout list
    renderProgramWorkouts();

    document.getElementById('programDetailModal').classList.add('active');
}

function renderProgramWorkouts() {
    const container = document.getElementById('programWorkoutsList');
    if (!container || !currentProgram) return;

    if (!currentProgram.workouts || currentProgram.workouts.length === 0) {
        container.innerHTML = '<div class="empty-hint">No workouts added yet. Click + to add workouts.</div>';
        return;
    }

    container.innerHTML = currentProgram.workouts.map((workout, index) => `
        <div class="prog-wkt-table-row" onclick="showWorkoutOptions('${currentProgram.id}', ${index})">
            <div class="prog-wkt-col-order">${index + 1}</div>
            <div class="prog-wkt-col-name">
                <span class="workout-icon-small">${workout.icon || '💪'}</span>
                <span class="workout-name-text">${workout.name}</span>
            </div>
            <div class="prog-wkt-col-exercises">${workout.exercises.length}</div>
            <div class="prog-wkt-col-actions">
                <button class="action-btn play" onclick="event.stopPropagation(); launchProgramWorkout('${currentProgram.id}', ${index})" title="Start Workout">▶</button>
                <button class="action-btn delete" onclick="event.stopPropagation(); removeWorkoutFromProgram(${index})">×</button>
            </div>
        </div>
    `).join('');
}

function showWorkoutOptions(programId, workoutIndex) {
    const program = customPrograms.find(p => p.id === programId);
    if (!program || !program.workouts[workoutIndex]) return;

    const workout = program.workouts[workoutIndex];

    // Show a simple action dialog
    if (confirm(`Start "${workout.name}"?`)) {
        launchProgramWorkout(programId, workoutIndex);
    }
}

function launchProgramWorkout(programId, workoutIndex) {
    const program = customPrograms.find(p => p.id === programId);
    if (!program || !program.workouts[workoutIndex]) return;

    const workout = program.workouts[workoutIndex];

    // Close the program modal
    closeProgramDetailModal();

    // Set up the workout
    currentWorkout = {
        id: workout.id,
        name: workout.name,
        icon: workout.icon || '💪',
        type: 'program',
        programId: programId,
        exercises: [...workout.exercises]
    };

    exerciseSets = {};
    workoutStartTime = new Date();
    supersets = []; // Reset supersets for new workout
    supersetMode = false;
    supersetSelections = [];

    currentWorkout.exercises.forEach(ex => {
        exerciseSets[ex.id] = [];
    });

    document.getElementById('workoutTitle').textContent = currentWorkout.name;
    renderExercises();
    updateWorkoutXP();
    showScreen('workoutScreen');
}

function closeProgramDetailModal() {
    document.getElementById('programDetailModal').classList.remove('active');
    currentProgram = null;
}

function deleteCurrentProgram() {
    if (!currentProgram) return;

    if (confirm(`Delete "${currentProgram.name}"?`)) {
        customPrograms = customPrograms.filter(p => p.id !== currentProgram.id);
        saveCustomData();
        closeProgramDetailModal();
        renderCustomLists();
        showToast('PROGRAM DELETED');
    }
}

function addWorkoutToProgram() {
    if (!currentProgram) return;

    selectedProgramExercises = [];
    document.getElementById('programWorkoutName').value = '';

    // Render available workouts list
    renderAvailableWorkouts();

    // Render exercise selector for new workout
    renderProgramExerciseSelector();

    // Switch to existing tab
    switchWorkoutSource('existing');

    document.getElementById('addWorkoutToProgramModal').classList.add('active');
}

function renderAvailableWorkouts() {
    const container = document.getElementById('availableWorkoutsList');
    if (!container) return;

    // Combine built-in and custom workouts
    const allWorkouts = [
        { id: 'push', ...workouts.push, icon: '🔥' },
        { id: 'pull', ...workouts.pull, icon: '💪' },
        { id: 'legs', ...workouts.legs, icon: '🦵' },
        ...customWorkouts
    ];

    if (allWorkouts.length === 0) {
        container.innerHTML = '<div class="empty-hint">No workouts available</div>';
        return;
    }

    container.innerHTML = allWorkouts.map(workout => `
        <div class="available-workout-item" onclick="selectWorkoutForProgram('${workout.id}')">
            <div class="workout-icon">${workout.icon || '💪'}</div>
            <div class="workout-info">
                <div class="workout-name">${workout.name}</div>
                <div class="workout-exercises">${workout.exercises.length} exercises</div>
            </div>
        </div>
    `).join('');
}

function selectWorkoutForProgram(workoutId) {
    // Find the workout
    let workout = customWorkouts.find(w => w.id === workoutId);
    if (!workout && workouts[workoutId]) {
        workout = { id: workoutId, ...workouts[workoutId], icon: workoutId === 'push' ? '🔥' : (workoutId === 'pull' ? '💪' : '🦵') };
    }

    if (!workout || !currentProgram) return;

    // Add copy of workout to program
    currentProgram.workouts.push({
        id: workout.id + '_' + Date.now(),
        name: workout.name,
        icon: workout.icon || '💪',
        exercises: [...workout.exercises]
    });

    saveCustomData();
    closeAddWorkoutToProgramModal();

    // Update counts
    document.getElementById('programWorkoutCount').textContent = currentProgram.workouts.length;
    renderProgramWorkouts();
    showToast('WORKOUT ADDED!');
}

function renderProgramExerciseSelector() {
    const container = document.getElementById('programExerciseSelector');
    if (!container) return;

    // Group exercises by muscle
    const groups = {};
    allExercises.forEach(ex => {
        if (!groups[ex.muscle]) {
            groups[ex.muscle] = [];
        }
        groups[ex.muscle].push(ex);
    });

    // Add custom exercises
    if (customExercises.length > 0) {
        groups.custom = customExercises;
    }

    const muscleNames = {
        chest: 'CHEST', back: 'BACK', shoulders: 'SHOULDERS',
        biceps: 'BICEPS', triceps: 'TRICEPS', quads: 'QUADS',
        hamstrings: 'HAMSTRINGS', glutes: 'GLUTES', calves: 'CALVES',
        core: 'CORE', custom: 'MY EXERCISES'
    };

    let html = '';
    Object.entries(groups).forEach(([muscle, exercises]) => {
        html += `
            <div class="exercise-group">
                <div class="exercise-group-header" onclick="toggleProgramExerciseGroup('${muscle}')">
                    <span>${muscleNames[muscle] || muscle.toUpperCase()}</span>
                    <span class="group-count">${exercises.length}</span>
                </div>
                <div class="exercise-group-items collapsed" id="programGroup_${muscle}">
                    ${exercises.map(ex => `
                        <div class="exercise-option ${selectedProgramExercises.some(e => e.id === ex.id) ? 'selected' : ''}"
                             onclick="toggleProgramExercise('${ex.id}', '${ex.name.replace(/'/g, "\\'")}')">
                            ${getEquipmentIcon(ex.equipment)} ${ex.name}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    updateProgramSelectedList();
}

function toggleProgramExerciseGroup(muscle) {
    const group = document.getElementById(`programGroup_${muscle}`);
    if (group) {
        group.classList.toggle('collapsed');
    }
}

function toggleProgramExercise(id, name) {
    const index = selectedProgramExercises.findIndex(e => e.id === id);
    if (index >= 0) {
        selectedProgramExercises.splice(index, 1);
    } else {
        selectedProgramExercises.push({ id, name, targetSets: 3 });
    }
    renderProgramExerciseSelector();
}

function updateProgramSelectedList() {
    const container = document.getElementById('programSelectedExercisesList');
    const countEl = document.getElementById('programSelectedCount');
    if (!container) return;

    if (countEl) {
        countEl.textContent = selectedProgramExercises.length;
    }

    if (selectedProgramExercises.length === 0) {
        container.innerHTML = '<div class="empty-hint">No exercises selected</div>';
        return;
    }

    container.innerHTML = selectedProgramExercises.map((ex, i) => `
        <div class="selected-exercise-item">
            <span class="exercise-order">${i + 1}</span>
            <span class="exercise-name">${ex.name}</span>
            <input type="number" class="sets-input" value="${ex.targetSets}" min="1" max="10"
                   onchange="updateProgramExerciseSets(${i}, this.value)">
            <span class="sets-label">sets</span>
            <button class="remove-btn" onclick="removeProgramExercise(${i})">×</button>
        </div>
    `).join('');
}

function updateProgramExerciseSets(index, sets) {
    if (selectedProgramExercises[index]) {
        selectedProgramExercises[index].targetSets = parseInt(sets) || 3;
    }
}

function removeProgramExercise(index) {
    selectedProgramExercises.splice(index, 1);
    renderProgramExerciseSelector();
}

function switchWorkoutSource(source) {
    // Update tabs
    document.querySelectorAll('.source-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`.source-tab[onclick*="${source}"]`).classList.add('active');

    // Show/hide content
    document.getElementById('existingWorkoutSource').classList.toggle('hidden', source !== 'existing');
    document.getElementById('newWorkoutSource').classList.toggle('hidden', source !== 'new');
}

function closeAddWorkoutToProgramModal() {
    document.getElementById('addWorkoutToProgramModal').classList.remove('active');
    selectedProgramExercises = [];
}

function confirmAddWorkoutToProgram() {
    const existingVisible = !document.getElementById('existingWorkoutSource').classList.contains('hidden');

    if (existingVisible) {
        // User should have clicked on a workout in the list
        showToast('SELECT A WORKOUT');
        return;
    }

    // Creating new workout
    const name = document.getElementById('programWorkoutName').value.trim();

    if (!name) {
        showToast('ENTER A NAME');
        return;
    }

    if (selectedProgramExercises.length === 0) {
        showToast('ADD EXERCISES');
        return;
    }

    if (!currentProgram) return;

    // Add new workout to program
    currentProgram.workouts.push({
        id: 'workout_' + Date.now(),
        name: name.toUpperCase(),
        icon: '💪',
        exercises: [...selectedProgramExercises]
    });

    saveCustomData();
    closeAddWorkoutToProgramModal();

    // Update counts
    document.getElementById('programWorkoutCount').textContent = currentProgram.workouts.length;
    renderProgramWorkouts();
    showToast('WORKOUT ADDED!');
}

function removeWorkoutFromProgram(index) {
    if (!currentProgram) return;

    currentProgram.workouts.splice(index, 1);
    saveCustomData();

    document.getElementById('programWorkoutCount').textContent = currentProgram.workouts.length;
    renderProgramWorkouts();
    showToast('WORKOUT REMOVED');
}

function startProgramWorkout(programId, workoutIndex) {
    const program = customPrograms.find(p => p.id === programId);
    if (!program || !program.workouts[workoutIndex]) return;

    const workout = program.workouts[workoutIndex];

    currentWorkout = { ...workout };
    exerciseSets = {};
    workoutStartTime = new Date();

    currentWorkout.exercises.forEach(ex => {
        exerciseSets[ex.id] = [];
    });

    document.getElementById('workoutTitle').textContent = currentWorkout.name;
    renderExercises();
    updateWorkoutXP();
    showScreen('workoutScreen');
}

// ============================================
// TEAMS FUNCTIONALITY
// ============================================

async function loadTeams() {
    if (!isOnlineMode) return;

    const container = document.getElementById('teamsList');
    container.innerHTML = '<div class="loading">Loading teams...</div>';

    try {
        const response = await API.getTeams();
        const teams = response.teams || [];

        if (teams.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <p>No teams yet. Create or join one!</p>
                </div>
            `;
        } else {
            container.innerHTML = teams.map(team => `
                <div class="team-card" onclick="openTeam('${team.id}')">
                    <div class="team-avatar">${team.avatar || '⚔️'}</div>
                    <div class="team-info">
                        <div class="team-name">${escapeHtml(team.name)}</div>
                        <div class="team-members">${team.member_count || 0} members</div>
                    </div>
                    <div class="team-arrow">›</div>
                </div>
            `).join('');
        }
    } catch (error) {
        container.innerHTML = `<div class="error">Failed to load teams</div>`;
        console.error('Error loading teams:', error);
    }
}

async function openTeam(teamId) {
    if (!teamId) {
        showToast('INVALID TEAM');
        return;
    }

    try {
        const response = await API.getTeam(teamId);

        if (!response || !response.team) {
            showToast('TEAM NOT FOUND');
            return;
        }

        currentTeam = response.team;

        // Join the team's socket room (optional - don't fail if socket not connected)
        try {
            API.joinTeamRoom(teamId);
        } catch (e) {
            console.warn('Could not join team room:', e);
        }

        // Update team header
        document.getElementById('teamDetailName').textContent = currentTeam.name || 'Team';
        document.getElementById('teamDetailAvatar').textContent = currentTeam.avatar || '⚔️';
        document.getElementById('teamInviteCode').textContent = currentTeam.invite_code || 'N/A';

        // Load initial data
        switchTeamTab('leaderboard');

        showScreen('teamScreen');
    } catch (error) {
        showToast('FAILED TO LOAD TEAM');
        console.error('Error opening team:', error);
    }
}

function closeTeamDetail() {
    if (currentTeam) {
        API.leaveTeamRoom(currentTeam.id);
    }
    currentTeam = null;
    showScreen('menuScreen');
    switchMenuTab('teams');
}

function switchTeamTab(tab) {
    document.querySelectorAll('.team-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.team-tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `team-${tab}`);
    });

    // Load tab content
    if (tab === 'leaderboard') {
        loadLeaderboard();
    } else if (tab === 'activity') {
        loadTeamActivity();
    } else if (tab === 'challenges') {
        loadChallenges();
    } else if (tab === 'chat') {
        loadTeamChat();
    }
}

async function loadLeaderboard() {
    if (!currentTeam) return;

    const container = document.getElementById('teamLeaderboard');
    container.innerHTML = '<div class="loading">Loading...</div>';

    try {
        const response = await API.getLeaderboard(currentTeam.id, 'xp');
        const leaderboard = response.leaderboard || [];

        if (leaderboard.length === 0) {
            container.innerHTML = '<div class="empty-hint">No rankings yet</div>';
        } else {
            container.innerHTML = leaderboard.map((entry, i) => `
                <div class="leaderboard-item ${entry.id === currentUser?.id ? 'current-user' : ''}">
                    <span class="rank">${i + 1}</span>
                    <span class="name">${escapeHtml(entry.username)}</span>
                    <span class="score">${formatNumber(entry.xp || 0)} XP</span>
                </div>
            `).join('');
        }
    } catch (error) {
        container.innerHTML = '<div class="error">Failed to load</div>';
    }
}

async function loadTeamActivity() {
    if (!currentTeam) return;

    const container = document.getElementById('teamActivityFeed');
    container.innerHTML = '<div class="loading">Loading...</div>';

    try {
        const response = await API.getTeamActivity(currentTeam.id);
        const activities = response.activities || [];

        if (activities.length === 0) {
            container.innerHTML = '<div class="empty-hint">No activity yet</div>';
        } else {
            container.innerHTML = activities.map(activity => {
                const timeAgo = getTimeAgo(new Date(activity.created_at));
                return `
                    <div class="activity-item">
                        <div class="activity-icon">${getActivityIcon(activity.type)}</div>
                        <div class="activity-content">
                            <strong>${escapeHtml(activity.username)}</strong> ${escapeHtml(activity.description)}
                        </div>
                        <div class="activity-time">${timeAgo}</div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        container.innerHTML = '<div class="error">Failed to load</div>';
    }
}

async function loadChallenges() {
    if (!currentTeam) return;

    const container = document.getElementById('teamChallengesList');
    container.innerHTML = '<div class="loading">Loading...</div>';

    try {
        const response = await API.getTeam(currentTeam.id);
        const challenges = response.team.challenges || [];

        if (challenges.length === 0) {
            container.innerHTML = '<div class="empty-hint">No active challenges</div>';
        } else {
            container.innerHTML = challenges.map(challenge => {
                const endDate = new Date(challenge.end_date);
                const isActive = endDate > new Date();
                return `
                    <div class="challenge-card ${isActive ? 'active' : 'ended'}">
                        <div class="challenge-header">
                            <span class="challenge-name">${escapeHtml(challenge.name)}</span>
                            <span class="challenge-status">${isActive ? 'ACTIVE' : 'ENDED'}</span>
                        </div>
                        <div class="challenge-desc">${escapeHtml(challenge.description || '')}</div>
                        <div class="challenge-goal">Goal: ${formatNumber(challenge.target_value)} ${challenge.type}</div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        container.innerHTML = '<div class="error">Failed to load</div>';
    }
}

async function loadTeamChat() {
    if (!currentTeam) return;

    const container = document.getElementById('chatMessages');
    container.innerHTML = '<div class="loading">Loading...</div>';

    try {
        const response = await API.getTeamMessages(currentTeam.id);
        const messages = response.messages || [];

        if (messages.length === 0) {
            container.innerHTML = '<div class="empty-hint">No messages yet. Say hello!</div>';
        } else {
            container.innerHTML = messages.reverse().map(msg => {
                const isOwn = msg.user_id === currentUser?.id;
                return `
                    <div class="chat-message ${isOwn ? 'own' : ''}">
                        <div class="chat-avatar">${msg.username ? msg.username[0].toUpperCase() : '?'}</div>
                        <div class="chat-bubble">
                            <div class="chat-username">${escapeHtml(msg.username)}</div>
                            <div class="chat-text">${escapeHtml(msg.message)}</div>
                        </div>
                    </div>
                `;
            }).join('');
            container.scrollTop = container.scrollHeight;
        }
    } catch (error) {
        container.innerHTML = '<div class="error">Failed to load messages</div>';
    }
}

async function sendChatMessage() {
    if (!currentTeam) return;

    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (!message) return;

    input.value = '';

    try {
        // Send via HTTP for persistence
        await API.sendMessage(currentTeam.id, message);

        // Also emit via socket for real-time delivery
        API.sendTeamMessage(currentTeam.id, message);

        // Optimistically add to chat
        const chatMessages = document.getElementById('chatMessages');
        const messageEl = document.createElement('div');
        messageEl.className = 'chat-message own';
        messageEl.innerHTML = `
            <div class="chat-avatar">${currentUser?.username?.[0]?.toUpperCase() || '?'}</div>
            <div class="chat-bubble">
                <div class="chat-username">${escapeHtml(currentUser?.username || 'You')}</div>
                <div class="chat-text">${escapeHtml(message)}</div>
            </div>
        `;
        chatMessages.appendChild(messageEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (error) {
        showToast('FAILED TO SEND');
    }
}

function openCreateTeamModal() {
    document.getElementById('newTeamName').value = '';
    document.getElementById('newTeamDescription').value = '';
    document.querySelectorAll('#teamAvatarSelector .avatar-option').forEach((o, i) => {
        o.classList.toggle('selected', i === 0);
    });
    document.getElementById('createTeamModal').classList.add('active');
}

function closeCreateTeamModal() {
    document.getElementById('createTeamModal').classList.remove('active');
}

async function createTeam() {
    const name = document.getElementById('newTeamName').value.trim();
    const description = document.getElementById('newTeamDescription').value.trim();
    const selectedAvatar = document.querySelector('#teamAvatarSelector .avatar-option.selected');
    const avatar = selectedAvatar ? selectedAvatar.dataset.avatar : '⚔️';

    if (!name) {
        showToast('ENTER A NAME');
        return;
    }

    try {
        const response = await API.createTeam(name, description, avatar);
        closeCreateTeamModal();
        loadTeams();

        // Show success modal with invite code
        if (response.team && response.team.invite_code) {
            showTeamCreatedModal(response.team);
        } else {
            showToast('TEAM CREATED!');
            if (response.team) {
                openTeam(response.team.id);
            }
        }
    } catch (error) {
        showToast(error.message || 'FAILED TO CREATE');
    }
}

function showTeamCreatedModal(team) {
    const modal = document.createElement('div');
    modal.id = 'teamCreatedModal';
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="text-align: center;">
            <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
            <h2>TEAM CREATED!</h2>
            <p style="color: var(--text-secondary); margin: 16px 0;">
                Share this code with others to invite them to join:
            </p>
            <div class="invite-code-display" style="
                background: var(--bg-tertiary);
                border: 2px dashed var(--accent-primary);
                border-radius: var(--radius-md);
                padding: 16px;
                margin: 16px 0;
            ">
                <div style="font-size: 28px; font-weight: 700; letter-spacing: 4px; color: var(--accent-primary);">
                    ${team.invite_code}
                </div>
            </div>
            <button class="dc-button secondary" style="margin-right: 8px;" onclick="copyInviteCode('${team.invite_code}')">
                📋 COPY CODE
            </button>
            <button class="dc-button" onclick="closeTeamCreatedModal(); openTeam('${team.id}');">
                VIEW TEAM
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeTeamCreatedModal() {
    const modal = document.getElementById('teamCreatedModal');
    if (modal) modal.remove();
}

function copyInviteCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        showToast('CODE COPIED!');
    }).catch(() => {
        showToast('FAILED TO COPY');
    });
}

function openJoinTeamModal() {
    document.getElementById('joinTeamCode').value = '';
    document.getElementById('joinTeamModal').classList.add('active');
}

function closeJoinTeamModal() {
    document.getElementById('joinTeamModal').classList.remove('active');
}

async function joinTeam() {
    const code = document.getElementById('joinTeamCode').value.trim().toUpperCase();

    if (!code) {
        showToast('ENTER A CODE');
        return;
    }

    try {
        const response = await API.joinTeam(code);
        closeJoinTeamModal();
        showToast('JOINED TEAM!');
        loadTeams();

        // Automatically open the joined team
        if (response.team) {
            openTeam(response.team.id);
        }
    } catch (error) {
        showToast(error.message || 'INVALID CODE');
    }
}

async function leaveCurrentTeam() {
    if (!currentTeam) return;

    if (!confirm('Leave this team?')) return;

    try {
        await API.leaveTeam(currentTeam.id);
        showToast('LEFT TEAM');
        closeTeamDetail();
    } catch (error) {
        showToast('FAILED TO LEAVE');
    }
}

function openCreateChallengeModal() {
    document.getElementById('challengeName').value = '';
    document.getElementById('challengeDescription').value = '';
    document.getElementById('challengeType').value = 'volume';
    document.getElementById('challengeTarget').value = '';
    document.getElementById('challengeDuration').value = '7';
    document.getElementById('createChallengeModal').classList.add('active');
}

function closeCreateChallengeModal() {
    document.getElementById('createChallengeModal').classList.remove('active');
}

async function createChallenge() {
    if (!currentTeam) return;

    const name = document.getElementById('challengeName').value.trim();
    const description = document.getElementById('challengeDescription').value.trim();
    const type = document.getElementById('challengeType').value;
    const targetValue = parseInt(document.getElementById('challengeTarget').value) || 0;
    const durationDays = parseInt(document.getElementById('challengeDuration').value) || 7;

    if (!name || targetValue <= 0) {
        showToast('FILL ALL FIELDS');
        return;
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);

    try {
        await API.createChallenge(currentTeam.id, {
            name,
            description,
            type,
            targetValue,
            endDate: endDate.toISOString()
        });
        closeCreateChallengeModal();
        showToast('CHALLENGE CREATED!');
        loadChallenges();
    } catch (error) {
        showToast(error.message || 'FAILED TO CREATE');
    }
}

function copyTeamInviteCode() {
    const code = document.getElementById('teamInviteCode').textContent;
    navigator.clipboard.writeText(code).then(() => {
        showToast('CODE COPIED!');
    }).catch(() => {
        showToast('COPY FAILED');
    });
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================
// CAMPAIGNS
// ============================================

let teamsData = []; // Teams the user belongs to
let campaignsData = { personal: [], team: [] };
let campaignWizardState = {
    type: 'personal',
    teamId: null,
    title: '',
    description: '',
    targetDate: '',
    goals: []
};
let currentCampaignId = null;

async function loadCampaigns() {
    if (!isOnlineMode) {
        // Show offline message
        campaignsData = { personal: [], team: [] };
        renderCampaigns();
        return;
    }

    try {
        campaignsData = await API.getCampaigns();
        renderCampaigns();
    } catch (error) {
        console.error('Failed to load campaigns:', error);
        campaignsData = { personal: [], team: [] };
        renderCampaigns();
    }
}

function renderCampaigns() {
    const activeList = document.getElementById('activeCampaignsList');
    const completedList = document.getElementById('completedCampaignsList');

    const allCampaigns = [...(campaignsData.personal || []), ...(campaignsData.team || [])];
    const activeCampaigns = allCampaigns.filter(c => !c.isCompleted);
    const completedCampaigns = allCampaigns.filter(c => c.isCompleted);

    // Render active campaigns
    if (activeCampaigns.length === 0) {
        activeList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎯</div>
                <p>No active campaigns. Create one to track your goals!</p>
            </div>
        `;
    } else {
        activeList.innerHTML = activeCampaigns.map(campaign => renderCampaignCard(campaign)).join('');
    }

    // Render completed campaigns
    if (completedCampaigns.length === 0) {
        completedList.innerHTML = '<p class="text-muted text-center">No completed campaigns yet</p>';
    } else {
        completedList.innerHTML = completedCampaigns.map(campaign => renderCampaignCard(campaign)).join('');
    }
}

function renderCampaignCard(campaign) {
    const goals = campaign.goals || [];
    const completedGoals = goals.filter(g => g.isAchieved).length;
    const totalGoals = goals.length;
    const progressPercent = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

    const targetDate = new Date(campaign.targetDate);
    const today = new Date();
    const daysLeft = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));

    return `
        <div class="campaign-card" onclick="openCampaignDetail('${campaign.id}')">
            <div class="campaign-card-header">
                <div class="campaign-card-title">${campaign.title}</div>
                <span class="campaign-card-type ${campaign.campaignType}">${campaign.campaignType}</span>
            </div>
            <div class="campaign-card-deadline">
                ${campaign.isCompleted ? 'Completed!' : (daysLeft > 0 ? `${daysLeft} days left` : 'Overdue')}
            </div>
            <div class="campaign-card-progress">
                <div class="campaign-progress-bar">
                    <div class="campaign-progress-fill" style="width: ${progressPercent}%"></div>
                </div>
            </div>
            <div class="campaign-card-stats">
                <div class="campaign-stat">
                    <span class="campaign-stat-value">${completedGoals}/${totalGoals}</span>
                    <span>goals</span>
                </div>
                <div class="campaign-stat">
                    <span class="campaign-stat-value">${progressPercent}%</span>
                    <span>complete</span>
                </div>
            </div>
        </div>
    `;
}

function toggleCampaignsSection(section) {
    const icon = document.getElementById(`${section}CampaignsIcon`);
    const list = document.getElementById(`${section}CampaignsList`);

    if (list.classList.contains('hidden')) {
        list.classList.remove('hidden');
        icon.textContent = '▼';
    } else {
        list.classList.add('hidden');
        icon.textContent = '▶';
    }
}

// Campaign Creator Wizard
function openCreateCampaignModal() {
    try {
        // Reset wizard state
        campaignWizardState = {
            type: 'personal',
            teamId: null,
            title: '',
            description: '',
            targetDate: '',
            goals: []
        };

        // Reset UI
        document.getElementById('campaignTitle').value = '';
        document.getElementById('campaignDescription').value = '';
        document.getElementById('campaignTargetDate').value = '';
        document.getElementById('campaignGoalsList').innerHTML = '<div class="empty-goals-hint"><p>No goals added yet</p></div>';
        document.getElementById('addGoalForm').classList.add('hidden');
        document.getElementById('toStep3Btn').disabled = true;

        // Reset wizard steps
        document.querySelectorAll('.wizard-step').forEach((step, i) => {
            step.classList.toggle('active', i === 0);
            step.classList.remove('completed');
        });
        document.querySelectorAll('.wizard-panel').forEach((panel, i) => {
            panel.classList.toggle('active', i === 0);
        });

        // Reset type selection
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === 'personal');
        });
        document.getElementById('campaignTeamSelect').classList.add('hidden');

        // Populate team dropdown if user has teams
        populateTeamDropdown();

        // Populate exercise dropdown
        populateGoalExerciseDropdown();

        // Set default target date to 30 days from now
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 30);
        document.getElementById('campaignTargetDate').value = defaultDate.toISOString().split('T')[0];

        document.getElementById('createCampaignModal').classList.add('active');
    } catch (error) {
        console.error('Error opening campaign modal:', error);
        alert('Error: ' + error.message);
    }
}

function closeCreateCampaignModal() {
    document.getElementById('createCampaignModal').classList.remove('active');
}

function selectCampaignType(type) {
    campaignWizardState.type = type;
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });

    const teamSelect = document.getElementById('campaignTeamSelect');
    if (type === 'team') {
        teamSelect.classList.remove('hidden');
    } else {
        teamSelect.classList.add('hidden');
        campaignWizardState.teamId = null;
    }
}

function populateTeamDropdown() {
    const select = document.getElementById('campaignTeamId');
    select.innerHTML = '<option value="">Select a team...</option>';

    if (teamsData && teamsData.length > 0) {
        teamsData.forEach(team => {
            select.innerHTML += `<option value="${team.id}">${team.name}</option>`;
        });
    }
}

function getAllExercises() {
    // Combine built-in exercises with custom exercises
    return [...allExercises, ...customExercises.map(ex => ({ ...ex, isCustom: true }))];
}

function populateGoalExerciseDropdown() {
    const select = document.getElementById('goalExerciseSelect');
    select.innerHTML = '<option value="">Select exercise...</option>';

    // Get all exercises
    const exercises = getAllExercises();
    exercises.forEach(ex => {
        select.innerHTML += `<option value="${ex.id}" data-name="${ex.name}">${ex.name}</option>`;
    });
}

function nextCampaignStep(step) {
    if (step === 2) {
        // Validate step 1
        const title = document.getElementById('campaignTitle').value.trim();
        const targetDate = document.getElementById('campaignTargetDate').value;

        if (!title) {
            showToast('ENTER A TITLE');
            return;
        }
        if (!targetDate) {
            showToast('SELECT A DATE');
            return;
        }

        if (campaignWizardState.type === 'team') {
            const teamId = document.getElementById('campaignTeamId').value;
            if (!teamId) {
                showToast('SELECT A TEAM');
                return;
            }
            campaignWizardState.teamId = teamId;
        }

        campaignWizardState.title = title;
        campaignWizardState.description = document.getElementById('campaignDescription').value.trim();
        campaignWizardState.targetDate = targetDate;
    }

    if (step === 3) {
        // Validate step 2
        if (campaignWizardState.goals.length === 0) {
            showToast('ADD AT LEAST ONE GOAL');
            return;
        }

        // Populate review
        populateCampaignReview();
    }

    // Update wizard steps
    document.querySelectorAll('.wizard-step').forEach((stepEl, i) => {
        if (i < step - 1) {
            stepEl.classList.add('completed');
            stepEl.classList.remove('active');
        } else if (i === step - 1) {
            stepEl.classList.add('active');
            stepEl.classList.remove('completed');
        } else {
            stepEl.classList.remove('active', 'completed');
        }
    });

    // Show correct panel
    document.querySelectorAll('.wizard-panel').forEach((panel, i) => {
        panel.classList.toggle('active', i === step - 1);
    });
}

function prevCampaignStep(step) {
    document.querySelectorAll('.wizard-step').forEach((stepEl, i) => {
        if (i < step - 1) {
            stepEl.classList.add('completed');
            stepEl.classList.remove('active');
        } else if (i === step - 1) {
            stepEl.classList.add('active');
            stepEl.classList.remove('completed');
        } else {
            stepEl.classList.remove('active', 'completed');
        }
    });

    document.querySelectorAll('.wizard-panel').forEach((panel, i) => {
        panel.classList.toggle('active', i === step - 1);
    });
}

function toggleAddGoalForm() {
    const form = document.getElementById('addGoalForm');
    form.classList.toggle('hidden');
}

function updateGoalTypeOptions() {
    // Reset target inputs when exercise changes
    updateGoalTargetInput();
}

function updateGoalTargetInput() {
    const goalType = document.getElementById('goalTypeSelect').value;

    document.getElementById('targetWeightGroup').classList.toggle('hidden', goalType === 'tonnage');
    document.getElementById('targetRepsGroup').classList.toggle('hidden', goalType !== 'reps');
    document.getElementById('targetTonnageGroup').classList.toggle('hidden', goalType !== 'tonnage');
}

function addCampaignGoal() {
    const exerciseSelect = document.getElementById('goalExerciseSelect');
    const exerciseId = exerciseSelect.value;
    const exerciseName = exerciseSelect.options[exerciseSelect.selectedIndex]?.dataset?.name || exerciseSelect.options[exerciseSelect.selectedIndex]?.text;
    const goalType = document.getElementById('goalTypeSelect').value;
    const targetWeight = parseInt(document.getElementById('goalTargetWeight').value) || 0;
    const targetReps = parseInt(document.getElementById('goalTargetReps').value) || 0;
    const targetTonnage = parseInt(document.getElementById('goalTargetTonnage').value) || 0;

    if (!exerciseId) {
        showToast('SELECT AN EXERCISE');
        return;
    }

    // Validate based on goal type
    if (goalType === '1rm' && targetWeight <= 0) {
        showToast('ENTER TARGET WEIGHT');
        return;
    }
    if (goalType === 'reps' && (targetWeight <= 0 || targetReps <= 0)) {
        showToast('ENTER WEIGHT AND REPS');
        return;
    }
    if (goalType === 'tonnage' && targetTonnage <= 0) {
        showToast('ENTER TARGET TONNAGE');
        return;
    }

    // Add goal to wizard state
    const goal = {
        exerciseId,
        exerciseName,
        goalType,
        targetWeight: goalType !== 'tonnage' ? targetWeight : null,
        targetReps: goalType === 'reps' ? targetReps : null,
        targetTonnage: goalType === 'tonnage' ? targetTonnage : null
    };

    campaignWizardState.goals.push(goal);

    // Render goals list
    renderWizardGoalsList();

    // Reset form
    document.getElementById('goalExerciseSelect').value = '';
    document.getElementById('goalTargetWeight').value = '';
    document.getElementById('goalTargetReps').value = '';
    document.getElementById('goalTargetTonnage').value = '';
    document.getElementById('addGoalForm').classList.add('hidden');

    // Enable next button
    document.getElementById('toStep3Btn').disabled = false;
}

function renderWizardGoalsList() {
    const list = document.getElementById('campaignGoalsList');

    if (campaignWizardState.goals.length === 0) {
        list.innerHTML = '<div class="empty-goals-hint"><p>No goals added yet</p></div>';
        document.getElementById('toStep3Btn').disabled = true;
        return;
    }

    list.innerHTML = campaignWizardState.goals.map((goal, index) => {
        let targetText = '';
        if (goal.goalType === '1rm') {
            targetText = `1RM: ${goal.targetWeight} lbs`;
        } else if (goal.goalType === 'reps') {
            targetText = `${goal.targetWeight} lbs × ${goal.targetReps} reps`;
        } else if (goal.goalType === 'tonnage') {
            targetText = `${goal.targetTonnage.toLocaleString()} lbs total`;
        }

        return `
            <div class="goal-item">
                <div class="goal-item-info">
                    <div class="goal-item-exercise">${goal.exerciseName}</div>
                    <div class="goal-item-target">${targetText}</div>
                </div>
                <button class="goal-item-remove" onclick="removeCampaignGoal(${index})">×</button>
            </div>
        `;
    }).join('');
}

function removeCampaignGoal(index) {
    campaignWizardState.goals.splice(index, 1);
    renderWizardGoalsList();
}

function populateCampaignReview() {
    document.getElementById('reviewTitle').textContent = campaignWizardState.title;
    document.getElementById('reviewType').textContent = campaignWizardState.type === 'personal' ? 'Personal' : 'Team';

    const targetDate = new Date(campaignWizardState.targetDate);
    document.getElementById('reviewDate').textContent = targetDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const goalsHtml = campaignWizardState.goals.map(goal => {
        let targetText = '';
        if (goal.goalType === '1rm') {
            targetText = `1RM: ${goal.targetWeight} lbs`;
        } else if (goal.goalType === 'reps') {
            targetText = `${goal.targetWeight} lbs × ${goal.targetReps} reps`;
        } else if (goal.goalType === 'tonnage') {
            targetText = `${goal.targetTonnage.toLocaleString()} lbs total`;
        }

        return `
            <div class="review-goal">
                <span class="review-goal-exercise">${goal.exerciseName}</span>
                <span class="review-goal-target"> - ${targetText}</span>
            </div>
        `;
    }).join('');

    document.getElementById('reviewGoals').innerHTML = goalsHtml;
}

async function createCampaign() {
    // Check if online
    if (!isOnlineMode) {
        showToast('SIGN IN TO CREATE CAMPAIGNS');
        closeCreateCampaignModal();
        return;
    }

    try {
        const campaignData = {
            title: campaignWizardState.title,
            description: campaignWizardState.description,
            campaignType: campaignWizardState.type,
            teamId: campaignWizardState.teamId,
            targetDate: campaignWizardState.targetDate,
            goals: campaignWizardState.goals
        };

        await API.createCampaign(campaignData);
        closeCreateCampaignModal();
        showToast('CAMPAIGN CREATED!');
        loadCampaigns();
    } catch (error) {
        showToast(error.message || 'FAILED TO CREATE');
    }
}

async function openCampaignDetail(campaignId) {
    currentCampaignId = campaignId;

    try {
        const response = await API.getCampaign(campaignId);
        const campaign = response.campaign;

        // Update header
        document.getElementById('campaignDetailTitle').textContent = campaign.title;
        document.getElementById('campaignDetailType').textContent = campaign.campaignType.toUpperCase();
        document.getElementById('campaignDetailType').classList.toggle('team', campaign.campaignType === 'team');

        const targetDate = new Date(campaign.targetDate);
        document.getElementById('campaignDetailDeadline').textContent = `Target: ${targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

        const today = new Date();
        const daysLeft = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
        document.getElementById('campaignDetailDaysLeft').textContent = campaign.isCompleted ? 'Complete!' : (daysLeft > 0 ? `${daysLeft} days left` : 'Overdue');

        // Update progress
        const goals = campaign.goals || [];
        const completedGoals = goals.filter(g => g.isAchieved).length;
        const totalGoals = goals.length;
        const progressPercent = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

        document.getElementById('campaignGoalsComplete').textContent = completedGoals;
        document.getElementById('campaignGoalsTotal').textContent = totalGoals;
        document.getElementById('campaignProgressPercent').textContent = `${progressPercent}%`;

        // Update progress ring
        const circumference = 2 * Math.PI * 45;
        const offset = circumference - (progressPercent / 100) * circumference;
        document.getElementById('campaignProgressRing').style.strokeDashoffset = offset;

        // Render goals detail
        const goalsDetailHtml = goals.map(goal => {
            let currentText = '';
            let targetText = '';
            let progressPercent = 0;

            if (goal.goalType === '1rm') {
                currentText = `${goal.currentValue || 0} lbs`;
                targetText = `${goal.targetWeight} lbs`;
                progressPercent = goal.targetWeight > 0 ? Math.min(100, Math.round(((goal.currentValue || 0) / goal.targetWeight) * 100)) : 0;
            } else if (goal.goalType === 'reps') {
                currentText = `${goal.currentValue || 0} reps`;
                targetText = `${goal.targetReps} reps @ ${goal.targetWeight} lbs`;
                progressPercent = goal.targetReps > 0 ? Math.min(100, Math.round(((goal.currentValue || 0) / goal.targetReps) * 100)) : 0;
            } else if (goal.goalType === 'tonnage') {
                currentText = `${(goal.currentValue || 0).toLocaleString()} lbs`;
                targetText = `${goal.targetTonnage.toLocaleString()} lbs`;
                progressPercent = goal.targetTonnage > 0 ? Math.min(100, Math.round(((goal.currentValue || 0) / goal.targetTonnage) * 100)) : 0;
            }

            return `
                <div class="goal-detail-card">
                    <div class="goal-detail-header">
                        <div>
                            <div class="goal-detail-exercise">${goal.exerciseName}</div>
                            <div class="goal-detail-type">${goal.goalType === '1rm' ? '1 Rep Max' : goal.goalType === 'reps' ? 'Reps at Weight' : 'Total Tonnage'}</div>
                        </div>
                        <span class="goal-detail-status ${goal.isAchieved ? 'achieved' : ''}">${goal.isAchieved ? 'ACHIEVED' : 'In Progress'}</span>
                    </div>
                    <div class="goal-detail-progress">
                        <div class="goal-progress-bar">
                            <div class="goal-progress-fill ${goal.isAchieved ? 'achieved' : ''}" style="width: ${progressPercent}%"></div>
                        </div>
                    </div>
                    <div class="goal-detail-values">
                        <span class="goal-current">${currentText}</span>
                        <span class="goal-target">Goal: ${targetText}</span>
                    </div>
                </div>
            `;
        }).join('');

        document.getElementById('campaignGoalsDetail').innerHTML = goalsDetailHtml;

        // Show/hide delete button based on ownership
        document.getElementById('deleteCampaignBtn').style.display = campaign.creatorId === (gameState?.onlineUserId) ? 'block' : 'none';

        document.getElementById('campaignDetailModal').classList.add('active');
    } catch (error) {
        showToast('FAILED TO LOAD');
    }
}

function closeCampaignDetailModal() {
    document.getElementById('campaignDetailModal').classList.remove('active');
    currentCampaignId = null;
}

async function deleteCampaign() {
    if (!currentCampaignId) return;

    if (!confirm('Delete this campaign?')) return;

    try {
        await API.deleteCampaign(currentCampaignId);
        closeCampaignDetailModal();
        showToast('CAMPAIGN DELETED');
        loadCampaigns();
    } catch (error) {
        showToast('FAILED TO DELETE');
    }
}

// ============================================
// COACH MODE
// ============================================

let coachClientsData = [];
let myCoachesData = [];
let coachInvitationsData = [];
let currentClientId = null;
let currentClientData = null;
let assignCampaignGoals = [];

async function loadCoachTab() {
    if (!isOnlineMode) return;

    // Check if user is a coach
    const isCoach = currentUser?.role === 'coach';

    // Show appropriate section
    document.getElementById('coachDashboard').style.display = isCoach ? 'block' : 'none';
    document.getElementById('myCoachesSection').style.display = isCoach ? 'none' : 'block';

    if (isCoach) {
        await loadCoachClients();
    } else {
        await loadMyCoaches();
        await loadCoachInvitations();
    }
}

async function loadCoachClients() {
    try {
        const response = await API.getCoachClients();
        coachClientsData = response.clients || [];
        renderCoachClients();
    } catch (error) {
        console.error('Failed to load clients:', error);
    }
}

function renderCoachClients() {
    const list = document.getElementById('coachClientsList');

    if (coachClientsData.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏋️</div>
                <p>No clients yet. Invite athletes to start coaching!</p>
            </div>
        `;
        return;
    }

    list.innerHTML = coachClientsData.map(client => {
        const lastWorkoutText = client.lastWorkout
            ? `Last: ${getTimeAgo(new Date(client.lastWorkout))}`
            : 'No workouts yet';

        return `
            <div class="client-card" onclick="openClientDetail('${client.clientId}')">
                <div class="client-card-avatar">${getAvatarEmoji(client.avatar)}</div>
                <div class="client-card-info">
                    <div class="client-card-name">${client.username}</div>
                    <div class="client-card-meta">Level ${client.level} • ${client.totalWorkouts} workouts</div>
                </div>
                <div class="client-card-stats">
                    <span class="client-card-status ${client.status}">${client.status}</span>
                    <div class="client-card-stat">${lastWorkoutText}</div>
                    <div class="client-card-stat">
                        <span class="client-card-stat-value">${client.recentWorkouts}</span> this week
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function loadMyCoaches() {
    try {
        const response = await API.getMyCoaches();
        myCoachesData = response.coaches || [];
        renderMyCoaches();
    } catch (error) {
        console.error('Failed to load coaches:', error);
    }
}

function renderMyCoaches() {
    const list = document.getElementById('myCoachesList');

    if (myCoachesData.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👤</div>
                <p>No coaches connected. Ask your coach to send you an invitation!</p>
            </div>
        `;
        return;
    }

    list.innerHTML = myCoachesData.map(coach => `
        <div class="coach-card">
            <div class="coach-card-avatar">${getAvatarEmoji(coach.avatar)}</div>
            <div class="coach-card-info">
                <div class="coach-card-name">${coach.username}</div>
                <div class="coach-card-meta">Connected ${getTimeAgo(new Date(coach.connectedAt))}</div>
            </div>
            <button class="dc-button warning small" onclick="event.stopPropagation(); disconnectCoach('${coach.coachId}')">
                Disconnect
            </button>
        </div>
    `).join('');
}

async function loadCoachInvitations() {
    try {
        const response = await API.getCoachInvitations();
        coachInvitationsData = response.invitations || [];
        renderCoachInvitations();
    } catch (error) {
        console.error('Failed to load invitations:', error);
    }
}

function renderCoachInvitations() {
    const section = document.getElementById('coachInvitationsSection');
    const list = document.getElementById('coachInvitationsList');

    if (coachInvitationsData.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    list.innerHTML = coachInvitationsData.map(inv => `
        <div class="invitation-card">
            <div class="invitation-info">
                <div class="invitation-coach-name">${inv.coachUsername} wants to coach you</div>
                <div class="invitation-date">Sent ${getTimeAgo(new Date(inv.invitedAt))}</div>
            </div>
            <div class="invitation-actions">
                <button class="invitation-btn accept" onclick="acceptInvitation('${inv.id}')">Accept</button>
                <button class="invitation-btn decline" onclick="declineInvitation('${inv.id}')">Decline</button>
            </div>
        </div>
    `).join('');
}

async function acceptInvitation(inviteId) {
    try {
        await API.acceptCoachInvitation(inviteId);
        showToast('COACH CONNECTED!');
        loadCoachInvitations();
        loadMyCoaches();
    } catch (error) {
        showToast('FAILED TO ACCEPT');
    }
}

async function declineInvitation(inviteId) {
    try {
        await API.declineCoachInvitation(inviteId);
        showToast('INVITATION DECLINED');
        loadCoachInvitations();
    } catch (error) {
        showToast('FAILED TO DECLINE');
    }
}

async function disconnectCoach(coachId) {
    if (!confirm('Disconnect from this coach?')) return;

    try {
        await API.disconnectFromCoach(coachId);
        showToast('DISCONNECTED');
        loadMyCoaches();
    } catch (error) {
        showToast('FAILED TO DISCONNECT');
    }
}

// Invite Client Modal
function openInviteClientModal() {
    document.getElementById('inviteClientEmail').value = '';
    document.getElementById('inviteClientError').textContent = '';
    document.getElementById('inviteClientModal').classList.add('active');
}

function closeInviteClientModal() {
    document.getElementById('inviteClientModal').classList.remove('active');
}

async function sendClientInvite() {
    const email = document.getElementById('inviteClientEmail').value.trim();
    const errorEl = document.getElementById('inviteClientError');

    if (!email) {
        errorEl.textContent = 'Please enter an email address';
        return;
    }

    try {
        const response = await API.inviteClient(email);
        closeInviteClientModal();
        showToast(`INVITED ${response.clientUsername}!`);
        loadCoachClients();
    } catch (error) {
        errorEl.textContent = error.message || 'Failed to send invitation';
    }
}

// Client Detail Modal
async function openClientDetail(clientId) {
    currentClientId = clientId;

    try {
        // Load client details
        const [detailResponse, statsResponse] = await Promise.all([
            API.getClientDetail(clientId),
            API.getClientStats(clientId)
        ]);

        currentClientData = {
            ...detailResponse.client,
            stats: statsResponse
        };

        // Update header
        document.getElementById('clientDetailName').textContent = currentClientData.username;
        document.getElementById('clientDetailAvatar').textContent = getAvatarEmoji(currentClientData.avatar);
        document.getElementById('clientDetailLevel').textContent = `Level ${currentClientData.level}`;
        document.getElementById('clientDetailJoined').textContent = `Joined: ${new Date(currentClientData.joinedAt).toLocaleDateString()}`;

        // Update stats
        document.getElementById('clientTotalWorkouts').textContent = currentClientData.totalWorkouts || 0;
        document.getElementById('clientWeeklyWorkouts').textContent = currentClientData.stats.weeklyStats?.workouts || 0;
        document.getElementById('clientTotalVolume').textContent = formatNumber(currentClientData.totalWeight || 0);

        // Load workouts tab by default
        switchClientTab('workouts');

        document.getElementById('clientDetailModal').classList.add('active');
    } catch (error) {
        showToast('FAILED TO LOAD CLIENT');
    }
}

function closeClientDetailModal() {
    document.getElementById('clientDetailModal').classList.remove('active');
    currentClientId = null;
    currentClientData = null;
}

async function switchClientTab(tab) {
    document.querySelectorAll('.client-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    const content = document.getElementById('clientTabContent');

    if (tab === 'workouts') {
        try {
            const response = await API.getClientWorkouts(currentClientId);
            const workouts = response.workouts || [];

            if (workouts.length === 0) {
                content.innerHTML = '<p class="text-muted text-center">No workouts yet</p>';
            } else {
                content.innerHTML = workouts.map(w => `
                    <div class="client-workout-item">
                        <div>
                            <div class="client-workout-name">${w.name}</div>
                            <div class="client-workout-date">${new Date(w.completedAt).toLocaleDateString()}</div>
                        </div>
                        <div class="client-workout-stats">
                            <div class="client-workout-volume">${formatNumber(w.totalVolume)} lbs</div>
                            <div class="client-workout-sets">${w.totalSets} sets</div>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            content.innerHTML = '<p class="text-muted text-center">Failed to load workouts</p>';
        }
    } else if (tab === 'prs') {
        const prs = currentClientData?.stats?.personalRecords || [];

        if (prs.length === 0) {
            content.innerHTML = '<p class="text-muted text-center">No personal records yet</p>';
        } else {
            content.innerHTML = prs.map(pr => `
                <div class="client-pr-item">
                    <div>
                        <div class="client-pr-exercise">${getExerciseName(pr.exerciseId)}</div>
                        <div class="client-pr-date">${new Date(pr.achievedAt).toLocaleDateString()}</div>
                    </div>
                    <div class="client-pr-weight">${pr.weight} lbs</div>
                </div>
            `).join('');
        }
    } else if (tab === 'campaigns') {
        try {
            const response = await API.getClientCampaigns(currentClientId);
            const campaigns = response.campaigns || [];

            if (campaigns.length === 0) {
                content.innerHTML = '<p class="text-muted text-center">No campaigns yet</p>';
            } else {
                content.innerHTML = campaigns.map(c => {
                    const goals = c.goals || [];
                    const completed = goals.filter(g => g.isAchieved).length;
                    const percent = goals.length > 0 ? Math.round((completed / goals.length) * 100) : 0;

                    return `
                        <div class="campaign-card" style="cursor: default;">
                            <div class="campaign-card-header">
                                <div class="campaign-card-title">${c.title}</div>
                                <span class="campaign-card-type">${c.isCompleted ? 'Completed' : 'Active'}</span>
                            </div>
                            <div class="campaign-card-progress">
                                <div class="campaign-progress-bar">
                                    <div class="campaign-progress-fill" style="width: ${percent}%"></div>
                                </div>
                            </div>
                            <div class="campaign-card-stats">
                                <span>${completed}/${goals.length} goals</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } catch (error) {
            content.innerHTML = '<p class="text-muted text-center">Failed to load campaigns</p>';
        }
    }
}

async function removeClient() {
    if (!currentClientId) return;
    if (!confirm('Remove this client?')) return;

    try {
        await API.removeClient(currentClientId);
        closeClientDetailModal();
        showToast('CLIENT REMOVED');
        loadCoachClients();
    } catch (error) {
        showToast('FAILED TO REMOVE');
    }
}

// Assign Campaign Modal
function assignCampaignToClient() {
    if (!currentClientId || !currentClientData) return;

    assignCampaignGoals = [];

    document.getElementById('assignCampaignClientName').textContent = currentClientData.username;
    document.getElementById('assignCampaignTitle').value = '';
    document.getElementById('assignCampaignDescription').value = '';

    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    document.getElementById('assignCampaignTargetDate').value = defaultDate.toISOString().split('T')[0];

    document.getElementById('assignCampaignGoalsList').innerHTML = '<div class="empty-goals-hint"><p>No goals added yet</p></div>';
    document.getElementById('assignGoalForm').classList.add('hidden');
    document.getElementById('submitAssignCampaignBtn').disabled = true;

    // Populate exercise dropdown
    const select = document.getElementById('assignGoalExerciseSelect');
    select.innerHTML = '<option value="">Select exercise...</option>';
    getAllExercises().forEach(ex => {
        select.innerHTML += `<option value="${ex.id}" data-name="${ex.name}">${ex.name}</option>`;
    });

    closeClientDetailModal();
    document.getElementById('assignCampaignModal').classList.add('active');
}

function closeAssignCampaignModal() {
    document.getElementById('assignCampaignModal').classList.remove('active');
}

function toggleAssignGoalForm() {
    document.getElementById('assignGoalForm').classList.toggle('hidden');
}

function updateAssignGoalTargetInput() {
    const goalType = document.getElementById('assignGoalTypeSelect').value;

    document.getElementById('assignTargetWeightGroup').classList.toggle('hidden', goalType === 'tonnage');
    document.getElementById('assignTargetRepsGroup').classList.toggle('hidden', goalType !== 'reps');
    document.getElementById('assignTargetTonnageGroup').classList.toggle('hidden', goalType !== 'tonnage');
}

function addAssignCampaignGoal() {
    const exerciseSelect = document.getElementById('assignGoalExerciseSelect');
    const exerciseId = exerciseSelect.value;
    const exerciseName = exerciseSelect.options[exerciseSelect.selectedIndex]?.text;
    const goalType = document.getElementById('assignGoalTypeSelect').value;
    const targetWeight = parseInt(document.getElementById('assignGoalTargetWeight').value) || 0;
    const targetReps = parseInt(document.getElementById('assignGoalTargetReps').value) || 0;
    const targetTonnage = parseInt(document.getElementById('assignGoalTargetTonnage').value) || 0;

    if (!exerciseId) {
        showToast('SELECT AN EXERCISE');
        return;
    }

    if (goalType === '1rm' && targetWeight <= 0) {
        showToast('ENTER TARGET WEIGHT');
        return;
    }
    if (goalType === 'reps' && (targetWeight <= 0 || targetReps <= 0)) {
        showToast('ENTER WEIGHT AND REPS');
        return;
    }
    if (goalType === 'tonnage' && targetTonnage <= 0) {
        showToast('ENTER TARGET TONNAGE');
        return;
    }

    assignCampaignGoals.push({
        exerciseId,
        exerciseName,
        goalType,
        targetWeight: goalType !== 'tonnage' ? targetWeight : null,
        targetReps: goalType === 'reps' ? targetReps : null,
        targetTonnage: goalType === 'tonnage' ? targetTonnage : null
    });

    renderAssignCampaignGoals();

    // Reset form
    document.getElementById('assignGoalExerciseSelect').value = '';
    document.getElementById('assignGoalTargetWeight').value = '';
    document.getElementById('assignGoalTargetReps').value = '';
    document.getElementById('assignGoalTargetTonnage').value = '';
    document.getElementById('assignGoalForm').classList.add('hidden');

    document.getElementById('submitAssignCampaignBtn').disabled = false;
}

function renderAssignCampaignGoals() {
    const list = document.getElementById('assignCampaignGoalsList');

    if (assignCampaignGoals.length === 0) {
        list.innerHTML = '<div class="empty-goals-hint"><p>No goals added yet</p></div>';
        document.getElementById('submitAssignCampaignBtn').disabled = true;
        return;
    }

    list.innerHTML = assignCampaignGoals.map((goal, index) => {
        let targetText = '';
        if (goal.goalType === '1rm') {
            targetText = `1RM: ${goal.targetWeight} lbs`;
        } else if (goal.goalType === 'reps') {
            targetText = `${goal.targetWeight} lbs × ${goal.targetReps} reps`;
        } else if (goal.goalType === 'tonnage') {
            targetText = `${goal.targetTonnage.toLocaleString()} lbs total`;
        }

        return `
            <div class="goal-item">
                <div class="goal-item-info">
                    <div class="goal-item-exercise">${goal.exerciseName}</div>
                    <div class="goal-item-target">${targetText}</div>
                </div>
                <button class="goal-item-remove" onclick="removeAssignCampaignGoal(${index})">×</button>
            </div>
        `;
    }).join('');
}

function removeAssignCampaignGoal(index) {
    assignCampaignGoals.splice(index, 1);
    renderAssignCampaignGoals();
}

async function submitAssignCampaign() {
    const title = document.getElementById('assignCampaignTitle').value.trim();
    const description = document.getElementById('assignCampaignDescription').value.trim();
    const targetDate = document.getElementById('assignCampaignTargetDate').value;

    if (!title) {
        showToast('ENTER A TITLE');
        return;
    }

    if (!targetDate) {
        showToast('SELECT A DATE');
        return;
    }

    if (assignCampaignGoals.length === 0) {
        showToast('ADD AT LEAST ONE GOAL');
        return;
    }

    try {
        await API.assignCampaignToClient(currentClientId, {
            title,
            description,
            targetDate,
            goals: assignCampaignGoals
        });

        closeAssignCampaignModal();
        showToast('CAMPAIGN ASSIGNED!');
    } catch (error) {
        showToast(error.message || 'FAILED TO ASSIGN');
    }
}

function getAvatarEmoji(avatarId) {
    const avatars = ['🧔', '👨', '👩', '🧑', '👴', '👵', '🦸', '🦹', '🧙', '🏋️'];
    return avatars[avatarId - 1] || '👤';
}

function getExerciseName(exerciseId) {
    const exercises = getAllExercises();
    const ex = exercises.find(e => e.id === exerciseId);
    return ex ? ex.name : exerciseId;
}

// Update campaign progress based on workout data
async function updateCampaignProgressFromWorkout(exerciseData) {
    if (!isOnlineMode || !campaignsData) return;

    const allCampaigns = [...(campaignsData.personal || []), ...(campaignsData.team || [])];
    const activeCampaigns = allCampaigns.filter(c => !c.isCompleted);

    if (activeCampaigns.length === 0) return;

    // Create a map of exercises in this workout with their max weight, reps, and volume
    const workoutExercises = {};
    exerciseData.forEach(ex => {
        let maxWeight = 0;
        let maxRepsAtWeight = 0;
        let totalVolume = 0;

        ex.sets.forEach(set => {
            const weight = set.weight || 0;
            const reps = set.reps || 0;

            // Track max weight (for 1RM goals)
            if (weight > maxWeight) {
                maxWeight = weight;
                maxRepsAtWeight = reps;
            }

            // Track max reps at a given weight
            if (weight >= maxWeight && reps > maxRepsAtWeight) {
                maxRepsAtWeight = reps;
            }

            // Accumulate volume (for tonnage goals)
            totalVolume += calculateVolume(ex.id, weight, reps);
        });

        workoutExercises[ex.id] = {
            maxWeight,
            maxRepsAtWeight,
            totalVolume,
            estimated1RM: maxWeight > 0 && maxRepsAtWeight > 0 ? Math.round(maxWeight * (1 + maxRepsAtWeight / 30)) : 0
        };
    });

    // Check each campaign's goals
    for (const campaign of activeCampaigns) {
        if (!campaign.goals) continue;

        for (const goal of campaign.goals) {
            if (goal.isAchieved) continue;

            const exerciseData = workoutExercises[goal.exerciseId];
            if (!exerciseData) continue;

            let currentValue = goal.currentValue || 0;
            let newValue = currentValue;
            let isAchieved = false;

            if (goal.goalType === '1rm') {
                // For 1RM, use the estimated 1RM or actual weight lifted
                const best1RM = Math.max(exerciseData.maxWeight, exerciseData.estimated1RM);
                if (best1RM > currentValue) {
                    newValue = best1RM;
                }
                if (newValue >= goal.targetWeight) {
                    isAchieved = true;
                }
            } else if (goal.goalType === 'reps') {
                // For reps at weight, check if they hit target weight with enough reps
                if (exerciseData.maxWeight >= goal.targetWeight) {
                    // They lifted at or above target weight, check reps
                    if (exerciseData.maxRepsAtWeight > currentValue) {
                        newValue = exerciseData.maxRepsAtWeight;
                    }
                }
                if (newValue >= goal.targetReps) {
                    isAchieved = true;
                }
            } else if (goal.goalType === 'tonnage') {
                // For tonnage, add to cumulative total
                newValue = currentValue + exerciseData.totalVolume;
                if (newValue >= goal.targetTonnage) {
                    isAchieved = true;
                }
            }

            // Update progress if changed
            if (newValue !== currentValue || isAchieved) {
                try {
                    await API.updateCampaignGoalProgress(campaign.id, goal.id, {
                        currentValue: newValue,
                        isAchieved
                    });

                    if (isAchieved) {
                        showToast(`GOAL ACHIEVED: ${goal.exerciseName}!`);
                    }
                } catch (error) {
                    console.error('Failed to update campaign progress:', error);
                }
            }
        }
    }

    // Refresh campaigns data
    loadCampaigns();
}

// ============================================
// CHARACTER PROFILE
// ============================================

// All possible achievements in the game
const ACHIEVEMENTS = [
    { id: 'first_workout', name: 'First Steps', desc: 'Complete your first workout', icon: '🎯', xp: 100 },
    { id: 'five_workouts', name: 'Getting Started', desc: 'Complete 5 workouts', icon: '💪', xp: 250 },
    { id: 'ten_workouts', name: 'Dedicated', desc: 'Complete 10 workouts', icon: '🔥', xp: 500 },
    { id: 'twenty_five_workouts', name: 'Iron Regular', desc: 'Complete 25 workouts', icon: '⚡', xp: 1000 },
    { id: 'fifty_workouts', name: 'Warrior', desc: 'Complete 50 workouts', icon: '⚔️', xp: 2000 },
    { id: 'hundred_workouts', name: 'Legend', desc: 'Complete 100 workouts', icon: '👑', xp: 5000 },
    { id: 'first_pr', name: 'Personal Best', desc: 'Set your first personal record', icon: '🏆', xp: 150 },
    { id: 'five_prs', name: 'Record Breaker', desc: 'Set 5 personal records', icon: '📈', xp: 400 },
    { id: 'bench_135', name: 'First Plate', desc: 'Bench Press 135 lbs', icon: '🏋️', xp: 300 },
    { id: 'bench_225', name: 'Two Plates', desc: 'Bench Press 225 lbs', icon: '💎', xp: 750 },
    { id: 'squat_225', name: 'Squat Master', desc: 'Squat 225 lbs', icon: '🦵', xp: 500 },
    { id: 'squat_315', name: 'Squat Legend', desc: 'Squat 315 lbs', icon: '🔱', xp: 1000 },
    { id: 'deadlift_315', name: 'Heavy Puller', desc: 'Deadlift 315 lbs', icon: '💀', xp: 750 },
    { id: 'deadlift_405', name: 'Deadlift King', desc: 'Deadlift 405 lbs', icon: '🦁', xp: 1500 },
    { id: 'volume_10k', name: '10K Club', desc: 'Lift 10,000 lbs total', icon: '📊', xp: 200 },
    { id: 'volume_100k', name: '100K Club', desc: 'Lift 100,000 lbs total', icon: '🚀', xp: 1000 },
    { id: 'volume_1m', name: 'Million Pound Club', desc: 'Lift 1,000,000 lbs total', icon: '🌟', xp: 5000 },
    { id: 'level_5', name: 'Rising Star', desc: 'Reach Level 5', icon: '⭐', xp: 300 },
    { id: 'level_10', name: 'Veteran', desc: 'Reach Level 10', icon: '🌙', xp: 600 },
    { id: 'level_25', name: 'Elite', desc: 'Reach Level 25', icon: '☀️', xp: 1500 },
    // Progress-based achievements
    { id: 'progress_10', name: 'Getting Stronger', desc: '10% improvement on any lift', icon: '📈', xp: 200 },
    { id: 'progress_20', name: 'Serious Gains', desc: '20% improvement on any lift', icon: '💪', xp: 400 },
    { id: 'progress_30', name: 'Transformation', desc: '30% improvement on any lift', icon: '🔥', xp: 600 },
    { id: 'progress_50', name: 'Beast Mode', desc: '50% improvement on any lift', icon: '🦍', xp: 1000 },
    { id: 'progress_100', name: 'Doubled Up', desc: '100% improvement on any lift', icon: '🏆', xp: 2000 }
];

function openCharacterProfile() {
    if (!gameState) {
        showToast('Create a character first!');
        return;
    }
    renderCharacterProfile();
    showScreen('characterScreen');
}

function switchCharacter() {
    // Save current character before switching
    saveCurrentCharacter();

    // Reset current character
    gameState = null;
    currentSlotIndex = null;

    // Go back to title/slot selection
    showScreen('titleScreen');
    renderCharacterSlots();
}

function confirmLogout() {
    if (confirm('Log out and return to character selection?')) {
        // Save current progress
        saveCurrentCharacter();

        // If online mode, disconnect
        if (isOnlineMode && typeof API !== 'undefined') {
            API.logout();
        }

        // Reset state
        gameState = null;
        currentSlotIndex = null;
        isOnlineMode = false;
        currentUser = null;

        // Go to title screen
        showScreen('titleScreen');
        renderCharacterSlots();
        showToast('LOGGED OUT');
    }
}

function renderCharacterProfile() {
    if (!gameState) return;

    // Profile header
    const avatarEl = document.getElementById('profileAvatar');
    if (avatarEl) {
        avatarEl.innerHTML = getAvatarHTML(gameState.avatar, gameState.customAvatar);
    }

    document.getElementById('profileName').textContent = gameState.name || gameState.playerName || 'WARRIOR';
    document.getElementById('profileLevel').textContent = `LEVEL ${gameState.level || 1}`;

    // Calculate join date (approximate from first workout or creation)
    const joinDate = gameState.createdAt ? new Date(gameState.createdAt) : new Date();
    document.getElementById('profileJoined').textContent = `Joined ${joinDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;

    // XP bar
    const xpForLevel = getXPForLevel(gameState.level || 1);
    const xpProgress = ((gameState.xp || 0) / xpForLevel) * 100;
    document.getElementById('profileXpFill').style.width = `${xpProgress}%`;
    document.getElementById('profileXpText').textContent = `${gameState.xp || 0} / ${xpForLevel} XP to next level`;

    // Stats summary
    const history = gameState.workoutHistory || [];
    const totalSets = history.reduce((sum, w) => sum + (w.totalSets || 0), 0);
    const totalVolume = history.reduce((sum, w) => sum + (w.totalVolume || 0), 0);

    const profileWorkoutsEl = document.getElementById('profileWorkouts');
    const profileVolumeEl = document.getElementById('profileVolume');
    const profileStreakEl = document.getElementById('profileStreak');
    const profileAchievementCountEl = document.getElementById('profileAchievementCount');

    if (profileWorkoutsEl) profileWorkoutsEl.textContent = formatNumber(gameState.totalWorkouts || 0);
    if (profileVolumeEl) profileVolumeEl.textContent = formatNumber(totalVolume);

    // Streak calculation
    const streak = calculateWeekStreak();
    if (profileStreakEl) profileStreakEl.textContent = streak;

    // Count unlocked achievements
    const unlockedAchievements = getUnlockedAchievements();
    if (profileAchievementCountEl) profileAchievementCountEl.textContent = unlockedAchievements.length;

    // Weekly goal setup
    renderWeeklyGoal();

    // Body stats
    renderBodyStats();

    // Personal records
    renderProfilePRs();

    // Best sets
    renderBestSets();

    // Lift progression
    renderLiftProgress();

    // Achievements
    renderAchievements(unlockedAchievements);

    // Milestones
    renderMilestones();
}

function renderBodyStats() {
    const section = document.getElementById('profileBodyStats');

    // Calculate height - support both new (height) and legacy (heightFeet/heightInches) formats
    let totalHeight = gameState.height;
    if (!totalHeight && (gameState.heightFeet || gameState.heightInches)) {
        totalHeight = ((gameState.heightFeet || 0) * 12) + (gameState.heightInches || 0);
    }

    const hasStats = totalHeight || gameState.weight || gameState.gender;

    if (!hasStats) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    const heightEl = document.querySelector('#profileHeight .body-stat-value');
    const weightEl = document.querySelector('#profileWeight .body-stat-value');
    const genderEl = document.querySelector('#profileGender .body-stat-value');

    if (totalHeight) {
        const feet = Math.floor(totalHeight / 12);
        const inches = totalHeight % 12;
        heightEl.textContent = `${feet}'${inches}"`;
    } else {
        heightEl.textContent = '--';
    }

    weightEl.textContent = gameState.weight ? `${gameState.weight} lbs` : '--';
    genderEl.textContent = gameState.gender ? gameState.gender.charAt(0).toUpperCase() + gameState.gender.slice(1) : '--';

    // Show weight change from initial
    const weightChangeEl = document.getElementById('weightChange');
    if (weightChangeEl && gameState.weightHistory && gameState.weightHistory.length > 1) {
        const initial = gameState.weightHistory[0].weight;
        const current = gameState.weight;
        const change = current - initial;
        if (change !== 0) {
            const sign = change > 0 ? '+' : '';
            weightChangeEl.textContent = `${sign}${change.toFixed(1)} lbs`;
            weightChangeEl.className = 'body-stat-change ' + (change > 0 ? 'gain' : 'loss');
        } else {
            weightChangeEl.textContent = '';
        }
    }
}

// ============================================
// WEIGHT TRACKING FUNCTIONS
// ============================================

function openWeightEditModal() {
    const currentWeight = gameState.weight || 0;
    document.getElementById('weightEditCurrent').textContent = currentWeight ? `${currentWeight} lbs` : '-- lbs';
    document.getElementById('newWeightInput').value = currentWeight || '';

    // Render weight history
    renderWeightHistoryChart();
    renderWeightHistoryList();

    document.getElementById('weightEditModal').classList.add('active');
}

function closeWeightEditModal() {
    document.getElementById('weightEditModal').classList.remove('active');
}

function saveNewWeight() {
    const input = document.getElementById('newWeightInput');
    const newWeight = parseFloat(input.value);

    if (!newWeight || newWeight < 50 || newWeight > 500) {
        showToast('Enter a valid weight (50-500 lbs)');
        return;
    }

    // Initialize weight history if needed
    if (!gameState.weightHistory) {
        gameState.weightHistory = [];
        // Add initial weight if we have one
        if (gameState.weight) {
            gameState.weightHistory.push({
                weight: gameState.weight,
                date: gameState.createdAt || new Date().toISOString()
            });
        }
    }

    // Add new weight entry
    gameState.weightHistory.push({
        weight: newWeight,
        date: new Date().toISOString()
    });

    // Update current weight
    gameState.weight = newWeight;
    saveGame();

    // Refresh displays
    renderBodyStats();
    closeWeightEditModal();
    showToast('Weight updated!');
}

function renderWeightHistoryChart() {
    const container = document.getElementById('weightHistoryChart');
    const history = gameState.weightHistory || [];

    if (history.length < 2) {
        container.innerHTML = '<div class="empty-hint">Track weight over time</div>';
        return;
    }

    // Take last 12 entries
    const dataPoints = history.slice(-12);

    const weights = dataPoints.map(d => d.weight);
    const minWeight = Math.min(...weights) - 2;
    const maxWeight = Math.max(...weights) + 2;
    const range = maxWeight - minWeight || 1;

    const width = 260;
    const height = 50;
    const padding = { top: 5, right: 5, bottom: 5, left: 30 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const points = dataPoints.map((d, i) => ({
        x: padding.left + (i / (dataPoints.length - 1)) * chartWidth,
        y: padding.top + chartHeight - ((d.weight - minWeight) / range) * chartHeight,
        weight: d.weight
    }));

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaD = pathD + ` L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;

    let svg = `<svg viewBox="0 0 ${width} ${height}" class="weight-chart-svg">`;
    svg += `<text x="${padding.left - 5}" y="${padding.top + 4}" class="weight-chart-label">${Math.round(maxWeight)}</text>`;
    svg += `<text x="${padding.left - 5}" y="${height - padding.bottom}" class="weight-chart-label">${Math.round(minWeight)}</text>`;
    svg += `<path d="${areaD}" class="weight-chart-area" />`;
    svg += `<path d="${pathD}" class="weight-chart-line" />`;
    points.forEach(p => {
        svg += `<circle cx="${p.x}" cy="${p.y}" r="2.5" class="weight-chart-point" />`;
    });
    svg += '</svg>';

    container.innerHTML = svg;
}

function renderWeightHistoryList() {
    const container = document.getElementById('weightHistoryList');
    const history = gameState.weightHistory || [];

    if (history.length === 0) {
        container.innerHTML = '<div class="empty-hint">No weight history</div>';
        return;
    }

    // Show last 5 entries, newest first
    const recent = [...history].reverse().slice(0, 5);

    container.innerHTML = recent.map((entry, idx) => {
        const date = new Date(entry.date);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });

        // Calculate change from previous
        let changeHtml = '';
        if (idx < recent.length - 1) {
            const prev = recent[idx + 1].weight;
            const change = entry.weight - prev;
            if (change !== 0) {
                const sign = change > 0 ? '+' : '';
                const changeClass = change > 0 ? 'gain' : 'loss';
                changeHtml = `<span class="weight-change ${changeClass}">${sign}${change.toFixed(1)}</span>`;
            }
        }

        return `
            <div class="weight-history-row">
                <span class="weight-history-date">${dateStr}</span>
                <span class="weight-history-value">${entry.weight} lbs</span>
                ${changeHtml}
            </div>
        `;
    }).join('');
}

// ============================================
// STREAK & WEEKLY GOAL FUNCTIONS
// ============================================

function getISOWeek(date) {
    // Returns ISO week number and year for a given date
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return { year: d.getFullYear(), week: weekNum };
}

function getWorkoutsThisWeek() {
    const history = gameState.workoutHistory || [];
    const now = new Date();
    const currentWeek = getISOWeek(now);

    // Count unique days with workouts this week
    const workoutDays = new Set();
    history.forEach(workout => {
        const workoutDate = new Date(workout.date);
        const workoutWeek = getISOWeek(workoutDate);
        if (workoutWeek.year === currentWeek.year && workoutWeek.week === currentWeek.week) {
            workoutDays.add(workoutDate.toDateString());
        }
    });

    return workoutDays.size;
}

function calculateWeekStreak() {
    const goal = gameState.streakGoal || 3;
    const history = gameState.workoutHistory || [];

    if (history.length === 0) return 0;

    // Group workouts by ISO week
    const weeklyWorkouts = {};
    history.forEach(workout => {
        const workoutDate = new Date(workout.date);
        const { year, week } = getISOWeek(workoutDate);
        const key = `${year}-${week}`;

        if (!weeklyWorkouts[key]) {
            weeklyWorkouts[key] = new Set();
        }
        weeklyWorkouts[key].add(workoutDate.toDateString());
    });

    // Get current week info
    const now = new Date();
    const currentWeek = getISOWeek(now);

    // Count backwards from previous completed week
    let streak = 0;
    let checkDate = new Date(now);

    // Start from last week (current week may not be complete)
    checkDate.setDate(checkDate.getDate() - 7);

    while (true) {
        const { year, week } = getISOWeek(checkDate);
        const key = `${year}-${week}`;
        const daysWorkedOut = weeklyWorkouts[key] ? weeklyWorkouts[key].size : 0;

        if (daysWorkedOut >= goal) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 7);
        } else {
            break;
        }

        // Safety limit
        if (streak > 520) break; // Max ~10 years
    }

    // Check if current week already meets goal (add to streak)
    const currentKey = `${currentWeek.year}-${currentWeek.week}`;
    const currentWeekDays = weeklyWorkouts[currentKey] ? weeklyWorkouts[currentKey].size : 0;
    if (currentWeekDays >= goal) {
        streak++;
    }

    return streak;
}

function renderWeeklyGoal() {
    const goal = gameState.streakGoal || 3;
    const workoutsThisWeek = getWorkoutsThisWeek();

    // Set the dropdown to current goal
    const selectEl = document.getElementById('streakGoalSelect');
    if (selectEl) {
        selectEl.value = goal;
    }

    // Update progress display
    const thisWeekEl = document.getElementById('thisWeekWorkouts');
    const goalDisplayEl = document.getElementById('weeklyGoalDisplay');
    const progressFillEl = document.getElementById('weeklyProgressFill');

    if (thisWeekEl) thisWeekEl.textContent = workoutsThisWeek;
    if (goalDisplayEl) goalDisplayEl.textContent = goal;

    // Update progress bar
    if (progressFillEl) {
        const progressPercent = Math.min((workoutsThisWeek / goal) * 100, 100);
        progressFillEl.style.width = `${progressPercent}%`;
    }
}

function updateStreakGoal(value) {
    gameState.streakGoal = parseInt(value);
    saveSaveSlots();

    // Re-render streak and weekly progress
    const streak = calculateWeekStreak();
    const streakEl = document.getElementById('profileStreak');
    if (streakEl) streakEl.textContent = streak;
    renderWeeklyGoal();
}

// ============================================
// BEST SETS FUNCTION
// ============================================

function renderBestSets() {
    const container = document.getElementById('profileBestSets');
    if (!container) return;

    const history = gameState.workoutHistory || [];

    if (history.length === 0) {
        container.innerHTML = '<div class="empty-hint">Complete workouts to see your best sets</div>';
        return;
    }

    // Collect all sets from history (bodyweight-aware volume)
    const allSets = [];
    history.forEach(workout => {
        if (!workout.exercises) return;
        workout.exercises.forEach(exercise => {
            if (!exercise.sets) return;
            exercise.sets.forEach(set => {
                if (set.type === 'warmup') return; // Skip warmup sets
                const volume = calculateVolume(exercise.id, set.weight || 0, set.reps || 0);
                if (volume > 0) {
                    allSets.push({
                        exerciseId: exercise.id,
                        exerciseName: exercise.name || getExerciseName(exercise.id),
                        weight: set.weight,
                        reps: set.reps,
                        volume: volume,
                        date: workout.date
                    });
                }
            });
        });
    });

    if (allSets.length === 0) {
        container.innerHTML = '<div class="empty-hint">Complete workouts to see your best sets</div>';
        return;
    }

    // Sort by volume and take top 5
    allSets.sort((a, b) => b.volume - a.volume);
    const topSets = allSets.slice(0, 5);

    container.innerHTML = topSets.map((set, index) => {
        const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
        const dateStr = new Date(set.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return `
            <div class="best-set-item">
                <div class="best-set-rank ${rankClass}">${index + 1}</div>
                <div class="best-set-info">
                    <div class="best-set-exercise">${set.exerciseName}</div>
                    <div class="best-set-details">${set.weight} lbs × ${set.reps} reps • ${dateStr}</div>
                </div>
                <div class="best-set-volume">${formatNumber(set.volume)}</div>
            </div>
        `;
    }).join('');
}

function renderProfilePRs() {
    const container = document.getElementById('profilePRGrid');
    if (!container) return;

    const prs = gameState.personalRecords || {};
    const baselines = gameState.baselines || {};
    const history = gameState.workoutHistory || [];

    // Combine all exercises that have baselines or PRs
    const allExerciseIds = new Set([...Object.keys(prs), ...Object.keys(baselines)]);

    if (allExerciseIds.size === 0) {
        container.innerHTML = '<div class="empty-hint">Complete the strength test and workouts to see your records!</div>';
        return;
    }

    // Build data for each exercise
    const exerciseData = [];

    allExerciseIds.forEach(exerciseId => {
        const pr = prs[exerciseId];
        const baseline = baselines[exerciseId] || 0;

        // Get max weight from PR
        let maxWeight = 0;
        if (pr) {
            maxWeight = typeof pr === 'number' ? pr : (pr.maxWeight || 0);
        }

        // Find best set (highest calculated 1RM) from workout history
        let bestSet = null;
        let best1RM = 0;

        history.forEach(workout => {
            if (!workout.exercises) return;
            workout.exercises.forEach(exercise => {
                if (exercise.id !== exerciseId || !exercise.sets) return;
                exercise.sets.forEach(set => {
                    if (set.type === 'warmup') return;
                    const weight = set.weight || 0;
                    const reps = set.reps || 0;
                    if (weight > 0 && reps > 0) {
                        const est1RM = calculate1RM(weight, reps);
                        if (est1RM > best1RM) {
                            best1RM = est1RM;
                            bestSet = { weight, reps, est1RM };
                        }
                    }
                });
            });
        });

        // Use baseline as maxWeight if no PR recorded yet
        if (maxWeight === 0 && baseline > 0) {
            maxWeight = baseline;
        }

        // Calculate progress from baseline
        let progress = 0;
        if (baseline > 0 && maxWeight > 0) {
            progress = Math.round(((maxWeight - baseline) / baseline) * 100);
        }

        exerciseData.push({
            exerciseId,
            name: getExerciseName(exerciseId),
            maxWeight,
            baseline,
            bestSet,
            best1RM,
            progress
        });
    });

    // Sort by max weight descending
    exerciseData.sort((a, b) => b.maxWeight - a.maxWeight);

    container.innerHTML = exerciseData.map(data => {
        // Best set display
        let bestSetDisplay = '--';
        if (data.bestSet) {
            bestSetDisplay = `${data.bestSet.weight}×${data.bestSet.reps} <span class="best-1rm">(${data.best1RM} 1RM)</span>`;
        }

        // Progress badge
        let progressBadge = '';
        if (data.baseline > 0) {
            const badgeClass = data.progress > 0 ? 'positive' : data.progress < 0 ? 'negative' : 'neutral';
            const sign = data.progress > 0 ? '+' : '';
            progressBadge = `<span class="progress-badge ${badgeClass}">${sign}${data.progress}%</span>`;
        } else {
            progressBadge = `<span class="progress-badge neutral">--</span>`;
        }

        return `
            <div class="pr-table-row" onclick="openPRDetail('${data.exerciseId}')">
                <div class="pr-col-exercise">${data.name}</div>
                <div class="pr-col-max">${data.maxWeight} lbs</div>
                <div class="pr-col-best">${bestSetDisplay}</div>
                <div class="pr-col-progress">${progressBadge}</div>
            </div>
        `;
    }).join('');
}

// ============================================
// PR DETAIL MODAL
// ============================================

function openPRDetail(exerciseId) {
    const history = gameState.workoutHistory || [];
    const prs = gameState.personalRecords || {};
    const baselines = gameState.baselines || {};

    const exerciseName = getExerciseName(exerciseId);
    const baseline = baselines[exerciseId] || 0;
    const pr = prs[exerciseId];

    // Gather all sessions where this exercise was performed
    const sessions = [];
    history.forEach(workout => {
        if (!workout.exercises) return;
        workout.exercises.forEach(ex => {
            if (ex.id !== exerciseId || !ex.sets) return;

            const workingSets = ex.sets.filter(s => s.type !== 'warmup');
            if (workingSets.length === 0) return;

            let bestWeight = 0;
            let bestReps = 0;
            let best1RM = 0;
            let totalVolume = 0;

            workingSets.forEach(set => {
                const weight = set.weight || 0;
                const reps = set.reps || 0;
                totalVolume += calculateVolume(exerciseId, weight, reps);

                const est1RM = calculate1RM(weight, reps);
                if (est1RM > best1RM) {
                    best1RM = est1RM;
                    bestWeight = weight;
                    bestReps = reps;
                }
            });

            sessions.push({
                date: new Date(workout.date),
                sets: workingSets.length,
                bestWeight,
                bestReps,
                best1RM,
                volume: totalVolume
            });
        });
    });

    // Sort sessions by date (newest first for display, oldest first for chart)
    sessions.sort((a, b) => b.date - a.date);

    // Calculate stats
    const totalSessions = sessions.length;
    const lastSession = sessions[0];

    let maxWeight = 0;
    let overallBestSet = null;
    let overallBest1RM = 0;

    sessions.forEach(s => {
        if (s.bestWeight > maxWeight) maxWeight = s.bestWeight;
        if (s.best1RM > overallBest1RM) {
            overallBest1RM = s.best1RM;
            overallBestSet = { weight: s.bestWeight, reps: s.bestReps };
        }
    });

    // Use PR or baseline if no sessions
    if (maxWeight === 0) {
        maxWeight = pr ? (typeof pr === 'number' ? pr : pr.maxWeight || 0) : baseline;
    }

    // Calculate progress
    let progress = 0;
    if (baseline > 0 && maxWeight > 0) {
        progress = Math.round(((maxWeight - baseline) / baseline) * 100);
    }

    // Calculate frequency (sessions per week over last 12 weeks)
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
    const recentSessions = sessions.filter(s => s.date >= twelveWeeksAgo);
    const weeksTracked = Math.min(12, Math.ceil((new Date() - twelveWeeksAgo) / (7 * 24 * 60 * 60 * 1000)));
    const avgPerWeek = weeksTracked > 0 ? (recentSessions.length / weeksTracked).toFixed(1) : 0;

    // Update modal content
    document.getElementById('prDetailExerciseName').textContent = exerciseName;
    document.getElementById('prDetailLastPerformed').textContent = lastSession
        ? `Last: ${formatDate(lastSession.date)}`
        : 'Never performed';
    document.getElementById('prDetailTotalSessions').textContent = `${totalSessions} session${totalSessions !== 1 ? 's' : ''} total`;

    document.getElementById('prDetailMax').textContent = maxWeight > 0 ? `${maxWeight} lbs` : '--';
    document.getElementById('prDetailBestSet').textContent = overallBestSet
        ? `${overallBestSet.weight}×${overallBestSet.reps}`
        : '--';
    document.getElementById('prDetailEst1RM').textContent = overallBest1RM > 0 ? `${overallBest1RM} lbs` : '--';

    const progressEl = document.getElementById('prDetailProgress');
    if (baseline > 0) {
        const sign = progress > 0 ? '+' : '';
        progressEl.textContent = `${sign}${progress}%`;
        progressEl.className = 'pr-stat-value ' + (progress > 0 ? 'positive' : progress < 0 ? 'negative' : '');
    } else {
        progressEl.textContent = '--';
        progressEl.className = 'pr-stat-value';
    }

    document.getElementById('prDetailFrequency').textContent = `${avgPerWeek}× per week avg`;

    // Render calendar
    renderPRCalendar(exerciseId, sessions);

    // Render chart
    renderPRChart(sessions);

    // Render history table
    renderPRHistoryTable(sessions);

    // Show modal
    document.getElementById('prDetailModal').classList.add('active');
}

function closePRDetailModal() {
    document.getElementById('prDetailModal').classList.remove('active');
}

function togglePRHistory() {
    const table = document.getElementById('prDetailHistory');
    const icon = document.getElementById('prHistoryCollapseIcon');
    table.classList.toggle('collapsed');
    icon.textContent = table.classList.contains('collapsed') ? '▼' : '▲';
}

function formatDate(date) {
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function renderPRCalendar(exerciseId, sessions) {
    const container = document.getElementById('prDetailCalendar');

    // Create a map of dates when exercise was performed
    const performedDates = new Set();
    sessions.forEach(s => {
        performedDates.add(s.date.toDateString());
    });

    // Generate last 12 weeks of calendar
    const today = new Date();
    const weeks = [];

    for (let w = 11; w >= 0; w--) {
        const weekDays = [];
        for (let d = 0; d < 7; d++) {
            const date = new Date(today);
            date.setDate(today.getDate() - (w * 7) - (6 - d) - today.getDay());
            weekDays.push({
                date,
                performed: performedDates.has(date.toDateString()),
                future: date > today
            });
        }
        weeks.push(weekDays);
    }

    // Render calendar grid
    let html = '<div class="pr-calendar-grid">';

    // Day labels
    html += '<div class="pr-calendar-labels">';
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(day => {
        html += `<div class="pr-calendar-day-label">${day}</div>`;
    });
    html += '</div>';

    // Weeks
    html += '<div class="pr-calendar-weeks">';
    weeks.forEach(week => {
        html += '<div class="pr-calendar-week">';
        week.forEach(day => {
            const classes = ['pr-calendar-day'];
            if (day.performed) classes.push('performed');
            if (day.future) classes.push('future');
            html += `<div class="${classes.join(' ')}" title="${day.date.toLocaleDateString()}"></div>`;
        });
        html += '</div>';
    });
    html += '</div>';

    html += '</div>';

    container.innerHTML = html;
}

function renderPRChart(sessions) {
    const container = document.getElementById('prDetailChart');

    if (sessions.length < 2) {
        container.innerHTML = '<div class="empty-hint">Complete more sessions to see progress chart</div>';
        return;
    }

    // Sort by date ascending for chart
    const chartData = [...sessions].sort((a, b) => a.date - b.date);

    // Take last 20 sessions max
    const dataPoints = chartData.slice(-20);

    // Find min/max for scaling
    const weights = dataPoints.map(d => d.bestWeight);
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    const range = maxWeight - minWeight || 1;

    // Generate SVG chart
    const width = 280;
    const height = 60;
    const padding = { top: 5, right: 5, bottom: 5, left: 30 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Calculate points
    const points = dataPoints.map((d, i) => ({
        x: padding.left + (i / (dataPoints.length - 1)) * chartWidth,
        y: padding.top + chartHeight - ((d.bestWeight - minWeight) / range) * chartHeight,
        weight: d.bestWeight,
        date: d.date
    }));

    // Create path
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    // Create area path
    const areaD = pathD + ` L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;

    let svg = `<svg viewBox="0 0 ${width} ${height}" class="pr-chart-svg">`;

    // Only show min/max labels
    svg += `<text x="${padding.left - 5}" y="${padding.top + 4}" class="pr-chart-label">${maxWeight}</text>`;
    svg += `<text x="${padding.left - 5}" y="${height - padding.bottom}" class="pr-chart-label">${minWeight}</text>`;

    // Area fill
    svg += `<path d="${areaD}" class="pr-chart-area" />`;

    // Line
    svg += `<path d="${pathD}" class="pr-chart-line" />`;

    // Points (smaller)
    points.forEach(p => {
        svg += `<circle cx="${p.x}" cy="${p.y}" r="2.5" class="pr-chart-point" />`;
    });

    svg += '</svg>';

    container.innerHTML = svg;
}

function renderPRHistoryTable(sessions) {
    const container = document.getElementById('prDetailHistoryBody');

    if (sessions.length === 0) {
        container.innerHTML = '<div class="empty-hint">No sessions recorded</div>';
        return;
    }

    container.innerHTML = sessions.map(session => {
        const dateStr = session.date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: session.date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });

        const volumeStr = session.volume >= 1000
            ? `${(session.volume / 1000).toFixed(1)}k`
            : session.volume.toLocaleString();

        return `
            <div class="pr-history-row">
                <div class="pr-hist-col-date">${dateStr}</div>
                <div class="pr-hist-col-sets">${session.sets}</div>
                <div class="pr-hist-col-best">${session.bestWeight}×${session.bestReps}</div>
                <div class="pr-hist-col-volume">${volumeStr}</div>
            </div>
        `;
    }).join('');
}

function renderLiftProgress() {
    const container = document.getElementById('liftProgressContainer');
    const history = gameState.workoutHistory || [];

    if (history.length < 2) {
        container.innerHTML = '<div class="empty-hint">Complete more workouts to see your lift progression over time.</div>';
        return;
    }

    // Find exercises with multiple data points
    const exerciseData = {};

    history.forEach(workout => {
        if (!workout.exercises) return;
        workout.exercises.forEach(ex => {
            if (!ex.sets || ex.sets.length === 0) return;
            const maxWeight = Math.max(...ex.sets.map(s => s.weight || 0));
            if (maxWeight > 0) {
                if (!exerciseData[ex.id]) {
                    exerciseData[ex.id] = [];
                }
                exerciseData[ex.id].push({
                    date: workout.date,
                    weight: maxWeight
                });
            }
        });
    });

    // Get top 3 most performed exercises with progress
    const exerciseStats = Object.entries(exerciseData)
        .filter(([_, data]) => data.length >= 2)
        .map(([id, data]) => {
            // Sort by date
            data.sort((a, b) => new Date(a.date) - new Date(b.date));
            const currentMax = Math.max(...data.map(d => d.weight));
            const startWeight = data[0].weight;
            const improvement = currentMax - startWeight;
            return { id, data, currentMax, improvement, count: data.length };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

    if (exerciseStats.length === 0) {
        container.innerHTML = '<div class="empty-hint">Keep training! Progress charts will appear after more workouts.</div>';
        return;
    }

    container.innerHTML = exerciseStats.map(stat => {
        const exerciseName = getExerciseName(stat.id);
        const maxWeight = Math.max(...stat.data.map(d => d.weight));
        const minWeight = Math.min(...stat.data.map(d => d.weight));
        const range = maxWeight - minWeight || 1;

        // Take last 10 data points for the chart
        const chartData = stat.data.slice(-10);

        const bars = chartData.map((d, i) => {
            const height = ((d.weight - minWeight) / range) * 100;
            const isLast = i === chartData.length - 1;
            return `<div class="lift-progress-bar ${isLast ? 'current' : ''}" style="height: ${Math.max(height, 10)}%" title="${d.weight} lbs"></div>`;
        }).join('');

        const improvementText = stat.improvement > 0 ? `+${stat.improvement} lbs` : `${stat.improvement} lbs`;

        return `
            <div class="lift-progress-item">
                <div class="lift-progress-header">
                    <span class="lift-progress-name">${exerciseName}</span>
                    <span class="lift-progress-current">${stat.currentMax} lbs</span>
                </div>
                <div class="lift-progress-chart">${bars}</div>
                <div class="lift-progress-stats">
                    <span>Started: <span>${stat.data[0].weight} lbs</span></span>
                    <span>Progress: <span>${improvementText}</span></span>
                </div>
            </div>
        `;
    }).join('');
}

function getUnlockedAchievements() {
    const unlocked = [];
    const history = gameState.workoutHistory || [];
    const prs = gameState.personalRecords || {};

    // Filter out imported workouts for count/volume achievements
    const organicWorkouts = history.filter(w => !w.imported);
    const organicWorkoutCount = organicWorkouts.length;
    const organicVolume = organicWorkouts.reduce((sum, w) => sum + (w.totalVolume || 0), 0);

    const prCount = Object.keys(prs).length;

    // Workout count achievements (only count non-imported workouts)
    if (organicWorkoutCount >= 1) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'first_workout'), date: organicWorkouts[organicWorkouts.length - 1]?.date });
    if (organicWorkoutCount >= 5) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'five_workouts') });
    if (organicWorkoutCount >= 10) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'ten_workouts') });
    if (organicWorkoutCount >= 25) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'twenty_five_workouts') });
    if (organicWorkoutCount >= 50) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'fifty_workouts') });
    if (organicWorkoutCount >= 100) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'hundred_workouts') });

    // PR achievements (PRs from imports still count - they represent real lifts)
    if (prCount >= 1) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'first_pr') });
    if (prCount >= 5) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'five_prs') });

    // Specific lift achievements (imports count - these are real accomplishments)
    if (prs.bench && prs.bench.weight >= 135) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'bench_135') });
    if (prs.bench && prs.bench.weight >= 225) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'bench_225') });
    if (prs.squat && prs.squat.weight >= 225) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'squat_225') });
    if (prs.squat && prs.squat.weight >= 315) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'squat_315') });
    if (prs.deadlift && prs.deadlift.weight >= 315) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'deadlift_315') });
    if (prs.deadlift && prs.deadlift.weight >= 405) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'deadlift_405') });

    // Volume achievements (only count non-imported volume)
    if (organicVolume >= 10000) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'volume_10k') });
    if (organicVolume >= 100000) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'volume_100k') });
    if (organicVolume >= 1000000) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'volume_1m') });

    // Level achievements
    if (gameState.level >= 5) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'level_5') });
    if (gameState.level >= 10) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'level_10') });
    if (gameState.level >= 25) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'level_25') });

    // Progress-based achievements (compare current PRs to baselines)
    const baselines = gameState.baselines || {};
    let maxProgress = 0;

    Object.keys(prs).forEach(exerciseId => {
        const baseline = baselines[exerciseId];
        if (!baseline || baseline <= 0) return;

        const currentPR = prs[exerciseId];
        const currentWeight = typeof currentPR === 'number' ? currentPR : (currentPR?.weight || currentPR?.maxWeight || 0);

        if (currentWeight > 0) {
            const progressPercent = ((currentWeight - baseline) / baseline) * 100;
            if (progressPercent > maxProgress) {
                maxProgress = progressPercent;
            }
        }
    });

    if (maxProgress >= 10) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'progress_10') });
    if (maxProgress >= 20) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'progress_20') });
    if (maxProgress >= 30) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'progress_30') });
    if (maxProgress >= 50) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'progress_50') });
    if (maxProgress >= 100) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'progress_100') });

    return unlocked.filter(a => a); // Remove any undefined
}

function renderAchievements(unlockedAchievements) {
    const container = document.getElementById('achievementsGrid');
    const unlockedIds = new Set(unlockedAchievements.map(a => a.id));

    // Show unlocked first, then locked
    const sorted = [
        ...unlockedAchievements,
        ...ACHIEVEMENTS.filter(a => !unlockedIds.has(a.id))
    ];

    if (sorted.length === 0) {
        container.innerHTML = '<div class="empty-hint">No achievements available</div>';
        return;
    }

    container.innerHTML = sorted.map(achievement => {
        const isUnlocked = unlockedIds.has(achievement.id);
        return `
            <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-card-icon">${achievement.icon}</div>
                <div class="achievement-card-name">${achievement.name}</div>
                <div class="achievement-card-desc">${achievement.desc}</div>
                ${isUnlocked ? `<div class="achievement-card-date">+${achievement.xp} XP</div>` : ''}
            </div>
        `;
    }).join('');
}

function renderMilestones() {
    const container = document.getElementById('milestonesList');
    const history = gameState.workoutHistory || [];
    const prs = gameState.personalRecords || {};
    const totalVolume = history.reduce((sum, w) => sum + (w.totalVolume || 0), 0);

    const milestones = [];

    // Next workout milestone
    const workoutMilestones = [5, 10, 25, 50, 100];
    const nextWorkoutMilestone = workoutMilestones.find(m => m > (gameState.totalWorkouts || 0));
    if (nextWorkoutMilestone) {
        milestones.push({
            icon: '💪',
            name: `${nextWorkoutMilestone} Workouts`,
            desc: 'Complete more training sessions',
            current: gameState.totalWorkouts || 0,
            target: nextWorkoutMilestone
        });
    }

    // Volume milestones
    const volumeMilestones = [10000, 50000, 100000, 500000, 1000000];
    const nextVolumeMilestone = volumeMilestones.find(m => m > totalVolume);
    if (nextVolumeMilestone) {
        milestones.push({
            icon: '📊',
            name: `${formatNumber(nextVolumeMilestone)} lbs Volume`,
            desc: 'Total weight lifted',
            current: totalVolume,
            target: nextVolumeMilestone
        });
    }

    // Bench milestones
    const benchWeight = prs.bench?.weight || 0;
    const benchMilestones = [135, 185, 225, 275, 315];
    const nextBenchMilestone = benchMilestones.find(m => m > benchWeight);
    if (nextBenchMilestone) {
        milestones.push({
            icon: '🏋️',
            name: `Bench ${nextBenchMilestone} lbs`,
            desc: 'Hit a new bench PR',
            current: benchWeight,
            target: nextBenchMilestone
        });
    }

    // Level milestone
    const levelMilestones = [5, 10, 15, 20, 25, 50];
    const nextLevelMilestone = levelMilestones.find(m => m > (gameState.level || 1));
    if (nextLevelMilestone) {
        milestones.push({
            icon: '⭐',
            name: `Reach Level ${nextLevelMilestone}`,
            desc: 'Earn XP to level up',
            current: gameState.level || 1,
            target: nextLevelMilestone
        });
    }

    if (milestones.length === 0) {
        container.innerHTML = '<div class="empty-hint">You\'ve conquered all milestones! 🏆</div>';
        return;
    }

    container.innerHTML = milestones.slice(0, 4).map(milestone => {
        const progress = Math.min((milestone.current / milestone.target) * 100, 100);
        return `
            <div class="milestone-item">
                <div class="milestone-icon">${milestone.icon}</div>
                <div class="milestone-info">
                    <div class="milestone-name">${milestone.name}</div>
                    <div class="milestone-desc">${milestone.desc}</div>
                </div>
                <div class="milestone-progress">
                    <div class="milestone-progress-bar">
                        <div class="milestone-progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="milestone-progress-text">${formatNumber(milestone.current)}/${formatNumber(milestone.target)}</div>
                </div>
            </div>
        `;
    }).join('');
}

function getExerciseName(exerciseId) {
    // Check built-in exercises (allExercises is defined at top of file)
    const builtIn = allExercises.find(e => e.id === exerciseId);
    if (builtIn) return builtIn.name;

    // Check workout templates
    const workoutExercises = [
        ...workouts.push.exercises,
        ...workouts.pull.exercises,
        ...workouts.legs.exercises
    ];
    const fromWorkout = workoutExercises.find(e => e.id === exerciseId);
    if (fromWorkout) return fromWorkout.name;

    // Check custom exercises
    const custom = customExercises.find(e => e.id === exerciseId);
    if (custom) return custom.name;

    // Fallback: format the ID
    return exerciseId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getXPForLevel(level) {
    return level * 100;
}

// ============================================
// RESET
// ============================================

function resetGame() {
    if (confirm('Delete ALL save data? This cannot be undone.')) {
        localStorage.removeItem('ironquest_slots');
        localStorage.removeItem('ironquest_exercises');
        localStorage.removeItem('ironquest_workouts');
        localStorage.removeItem('ironquest_token');
        sessionStorage.removeItem('coachViewData');
        API.logout();
        location.reload();
    }
}
