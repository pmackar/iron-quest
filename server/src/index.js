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

// Import socket handler
const { initializeSocket } = require('./socket/handler');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// ============================================
// MIDDLEWARE
// ============================================

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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
