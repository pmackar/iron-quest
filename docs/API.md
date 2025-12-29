# Iron Quest API Documentation

Base URL: `https://iron-quest-production.up.railway.app`

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

Tokens are obtained from `/api/auth/login` or `/api/auth/register`.

---

## Endpoints

### Health Check

#### GET /health
Check server status.

**Response**
```json
{
  "status": "ok",
  "timestamp": "2025-12-29T22:36:20.000Z",
  "version": "1.0.0"
}
```

---

### Authentication

#### POST /api/auth/register
Create a new user account.

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "username": "IronWarrior",
  "avatar": 1,
  "heightFeet": 5,
  "heightInches": 10,
  "weight": 180,
  "gender": "male"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Unique email address |
| password | string | Yes | Min 6 characters |
| username | string | Yes | Unique display name |
| avatar | integer | No | Avatar ID (1-4) |
| heightFeet | integer | No | Height in feet |
| heightInches | integer | No | Additional inches |
| weight | integer | No | Body weight in lbs |
| gender | string | No | `male`, `female`, or `other` |

**Response** `201 Created`
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "IronWarrior",
    "avatar": 1,
    "level": 1,
    "xp": 0
  }
}
```

---

#### POST /api/auth/login
Authenticate an existing user.

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response** `200 OK`
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "IronWarrior",
    "avatar": 1,
    "level": 5,
    "xp": 2450,
    "xpToNext": 600,
    "totalWorkouts": 23,
    "totalSets": 412,
    "totalWeight": 156000
  }
}
```

**Error** `401 Unauthorized`
```json
{
  "error": "Invalid email or password"
}
```

---

#### GET /api/auth/me
Get current user profile. Requires authentication.

**Response** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "IronWarrior",
    "avatar": 1,
    "heightFeet": 5,
    "heightInches": 10,
    "weight": 180,
    "gender": "male",
    "level": 5,
    "xp": 2450,
    "xpToNext": 600,
    "totalWorkouts": 23,
    "totalSets": 412,
    "totalWeight": 156000,
    "achievements": ["first_workout", "week_streak"],
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

---

#### PUT /api/auth/me
Update user profile. Requires authentication.

**Request Body** (all fields optional)
```json
{
  "username": "NewUsername",
  "avatar": 2,
  "heightFeet": 6,
  "heightInches": 0,
  "weight": 185,
  "gender": "male"
}
```

**Response** `200 OK`
```json
{
  "message": "Profile updated successfully",
  "user": { ... }
}
```

---

### Workouts

#### GET /api/workouts
Get user's workout history. Requires authentication.

**Query Parameters**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | integer | 20 | Max results |
| offset | integer | 0 | Pagination offset |

**Response** `200 OK`
```json
{
  "workouts": [
    {
      "id": "uuid",
      "name": "Push Day",
      "type": "push",
      "duration": 3600,
      "totalSets": 18,
      "totalVolume": 12500,
      "xpEarned": 150,
      "notes": "Felt strong today",
      "completedAt": "2025-12-29T18:00:00.000Z"
    }
  ],
  "total": 23,
  "limit": 20,
  "offset": 0
}
```

---

#### GET /api/workouts/:id
Get a single workout with full exercise details. Requires authentication.

**Response** `200 OK`
```json
{
  "workout": {
    "id": "uuid",
    "name": "Push Day",
    "type": "push",
    "duration": 3600,
    "totalSets": 18,
    "totalVolume": 12500,
    "xpEarned": 150,
    "notes": "Felt strong today",
    "completedAt": "2025-12-29T18:00:00.000Z",
    "exercises": [
      {
        "id": "uuid",
        "exerciseId": "bench-press",
        "exerciseName": "Bench Press",
        "orderIndex": 0,
        "sets": [
          {
            "id": "uuid",
            "setNumber": 1,
            "weight": 185,
            "reps": 8
          }
        ]
      }
    ]
  }
}
```

