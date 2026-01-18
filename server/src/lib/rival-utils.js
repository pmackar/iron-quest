/**
 * Rival System Utilities
 */

// Phantom name options
const PHANTOM_NAMES = [
    'Iron Shadow', 'Steel Ghost', 'The Crusher', 'Barbell Baron',
    'Plate Phantom', 'Rep Reaper', 'Set Slayer', 'Volume Victor',
    'Strength Specter', 'Gym Guardian', 'The Grinder', 'Iron Will',
    'Power Prophet', 'Muscle Mirage', 'The Beast', 'Iron Knight'
];

// Response templates by personality
const RESPONSE_TEMPLATES = {
    friendly: {
        chat: [
            "Great work! Keep pushing!",
            "You're doing amazing, but I'm still catching up!",
            "Nice effort! Let's both give it our all!",
            "That's the spirit! See you at the gym!"
        ],
        challenge: [
            "Challenge accepted! May the best lifter win!",
            "Ooh, this will be fun! Good luck!",
            "You're on! Let's make each other better!"
        ],
        congratulate: [
            "Awesome job! You earned that win!",
            "Well done! I'll get you next time!",
            "Impressive performance!"
        ]
    },
    competitive: {
        chat: [
            "Not bad, but I can do better.",
            "Is that all you've got?",
            "I'm coming for that top spot.",
            "Your move. I'll be ready."
        ],
        challenge: [
            "Finally, a worthy opponent.",
            "Bring it on. I've been waiting for this.",
            "Let's see what you're made of."
        ],
        congratulate: [
            "Good match. Don't expect it to happen again.",
            "You got lucky this time.",
            "Enjoy it while it lasts."
        ]
    },
    trash_talker: {
        chat: [
            "Ha! I've seen better from beginners.",
            "You call that a workout? Watch and learn.",
            "Keep trying. Maybe one day you'll catch up.",
            "I'm not even breaking a sweat yet."
        ],
        challenge: [
            "Oh, you actually think you have a chance?",
            "This will be over quick.",
            "Prepare to get crushed!"
        ],
        congratulate: [
            "...beginner's luck.",
            "I wasn't even trying.",
            "Enjoy your moment. It won't last."
        ]
    },
    stoic: {
        chat: [
            "Noted.",
            "The iron doesn't lie.",
            "Consistency is key.",
            "Keep grinding."
        ],
        challenge: [
            "Very well.",
            "Let us see.",
            "Actions speak louder than words."
        ],
        congratulate: [
            "Well earned.",
            "Respect.",
            "Strong performance."
        ]
    },
    mentor: {
        chat: [
            "Good progress! Remember to focus on form.",
            "You're improving! Try adding progressive overload.",
            "Solid effort. Recovery is just as important.",
            "I see potential in you. Keep at it."
        ],
        challenge: [
            "This will be a good learning experience for both of us.",
            "Competition breeds excellence. Let's go.",
            "Show me what you've learned."
        ],
        congratulate: [
            "Excellent execution! I'm proud of your progress.",
            "You've grown so much. Well deserved!",
            "This is what all the hard work was for."
        ]
    }
};

/**
 * Generate phantom stats based on user level
 * @param {Object} userStats - User's stats
 * @returns {Object} Phantom stats
 */
function generatePhantomStats(userStats) {
    const { level, totalWeight, totalWorkouts } = userStats;

    // Calculate average workout volume
    const avgWorkoutVolume = totalWorkouts > 0 ? totalWeight / totalWorkouts : 5000;

    // Generate phantom stats with some variance (90-110% of user)
    const variance = 0.9 + Math.random() * 0.2;
    const weeklyVolume = Math.floor(avgWorkoutVolume * 4 * variance); // 4 workouts per week estimate

    return {
        weeklyVolume,
        weeklyWorkouts: Math.floor(3 + Math.random() * 3), // 3-5 workouts
        consistency: 0.7 + Math.random() * 0.25 // 70-95%
    };
}

/**
 * Generate AI response based on personality and context
 * @param {Object} params - Response parameters
 * @returns {Object} Generated response
 */
function generatePhantomResponse(params) {
    const { personality, messageType = 'chat' } = params;

    const templates = RESPONSE_TEMPLATES[personality] || RESPONSE_TEMPLATES.friendly;
    const typeTemplates = templates[messageType] || templates.chat;

    const content = typeTemplates[Math.floor(Math.random() * typeTemplates.length)];

    return { content, type: messageType };
}

