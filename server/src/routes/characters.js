const express = require('express');
const db = require('../db/config');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all characters for the authenticated user
router.get('/', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT slot_index, character_data, created_at, updated_at
             FROM characters
             WHERE user_id = $1
             ORDER BY slot_index`,
            [req.user.id]
        );

        // Convert to array format matching frontend saveSlots structure
        const slots = [null, null, null, null];
        result.rows.forEach(row => {
            if (row.slot_index >= 0 && row.slot_index < 4) {
                slots[row.slot_index] = {
                    ...row.character_data,
                    onlineUserId: req.user.id,
                    _savedAt: row.updated_at
                };
            }
        });

        res.json({ characters: slots });

    } catch (error) {
        console.error('Get characters error:', error);
        res.status(500).json({ error: 'Failed to get characters' });
    }
});

// Save/update a character at a specific slot
router.put('/:slotIndex', authenticate, async (req, res) => {
    try {
        const slotIndex = parseInt(req.params.slotIndex);
        const { characterData } = req.body;

        if (isNaN(slotIndex) || slotIndex < 0 || slotIndex > 3) {
            return res.status(400).json({ error: 'Invalid slot index (must be 0-3)' });
        }

        if (!characterData) {
            return res.status(400).json({ error: 'Character data is required' });
        }

        // Remove any sensitive or redundant fields before storing
        const cleanData = { ...characterData };
        delete cleanData.onlineUserId; // Will be added on retrieval

        // Upsert character
        const result = await db.query(
            `INSERT INTO characters (user_id, slot_index, character_data)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, slot_index)
             DO UPDATE SET
                character_data = $3,
                updated_at = CURRENT_TIMESTAMP
             RETURNING id, slot_index, updated_at`,
            [req.user.id, slotIndex, JSON.stringify(cleanData)]
        );

        res.json({
            message: 'Character saved',
            slotIndex: result.rows[0].slot_index,
            savedAt: result.rows[0].updated_at
        });

    } catch (error) {
        console.error('Save character error:', error);
        res.status(500).json({ error: 'Failed to save character' });
    }
});

// Delete a character at a specific slot
router.delete('/:slotIndex', authenticate, async (req, res) => {
    try {
        const slotIndex = parseInt(req.params.slotIndex);

        if (isNaN(slotIndex) || slotIndex < 0 || slotIndex > 3) {
            return res.status(400).json({ error: 'Invalid slot index (must be 0-3)' });
        }

        await db.query(
            `DELETE FROM characters WHERE user_id = $1 AND slot_index = $2`,
            [req.user.id, slotIndex]
        );

        res.json({ message: 'Character deleted', slotIndex });

    } catch (error) {
        console.error('Delete character error:', error);
        res.status(500).json({ error: 'Failed to delete character' });
    }
});

module.exports = router;