---

#### POST /api/workouts
Save a completed workout. Requires authentication.

**Request Body**
```json
{
  "name": "Push Day",
  "type": "push",
  "duration": 3600,
  "totalSets": 18,
  "totalVolume": 12500,
  "xpEarned": 150,
  "notes": "Felt strong today",
  "exercises": [
    {
      "exerciseId": "bench-press",
      "exerciseName": "Bench Press",
      "sets": [
        { "weight": 185, "reps": 8 },
        { "weight": 185, "reps": 7 },
        { "weight": 185, "reps": 6 }
      ]
    }
  ],
  "personalRecords": [
    {
      "exerciseId": "bench-press",
      "weight": 185
    }
  ]
}
```

**Response** `201 Created`
```json
{
  "message": "Workout saved successfully",
  "workout": {
    "id": "uuid",
    "name": "Push Day",
    ...
  }
}
```

---

#### DELETE /api/workouts/:id
Delete a workout. Requires authentication.

**Response** `200 OK`
```json
{
  "message": "Workout deleted successfully"
}
```

---

#### GET /api/workouts/stats/summary
Get workout statistics. Requires authentication.

**Response** `200 OK`
```json
{
  "stats": {
    "totalWorkouts": 23,
    "totalSets": 412,
    "totalVolume": 156000,
    "totalXp": 2450,
    "thisWeek": {
      "workouts": 3,
      "volume": 8500
    },
    "lastWorkout": "2025-12-29T18:00:00.000Z"
  }
}
```

---

### Teams

#### GET /api/teams
Get user's teams. Requires authentication.

**Response** `200 OK`
```json
{
  "teams": [
    {
      "id": "uuid",
      "name": "Iron Warriors",
      "description": "Strength training crew",
      "avatar": "💪",
      "level": 3,
      "memberCount": 8,
      "role": "captain"
    }
  ]
}
```

---

#### GET /api/teams/:id
Get team details with members and challenges. Requires authentication.

**Response** `200 OK`
```json
{
  "team": {
    "id": "uuid",
    "name": "Iron Warriors",
    "description": "Strength training crew",
    "avatar": "💪",
    "inviteCode": "ABC12345",
    "level": 3,
    "totalXp": 15000,
    "weeklyXp": 2500,
    "captainId": "uuid",
    "maxMembers": 20,
    "isPublic": true,
    "members": [
      {
        "id": "uuid",
        "userId": "uuid",
        "username": "IronWarrior",
        "avatar": 1,
        "role": "captain",
        "contributionXp": 5000,
        "joinedAt": "2025-01-01T00:00:00.000Z"
      }
    ],
    "challenges": [
      {
        "id": "uuid",
        "title": "Weekly Volume Challenge",
        "targetType": "volume",
        "targetValue": 50000,
        "currentValue": 32000,
        "endDate": "2025-12-31T23:59:59.000Z",
        "isCompleted": false
      }
    ]
  }
}
```

---

#### POST /api/teams
Create a new team. Requires authentication.

**Request Body**
```json
{
  "name": "Iron Warriors",
  "description": "Strength training crew",
  "avatar": "💪"
}
```

**Response** `201 Created`
```json
{
  "message": "Team created successfully",
  "team": {
    "id": "uuid",
    "name": "Iron Warriors",
    "inviteCode": "ABC12345",
    ...
  }
}
```

---

#### POST /api/teams/join
Join a team using invite code. Requires authentication.

**Request Body**
```json
{
  "inviteCode": "ABC12345"
}
```

**Response** `200 OK`
```json
{
  "message": "Joined team successfully",
  "team": { ... }
}
```

**Error** `404 Not Found`
```json
{
  "error": "Invalid invite code"
}
```

---

#### POST /api/teams/:id/leave
Leave a team. Requires authentication.

**Response** `200 OK`
```json
{
  "message": "Left team successfully"
}
```

