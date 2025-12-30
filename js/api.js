/**
 * IRON QUEST - API Client
 * Handles all communication with the backend server
 */

const API = {
    // Get API URL from config or use defaults
    // Priority: APP_CONFIG > hostname detection > default
    baseUrl: (function() {
        if (window.APP_CONFIG?.API_URL) {
            return window.APP_CONFIG.API_URL + '/api';
        }
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3001/api';
        }
        // Production default
        return 'https://iron-quest-production.up.railway.app/api';
    })(),
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
                const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error;
                throw new Error(errorMsg || 'Request failed');
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

    // Google Sign-In (legacy)
    async googleSignIn(idToken, options = {}) {
        const response = await this.post('/auth/google', {
            idToken,
            username: options.username,
            role: options.role || 'user'
        });
        if (response.token) {
            this.setToken(response.token);
        }
        return response;
    },

    // Clerk Sign-In (SSO)
    async clerkSignIn(clerkToken, userData = {}) {
        const response = await this.post('/auth/clerk', {
            clerkToken,
            clerkUserId: userData.clerkUserId,
            email: userData.email,
            username: userData.username,
            avatarUrl: userData.avatarUrl,
            role: userData.role || 'user'
        });
        if (response.token) {
            this.setToken(response.token);
        }
        return response;
    },

    // Initialize Google Sign-In (legacy)
    initGoogleSignIn(buttonId, callback) {
        if (!window.google) {
            console.error('Google Sign-In SDK not loaded');
            return;
        }

        google.accounts.id.initialize({
            client_id: this.GOOGLE_CLIENT_ID,
            callback: async (response) => {
                try {
                    const result = await this.googleSignIn(response.credential);
                    callback(null, result);
                } catch (error) {
                    callback(error, null);
                }
            }
        });

        google.accounts.id.renderButton(
            document.getElementById(buttonId),
            {
                theme: 'filled_black',
                size: 'large',
                width: 280,
                text: 'continue_with',
                shape: 'rectangular'
            }
        );
    },

    // Google Client ID (loaded from script or config)
    GOOGLE_CLIENT_ID: null,

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
    // CAMPAIGNS
    // ============================================

    async getCampaigns() {
        return this.get('/campaigns');
    },

    async getCampaign(id) {
        return this.get(`/campaigns/${id}`);
    },

    async createCampaign(campaignData) {
        return this.post('/campaigns', campaignData);
    },

    async updateCampaign(id, updates) {
        return this.put(`/campaigns/${id}`, updates);
    },

    async deleteCampaign(id) {
        return this.delete(`/campaigns/${id}`);
    },

    async addCampaignGoal(campaignId, goalData) {
        return this.post(`/campaigns/${campaignId}/goals`, goalData);
    },

    async updateCampaignGoalProgress(campaignId, goalId, progressData) {
        return this.put(`/campaigns/${campaignId}/goals/${goalId}/progress`, progressData);
    },

    async removeCampaignGoal(campaignId, goalId) {
        return this.delete(`/campaigns/${campaignId}/goals/${goalId}`);
    },

    // ============================================
    // CHARACTERS (Save Slots)
    // ============================================

    async getCharacters() {
        return this.get('/characters');
    },

    async saveCharacter(slotIndex, characterData) {
        return this.put(`/characters/${slotIndex}`, { characterData });
    },

    async deleteCharacter(slotIndex) {
        return this.delete(`/characters/${slotIndex}`);
    },

    // ============================================
    // COACH
    // ============================================

    async getCoachClients() {
        return this.get('/coach/clients');
    },

    async getClientDetail(clientId) {
        return this.get(`/coach/clients/${clientId}`);
    },

    async getClientWorkouts(clientId, limit = 20, offset = 0) {
        return this.get(`/coach/clients/${clientId}/workouts?limit=${limit}&offset=${offset}`);
    },

    async getClientStats(clientId) {
        return this.get(`/coach/clients/${clientId}/stats`);
    },

    async getClientCampaigns(clientId) {
        return this.get(`/coach/clients/${clientId}/campaigns`);
    },

    async inviteClient(email) {
        return this.post('/coach/invite', { email });
    },

    async getCoachInvitations() {
        return this.get('/coach/invitations');
    },

    async acceptCoachInvitation(inviteId) {
        return this.post(`/coach/invitations/${inviteId}/accept`);
    },

    async declineCoachInvitation(inviteId) {
        return this.post(`/coach/invitations/${inviteId}/decline`);
    },

    async getMyCoaches() {
        return this.get('/coach/my-coaches');
    },

    async removeClient(clientId) {
        return this.delete(`/coach/clients/${clientId}`);
    },

    async disconnectFromCoach(coachId) {
        return this.delete(`/coach/my-coaches/${coachId}`);
    },

    async assignCampaignToClient(clientId, campaignData) {
        return this.post(`/coach/clients/${clientId}/assign-campaign`, campaignData);
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
    },

    // ============================================
    // OFFLINE SYNC
    // ============================================

    // IndexedDB database name and version
    DB_NAME: 'ironquest_offline',
    DB_VERSION: 1,
    db: null,

    // Initialize IndexedDB
    async initOfflineDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = () => reject(request.error);

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Store for pending sync actions
                if (!db.objectStoreNames.contains('syncQueue')) {
                    const syncStore = db.createObjectStore('syncQueue', { keyPath: 'clientId' });
                    syncStore.createIndex('timestamp', 'clientTimestamp', { unique: false });
                    syncStore.createIndex('type', 'type', { unique: false });
                }

                // Store for offline workouts
                if (!db.objectStoreNames.contains('offlineWorkouts')) {
                    const workoutStore = db.createObjectStore('offlineWorkouts', { keyPath: 'clientId' });
                    workoutStore.createIndex('date', 'completedAt', { unique: false });
                }

                // Store for sync metadata
                if (!db.objectStoreNames.contains('syncMeta')) {
                    db.createObjectStore('syncMeta', { keyPath: 'key' });
                }
            };
        });
    },

    // Get IndexedDB database
    async getDB() {
        if (!this.db) {
            await this.initOfflineDB();
        }
        return this.db;
    },

    // Add action to sync queue
    async queueSyncAction(type, payload) {
        const db = await this.getDB();
        const clientId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const action = {
            clientId,
            type,
            payload: { ...payload, clientId },
            clientTimestamp: new Date().toISOString(),
            synced: false
        };

        return new Promise((resolve, reject) => {
            const tx = db.transaction('syncQueue', 'readwrite');
            const store = tx.objectStore('syncQueue');
            const request = store.add(action);

            request.onsuccess = () => resolve(action);
            request.onerror = () => reject(request.error);
        });
    },

    // Get all pending sync actions
    async getPendingSyncActions() {
        const db = await this.getDB();

        return new Promise((resolve, reject) => {
            const tx = db.transaction('syncQueue', 'readonly');
            const store = tx.objectStore('syncQueue');
            const request = store.getAll();

            request.onsuccess = () => {
                const actions = request.result.filter(a => !a.synced);
                resolve(actions);
            };
            request.onerror = () => reject(request.error);
        });
    },

    // Mark actions as synced
    async markActionsSynced(clientIds) {
        const db = await this.getDB();

        return new Promise((resolve, reject) => {
            const tx = db.transaction('syncQueue', 'readwrite');
            const store = tx.objectStore('syncQueue');

            clientIds.forEach(clientId => {
                const getRequest = store.get(clientId);
                getRequest.onsuccess = () => {
                    const action = getRequest.result;
                    if (action) {
                        action.synced = true;
                        store.put(action);
                    }
                };
            });

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    // Clear synced actions
    async clearSyncedActions() {
        const db = await this.getDB();

        return new Promise((resolve, reject) => {
            const tx = db.transaction('syncQueue', 'readwrite');
            const store = tx.objectStore('syncQueue');
            const request = store.openCursor();

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (cursor.value.synced) {
                        cursor.delete();
                    }
                    cursor.continue();
                }
            };

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    // Save last sync timestamp
    async setLastSyncTimestamp(timestamp) {
        const db = await this.getDB();

        return new Promise((resolve, reject) => {
            const tx = db.transaction('syncMeta', 'readwrite');
            const store = tx.objectStore('syncMeta');
            store.put({ key: 'lastSync', value: timestamp });

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    // Get last sync timestamp
    async getLastSyncTimestamp() {
        const db = await this.getDB();

        return new Promise((resolve, reject) => {
            const tx = db.transaction('syncMeta', 'readonly');
            const store = tx.objectStore('syncMeta');
            const request = store.get('lastSync');

            request.onsuccess = () => resolve(request.result?.value || null);
            request.onerror = () => reject(request.error);
        });
    },

    // Sync status
    syncStatus: 'idle', // 'idle', 'syncing', 'error', 'offline'
    syncListeners: [],

    onSyncStatusChange(callback) {
        this.syncListeners.push(callback);
    },

    setSyncStatus(status) {
        this.syncStatus = status;
        this.syncListeners.forEach(cb => cb(status));
    },

    // Check if online
    isOnline() {
        return navigator.onLine;
    },

    // Push sync to server
    async pushSync() {
        if (!this.isOnline() || !this.isAuthenticated()) {
            return { status: 'offline' };
        }

        const pending = await this.getPendingSyncActions();
        if (pending.length === 0) {
            return { status: 'no_pending' };
        }

        this.setSyncStatus('syncing');

        try {
            const lastSync = await this.getLastSyncTimestamp();
            const response = await this.post('/sync/push', {
                actions: pending.map(a => ({
                    type: a.type,
                    clientTimestamp: a.clientTimestamp,
                    payload: a.payload
                })),
                lastSyncTimestamp: lastSync
            });

            // Mark successful syncs
            const syncedIds = response.results
                .filter(r => r.status === 'synced' || r.status === 'already_synced')
                .map(r => pending.find(p => p.clientTimestamp === r.clientTimestamp)?.clientId)
                .filter(Boolean);

            await this.markActionsSynced(syncedIds);
            await this.setLastSyncTimestamp(response.serverTimestamp);
            await this.clearSyncedActions();

            this.setSyncStatus('idle');

            return {
                status: 'success',
                synced: syncedIds.length,
                conflicts: response.conflicts || []
            };

        } catch (error) {
            console.error('Sync push error:', error);
            this.setSyncStatus('error');
            return { status: 'error', error: error.message };
        }
    },

    // Pull changes from server
    async pullSync() {
        if (!this.isOnline() || !this.isAuthenticated()) {
            return { status: 'offline' };
        }

        this.setSyncStatus('syncing');

        try {
            const lastSync = await this.getLastSyncTimestamp();
            const response = await this.get(`/sync/pull?since=${lastSync || ''}`);

            await this.setLastSyncTimestamp(response.serverTimestamp);
            this.setSyncStatus('idle');

            return {
                status: 'success',
                workouts: response.workouts || [],
                personalRecords: response.personalRecords || {},
                userStats: response.userStats
            };

        } catch (error) {
            console.error('Sync pull error:', error);
            this.setSyncStatus('error');
            return { status: 'error', error: error.message };
        }
    },

    // Full sync (push then pull)
    async fullSync() {
        const pushResult = await this.pushSync();
        if (pushResult.status === 'error') {
            return pushResult;
        }

        const pullResult = await this.pullSync();
        return {
            push: pushResult,
            pull: pullResult
        };
    },

    // Save workout with offline support
    async saveWorkoutWithSync(workoutData) {
        // Always queue locally first
        const action = await this.queueSyncAction('workout', workoutData);

        // Try to sync immediately if online
        if (this.isOnline() && this.isAuthenticated()) {
            const syncResult = await this.pushSync();
            return {
                ...workoutData,
                clientId: action.clientId,
                synced: syncResult.status === 'success'
            };
        }

        return {
            ...workoutData,
            clientId: action.clientId,
            synced: false,
            offline: true
        };
    },

    // Get pending sync count
    async getPendingSyncCount() {
        const pending = await this.getPendingSyncActions();
        return pending.length;
    }
};

// Initialize offline DB on load
API.initOfflineDB().catch(err => console.error('Failed to init offline DB:', err));

// Listen for online/offline events
window.addEventListener('online', async () => {
    console.log('Back online - attempting sync');
    API.setSyncStatus('idle');
    if (API.isAuthenticated()) {
        const result = await API.fullSync();
        console.log('Auto-sync result:', result);
    }
});

window.addEventListener('offline', () => {
    console.log('Gone offline');
    API.setSyncStatus('offline');
});

// Export for use in app.js
window.API = API;
