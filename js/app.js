/**
 * IRON QUEST - Workout Tracker
 * PS1/Dreamcast Style Web Application
 * Version 3.0 - Custom Exercises, Custom Workouts, Character Stats
 */

// ============================================
// DATA STRUCTURES
// ============================================

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

    // Icon selection for workout creation
    document.querySelectorAll('#workoutIconSelector .icon-option-sm').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('#workoutIconSelector .icon-option-sm').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
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
});

// ============================================
// SAVE/LOAD SYSTEM
// ============================================

function loadSaveSlots() {
    try {
        const saved = localStorage.getItem('ironquest_slots');
        if (saved) {
            saveSlots = JSON.parse(saved);
        }
        renderCharacterSlots();
    } catch (e) {
        console.warn('Could not load save slots:', e);
    }
}

function saveSaveSlots() {
    try {
        localStorage.setItem('ironquest_slots', JSON.stringify(saveSlots));
    } catch (e) {
        console.warn('Could not save slots:', e);
    }
}

function saveCurrentCharacter() {
    if (currentSlotIndex !== null && gameState) {
        saveSlots[currentSlotIndex] = { ...gameState };
        saveSaveSlots();
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

function checkAuthState() {
    if (API.isAuthenticated()) {
        // Verify token is still valid
        API.getProfile().then(response => {
            currentUser = response.user;
            isOnlineMode = true;
            API.connectSocket();
            setupSocketListeners();
            updateOnlineUI();
        }).catch(() => {
            // Token invalid, clear it
            API.logout();
            isOnlineMode = false;
            currentUser = null;
        });
    }
}

function goToAuth() {
    showScreen('authScreen');
}

function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    document.querySelector('.auth-toggle-btn:first-child').classList.add('active');
    document.querySelector('.auth-toggle-btn:last-child').classList.remove('active');
}

function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.querySelector('.auth-toggle-btn:first-child').classList.remove('active');
    document.querySelector('.auth-toggle-btn:last-child').classList.add('active');
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
    const menuFooter = document.querySelector('.menu-footer');

    if (isOnlineMode && currentUser) {
        if (onlineBtn) onlineBtn.style.display = 'none';
        if (teamsTab) teamsTab.style.display = 'block';
        if (menuFooter) {
            menuFooter.innerHTML = `
                <span class="online-status">ONLINE: ${currentUser.username}</span>
                <button class="logout-btn" onclick="handleLogout()">LOGOUT</button>
            `;
        }
    } else {
        if (onlineBtn) onlineBtn.style.display = 'block';
        if (teamsTab) teamsTab.style.display = 'none';
        if (menuFooter) {
            menuFooter.innerHTML = '';
        }
    }
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
    container.innerHTML = saveSlots.map((slot, index) => {
        if (slot) {
            return `
                <div class="character-slot" onclick="selectCharacter(${index})">
                    <button class="delete-btn" onclick="event.stopPropagation(); deleteCharacter(${index})">×</button>
                    <div class="slot-avatar">${avatarSVGs[slot.avatar] || avatarSVGs[1]}</div>
                    <div class="slot-name">${slot.playerName}</div>
                    <div class="slot-level">LEVEL ${slot.level}</div>
                    <div class="slot-stats">${slot.totalWorkouts} workouts</div>
                </div>
            `;
        } else {
            return `
                <div class="character-slot empty" onclick="createNewCharacter(${index})">
                    <div class="empty-slot-icon">+</div>
                    <div class="slot-name">NEW WARRIOR</div>
                </div>
            `;
        }
    }).join('');
}

