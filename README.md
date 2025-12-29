# Iron Quest

A gamified workout tracker with RPG-style progression, team challenges, and real-time social features.

## Features

### Core Workout Tracking
- **Exercise Logging** - Track weight, reps, sets, and RPE for every exercise
- **Personal Records** - Automatic PR detection and history
- **Workout Types** - Push, Pull, Legs with customizable routines
- **Custom Exercises** - Create your own exercises with muscle group tags
- **Custom Workouts** - Build and save workout templates

### Gamification
- **XP & Leveling** - Earn XP for completed workouts and PRs
- **3-Tier Exercise System** - Major compounds earn 3x XP, secondary compounds 2x
- **Achievements** - Unlock badges for milestones
- **Streaks** - Track consecutive workout weeks

### Social & Teams
- **Team Creation** - Create or join teams with invite codes
- **Leaderboards** - XP, workouts, and volume rankings
- **Team Challenges** - Weekly challenges with XP rewards
- **Real-time Chat** - Team messaging with Socket.io
- **Activity Feed** - See teammate PRs, workouts, and achievements

### Utilities
- **Plate Calculator** - Visual weight plate configuration
- **Rest Timer** - Configurable rest periods
- **1RM Calculator** - Estimate one-rep max from working sets
- **Coach Sharing** - Share progress with coaches via unique codes

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js, Express 5 |
| Database | PostgreSQL |
| Real-time | Socket.io |
| Auth | JWT, bcryptjs |
| Hosting | Vercel (frontend), Railway (backend) |

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/pmackar/iron-quest.git
   cd iron-quest
   ```

2. **Set up the backend**
   ```bash
   cd server
   npm install
   cp .env.example .env
   ```

3. **Configure environment variables** (edit `server/.env`)
   ```env
   PORT=3001
   NODE_ENV=development
   DATABASE_URL=postgresql://postgres:password@localhost:5432/ironquest
   JWT_SECRET=your-secret-key
   JWT_EXPIRES_IN=7d
   FRONTEND_URL=http://localhost:3000
   ```

4. **Initialize the database**
   ```bash
   npm run db:init
   ```

5. **Start the server**
   ```bash
   npm run dev
   ```

6. **Open the frontend**
   - Serve the root directory with any static server
   - Or open `index.html` directly (limited functionality)
   - Recommended: `npx serve .` from project root

## Project Structure

```
iron-quest/
├── index.html              # Main SPA entry point
├── css/
│   └── styles.css          # All styling (5,900 lines)
├── js/
│   ├── app.js              # Application logic (6,614 lines)
│   └── api.js              # API client
├── server/
│   ├── src/
│   │   ├── index.js        # Express server
│   │   ├── db/
│   │   │   ├── config.js   # Database connection
│   │   │   ├── init.js     # Schema initialization
│   │   │   └── schema.sql  # Database schema
│   │   ├── routes/
│   │   │   ├── auth.js     # Authentication
│   │   │   ├── workouts.js # Workout CRUD
│   │   │   ├── teams.js    # Team management
│   │   │   └── chat.js     # Team chat
│   │   ├── middleware/
│   │   │   └── auth.js     # JWT middleware
│   │   └── socket/
│   │       └── handler.js  # Socket.io events
│   └── package.json
└── README.md
```

## Production URLs

| Service | URL |
|---------|-----|
| Frontend | https://iron-quest-8ta6pdb0p-peters-projects-5938774f.vercel.app |
| Backend API | https://iron-quest-production.up.railway.app |
| Health Check | https://iron-quest-production.up.railway.app/health |

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get profile |
| GET | `/api/workouts` | List workouts |
| POST | `/api/workouts` | Save workout |
| GET | `/api/teams` | List user's teams |
| POST | `/api/teams` | Create team |
| POST | `/api/teams/join` | Join team |

See [API Documentation](docs/API.md) for complete reference.

## Database Schema

13 tables including:
- `users` - User accounts and stats
- `workouts` - Workout sessions
- `workout_exercises` - Exercises in workouts
- `exercise_sets` - Individual sets
- `personal_records` - PR history
- `teams` - Team data
- `team_members` - Team membership
- `team_challenges` - Weekly challenges
- `activity_feed` - Social feed
- `team_messages` - Chat messages

See [server/src/db/schema.sql](server/src/db/schema.sql) for full schema.

## Deployment

See [Deployment Guide](docs/DEPLOYMENT.md) for detailed instructions.

### Quick Deploy

**Backend (Railway)**
1. Connect GitHub repo to Railway
2. Set root directory to `server`
3. Add PostgreSQL database
4. Set environment variables

**Frontend (Vercel)**
1. Connect GitHub repo to Vercel
2. Deploy from root directory
3. No build configuration needed

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret for JWT signing | Yes |
| `JWT_EXPIRES_IN` | Token expiration (e.g., `7d`) | No |
| `NODE_ENV` | `development` or `production` | No |
| `PORT` | Server port (default: 3001) | No |
| `FRONTEND_URL` | Frontend URL for CORS | Yes |

## License

MIT
