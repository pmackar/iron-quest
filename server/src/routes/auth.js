const express = require('express');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const db = require('../db/config');
const { generateToken, authenticate } = require('../middleware/auth');

const router = express.Router();

// Google OAuth client (legacy)
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Clerk Sign-In (SSO)
router.post('/clerk', async (req, res) => {
    console.log('[Clerk] Auth request received');

    // Check for required environment variables
    if (!process.env.JWT_SECRET) {
        console.error('[Clerk] FATAL: JWT_SECRET not configured');
        return res.status(500).json({ error: 'Server configuration error', details: 'JWT_SECRET not configured' });
    }

    try {
        const { clerkToken, clerkUserId, email, username, avatarUrl, role } = req.body;
        console.log('[Clerk] Parsed body:', { clerkUserId, email, username, role });

        if (!clerkToken || !clerkUserId) {
            return res.status(400).json({ error: 'Clerk token and user ID are required' });
        }

        console.log('[Clerk] Step 1: Querying by clerk_id');
        // Check if user exists by Clerk ID
        let result = await db.query(
            'SELECT * FROM users WHERE clerk_id = $1',
            [clerkUserId]
        );

        let user;
        let isNewUser = false;

        console.log('[Clerk] Step 2: Found', result.rows.length, 'existing users by clerk_id');
        if (result.rows.length > 0) {
            // Existing user - update last login
            user = result.rows[0];
            console.log('[Clerk] Existing user found, updating last login');
            await db.query(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP, google_avatar_url = $1 WHERE id = $2',
                [avatarUrl, user.id]
            );
        } else {
            // Check if email exists (user might have registered before)
            if (email) {
                console.log('[Clerk] Step 3: Checking email');
                result = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
            }

            console.log('[Clerk] Step 4: Email check result:', result.rows.length);
            if (result.rows.length > 0) {
                // Link Clerk account to existing email account
                user = result.rows[0];
                await db.query(
                    `UPDATE users SET
                        clerk_id = $1,
                        google_avatar_url = $2,
                        auth_provider = 'clerk',
                        last_login = CURRENT_TIMESTAMP
                     WHERE id = $3`,
                    [clerkUserId, avatarUrl, user.id]
                );
            } else {
                // Create new user
                isNewUser = true;
                console.log('[Clerk] Step 5: Creating new user');

                // Generate a unique username
                let baseUsername = username || email?.split('@')[0] || 'Warrior';
                let finalUsername = baseUsername.substring(0, 45);
                console.log('[Clerk] Username:', finalUsername);

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

                console.log('[Clerk] Step 6: Inserting user into DB');
                result = await db.query(
                    `INSERT INTO users (
                        email, username, clerk_id, google_avatar_url,
                        auth_provider, role, avatar
                    ) VALUES ($1, $2, $3, $4, 'clerk', $5, 1)
                    RETURNING *`,
                    [email?.toLowerCase(), finalUsername, clerkUserId, avatarUrl, role || 'user']
                );
                user = result.rows[0];
                console.log('[Clerk] Step 7: User created with id:', user.id);
            }
        }

        console.log('[Clerk] Step 8: Generating JWT token');
        // Generate JWT token
        const token = generateToken(user.id);
        console.log('[Clerk] Step 9: Token generated successfully');

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
        console.error('Clerk auth error:', error);
        const errorDetails = error ? (error.message || error.toString() || JSON.stringify(error)) : 'Error was null/undefined';
        res.status(500).json({
            error: 'Clerk authentication failed',
            details: errorDetails || 'Could not extract error details'
        });
    }
});

// Google Sign-In
router.post('/google', async (req, res) => {
    console.log('[Google] Auth request received');

    // Check for required environment variables
    if (!process.env.GOOGLE_CLIENT_ID) {
        console.error('[Google] FATAL: GOOGLE_CLIENT_ID not configured');
        return res.status(500).json({ error: 'Server configuration error', details: 'GOOGLE_CLIENT_ID not configured' });
    }
    if (!process.env.JWT_SECRET) {
        console.error('[Google] FATAL: JWT_SECRET not configured');
        return res.status(500).json({ error: 'Server configuration error', details: 'JWT_SECRET not configured' });
    }
    if (!process.env.DATABASE_URL) {
        console.error('[Google] FATAL: DATABASE_URL not configured');
        return res.status(500).json({ error: 'Server configuration error', details: 'DATABASE_URL not configured' });
    }

    try {
        const { idToken, username, role } = req.body;
        console.log('[Google] Request body:', { hasIdToken: !!idToken, username, role });

        if (!idToken) {
            return res.status(400).json({ error: 'Google ID token is required' });
        }

        // Verify the Google ID token
        let payload;
        try {
            console.log('[Google] Verifying token with client ID:', process.env.GOOGLE_CLIENT_ID.substring(0, 20) + '...');
            const ticket = await googleClient.verifyIdToken({
                idToken,
                audience: process.env.GOOGLE_CLIENT_ID
            });
            payload = ticket.getPayload();
            console.log('[Google] Token verified, email:', payload.email);
        } catch (err) {
            console.error('Google token verification failed:', err.message);
            return res.status(401).json({ error: 'Invalid Google token', details: err.message });
        }

        const { sub: googleId, email, name, picture } = payload;
        console.log('[Google] User info:', { googleId, email, name });

        // Check if user exists by Google ID
        console.log('[Google] Step 1: Querying by google_id');
        let result = await db.query(
            'SELECT * FROM users WHERE google_id = $1',
            [googleId]
        );
        console.log('[Google] Step 2: Found', result.rows.length, 'existing users');

        let user;
        let isNewUser = false;

        if (result.rows.length > 0) {
            // Existing user - update last login and return
            console.log('[Google] Existing user found, updating last login');
            user = result.rows[0];
            await db.query(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP, google_avatar_url = $1 WHERE id = $2',
                [picture, user.id]
            );
        } else {
            // Check if email exists (user might have registered with email before)
            console.log('[Google] Step 3: Checking email');
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
                console.log('[Google] Step 4: Creating new user');

                // Generate a unique username from Google name or email
                let baseUsername = username || name?.replace(/\s+/g, '') || email.split('@')[0];
                let finalUsername = baseUsername.substring(0, 45);
                console.log('[Google] Username:', finalUsername);

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

                console.log('[Google] Step 5: Inserting user into DB');
                result = await db.query(
                    `INSERT INTO users (
                        email, username, google_id, google_email, google_avatar_url,
                        auth_provider, role, avatar
                    ) VALUES ($1, $2, $3, $4, $5, 'google', $6, 1)
                    RETURNING *`,
                    [email.toLowerCase(), finalUsername, googleId, email, picture, role || 'user']
                );
                user = result.rows[0];
                console.log('[Google] Step 6: User created with id:', user.id);
            }
        }

        console.log('[Google] Step 7: Generating JWT token');
        // Generate JWT token
        const token = generateToken(user.id);
        console.log('[Google] Step 8: Success!');

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
        res.status(500).json({ error: 'Google authentication failed', details: error.message });
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