function selectCharacter(index) {
    currentSlotIndex = index;
    gameState = { ...saveSlots[index] };
    updateMenuStats();
    renderCustomLists();
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

function deleteCharacter(index) {
    if (confirm('Delete this character? This cannot be undone.')) {
        saveSlots[index] = null;
        saveSaveSlots();
        renderCharacterSlots();
    }
}

function startGame() {
    const nameInput = document.getElementById('playerName');
    const selectedAvatar = document.querySelector('.avatar-option.selected');
    const avatarId = selectedAvatar ? parseInt(selectedAvatar.dataset.avatar) : 1;

    // Get character stats
    const heightFeet = parseInt(document.getElementById('heightFeet').value) || 0;
    const heightInches = parseInt(document.getElementById('heightInches').value) || 0;
    const weight = parseInt(document.getElementById('playerWeight').value) || 0;
    const gender = document.getElementById('playerGender').value || '';

    // Calculate total height in inches
    const totalHeight = (heightFeet * 12) + heightInches;

    gameState = {
        name: nameInput.value.toUpperCase() || 'PLAYER_01',
        playerName: nameInput.value.toUpperCase() || 'PLAYER_01', // Keep for backwards compat
        avatar: avatarId,
        height: totalHeight,
        heightFeet: heightFeet,
        heightInches: heightInches,
        weight: weight,
        gender: gender,
        level: 1,
        xp: 0,
        xpToNext: 100,
        totalWorkouts: 0,
        totalSets: 0,
        totalWeight: 0,
        achievements: [],
        personalRecords: {},
        workoutHistory: [],
        createdAt: new Date().toISOString()
    };

    saveSlots[currentSlotIndex] = gameState;
    saveSaveSlots();
    updateMenuStats();
    renderCustomLists();
    showScreen('menuScreen');
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
    } else if (tab === 'share') {
        renderShareTab();
    } else if (tab === 'teams') {
        loadTeams();
    }
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
    document.getElementById('menuAvatar').innerHTML = avatarSVGs[gameState.avatar] || avatarSVGs[1];
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
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
                    <div class="exercise-item superset-exercise ${groupCompleted ? 'completed' : ''}"
                         onclick="${supersetMode ? `toggleSupersetSelection('${groupEx.id}')` : `openSetModal('${groupEx.id}')`}">
                        <div>
                            <div class="exercise-name">${groupEx.name}</div>
                            <div class="exercise-sets">${groupSets.length} / ${groupEx.targetSets} sets</div>
                        </div>
                        <div class="exercise-status">${groupCompleted ? 'COMPLETE' : 'TAP TO LOG'}</div>
                    </div>
                `;
            });

            html += `</div>`;
        } else {
            // Render single exercise
            const isSelected = supersetSelections.includes(ex.id);
            processedIds.add(ex.id);

            html += `
                <div class="exercise-item ${completed ? 'completed' : ''} ${isSelected ? 'superset-selected' : ''}"
                     onclick="${supersetMode ? `toggleSupersetSelection('${ex.id}')` : `openSetModal('${ex.id}')`}">
                    <div>
                        <div class="exercise-name">${ex.name}</div>
                        <div class="exercise-sets">${sets.length} / ${ex.targetSets} sets</div>
                    </div>
                    <div class="exercise-status">
                        ${supersetMode ? (isSelected ? 'SELECTED' : 'TAP TO SELECT') : (completed ? 'COMPLETE' : 'TAP TO LOG')}
                    </div>
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
    document.querySelectorAll('.set-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === 'normal');
    });

    // Show previous workout data
    showPreviousWorkoutData();

    // Update 1RM estimate
    updateOrmEstimate();

    // Reset plate calculator
    document.getElementById('plateCalculator').style.display = 'none';

    renderLoggedSets();
    document.getElementById('setModal').classList.add('active');

    // Add input listeners for 1RM calculation
    document.getElementById('weightInput').addEventListener('input', updateOrmEstimate);
    document.getElementById('repsInput').addEventListener('input', updateOrmEstimate);
    document.getElementById('weightInput').addEventListener('input', updatePlateCalculator);
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

    // Calculate XP
    const xpGain = Math.floor((weight * reps) / 10);
    addXP(xpGain);

    // Update stats
    gameState.totalSets++;
    gameState.totalWeight += weight * reps;

    // Check for milestone achievements
    checkMilestones(currentExercise.id, weight);

    // Update personal records (max single rep weight and max tonnage)
    const tonnage = weight * reps;
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
    document.getElementById('timerDisplay').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

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
    document.querySelectorAll('.set-type-btn').forEach(btn => {
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

const PLATES = [45, 35, 25, 10, 5, 2.5];
const BAR_WEIGHT = 45;

function togglePlateCalculator() {
    const calc = document.getElementById('plateCalculator');
    calc.style.display = calc.style.display === 'none' ? 'block' : 'none';
    if (calc.style.display === 'block') {
        updatePlateCalculator();
    }
}

function updatePlateCalculator() {
    const weight = parseInt(document.getElementById('weightInput').value) || 0;
    const perSide = (weight - BAR_WEIGHT) / 2;

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

    for (const plate of PLATES) {
        while (remaining >= plate) {
            platesNeeded.push(plate);
            remaining -= plate;
        }
    }

    // Visual representation
    const colors = {
        45: '#e74c3c',
        35: '#f1c40f',
        25: '#2ecc71',
        10: '#3498db',
        5: '#9b59b6',
        2.5: '#95a5a6'
    };

    plateVisual.innerHTML = platesNeeded.map(p =>
        `<div class="plate-disc" style="background: ${colors[p]}; height: ${20 + p}px;">${p}</div>`
    ).join('') || '<div class="no-plates">Bar only</div>';

    // Text list
    const plateCounts = {};
    platesNeeded.forEach(p => plateCounts[p] = (plateCounts[p] || 0) + 1);
    plateList.innerHTML = Object.entries(plateCounts)
        .map(([plate, count]) => `<span class="plate-count">${count}×${plate}lb</span>`)
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
    if (notes.style.display === 'none') {
        notes.style.display = 'block';
        toggle.textContent = '▲';
    } else {
        notes.style.display = 'none';
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
            const volume = ex.sets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
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
                const volume = set.weight * set.reps;
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
            sets.forEach(s => totalVolume += s.weight * s.reps);
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

            // Notify team via socket
            API.notifyWorkoutCompleted(currentWorkout.name, xpEarned + bonusXP, totalVolume);
        } catch (error) {
            console.error('Failed to save workout to server:', error);
        }
    }

    // Show workout summary modal
    showWorkoutSummary(duration, totalSets, totalVolume, xpEarned + bonusXP, exerciseData);

    // Clear workout notes
    if (document.getElementById('workoutNotes')) {
        document.getElementById('workoutNotes').value = '';
        document.getElementById('workoutNotes').style.display = 'none';
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

    if (!gameState.workoutHistory || gameState.workoutHistory.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <p>No workouts yet. Start your first quest!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = gameState.workoutHistory.slice(0, 10).map(workout => {
        const date = new Date(workout.date);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

        return `
            <div class="history-item" onclick="showWorkoutDetail('${workout.id}')">
                <div class="history-item-header">
                    <span class="history-item-type ${workout.type}">${workout.name}</span>
                    <span class="history-item-date">${dateStr} ${timeStr}</span>
                </div>
                <div class="history-item-stats">
                    <div><span>${workout.totalSets}</span> sets</div>
                    <div><span>${formatNumber(workout.totalVolume)}</span> lbs</div>
                    <div><span>+${workout.xpEarned}</span> XP</div>
                </div>
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
        <h2>${workout.name}</h2>
        <p style="text-align: center; color: var(--ps1-gray); margin-bottom: 20px;">
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
        <button class="dc-button secondary" onclick="closeWorkoutDetail()" style="margin-top: 20px;">CLOSE</button>
    `;

    document.getElementById('workoutDetailModal').classList.add('active');
}

function closeWorkoutDetail() {
    document.getElementById('workoutDetailModal').classList.remove('active');
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
    const now = new Date();

    if (gameState.workoutHistory) {
        gameState.workoutHistory.forEach(workout => {
            const date = new Date(workout.date);
            const weekStart = getWeekStart(date);
            const key = weekStart.toISOString();

            if (!weeklyVolume[key]) {
                weeklyVolume[key] = { date: weekStart, volume: 0 };
            }
            weeklyVolume[key].volume += workout.totalVolume;
        });
    }

    const data = Object.values(weeklyVolume)
        .sort((a, b) => a.date - b.date)
        .slice(-8);

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

    const bars = data.map(d => {
        const height = (d.volume / maxVolume) * 100;
        const label = d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `
            <div class="bar" style="height: ${height}%">
                <span class="bar-value">${formatNumber(d.volume)}</span>
                <span class="bar-label">${label}</span>
            </div>
        `;
    }).join('');

    container.innerHTML = `<div class="bar-chart">${bars}</div>`;
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
    document.getElementById('shareCodeDisplay').style.display = 'block';
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
                csv += `${date},${workout.name},${ex.name},${i + 1},${set.weight},${set.reps},${set.weight * set.reps}\n`;
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
    document.getElementById('coachAvatar').innerHTML = avatarSVGs[data.a] || avatarSVGs[1];

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

function openCreateWorkoutModal() {
    document.getElementById('newWorkoutName').value = '';
    selectedWorkoutExercises = [];

    // Reset icon selection
    document.querySelectorAll('#workoutIconSelector .icon-option-sm').forEach((o, i) => {
        o.classList.toggle('selected', i === 0);
    });

    renderExerciseSelector();
    updateSelectedExercisesList();
    document.getElementById('createWorkoutModal').classList.add('active');
}

function closeCreateWorkoutModal() {
    document.getElementById('createWorkoutModal').classList.remove('active');
    selectedWorkoutExercises = [];
}

function renderExerciseSelector() {
    const container = document.getElementById('exerciseSelector');

    // Group exercises by muscle
    const muscleGroups = {
        chest: { name: 'CHEST', icon: '🫁', exercises: [] },
        back: { name: 'BACK', icon: '🔙', exercises: [] },
        shoulders: { name: 'SHOULDERS', icon: '💪', exercises: [] },
        biceps: { name: 'BICEPS', icon: '💪', exercises: [] },
        triceps: { name: 'TRICEPS', icon: '💪', exercises: [] },
        quads: { name: 'QUADRICEPS', icon: '🦵', exercises: [] },
        hamstrings: { name: 'HAMSTRINGS', icon: '🦵', exercises: [] },
        glutes: { name: 'GLUTES', icon: '🍑', exercises: [] },
        calves: { name: 'CALVES', icon: '🦶', exercises: [] },
        core: { name: 'CORE', icon: '🎯', exercises: [] },
        custom: { name: 'CUSTOM', icon: '⭐', exercises: [] }
    };

    // Sort built-in exercises into groups
    allExercises.forEach(ex => {
        if (muscleGroups[ex.muscle]) {
            muscleGroups[ex.muscle].exercises.push(ex);
        }
    });

    // Add custom exercises
    customExercises.forEach(ex => {
        muscleGroups.custom.exercises.push(ex);
    });

    // Render grouped exercises
    let html = '';
    Object.entries(muscleGroups).forEach(([key, group]) => {
        if (group.exercises.length === 0) return;

        html += `<div class="exercise-group">
            <div class="exercise-group-header" onclick="toggleExerciseGroup('${key}')">
                <span>${group.icon} ${group.name}</span>
                <span class="group-count">${group.exercises.length}</span>
            </div>
            <div class="exercise-group-items" id="exerciseGroup_${key}">
                ${group.exercises.map(ex => {
                    const isSelected = selectedWorkoutExercises.some(s => s.id === ex.id);
                    return `
                        <div class="exercise-option ${isSelected ? 'selected' : ''}" onclick="toggleExerciseSelection('${ex.id}', '${ex.name.replace(/'/g, "\\'")}')">
                            <span class="exercise-name">${ex.name}</span>
                            <span class="exercise-equipment">${getEquipmentIcon(ex.equipment)}</span>
                            <span class="exercise-check">${isSelected ? '✓' : '+'}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

function toggleExerciseGroup(groupKey) {
    const group = document.getElementById(`exerciseGroup_${groupKey}`);
    group.classList.toggle('collapsed');
}

function getEquipmentIcon(equipment) {
    const icons = {
        barbell: '🏋️',
        dumbbell: '🔩',
        cable: '🔗',
        machine: '⚙️',
        bodyweight: '🧍',
        other: '📦'
    };
    return icons[equipment] || '';
}

function toggleExerciseSelection(id, name) {
    const index = selectedWorkoutExercises.findIndex(e => e.id === id);

    if (index >= 0) {
        selectedWorkoutExercises.splice(index, 1);
    } else {
        selectedWorkoutExercises.push({ id, name, targetSets: 3 });
    }

    renderExerciseSelector();
    updateSelectedExercisesList();
}

function updateSelectedExercisesList() {
    document.getElementById('selectedCount').textContent = `${selectedWorkoutExercises.length} selected`;

    // The container may not exist in the streamlined UI
    const container = document.getElementById('selectedExercisesList');
    if (!container) return;

    if (selectedWorkoutExercises.length === 0) {
        container.innerHTML = '<div class="empty-hint">Select exercises above</div>';
        return;
    }

    container.innerHTML = selectedWorkoutExercises.map((ex, i) => `
        <div class="selected-exercise-item">
            <span class="exercise-name">${ex.name}</span>
            <div class="sets-control">
                <button onclick="adjustSets(${i}, -1)">-</button>
                <span>${ex.targetSets} sets</span>
                <button onclick="adjustSets(${i}, 1)">+</button>
            </div>
            <button class="remove-btn" onclick="removeFromSelection(${i})">×</button>
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

function removeFromSelection(index) {
    selectedWorkoutExercises.splice(index, 1);
    renderExerciseSelector();
    updateSelectedExercisesList();
}

function saveCustomWorkout() {
    const name = document.getElementById('newWorkoutName').value.trim();
    const selectedIcon = document.querySelector('#workoutIconSelector .icon-option-sm.selected');
    const icon = selectedIcon ? selectedIcon.dataset.icon : '💪';

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
    renderCustomProgramList();
    renderCustomWorkoutList();
    renderCustomExerciseList();
}

function renderCustomWorkoutList() {
    const container = document.getElementById('customWorkoutList');
    if (!container) return;

    if (customWorkouts.length === 0) {
        container.innerHTML = '<div class="empty-hint">No custom workouts yet</div>';
        return;
    }

    container.innerHTML = customWorkouts.map(workout => `
        <div class="custom-workout-card" onclick="startCustomWorkout('${workout.id}')">
            <div class="workout-icon">${workout.icon}</div>
            <div class="workout-info">
                <div class="workout-name">${workout.name}</div>
                <div class="workout-exercises">${workout.exercises.length} exercises</div>
            </div>
            <button class="delete-btn" onclick="event.stopPropagation(); deleteCustomWorkout('${workout.id}')">×</button>
        </div>
    `).join('');
}

function renderCustomExerciseList() {
    const container = document.getElementById('customExerciseList');
    if (!container) return;

    // Group all exercises by muscle
    const muscleGroups = {
        chest: { name: 'CHEST', icon: '🫁', exercises: [] },
        back: { name: 'BACK', icon: '🔙', exercises: [] },
        shoulders: { name: 'SHOULDERS', icon: '🎯', exercises: [] },
        biceps: { name: 'BICEPS', icon: '💪', exercises: [] },
        triceps: { name: 'TRICEPS', icon: '💪', exercises: [] },
        quads: { name: 'QUADS', icon: '🦵', exercises: [] },
        hamstrings: { name: 'HAMSTRINGS', icon: '🦵', exercises: [] },
        glutes: { name: 'GLUTES', icon: '🍑', exercises: [] },
        calves: { name: 'CALVES', icon: '🦶', exercises: [] },
        core: { name: 'CORE', icon: '🎯', exercises: [] },
        custom: { name: 'MY EXERCISES', icon: '⭐', exercises: [] }
    };

    // Add built-in exercises
    allExercises.forEach(ex => {
        if (muscleGroups[ex.muscle]) {
            muscleGroups[ex.muscle].exercises.push({ ...ex, isCustom: false });
        }
    });

    // Add custom exercises
    customExercises.forEach(ex => {
        muscleGroups.custom.exercises.push({ ...ex, isCustom: true });
    });

    // Render grouped exercises
    let html = '';
    Object.entries(muscleGroups).forEach(([key, group]) => {
        if (group.exercises.length === 0) return;

        html += `
            <div class="exercise-library-group">
                <div class="exercise-library-header" onclick="toggleLibraryGroup('${key}')">
                    <span>${group.icon} ${group.name}</span>
                    <span class="group-badge">${group.exercises.length}</span>
                </div>
                <div class="exercise-library-items collapsed" id="libraryGroup_${key}">
                    ${group.exercises.map(ex => `
                        <div class="exercise-library-item">
                            <div class="exercise-info">
                                <div class="exercise-name">${ex.name}</div>
                                <div class="exercise-meta">${getEquipmentIcon(ex.equipment)} ${ex.equipment || 'other'}</div>
                            </div>
                            ${ex.isCustom ? `<button class="delete-btn" onclick="deleteCustomExercise('${ex.id}')">×</button>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
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

    container.innerHTML = customPrograms.map(program => {
        const workoutCount = program.workouts ? program.workouts.length : 0;
        const periodLabel = getPeriodLabel(program.period);
        return `
            <div class="custom-program-card" onclick="openProgramDetail('${program.id}')">
                <div class="program-icon">${program.icon}</div>
                <div class="program-info">
                    <div class="program-name">${program.name}</div>
                    <div class="program-schedule">${workoutCount}/${program.workoutsPerPeriod} workouts / ${periodLabel}</div>
                </div>
                <div class="program-arrow">›</div>
            </div>
        `;
    }).join('');
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
        <div class="program-workout-item" onclick="showWorkoutOptions('${currentProgram.id}', ${index})">
            <div class="workout-order">${index + 1}</div>
            <div class="workout-icon">${workout.icon || '💪'}</div>
            <div class="workout-info">
                <div class="workout-name">${workout.name}</div>
                <div class="workout-exercises">${workout.exercises.length} exercises</div>
            </div>
            <div class="workout-actions">
                <button class="launch-btn" onclick="event.stopPropagation(); launchProgramWorkout('${currentProgram.id}', ${index})" title="Start Workout">▶</button>
                <button class="delete-btn" onclick="event.stopPropagation(); removeWorkoutFromProgram(${index})">×</button>
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
    try {
        const response = await API.getTeam(teamId);
        currentTeam = response.team;

        // Join the team's socket room
        API.joinTeamRoom(teamId);

        // Update team header
        document.getElementById('teamDetailName').textContent = currentTeam.name;
        document.getElementById('teamDetailAvatar').textContent = currentTeam.avatar || '⚔️';
        document.getElementById('teamInviteCode').textContent = currentTeam.invite_code || 'N/A';

        // Load initial data
        switchTeamTab('leaderboard');

        showScreen('teamDetailScreen');
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
                <div class="leaderboard-item ${entry.user_id === currentUser?.id ? 'current-user' : ''}">
                    <span class="rank">${i + 1}</span>
                    <span class="name">${escapeHtml(entry.username)}</span>
                    <span class="score">${formatNumber(entry.total_xp || 0)} XP</span>
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
        showToast('TEAM CREATED!');
        loadTeams();

        // Automatically open the new team
        if (response.team) {
            openTeam(response.team.id);
        }
    } catch (error) {
        showToast(error.message || 'FAILED TO CREATE');
    }
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

function copyInviteCode() {
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
    { id: 'level_25', name: 'Elite', desc: 'Reach Level 25', icon: '☀️', xp: 1500 }
];

function openCharacterProfile() {
    console.log('openCharacterProfile called, gameState:', gameState);
    if (!gameState) {
        console.warn('No gameState - cannot open profile');
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
        avatarEl.innerHTML = avatarSVGs[gameState.avatar] || avatarSVGs[1];
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

    document.getElementById('profileWorkouts').textContent = formatNumber(gameState.totalWorkouts || 0);
    document.getElementById('profileSets').textContent = formatNumber(totalSets);
    document.getElementById('profileVolume').textContent = formatNumber(totalVolume);

    // Count unlocked achievements
    const unlockedAchievements = getUnlockedAchievements();
    document.getElementById('profileAchievementCount').textContent = unlockedAchievements.length;

    // Body stats
    renderBodyStats();

    // Personal records
    renderProfilePRs();

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
}

function renderProfilePRs() {
    const container = document.getElementById('profilePRGrid');
    const prs = gameState.personalRecords || {};
    const prEntries = Object.entries(prs);

    if (prEntries.length === 0) {
        container.innerHTML = '<div class="empty-hint">No personal records yet. Complete workouts to set PRs!</div>';
        return;
    }

    // Normalize and sort by max weight descending
    const normalizedPRs = prEntries.map(([exerciseId, pr]) => {
        // Handle legacy format (just a number)
        if (typeof pr === 'number') {
            return {
                exerciseId,
                maxWeight: pr,
                maxWeightDate: null,
                maxTonnage: null,
                maxTonnageWeight: null,
                maxTonnageReps: null
            };
        }
        return { exerciseId, ...pr };
    });

    normalizedPRs.sort((a, b) => (b.maxWeight || 0) - (a.maxWeight || 0));

    container.innerHTML = normalizedPRs.map(pr => {
        const exerciseName = getExerciseName(pr.exerciseId);
        const maxWeightDate = pr.maxWeightDate ? new Date(pr.maxWeightDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
        const tonnageDisplay = pr.maxTonnage ? `${pr.maxTonnageWeight}×${pr.maxTonnageReps} = ${formatNumber(pr.maxTonnage)} lbs` : '--';

        return `
            <div class="profile-pr-card">
                <div class="profile-pr-header">
                    <div class="profile-pr-icon">🏆</div>
                    <div class="profile-pr-exercise">${exerciseName}</div>
                </div>
                <div class="profile-pr-stats">
                    <div class="pr-stat">
                        <div class="pr-stat-label">MAX WEIGHT</div>
                        <div class="pr-stat-value">${pr.maxWeight || 0} lbs</div>
                        ${maxWeightDate ? `<div class="pr-stat-date">${maxWeightDate}</div>` : ''}
                    </div>
                    <div class="pr-stat">
                        <div class="pr-stat-label">MAX TONNAGE</div>
                        <div class="pr-stat-value tonnage">${tonnageDisplay}</div>
                    </div>
                </div>
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
    const totalVolume = history.reduce((sum, w) => sum + (w.totalVolume || 0), 0);
    const prCount = Object.keys(prs).length;

    // Workout count achievements
    if (gameState.totalWorkouts >= 1) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'first_workout'), date: history[history.length - 1]?.date });
    if (gameState.totalWorkouts >= 5) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'five_workouts') });
    if (gameState.totalWorkouts >= 10) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'ten_workouts') });
    if (gameState.totalWorkouts >= 25) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'twenty_five_workouts') });
    if (gameState.totalWorkouts >= 50) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'fifty_workouts') });
    if (gameState.totalWorkouts >= 100) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'hundred_workouts') });

    // PR achievements
    if (prCount >= 1) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'first_pr') });
    if (prCount >= 5) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'five_prs') });

    // Specific lift achievements
    if (prs.bench && prs.bench.weight >= 135) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'bench_135') });
    if (prs.bench && prs.bench.weight >= 225) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'bench_225') });
    if (prs.squat && prs.squat.weight >= 225) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'squat_225') });
    if (prs.squat && prs.squat.weight >= 315) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'squat_315') });
    if (prs.deadlift && prs.deadlift.weight >= 315) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'deadlift_315') });
    if (prs.deadlift && prs.deadlift.weight >= 405) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'deadlift_405') });

    // Volume achievements
    if (totalVolume >= 10000) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'volume_10k') });
    if (totalVolume >= 100000) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'volume_100k') });
    if (totalVolume >= 1000000) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'volume_1m') });

    // Level achievements
    if (gameState.level >= 5) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'level_5') });
    if (gameState.level >= 10) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'level_10') });
    if (gameState.level >= 25) unlocked.push({ ...ACHIEVEMENTS.find(a => a.id === 'level_25') });

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
    // Check built-in exercises
    const allExercises = [
        ...Object.values(EXERCISES.push || {}),
        ...Object.values(EXERCISES.pull || {}),
        ...Object.values(EXERCISES.legs || {})
    ].flat();

    const builtIn = allExercises.find(e => e.id === exerciseId);
    if (builtIn) return builtIn.name;

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
