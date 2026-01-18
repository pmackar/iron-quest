const express = require('express');
const db = require('../db/config');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Phantom name generator
const PHANTOM_NAMES = [
    'Iron Shadow', 'Steel Ghost', 'The Crusher', 'Barbell Baron',
    'Plate Phantom', 'Rep Reaper', 'Set Slayer', 'Volume Victor',
    'Strength Specter', 'Gym Guardian', 'The Grinder', 'Iron Will',
    'Power Prophet', 'Muscle Mirage', 'The Beast', 'Iron Knight'
];

function generatePhantomName() {
    return PHANTOM_NAMES[Math.floor(Math.random() * PHANTOM_NAMES.length)];
}

function generatePhantomPersonality() {
    const personalities = ['friendly', 'competitive', 'trash_talker', 'stoic', 'mentor'];
    return personalities[Math.floor(Math.random() * personalities.length)];
}

// ============================================
// RIVALS MANAGEMENT
// ============================================

// Get all rivals
router.get('/', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT fr.*,
                    u.username as rival_username, u.avatar as rival_avatar, u.level as rival_level
             FROM fitness_rivals fr
             LEFT JOIN users u ON u.id = fr.rival_user_id
             WHERE fr.user_id = $1
             ORDER BY fr.updated_at DESC`,
            [req.user.id]
        );

        res.json({ rivals: result.rows });

    } catch (error) {
        console.error('Get rivals error:', error);
        res.status(500).json({ error: 'Failed to get rivals' });
    }
});

// Get single rival with details
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const rivalResult = await db.query(
            `SELECT fr.*,
                    u.username as rival_username, u.avatar as rival_avatar,
                    u.level as rival_level, u.total_workouts as rival_total_workouts
             FROM fitness_rivals fr
             LEFT JOIN users u ON u.id = fr.rival_user_id
             WHERE fr.id = $1 AND (fr.user_id = $2 OR fr.rival_user_id = $2)`,
            [id, req.user.id]
        );

        if (rivalResult.rows.length === 0) {
            return res.status(404).json({ error: 'Rival not found' });
        }

        const rival = rivalResult.rows[0];

        // Get recent encounters
        const encountersResult = await db.query(
            `SELECT * FROM rival_encounters
             WHERE rival_id = $1
             ORDER BY created_at DESC
             LIMIT 10`,
            [id]
        );

        rival.recentEncounters = encountersResult.rows;

        // Get active encounter
        const activeEncounter = await db.query(
            `SELECT * FROM rival_encounters
             WHERE rival_id = $1 AND status = 'active'`,
            [id]
        );

        rival.activeEncounter = activeEncounter.rows.length > 0 ? activeEncounter.rows[0] : null;

        // Check for revenge opportunity
        const revengeOpportunity = await db.query(
            `SELECT * FROM rival_encounters
             WHERE rival_id = $1 AND winner = 'rival'
               AND revenge_available_until > NOW()
               AND NOT EXISTS (
                   SELECT 1 FROM rival_encounters
                   WHERE is_revenge_of = rival_encounters.id
               )
             ORDER BY completed_at DESC
             LIMIT 1`,
            [id]
        );

        rival.revengeOpportunity = revengeOpportunity.rows.length > 0 ? revengeOpportunity.rows[0] : null;

        res.json({ rival });

    } catch (error) {
        console.error('Get rival error:', error);
        res.status(500).json({ error: 'Failed to get rival' });
    }
});

// Create AI phantom rival
router.post('/phantom', authenticate, async (req, res) => {
    try {
        const { archetype } = req.body;

        // Get user's stats to calibrate phantom
        const userResult = await db.query(
            `SELECT level, total_workouts, total_weight FROM users WHERE id = $1`,
            [req.user.id]
        );

        const user = userResult.rows[0];

        // Generate phantom stats based on user level
        const phantomStats = {
            weeklyVolume: Math.floor(user.total_weight / Math.max(1, user.total_workouts) * (0.9 + Math.random() * 0.2)),
            weeklyWorkouts: Math.floor(3 + Math.random() * 2),
            consistency: 0.7 + Math.random() * 0.25
        };

        const result = await db.query(
            `INSERT INTO fitness_rivals (user_id, rival_type, phantom_name, phantom_archetype, phantom_personality, phantom_level, phantom_stats)
             VALUES ($1, 'phantom', $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                req.user.id,
                generatePhantomName(),
                archetype || 'hybrid',
                generatePhantomPersonality(),
                user.level,
                JSON.stringify(phantomStats)
            ]
        );

        res.status(201).json({
            message: 'Phantom rival created',
            rival: result.rows[0]
        });

    } catch (error) {
        console.error('Create phantom error:', error);
        res.status(500).json({ error: 'Failed to create phantom rival' });
    }
});

