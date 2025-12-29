# Iron Quest - Backend Server

Node.js + Express + PostgreSQL + Socket.io backend for Iron Quest workout tracker.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+

## Setup

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Server port (default: 3001)

### 3. Setup Database

Create the PostgreSQL database:

```sql
CREATE DATABASE ironquest;
```

Initialize the schema:

```bash
npm run db:init
```

### 4. Run Server

Development (with hot reload):
```bash
npm run dev
```

Production:
```bash
npm start
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user profile |
| PUT | `/api/auth/me` | Update user profile |

### Workouts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workouts` | Get user workouts |
| GET | `/api/workouts/:id` | Get single workout |
| POST | `/api/workouts` | Save workout |
| DELETE | `/api/workouts/:id` | Delete workout |
| GET | `/api/workouts/stats/summary` | Get workout stats |

### Teams
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/teams` | Get user teams |
| GET | `/api/teams/:id` | Get team details |
| POST | `/api/teams` | Create team |
| POST | `/api/teams/join` | Join team by invite code |
| POST | `/api/teams/:id/leave` | Leave team |
| GET | `/api/teams/:id/leaderboard` | Get team leaderboard |
| GET | `/api/teams/:id/activity` | Get team activity feed |
| POST | `/api/teams/:id/challenges` | Create team challenge |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat/team/:id/messages` | Get team messages |
| POST | `/api/chat/team/:id/messages` | Send message |

## Socket.io Events

### Client Events (emit)
- `join_team` - Join team room for real-time updates
- `leave_team` - Leave team room
- `team_message` - Send chat message
- `workout_completed` - Notify team of completed workout
- `new_pr` - Notify team of new personal record
- `achievement_unlocked` - Notify team of achievement

### Server Events (listen)
- `new_message` - New chat message received
- `activity` - New team activity
- `error` - Error notification

## Database Schema

Tables:
- `users` - User accounts and profiles
- `personal_records` - Personal bests per exercise
- `workouts` - Completed workout sessions
- `workout_exercises` - Exercises within workouts
- `exercise_sets` - Individual sets
- `custom_exercises` - User-created exercises
- `custom_workouts` - User-created workout templates
- `teams` - Teams/guilds
- `team_members` - Team membership
- `team_challenges` - Team challenges
- `activity_feed` - Team activity log
- `team_messages` - Team chat messages
- `coach_shares` - Coach sharing tokens
