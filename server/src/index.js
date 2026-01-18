/**
 * IRON QUEST - Backend Server
 * Node.js + Express + PostgreSQL + Socket.io
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

// Import routes
const authRoutes = require('./routes/auth');
const workoutRoutes = require('./routes/workouts');
const teamRoutes = require('./routes/teams');
const chatRoutes = require('./routes/chat');
const syncRoutes = require('./routes/sync');
const campaignsRoutes = require('./routes/campaigns');
const coachRoutes = require('./routes/coach');
const charactersRoutes = require('./routes/characters');
// New feature routes
const streaksRoutes = require('./routes/streaks');
const clubsRoutes = require('./routes/clubs');
const checkinsRoutes = require('./routes/checkins');
const rivalsRoutes = require('./routes/rivals');
const sessionsRoutes = require('./routes/sessions');
const predictionsRoutes = require('./routes/predictions');

// Import socket handler
const { initializeSocket } = require('./socket/handler');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io with permissive CORS for Vercel
const io = new Server(server, {
    cors: {
        origin: function(origin, callback) {
            // Allow requests with no origin
            if (!origin) return callback(null, true);
            // Allow localhost and vercel.app
            if (origin.includes('localhost') || origin.endsWith('.vercel.app')) {
                return callback(null, true);
            }
            return callback(null, true); // Allow all for now
        },
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// ============================================
// MIDDLEWARE
// ============================================

// CORS configuration - allow multiple origins
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8080',
    'https://iron-quest.vercel.app',
    'https://iron-quest-production.vercel.app',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        // Also allow any vercel.app subdomain
        if (origin.endsWith('.vercel.app')) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Request logging (development)
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
    });
}

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/characters', charactersRoutes);
// New feature routes
app.use('/api/streaks', streaksRoutes);
app.use('/api/clubs', clubsRoutes);
app.use('/api/checkins', checkinsRoutes);
app.use('/api/rivals', rivalsRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/predictions', predictionsRoutes);

// API documentation
app.get('/api', (req, res) => {
    res.json({
        name: 'Iron Quest API',
        version: '1.0.0',
        endpoints: {
            auth: {
                'POST /api/auth/register': 'Register new user',
                'POST /api/auth/login': 'Login user',
                'GET /api/auth/me': 'Get current user profile',
                'PUT /api/auth/me': 'Update user profile'
            },
            workouts: {
                'GET /api/workouts': 'Get user workouts',
                'GET /api/workouts/:id': 'Get single workout',
                'POST /api/workouts': 'Save workout',
                'DELETE /api/workouts/:id': 'Delete workout',
                'GET /api/workouts/stats/summary': 'Get workout stats'
            },
            teams: {
                'GET /api/teams': 'Get user teams',
                'GET /api/teams/:id': 'Get team details',
                'POST /api/teams': 'Create team',
                'POST /api/teams/join': 'Join team by invite code',
                'POST /api/teams/:id/leave': 'Leave team',
                'GET /api/teams/:id/leaderboard': 'Get team leaderboard',
                'GET /api/teams/:id/activity': 'Get team activity feed',
                'POST /api/teams/:id/challenges': 'Create team challenge'
            },
            campaigns: {
                'GET /api/campaigns': 'Get user campaigns (personal + team)',
                'GET /api/campaigns/:id': 'Get single campaign with goals',
                'POST /api/campaigns': 'Create new campaign',
                'PUT /api/campaigns/:id': 'Update campaign',
                'DELETE /api/campaigns/:id': 'Delete campaign',
                'POST /api/campaigns/:id/goals': 'Add goal to campaign',
                'PUT /api/campaigns/:id/goals/:goalId/progress': 'Update goal progress',
                'DELETE /api/campaigns/:id/goals/:goalId': 'Remove goal from campaign'
            },
            coach: {
                'GET /api/coach/clients': 'Get coach clients list',
                'GET /api/coach/clients/:id': 'Get client details',
                'GET /api/coach/clients/:id/workouts': 'Get client workout history',
                'GET /api/coach/clients/:id/stats': 'Get client stats and PRs',
                'GET /api/coach/clients/:id/campaigns': 'Get client campaigns',
                'POST /api/coach/invite': 'Invite client by email',
                'GET /api/coach/invitations': 'Get pending invitations (for clients)',
                'POST /api/coach/invitations/:id/accept': 'Accept coach invitation',
                'POST /api/coach/invitations/:id/decline': 'Decline coach invitation',
                'GET /api/coach/my-coaches': 'Get list of user coaches',
                'DELETE /api/coach/clients/:id': 'Remove client',
                'DELETE /api/coach/my-coaches/:id': 'Disconnect from coach',
                'POST /api/coach/clients/:id/assign-campaign': 'Assign campaign to client'
            },
            streaks: {
                'GET /api/streaks': 'Get streak info',
                'POST /api/streaks/freeze': 'Activate streak freeze',
                'POST /api/streaks/shield': 'Use streak shield',
                'GET /api/streaks/history': 'Get freeze/shield history',
                'POST /api/streaks/wagers': 'Create streak wager',
                'GET /api/streaks/wagers': 'Get active wagers',
                'GET /api/streaks/wagers/:id': 'Get wager details',
                'POST /api/streaks/wagers/:id/cancel': 'Cancel wager',
                'POST /api/streaks/update': 'Update streak after workout'
            },
            clubs: {
                'GET /api/clubs/guilds': 'Get all archetype guilds',
                'GET /api/clubs/guilds/my': 'Get user\'s guild',
                'GET /api/clubs/guilds/:id': 'Get guild details',
                'POST /api/clubs/guilds/join': 'Join guild by archetype',
                'GET /api/clubs/guilds/:id/messages': 'Get guild messages',
                'POST /api/clubs/guilds/:id/messages': 'Post guild message',
                'GET /api/clubs/guilds/:id/leaderboard': 'Get guild leaderboard',
                'GET /api/clubs': 'Get user\'s clubs',
                'POST /api/clubs': 'Create club',
                'GET /api/clubs/:id': 'Get club details',
                'PUT /api/clubs/:id': 'Update club',
                'POST /api/clubs/join': 'Join club by invite code',
                'POST /api/clubs/:id/leave': 'Leave club',
                'GET /api/clubs/:id/messages': 'Get club messages',
                'POST /api/clubs/:id/messages': 'Post club message',
                'POST /api/clubs/:id/challenges': 'Create club challenge',
                'GET /api/clubs/:id/leaderboard': 'Get club leaderboard'
            },
            checkins: {
                'GET /api/checkins': 'Get today\'s check-in',
                'GET /api/checkins/history': 'Get check-in history',
                'POST /api/checkins': 'Create daily check-in',
                'PUT /api/checkins': 'Update today\'s check-in',
                'GET /api/checkins/streak': 'Get check-in streak',
                'GET /api/checkins/quests': 'Get available quests',
                'POST /api/checkins/quests/:id/complete': 'Complete quest',
                'GET /api/checkins/quests/history': 'Get quest history',
                'GET /api/checkins/summary': 'Get wellness summary'
            },
            rivals: {
                'GET /api/rivals': 'Get all rivals',
                'GET /api/rivals/:id': 'Get rival details',
                'POST /api/rivals/phantom': 'Create AI phantom rival',
                'POST /api/rivals/challenge': 'Challenge friend as rival',
                'DELETE /api/rivals/:id': 'Dismiss rival',
                'GET /api/rivals/:id/messages': 'Get rival chat',
                'POST /api/rivals/:id/messages': 'Send message to rival',
                'GET /api/rivals/:id/encounter': 'Get active encounter',
                'POST /api/rivals/:id/showdown': 'Start weekly showdown',
                'GET /api/rivals/:id/showdown/preview': 'Get showdown prediction',
                'POST /api/rivals/:id/revenge': 'Request revenge match'
            },
            sessions: {
                'GET /api/sessions': 'Get active workout sessions',
                'GET /api/sessions/history': 'Get session history',
                'POST /api/sessions': 'Create workout session',
                'GET /api/sessions/:id': 'Get session details',
                'POST /api/sessions/join': 'Join session by code',
                'POST /api/sessions/:id/leave': 'Leave session',
                'GET /api/sessions/:id/updates': 'Get session updates (polling)',
                'POST /api/sessions/:id/updates': 'Post session update',
                'POST /api/sessions/:id/cheer': 'Send cheer to partner',
                'POST /api/sessions/share': 'Create share template',
                'GET /api/sessions/share/:url': 'Get share template (public)',
                'GET /api/sessions/shares': 'Get user\'s shares',
                'DELETE /api/sessions/share/:id': 'Delete share'
            },
            predictions: {
                'GET /api/predictions/pr': 'Get PR predictions',
                'GET /api/predictions/pr/:exerciseId': 'Get PR prediction for exercise',
                'POST /api/predictions/pr/generate': 'Generate PR prediction',
                'POST /api/predictions/pr/:id/achieved': 'Mark PR as achieved',
                'GET /api/predictions/plateau': 'Get plateau predictions',
                'POST /api/predictions/plateau/analyze': 'Analyze for plateaus',
                'POST /api/predictions/plateau/:id/acknowledge': 'Acknowledge plateau',
                'GET /api/predictions/recovery': 'Get recovery status',
                'POST /api/predictions/recovery/calculate': 'Calculate fatigue/recovery',
                'GET /api/predictions/recovery/history': 'Get recovery history',
                'GET /api/predictions/readiness': 'Get training readiness'
            }
        },
        socketEvents: {
            client: {
                'join_team': 'Join team room for real-time updates',
                'leave_team': 'Leave team room',
                'team_message': 'Send chat message to team',
                'workout_completed': 'Notify team of completed workout',
                'new_pr': 'Notify team of new personal record',
                'achievement_unlocked': 'Notify team of achievement'
            },
            server: {
                'new_message': 'New chat message received',
                'activity': 'New team activity (workout, PR, achievement)',
                'error': 'Error notification'
            }
        }
    });
});

// ============================================
// STATIC FILES (Production)
// ============================================

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../../')));

// Serve index.html for all non-API routes (SPA fallback)
app.get('/{*splat}', (req, res) => {
    // Only serve index.html for non-API routes
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../../index.html'));
    } else {
        res.status(404).json({ error: 'Endpoint not found' });
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// ============================================
// SOCKET.IO
// ============================================

initializeSocket(io);

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log('║       IRON QUEST - Backend Server       ║');
    console.log('╠════════════════════════════════════════╣');
    console.log(`║  Port: ${PORT}                             ║`);
    console.log(`║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(18)}║`);
    console.log('║  Status: Running                        ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('');
    console.log('API Endpoints:');
    console.log(`  http://localhost:${PORT}/api`);
    console.log(`  http://localhost:${PORT}/health`);
    console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = { app, server, io };