// Challenge a friend as rival
router.post('/challenge', authenticate, async (req, res) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const { friendId } = req.body;

        if (!friendId) {
            return res.status(400).json({ error: 'Friend ID is required' });
        }

        // Verify friend exists
        const friendResult = await client.query(
            `SELECT id, username FROM users WHERE id = $1`,
            [friendId]
        );

        if (friendResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if rivalry already exists
        const existingRivalry = await client.query(
            `SELECT id FROM fitness_rivals
             WHERE (user_id = $1 AND rival_user_id = $2)
                OR (user_id = $2 AND rival_user_id = $1)`,
            [req.user.id, friendId]
        );

        if (existingRivalry.rows.length > 0) {
            return res.status(400).json({ error: 'Rivalry already exists with this user' });
        }

        // Create rivalry
        const result = await client.query(
            `INSERT INTO fitness_rivals (user_id, rival_type, rival_user_id)
             VALUES ($1, 'friend', $2)
             RETURNING *`,
            [req.user.id, friendId]
        );

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Rivalry created',
            rival: {
                ...result.rows[0],
                rival_username: friendResult.rows[0].username
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Challenge friend error:', error);
        res.status(500).json({ error: 'Failed to create rivalry' });
    } finally {
        client.release();
    }
});

// Delete/dismiss rival
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            `DELETE FROM fitness_rivals WHERE id = $1 AND user_id = $2 RETURNING id`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Rival not found' });
        }

        res.json({ message: 'Rival dismissed' });

    } catch (error) {
        console.error('Delete rival error:', error);
        res.status(500).json({ error: 'Failed to dismiss rival' });
    }
});

// ============================================
// RIVAL CHAT
// ============================================

// Get messages with rival
router.get('/:id/messages', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 50, before } = req.query;

        // Verify access
        const accessCheck = await db.query(
            `SELECT id FROM fitness_rivals WHERE id = $1 AND (user_id = $2 OR rival_user_id = $2)`,
            [id, req.user.id]
        );

        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Access denied' });
        }

        let query = `
            SELECT * FROM rival_messages
            WHERE rival_id = $1
        `;

        const params = [id];

        if (before) {
            query += ` AND created_at < $2`;
            params.push(before);
        }

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await db.query(query, params);

        // Mark messages as read
        await db.query(
            `UPDATE rival_messages SET is_read = true
             WHERE rival_id = $1 AND sender = 'rival' AND is_read = false`,
            [id]
        );

        res.json({ messages: result.rows.reverse() });

    } catch (error) {
        console.error('Get rival messages error:', error);
        res.status(500).json({ error: 'Failed to get messages' });
    }
});

// Send message to rival
router.post('/:id/messages', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { content, messageType = 'chat' } = req.body;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'Message content is required' });
        }

        // Verify access
        const rivalResult = await db.query(
            `SELECT * FROM fitness_rivals WHERE id = $1 AND (user_id = $2 OR rival_user_id = $2)`,
            [id, req.user.id]
        );

        if (rivalResult.rows.length === 0) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const rival = rivalResult.rows[0];

        // Send user message
        const result = await db.query(
            `INSERT INTO rival_messages (rival_id, sender, content, message_type)
             VALUES ($1, 'user', $2, $3)
             RETURNING *`,
            [id, content.trim(), messageType]
        );

        // If phantom rival, generate AI response after delay
        if (rival.rival_type === 'phantom') {
            // Queue AI response (in production, this would be async)
            setTimeout(async () => {
                try {
                    const aiResponse = generatePhantomResponse(rival, content, messageType);
                    await db.query(
                        `INSERT INTO rival_messages (rival_id, sender, content, message_type)
                         VALUES ($1, 'rival', $2, $3)`,
                        [id, aiResponse.content, aiResponse.type]
                    );
                } catch (err) {
                    console.error('AI response error:', err);
                }
            }, 2000 + Math.random() * 3000); // 2-5 second delay
        }

        res.status(201).json({ message: result.rows[0] });

    } catch (error) {
        console.error('Send rival message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Generate phantom AI response based on personality
function generatePhantomResponse(rival, userMessage, messageType) {
    const personality = rival.phantom_personality;
    const responses = {
        friendly: [
            "Great work! Keep pushing!",
            "You're doing amazing, but I'm still catching up!",
            "Nice effort! Let's both give it our all!",
            "That's the spirit! See you at the gym!"
        ],
        competitive: [
            "Not bad, but I can do better.",
            "Is that all you've got?",
            "I'm coming for that top spot.",
            "Your move. I'll be ready."
        ],
        trash_talker: [
            "Ha! I've seen better from beginners.",
            "You call that a workout? Watch and learn.",
            "Keep trying. Maybe one day you'll catch up.",
            "I'm not even breaking a sweat yet."
        ],
        stoic: [
            "Noted.",
            "The iron doesn't lie.",
            "Consistency is key.",
            "Keep grinding."
        ],
        mentor: [
            "Good progress! Remember to focus on form.",
            "You're improving! Try adding progressive overload.",
            "Solid effort. Recovery is just as important.",
            "I see potential in you. Keep at it."
        ]
    };

    const personalityResponses = responses[personality] || responses.friendly;
    const content = personalityResponses[Math.floor(Math.random() * personalityResponses.length)];

    return { content, type: 'chat' };
}

// ============================================
// ENCOUNTERS / SHOWDOWNS
// ============================================

// Get active encounter
router.get('/:id/encounter', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            `SELECT * FROM rival_encounters
             WHERE rival_id = $1 AND status = 'active'`,
            [id]
        );

        res.json({
            encounter: result.rows.length > 0 ? result.rows[0] : null
        });

    } catch (error) {
        console.error('Get encounter error:', error);
        res.status(500).json({ error: 'Failed to get encounter' });
    }
});