/**
 * Calculate encounter winner
 * @param {Object} stats - Encounter stats
 * @returns {Object} Result with winner and rewards
 */
function calculateEncounterWinner(stats) {
    const { userVolume, userWorkouts, rivalVolume, rivalWorkouts } = stats;

    // Calculate total score (volume weighted more than workouts)
    const userScore = userVolume + (userWorkouts * 1000);
    const rivalScore = rivalVolume + (rivalWorkouts * 1000);

    // Margin of victory
    const totalScore = userScore + rivalScore;
    const margin = Math.abs(userScore - rivalScore) / (totalScore || 1);

    // Determine winner (5% margin needed for clear win)
    let winner;
    if (margin < 0.05) {
        winner = 'tie';
    } else if (userScore > rivalScore) {
        winner = 'user';
    } else {
        winner = 'rival';
    }

    // Calculate XP reward based on margin
    let xpReward = 0;
    if (winner === 'user') {
        xpReward = Math.floor(50 + (margin * 100)); // 50-150 XP
    }

    // Calculate respect change
    let respectChange = 0;
    if (winner === 'user') {
        respectChange = Math.floor(10 + (margin * 20));
    } else if (winner === 'rival') {
        respectChange = -Math.floor(5 + (margin * 10));
    }

    return {
        winner,
        xpReward,
        respectChange,
        margin: Math.round(margin * 100),
        stats: {
            userScore,
            rivalScore
        }
    };
}

/**
 * Check if revenge is available for an encounter
 * @param {Object} encounter - Encounter data
 * @returns {boolean}
 */
function isRevengeAvailable(encounter) {
    const { winner, revengeAvailableUntil, hasRevengeBeenTaken } = encounter;

    // Only losses have revenge option
    if (winner !== 'rival') return false;

    // Check if already taken
    if (hasRevengeBeenTaken) return false;

    // Check if still within revenge window
    if (!revengeAvailableUntil) return false;

    return new Date(revengeAvailableUntil) > new Date();
}

/**
 * Evolve phantom based on rivalry history
 * @param {Object} rivalry - Rivalry data
 * @returns {Object} Evolved phantom data
 */
function evolvePhantom(rivalry) {
    const { phantomLevel, phantomStats, userWins, rivalWins } = rivalry;

    const totalEncounters = userWins + rivalWins;
    if (totalEncounters === 0) return { phantomLevel, phantomStats };

    // Calculate win rate
    const userWinRate = userWins / totalEncounters;

    // Rubber-banding: adjust phantom difficulty
    let levelChange = 0;
    let volumeMultiplier = 1;

    if (userWinRate > 0.7) {
        // User dominating - make phantom harder
        levelChange = 1;
        volumeMultiplier = 1.1;
    } else if (userWinRate < 0.3) {
        // Phantom dominating - make it easier
        levelChange = 0;
        volumeMultiplier = 0.9;
    } else {
        // Balanced - small increase
        levelChange = userWinRate > 0.5 ? 1 : 0;
        volumeMultiplier = 1 + (userWinRate - 0.5) * 0.1;
    }

    return {
        phantomLevel: phantomLevel + levelChange,
        phantomStats: {
            ...phantomStats,
            weeklyVolume: Math.floor(phantomStats.weeklyVolume * volumeMultiplier),
            weeklyWorkouts: phantomStats.weeklyWorkouts
        }
    };
}

/**
 * Generate a phantom name
 * @returns {string}
 */
function generatePhantomName() {
    return PHANTOM_NAMES[Math.floor(Math.random() * PHANTOM_NAMES.length)];
}

/**
 * Generate phantom personality
 * @returns {string}
 */
function generatePhantomPersonality() {
    const personalities = ['friendly', 'competitive', 'trash_talker', 'stoic', 'mentor'];
    return personalities[Math.floor(Math.random() * personalities.length)];
}

module.exports = {
    generatePhantomStats,
    generatePhantomResponse,
    calculateEncounterWinner,
    isRevengeAvailable,
    evolvePhantom,
    generatePhantomName,
    generatePhantomPersonality,
    PHANTOM_NAMES,
    RESPONSE_TEMPLATES
};