---

#### GET /api/teams/:id/leaderboard
Get team leaderboard. Requires authentication.

**Query Parameters**
| Param | Type | Default | Options |
|-------|------|---------|---------|
| type | string | xp | `xp`, `workouts`, `volume` |

**Response** `200 OK`
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "userId": "uuid",
      "username": "IronWarrior",
      "avatar": 1,
      "value": 5000
    }
  ]
}
```

---

#### GET /api/teams/:id/activity
Get team activity feed. Requires authentication.

**Query Parameters**
| Param | Type | Default |
|-------|------|---------|
| limit | integer | 20 |

**Response** `200 OK`
```json
{
  "activities": [
    {
      "id": "uuid",
      "userId": "uuid",
      "username": "IronWarrior",
      "activityType": "workout",
      "title": "Completed Push Day",
      "description": "18 sets, 12,500 lbs volume",
      "metadata": { "xpEarned": 150 },
      "createdAt": "2025-12-29T18:00:00.000Z"
    }
  ]
}
```

---

#### POST /api/teams/:id/challenges
Create a team challenge. Requires authentication (captain/co-captain only).

**Request Body**
```json
{
  "title": "Weekly Volume Challenge",
  "description": "Hit 50,000 lbs total team volume",
  "targetType": "volume",
  "targetValue": 50000,
  "endDate": "2025-12-31T23:59:59.000Z",
  "rewardXp": 500
}
```

| Field | Type | Required | Options |
|-------|------|----------|---------|
| title | string | Yes | |
| description | string | No | |
| targetType | string | Yes | `xp`, `workouts`, `volume`, `sets` |
| targetValue | integer | Yes | |
| endDate | ISO date | Yes | |
| rewardXp | integer | No | Default: 100 |

**Response** `201 Created`
```json
{
  "message": "Challenge created successfully",
  "challenge": { ... }
}
```

---

### Chat

#### GET /api/chat/team/:teamId/messages
Get team chat messages. Requires authentication.

**Query Parameters**
| Param | Type | Default |
|-------|------|---------|
| limit | integer | 50 |

**Response** `200 OK`
```json
{
  "messages": [
    {
      "id": "uuid",
      "userId": "uuid",
      "username": "IronWarrior",
      "avatar": 1,
      "message": "Great workout today!",
      "createdAt": "2025-12-29T18:30:00.000Z"
    }
  ]
}
```

---

#### POST /api/chat/team/:teamId/messages
Send a chat message. Requires authentication.

**Request Body**
```json
{
  "message": "Great workout today!"
}
```

**Response** `201 Created`
```json
{
  "message": "Message sent",
  "chatMessage": {
    "id": "uuid",
    "message": "Great workout today!",
    "createdAt": "2025-12-29T18:30:00.000Z"
  }
}
```

---

## Socket.io Events

Connect to the WebSocket server for real-time features:

```javascript
const socket = io('https://iron-quest-production.up.railway.app', {
  auth: { token: 'your-jwt-token' }
});
```

### Client Events (Emit)

| Event | Payload | Description |
|-------|---------|-------------|
| `join_team` | `teamId` | Join team room for updates |
| `leave_team` | `teamId` | Leave team room |
| `team_message` | `{ teamId, message }` | Send chat message |
| `workout_completed` | `{ workoutName, xpEarned, totalVolume }` | Notify workout completion |
| `new_pr` | `{ exerciseName, weight }` | Notify new personal record |
| `achievement_unlocked` | `{ achievementName }` | Notify achievement |

### Server Events (Listen)

| Event | Payload | Description |
|-------|---------|-------------|
| `new_message` | `{ userId, username, message, createdAt }` | New chat message |
| `activity` | `{ type, userId, username, data }` | Team activity update |
| `error` | `{ message }` | Error notification |

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message description"
}
```

| Status | Description |
|--------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate resource |
| 500 | Internal Server Error |