// Start weekly showdown
router.post('/:id/showdown', authenticate, async (req, res) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const { id } = req.params;

        // Verify rivalry exists and user owns it
        const rivalResult = await client.query(
            `SELECT * FROM fitness_rivals WHERE id = $1 AND user_id = $2`,
            [id, req.user.id]
        );

        if (rivalResult.rows.length === 0) {
            return res.status(404).json({ error: 'Rival not found' });
        }

        // Check for existing active encounter
        const existingEncounter = await client.query(
            `SELECT id FROM rival_encounters WHERE rival_id = $1 AND status = 'active'`,
            [id]
        );

        if (existingEncounter.rows.length > 0) {
            return res.status(400).json({ error: 'Active encounter already exists' });
        }

        // Calculate dates (week-long showdown)
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7);

        // Create encounter
        const result = await client.query(
            `INSERT INTO rival_encounters (rival_id, encounter_type, start_date, end_date)
             VALUES ($1, 'weekly_showdown', $2, $3)
             RETURNING *`,
            [id, startDate, endDate]
        );

        // Increment total encounters
        await client.query(
            `UPDATE fitness_rivals SET total_encounters = total_encounters + 1 WHERE id = $1`,
            [id]
        );

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Showdown started',
            encounter: result.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Start showdown error:', error);
        res.status(500).json({ error: 'Failed to start showdown' });
    } finally {
        client.release();
    }
});

// Get showdown preview (prediction)
router.get('/:id/showdown/preview', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        // Get rival info
        const rivalResult = await db.query(
            `SELECT fr.*, u.total_workouts as rival_total_workouts, u.total_weight as rival_total_weight
             FROM fitness_rivals fr
             LEFT JOIN users u ON u.id = fr.rival_user_id
             WHERE fr.id = $1 AND fr.user_id = $2`,
            [id, req.user.id]
        );

        if (rivalResult.rows.length === 0) {
            return res.status(404).json({ error: 'Rival not found' });
        }

        const rival = rivalResult.rows[0];

        // Get user's recent performance
        const userStats = await db.query(
            `SELECT
                COUNT(*) as workouts,
                COALESCE(SUM(total_volume), 0) as volume
             FROM workouts
             WHERE user_id = $1
               AND completed_at >= NOW() - INTERVAL '7 days'`,
            [req.user.id]
        );

        // Calculate prediction
        let prediction;
        if (rival.rival_type === 'phantom') {
            const phantomStats = rival.phantom_stats || {};
            const userWorkouts = parseInt(userStats.rows[0].workouts) || 0;
            const phantomWorkouts = phantomStats.weeklyWorkouts || 3;

            prediction = {
                userProjected: {
                    workouts: userWorkouts,
                    volume: parseInt(userStats.rows[0].volume) || 0
                },
                rivalProjected: {
                    workouts: phantomWorkouts,
                    volume: phantomStats.weeklyVolume || 10000
                },
                predictedWinner: userWorkouts >= phantomWorkouts ? 'user' : 'rival',
                confidence: 0.6 + Math.random() * 0.3
            };
        } else {
            // For friend rivals, use their actual recent stats
            const rivalStats = await db.query(
                `SELECT
                    COUNT(*) as workouts,
                    COALESCE(SUM(total_volume), 0) as volume
                 FROM workouts
                 WHERE user_id = $1
                   AND completed_at >= NOW() - INTERVAL '7 days'`,
                [rival.rival_user_id]
            );

            prediction = {
                userProjected: {
                    workouts: parseInt(userStats.rows[0].workouts) || 0,
                    volume: parseInt(userStats.rows[0].volume) || 0
                },
                rivalProjected: {
                    workouts: parseInt(rivalStats.rows[0].workouts) || 0,
                    volume: parseInt(rivalStats.rows[0].volume) || 0
                },
                predictedWinner:
                    (parseInt(userStats.rows[0].volume) || 0) >= (parseInt(rivalStats.rows[0].volume) || 0)
                        ? 'user' : 'rival',
                confidence: 0.5 + Math.random() * 0.3
            };
        }

        res.json({ prediction });

    } catch (error) {
        console.error('Get showdown preview error:', error);
        res.status(500).json({ error: 'Failed to get showdown preview' });
    }
});

