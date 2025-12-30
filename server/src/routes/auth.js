const express = require('express');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const db = require('../db/config');
const { generateToken, authenticate } = require('../middleware/auth');

const router = express.Router();

// Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google Sign-In
router.post('/google', async (req, res) => {
    try {
        const { idToken, username, role } = req.body;

        if (!idToken) {
            return res.status(400).json({ error: 'Google ID token is required' });
        }

        // Verify the Google ID token
        let payload;
        try {
            const ticket = await googleClient.verifyIdToken({
                idToken,
                audience: process.env.GOOGLE_CLIENT_ID
            });
            payload = ticket.getPayload();
        } catch (err) {
            console.error('Google token verification failed:', err);
            return res.status(401).json({ error: 'Invalid Google token' });
        }

        const { sub: googleId, email, name, picture } = payload;

        // Check if user exists by Google ID
        let result = await db.query(
            'SELECT * FROM users WHERE google_id = $1',
            [googleId]
        );

        let user;
        let isNewUser = false;

        if (result.rows.length > 0) {
            // Existing user - update last login and return
            user = result.rows[0];
            await db.query(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP, google_avatar_url = $1 WHERE id = $2',
                [picture, user.id]
            );
        } else {
            // Check if email exists (user might have registered with email before)
            result = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);

            if (result.rows.length > 0) {
                // Link Google account to existing email account
                user = result.rows[0];
                await db.query(
                    `UPDATE users SET
                        google_id = $1,
                        google_email = $2,
                        google_avatar_url = $3,
                        auth_provider = 'google',
                        last_login = CURRENT_TIMESTAMP
                     WHERE id = $4`,
                    [googleId, email, picture, user.id]
                );
            } else {
                // Create new user
                isNewUser = true;

                // Generate a unique username from Google name or email
                let baseUsername = username || name?.replace(/\s+/g, '') || email.split('@')[0];
                let finalUsername = baseUsername.substring(0, 45);

                // Check if username exists and append number if needed
                let counter = 1;
                while (true) {
                    const usernameCheck = await db.query(
                        'SELECT id FROM users WHERE username = $1',
                        [finalUsername]
                    );
                    if (usernameCheck.rows.length === 0) break;
                    finalUsername = `${baseUsername.substring(0, 40)}${counter}`;
                    counter++;
                }

                result = await db.query(
                    `INSERT INTO users (
                        email, username, google_id, google_email, google_avatar_url,
                        auth_provider, role, avatar
                    ) VALUES ($1, $2, $3, $4, $5, 'google', $6, 1)
                    RETURNING *`,
                    [email.toLowerCase(), finalUsername, googleId, email, picture, role || 'user']
                );
                user = result.rows[0];
            }
        }

        // Generate JWT token
        const token = generateToken(user.id);

        // Get personal records if existing user
        let personalRecords = {};
        if (!isNewUser) {
            const prs = await db.query(
                'SELECT exercise_id, weight FROM personal_records WHERE user_id = $1',
                [user.id]
            );
            prs.rows.forEach(pr => {
                personalRecords[pr.exercise_id] = pr.weight;
            });
        }

        res.json({
            message: isNewUser ? 'Account created successfully' : 'Login successful',
            token,
            isNewUser,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                avatar: user.avatar,
                googleAvatarUrl: user.google_avatar_url,
                level: user.level,
                xp: user.xp,
                xpToNext: user.xp_to_next,
                heightFeet: user.height_feet,
                heightInches: user.height_inches,
                weight: user.weight,
                gender: user.gender,
                role: user.role,
                totalWorkouts: user.total_workouts,
                totalSets: user.total_sets,
                totalWeight: user.total_weight,
                achievements: user.achievements || [],
                personalRecords
            }
        });

    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ error: 'Google authentication failed' });
    }
});

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
