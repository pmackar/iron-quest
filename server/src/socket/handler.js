const jwt = require('jsonwebtoken');
const db = require('../db/config');

function initializeSocket(io) {
    // Authentication middleware for Socket.io
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error('Authentication required'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const result = await db.query(
                'SELECT id, username, avatar FROM users WHERE id = $1',
                [decoded.userId]
            );

            if (result.rows.length === 0) {
                return next(new Error('User not found'));
            }

            socket.user = result.rows[0];
            next();
        } catch (error) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.user.username}`);

        // Join user's personal room
        socket.join(`user:${socket.user.id}`);

        // Join team rooms
        joinUserTeams(socket);

        // ============================================
        // TEAM CHAT
        // ============================================

        socket.on('join_team', async (teamId) => {
            // Verify user is a member
            const result = await db.query(
                'SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2',
                [teamId, socket.user.id]
            );

            if (result.rows.length > 0) {
                socket.join(`team:${teamId}`);
                console.log(`${socket.user.username} joined team room: ${teamId}`);
            }
        });

        socket.on('leave_team', (teamId) => {
            socket.leave(`team:${teamId}`);
        });

        socket.on('team_message', async (data) => {
            try {
                const { teamId, message } = data;

                // Verify membership
                const memberCheck = await db.query(
                    'SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2',
                    [teamId, socket.user.id]
                );

                if (memberCheck.rows.length === 0) {
                    socket.emit('error', { message: 'Not a team member' });
                    return;
                }

                // Save message to database
                const result = await db.query(
                    `INSERT INTO team_messages (team_id, user_id, message)
                     VALUES ($1, $2, $3)
                     RETURNING id, created_at`,
                    [teamId, socket.user.id, message]
                );

                const messageData = {
                    id: result.rows[0].id,
                    teamId,
                    userId: socket.user.id,
                    username: socket.user.username,
                    avatar: socket.user.avatar,
                    message,
                    createdAt: result.rows[0].created_at
                };

                // Broadcast to team
                io.to(`team:${teamId}`).emit('new_message', messageData);

            } catch (error) {
                console.error('Team message error:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // ============================================
        // LIVE ACTIVITY UPDATES
        // ============================================

        socket.on('workout_completed', async (data) => {
            try {
                const { workoutName, xpEarned, totalVolume } = data;

                // Get user's teams
                const teams = await db.query(
                    'SELECT team_id FROM team_members WHERE user_id = $1',
                    [socket.user.id]
                );

                for (const team of teams.rows) {
                    // Update team XP
                    await db.query(
                        `UPDATE teams SET weekly_xp = weekly_xp + $1, total_xp = total_xp + $1
                         WHERE id = $2`,
                        [xpEarned, team.team_id]
                    );

                    // Update member contribution
                    await db.query(
                        `UPDATE team_members SET contribution_xp = contribution_xp + $1
                         WHERE team_id = $2 AND user_id = $3`,
                        [xpEarned, team.team_id, socket.user.id]
                    );

                    // Add activity
                    await db.query(
                        `INSERT INTO activity_feed (team_id, user_id, activity_type, title, metadata)
                         VALUES ($1, $2, 'workout', $3, $4)`,
                        [
                            team.team_id,
                            socket.user.id,
                            `${socket.user.username} completed ${workoutName}`,
                            JSON.stringify({ xpEarned, totalVolume })
                        ]
                    );

                    // Broadcast to team
                    io.to(`team:${team.team_id}`).emit('activity', {
                        type: 'workout',
                        userId: socket.user.id,
                        username: socket.user.username,
                        avatar: socket.user.avatar,
                        title: `${socket.user.username} completed ${workoutName}`,
                        xpEarned,
                        totalVolume,
                        createdAt: new Date()
                    });

                    // Update team challenges
                    await updateTeamChallenges(team.team_id, 'workouts', 1);
                    await updateTeamChallenges(team.team_id, 'xp', xpEarned);
                    await updateTeamChallenges(team.team_id, 'volume', totalVolume);
                }

            } catch (error) {
                console.error('Workout completed broadcast error:', error);
            }
        });

        socket.on('new_pr', async (data) => {
            try {
                const { exerciseName, weight } = data;

                // Get user's teams
                const teams = await db.query(
                    'SELECT team_id FROM team_members WHERE user_id = $1',
                    [socket.user.id]
                );

                for (const team of teams.rows) {
                    // Add activity
                    await db.query(
                        `INSERT INTO activity_feed (team_id, user_id, activity_type, title, metadata)
                         VALUES ($1, $2, 'pr', $3, $4)`,
                        [
                            team.team_id,
                            socket.user.id,
                            `${socket.user.username} hit a new PR!`,
                            JSON.stringify({ exerciseName, weight })
                        ]
                    );

                    // Broadcast to team
                    io.to(`team:${team.team_id}`).emit('activity', {
                        type: 'pr',
                        userId: socket.user.id,
                        username: socket.user.username,
                        avatar: socket.user.avatar,
                        title: `${socket.user.username} hit a new PR!`,
                        exerciseName,
                        weight,
                        createdAt: new Date()
                    });
                }

            } catch (error) {
                console.error('New PR broadcast error:', error);
            }
        });

        socket.on('achievement_unlocked', async (data) => {
            try {
                const { achievementName } = data;

                // Get user's teams
                const teams = await db.query(
                    'SELECT team_id FROM team_members WHERE user_id = $1',
                    [socket.user.id]
                );

                for (const team of teams.rows) {
                    // Broadcast to team
                    io.to(`team:${team.team_id}`).emit('activity', {
                        type: 'achievement',
                        userId: socket.user.id,
                        username: socket.user.username,
                        avatar: socket.user.avatar,
                        title: `${socket.user.username} unlocked "${achievementName}"`,
                        createdAt: new Date()
                    });
                }

            } catch (error) {
                console.error('Achievement broadcast error:', error);
            }
        });

        // ============================================
        // DISCONNECT
        // ============================================

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.user.username}`);
        });
    });

    // Helper: Join all user's team rooms
    async function joinUserTeams(socket) {
        try {
            const result = await db.query(
                'SELECT team_id FROM team_members WHERE user_id = $1',
                [socket.user.id]
            );

            for (const row of result.rows) {
                socket.join(`team:${row.team_id}`);
            }
        } catch (error) {
            console.error('Error joining team rooms:', error);
        }
    }

    // Helper: Update team challenges
    async function updateTeamChallenges(teamId, targetType, value) {
        try {
            await db.query(
                `UPDATE team_challenges
                 SET current_value = current_value + $1,
                     is_completed = (current_value + $1) >= target_value
                 WHERE team_id = $2
                   AND target_type = $3
                   AND end_date > NOW()
                   AND is_completed = false`,
                [value, teamId, targetType]
            );
        } catch (error) {
            console.error('Update challenges error:', error);
        }
    }

    return io;
}

module.exports = { initializeSocket };