// Request revenge match
router.post('/:id/revenge', authenticate, async (req, res) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const { encounterId } = req.body;

        // Verify the encounter was a loss and revenge is available
        const encounterResult = await client.query(
            `SELECT re.*, fr.user_id as rivalry_owner
             FROM rival_encounters re
             JOIN fitness_rivals fr ON fr.id = re.rival_id
             WHERE re.id = $1
               AND re.rival_id = $2
               AND re.winner = 'rival'
               AND re.revenge_available_until > NOW()`,
            [encounterId, id]
        );

        if (encounterResult.rows.length === 0) {
            return res.status(400).json({ error: 'Revenge match not available' });
        }

        // Check if revenge already taken
        const existingRevenge = await client.query(
            `SELECT id FROM rival_encounters WHERE is_revenge_of = $1`,
            [encounterId]
        );

        if (existingRevenge.rows.length > 0) {
            return res.status(400).json({ error: 'Revenge already taken for this encounter' });
        }

        // Create revenge encounter (2x stakes)
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7);

        const result = await client.query(
            `INSERT INTO rival_encounters (rival_id, encounter_type, start_date, end_date, is_revenge_of)
             VALUES ($1, 'revenge', $2, $3, $4)
             RETURNING *`,
            [id, startDate, endDate, encounterId]
        );

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Revenge match started! Stakes are doubled.',
            encounter: result.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Request revenge error:', error);
        res.status(500).json({ error: 'Failed to start revenge match' });
    } finally {
        client.release();
    }
});

// Update encounter stats (called after workout)
router.post('/encounters/:encounterId/update', authenticate, async (req, res) => {
    try {
        const { encounterId } = req.params;
        const { volume, workouts, xp } = req.body;

        // Get encounter and verify user
        const encounterResult = await db.query(
            `SELECT re.*, fr.user_id, fr.rival_type, fr.phantom_stats
             FROM rival_encounters re
             JOIN fitness_rivals fr ON fr.id = re.rival_id
             WHERE re.id = $1 AND re.status = 'active'`,
            [encounterId]
        );

        if (encounterResult.rows.length === 0) {
            return res.status(404).json({ error: 'Active encounter not found' });
        }

        const encounter = encounterResult.rows[0];

        if (encounter.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Update user stats
        await db.query(
            `UPDATE rival_encounters
             SET user_volume = user_volume + $1,
                 user_workouts = user_workouts + $2,
                 user_xp = user_xp + $3
             WHERE id = $4`,
            [volume || 0, workouts || 0, xp || 0, encounterId]
        );

        // For phantom rivals, also update their simulated progress
        if (encounter.rival_type === 'phantom') {
            const phantomStats = encounter.phantom_stats || {};
            const dailyProgress = (phantomStats.weeklyVolume || 10000) / 7;

            await db.query(
                `UPDATE rival_encounters
                 SET rival_volume = rival_volume + $1,
                     rival_workouts = rival_workouts + CASE WHEN random() > 0.3 THEN 1 ELSE 0 END
                 WHERE id = $2`,
                [Math.floor(dailyProgress * (0.8 + Math.random() * 0.4)), encounterId]
            );
        }

        res.json({ message: 'Encounter stats updated' });

    } catch (error) {
        console.error('Update encounter error:', error);
        res.status(500).json({ error: 'Failed to update encounter' });
    }
});

module.exports = router;
