const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/config');
const { generateToken, authenticate } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { email, password, username, avatar, heightFeet, heightInches, weight, gender } = req.body;

        // Validate required fields
        if (!email || !password || !username) {
            return res.status(400).json({ error: 'Email, password, and username are required' });
        }

        // Check if email already exists
        const existingEmail = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (existingEmail.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Check if username already exists
        const existingUsername = await db.query('SELECT id FROM users WHERE username = $1', [username]);
        if (existingUsername.rows.length > 0) {
            return res.status(400).json({ error: 'Username already taken' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user
        const result = await db.query(
            `INSERT INTO users (email, password_hash, username, avatar, height_feet, height_inches, weight, gender)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, email, username, avatar, level, xp, xp_to_next, total_workouts, total_sets, total_weight, created_at`,
            [email.toLowerCase(), passwordHash, username, avatar || 1, heightFeet, heightInches, weight, gender]
        );

        const user = result.rows[0];
        const token = generateToken(user.id);

        res.status(201).json({
            message: 'Registration successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                avatar: user.avatar,
                level: user.level,
                xp: user.xp,
                xpToNext: user.xp_to_next
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const result = await db.query(
            `SELECT id, email, username, password_hash, avatar, level, xp, xp_to_next,
                    height_feet, height_inches, weight, gender,
                    total_workouts, total_sets, total_weight, achievements
             FROM users WHERE email = $1`,
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Update last login
        await db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

        const token = generateToken(user.id);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                avatar: user.avatar,
                level: user.level,
                xp: user.xp,
                xpToNext: user.xp_to_next,
                heightFeet: user.height_feet,
                heightInches: user.height_inches,
                weight: user.weight,
                gender: user.gender,
                totalWorkouts: user.total_workouts,
                totalSets: user.total_sets,
                totalWeight: user.total_weight,
                achievements: user.achievements
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user profile
router.get('/me', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, email, username, avatar, level, xp, xp_to_next,
                    height_feet, height_inches, weight, gender,
                    total_workouts, total_sets, total_weight, achievements, created_at
             FROM users WHERE id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        // Get personal records
        const prs = await db.query(
            'SELECT exercise_id, weight FROM personal_records WHERE user_id = $1',
            [req.user.id]
        );

        const personalRecords = {};
        prs.rows.forEach(pr => {
            personalRecords[pr.exercise_id] = pr.weight;
        });

        res.json({
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                avatar: user.avatar,
                level: user.level,
                xp: user.xp,
                xpToNext: user.xp_to_next,
                heightFeet: user.height_feet,
                heightInches: user.height_inches,
                weight: user.weight,
                gender: user.gender,
                totalWorkouts: user.total_workouts,
                totalSets: user.total_sets,
                totalWeight: user.total_weight,
                achievements: user.achievements,
                personalRecords,
                createdAt: user.created_at
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// Update user profile
router.put('/me', authenticate, async (req, res) => {
    try {
        const { username, avatar, heightFeet, heightInches, weight, gender } = req.body;

        const result = await db.query(
            `UPDATE users SET
                username = COALESCE($1, username),
                avatar = COALESCE($2, avatar),
                height_feet = COALESCE($3, height_feet),
                height_inches = COALESCE($4, height_inches),
                weight = COALESCE($5, weight),
                gender = COALESCE($6, gender)
             WHERE id = $7
             RETURNING id, email, username, avatar, level, xp`,
            [username, avatar, heightFeet, heightInches, weight, gender, req.user.id]
        );

        res.json({ user: result.rows[0] });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

module.exports = router;
