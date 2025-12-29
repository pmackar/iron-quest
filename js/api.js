/**
 * IRON QUEST - API Client
 * Handles all communication with the backend server
 */

const API = {
    // Production API URL - update this after deploying backend to Railway
    PRODUCTION_API_URL: 'https://iron-quest-production.up.railway.app',

    // Use production URL or localhost in development
    baseUrl: window.location.hostname === 'localhost'
        ? 'http://localhost:3001/api'
        : (window.IRON_QUEST_API_URL || 'https://iron-quest-production.up.railway.app') + '/api',
    token: null,
    socket: null,

    // ============================================
    // TOKEN MANAGEMENT
    // ============================================

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('ironquest_token', token);
        } else {
            localStorage.removeItem('ironquest_token');
        }
    },

    getToken() {
        if (!this.token) {
            this.token = localStorage.getItem('ironquest_token');
        }
        return this.token;
    },

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    },

    // ============================================
    // HTTP METHODS
    // ============================================

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    async post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    async put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    },

    // ============================================
    // AUTHENTICATION
    // ============================================

    async register(userData) {
        const response = await this.post('/auth/register', userData);
        if (response.token) {
            this.setToken(response.token);
        }
        return response;
    },

    async login(email, password) {
        const response = await this.post('/auth/login', { email, password });
        if (response.token) {
            this.setToken(response.token);
        }
        return response;
    },

    async getProfile() {
        return this.get('/auth/me');
    },

    async updateProfile(data) {
        return this.put('/auth/me', data);
    },

    logout() {
        this.setToken(null);
        this.disconnectSocket();
    },

    isAuthenticated() {
        return !!this.getToken();
    },

    // ============================================
    // WORKOUTS
    // ============================================

    async getWorkouts(limit = 20, offset = 0) {
        return this.get(`/workouts?limit=${limit}&offset=${offset}`);
    },

    async getWorkout(id) {
        return this.get(`/workouts/${id}`);
    },

    async saveWorkout(workoutData) {
        return this.post('/workouts', workoutData);
    },

    async deleteWorkout(id) {
        return this.delete(`/workouts/${id}`);
    },

    async getWorkoutStats() {
        return this.get('/workouts/stats/summary');
    },

    // ============================================
    // TEAMS
    // ============================================

    async getTeams() {
        return this.get('/teams');
    },

    async getTeam(id) {
        return this.get(`/teams/${id}`);
    },

    async createTeam(name, description, avatar) {
        return this.post('/teams', { name, description, avatar });
    },

    async joinTeam(inviteCode) {
        return this.post('/teams/join', { inviteCode });
    },

    async leaveTeam(id) {
        return this.post(`/teams/${id}/leave`);
    },

    async getLeaderboard(teamId, type = 'xp') {
        return this.get(`/teams/${teamId}/leaderboard?type=${type}`);
    },

    async getTeamActivity(teamId, limit = 20) {
        return this.get(`/teams/${teamId}/activity?limit=${limit}`);
    },

    async createChallenge(teamId, challengeData) {
        return this.post(`/teams/${teamId}/challenges`, challengeData);
    },

    // ============================================
    // CHAT
    // ============================================

    async getTeamMessages(teamId, limit = 50) {
        return this.get(`/chat/team/${teamId}/messages?limit=${limit}`);
    },

    async sendMessage(teamId, message) {
        return this.post(`/chat/team/${teamId}/messages`, { message });
    },

    // ============================================
    // SOCKET.IO
    // ============================================

    connectSocket() {
        if (this.socket) return;

        const token = this.getToken();
        if (!token) return;

        // Load Socket.io if not already loaded
        if (typeof io === 'undefined') {
            console.warn('Socket.io not loaded');
            return;
        }

        const socketUrl = window.location.hostname === 'localhost'
            ? 'http://localhost:3001'
            : (window.IRON_QUEST_API_URL || this.PRODUCTION_API_URL);

        this.socket = io(socketUrl, {
            auth: { token }
        });

        this.socket.on('connect', () => {
            console.log('Socket connected');
        });

        this.socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
        });

        return this.socket;
    },

    disconnectSocket() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    },

    joinTeamRoom(teamId) {
        if (this.socket) {
            this.socket.emit('join_team', teamId);
        }
    },

    leaveTeamRoom(teamId) {
        if (this.socket) {
            this.socket.emit('leave_team', teamId);
        }
    },

    sendTeamMessage(teamId, message) {
        if (this.socket) {
            this.socket.emit('team_message', { teamId, message });
        }
    },

    notifyWorkoutCompleted(workoutName, xpEarned, totalVolume) {
        if (this.socket) {
            this.socket.emit('workout_completed', { workoutName, xpEarned, totalVolume });
        }
    },

    notifyNewPR(exerciseName, weight) {
        if (this.socket) {
            this.socket.emit('new_pr', { exerciseName, weight });
        }
    },

    notifyAchievement(achievementName) {
        if (this.socket) {
            this.socket.emit('achievement_unlocked', { achievementName });
        }
    },

    onNewMessage(callback) {
        if (this.socket) {
            this.socket.on('new_message', callback);
        }
    },

    onActivity(callback) {
        if (this.socket) {
            this.socket.on('activity', callback);
        }
    }
};

// Export for use in app.js
window.API = API;
