# gamify.today - Development Kickstart Guide

> A gamified to-do app sharing the design language and ecosystem of Iron Quest

---

## Project Context

**gamify.today** is a to-do application that will be part of the Iron Quest ecosystem. It should share the same visual identity, gamification philosophy, and technical patterns while being adapted for task/productivity management rather than fitness tracking.

---

## 1. Tech Stack (Mirror Iron Quest)

### Frontend
| Technology | Purpose | Notes |
|------------|---------|-------|
| **HTML5/CSS3** | Structure & styling | No framework, vanilla |
| **Vanilla JavaScript** | App logic | Single-file SPA pattern |
| **Google Fonts** | Typography | Inter + Press Start 2P |
| **Google Sign-In** | OAuth authentication | Same client ID as Iron Quest |
| **Socket.io Client** | Real-time features | Team/shared list updates |
| **localStorage** | Offline mode | Full offline functionality |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Runtime |
| **Express.js** | 5.x | HTTP framework |
| **PostgreSQL** | 14+ | Database |
| **Socket.io** | 4.8+ | Real-time communication |
| **JWT** | jsonwebtoken | Authentication |
| **bcryptjs** | 3.x | Password hashing |
| **pg** | 8.x | PostgreSQL driver |

### Deployment
- **Frontend**: Vercel (static hosting)
- **Backend**: Railway (Node.js + PostgreSQL)
- **Environment**: Same infrastructure as Iron Quest

---

## 2. Design Language

### Color Palette (Dreamcast Theme)

```css
/* Primary Colors */
--dreamcast-orange: #ff6b35;    /* Primary accent - energy, motivation */
--dreamcast-blue: #2d7dd2;      /* Secondary accent - calm, professional */

/* Backgrounds */
--bg-primary: #ffffff;          /* Main background */
--bg-secondary: #f8f9fa;        /* Cards, sections */
--bg-tertiary: #f1f3f5;         /* Subtle backgrounds */

/* Text */
--text-primary: #1a1d23;        /* Main text */
--text-secondary: #4a5568;      /* Secondary text */
--text-tertiary: #718096;       /* Muted text */

/* Status Colors */
--success: #22c55e;             /* Completed, positive */
--warning: #f59e0b;             /* Pending, attention */
--error: #ef4444;               /* Overdue, danger */
--info: #3b82f6;                /* Informational */

/* Gamification */
--xp-gold: #fbbf24;             /* XP indicators */
--level-purple: #8b5cf6;        /* Level badges */
--streak-flame: #f97316;        /* Streak indicators */
```

### Typography

```css
/* Primary Font - Modern, clean */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Pixel/Retro Font - Headings, stats, gamification elements */
font-family: 'Press Start 2P', monospace;

/* Monospace - Code, numbers, stats */
font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
```

**Usage Guidelines:**
- Inter: Body text, UI elements, descriptions
- Press Start 2P: XP displays, level numbers, achievement titles, hero headings
- Monospace: Statistics, counters, timestamps

### Spacing Scale (8px base)

```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
--space-2xl: 48px;
```

### Border Radius

```css
--radius-sm: 4px;     /* Small elements, chips */
--radius-md: 8px;     /* Buttons, inputs */
--radius-lg: 12px;    /* Cards */
--radius-xl: 16px;    /* Large cards, modals */
--radius-2xl: 24px;   /* Hero sections */
```

### Shadows

```css
/* Light, subtle shadow */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);

/* Medium shadow for cards */
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
             0 2px 4px -1px rgba(0, 0, 0, 0.06);

/* Large shadow for modals, dropdowns */
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
             0 4px 6px -2px rgba(0, 0, 0, 0.05);

/* Glow effect for interactive elements */
--shadow-glow: 0 0 20px rgba(255, 107, 53, 0.3);
```

### Glass Morphism Effect

```css
.glass-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: var(--shadow-md);
}
```

### Animations

```css
/* Standard transition */
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 400ms cubic-bezier(0.4, 0, 0.2, 1);

/* Hover lift effect */
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

/* XP bar animation */
@keyframes xp-fill {
  from { width: 0; }
  to { width: var(--xp-percent); }
}
```

### Retro/Dreamcast Elements

1. **Dreamcast Swirl Pattern**: Subtle rotating SVG background decoration
2. **Pixel Font Headers**: Use Press Start 2P for gamification UI
3. **Bevel Buttons**: 3D button effect for primary actions
4. **Memory Card Metaphor**: Save slots, character profiles
5. **Floating Particles**: Subtle animated background elements
6. **XP Bar Glow**: Animated glow on progress bars

---

## 3. Gamification System (Adapted for Tasks)

### XP & Leveling

#### Task Tier System (Replaces Exercise Tiers)
```javascript
const TASK_TIERS = {
  // Tier 1: Major tasks (3x XP)
  tier1: ['project', 'milestone', 'deadline', 'review'],

  // Tier 2: Standard tasks (2x XP)
  tier2: ['meeting', 'report', 'feature', 'bug-fix'],

  // Tier 3: Quick tasks (1x XP)
  tier3: ['email', 'call', 'note', 'reminder']
};
```

#### XP Calculation Ideas
```javascript
// Base XP per task completion
const BASE_XP = 10;

// Multipliers
const TIER_MULTIPLIER = { tier1: 3, tier2: 2, tier3: 1 };
const ON_TIME_BONUS = 1.5;      // Completed before deadline
const STREAK_BONUS = 0.1;       // Per day of streak (caps at 2x)
const DIFFICULTY_MULTIPLIER = { easy: 1, medium: 1.5, hard: 2, epic: 3 };

function calculateTaskXP(task, userStreak) {
  let xp = BASE_XP;
  xp *= TIER_MULTIPLIER[task.tier];
  xp *= DIFFICULTY_MULTIPLIER[task.difficulty];

  if (task.completedBeforeDeadline) {
    xp *= ON_TIME_BONUS;
  }

  const streakMultiplier = Math.min(1 + (userStreak * 0.1), 2);
  xp *= streakMultiplier;

  return Math.floor(xp);
}
```

#### Leveling Formula
```javascript
function xpToNextLevel(level) {
  // Progressive XP requirements
  return Math.floor(100 * Math.pow(1.5, level - 1));
}
```

### Streaks

```javascript
const STREAK_TYPES = {
  daily: {
    name: 'Daily Streak',
    requirement: 'Complete at least 1 task per day',
    bonusXP: 10 // per day maintained
  },
  weekly: {
    name: 'Weekly Warrior',
    requirement: 'Complete all weekly goals',
    bonusXP: 100
  },
  perfect: {
    name: 'Perfect Day',
    requirement: 'Complete all scheduled tasks for a day',
    bonusXP: 50
  }
};
```

### Achievements (Badges)

```javascript
const ACHIEVEMENTS = {
  // Getting Started
  'first-task': { name: 'First Step', desc: 'Complete your first task', xp: 25 },
  'task-10': { name: 'Getting Going', desc: 'Complete 10 tasks', xp: 50 },
  'task-100': { name: 'Centurion', desc: 'Complete 100 tasks', xp: 200 },

  // Streaks
  'streak-7': { name: 'Week Warrior', desc: '7-day streak', xp: 100 },
  'streak-30': { name: 'Monthly Master', desc: '30-day streak', xp: 500 },
  'streak-100': { name: 'Legendary', desc: '100-day streak', xp: 2000 },

  // On-Time
  'on-time-10': { name: 'Punctual', desc: '10 tasks on time', xp: 75 },
  'on-time-50': { name: 'Reliable', desc: '50 tasks on time', xp: 300 },

  // Categories
  'category-master': { name: 'Specialist', desc: '50 tasks in one category', xp: 150 },

  // Time-based
  'early-bird': { name: 'Early Bird', desc: 'Complete 10 tasks before 9am', xp: 100 },
  'night-owl': { name: 'Night Owl', desc: 'Complete 10 tasks after 10pm', xp: 100 },

  // Social
  'team-player': { name: 'Team Player', desc: 'Join a team', xp: 50 },
  'collaborator': { name: 'Collaborator', desc: 'Complete 25 shared tasks', xp: 200 }
};
```

### Personal Records (PRs) - Adapted

```javascript
const PERSONAL_RECORDS = {
  'most-tasks-day': { name: 'Daily Max', desc: 'Most tasks in a single day' },
  'longest-streak': { name: 'Longest Streak', desc: 'Longest daily streak' },
  'fastest-completion': { name: 'Speed Demon', desc: 'Fastest task completion' },
  'most-xp-week': { name: 'Weekly Champion', desc: 'Most XP in a week' }
};
```

---

## 4. Database Schema (Suggested)

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users (shared with Iron Quest ecosystem)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  avatar VARCHAR(255) DEFAULT 'default',

  -- Gamification
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  xp_to_next INTEGER DEFAULT 100,
  total_tasks_completed INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  achievements TEXT[] DEFAULT '{}',

  -- OAuth
  google_id VARCHAR(255) UNIQUE,
  auth_provider VARCHAR(20) DEFAULT 'email',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- Task Lists
CREATE TABLE lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50) DEFAULT 'list',
  color VARCHAR(7) DEFAULT '#ff6b35',
  is_default BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Task details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  tier VARCHAR(10) DEFAULT 'tier3', -- tier1, tier2, tier3
  difficulty VARCHAR(10) DEFAULT 'medium', -- easy, medium, hard, epic

  -- Status
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,

  -- Scheduling
  due_date TIMESTAMP,
  reminder_at TIMESTAMP,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule VARCHAR(100), -- RRULE format

  -- Gamification
  xp_earned INTEGER DEFAULT 0,
  was_on_time BOOLEAN,

  -- Organization
  tags TEXT[] DEFAULT '{}',
  order_index INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subtasks
CREATE TABLE subtasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Personal Records
CREATE TABLE personal_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  record_type VARCHAR(50) NOT NULL,
  value INTEGER NOT NULL,
  achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, record_type)
);

-- Daily Stats (for streaks and analytics)
CREATE TABLE daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  tasks_completed INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  on_time_completions INTEGER DEFAULT 0,
  UNIQUE(user_id, date)
);

-- Teams (for shared lists)
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  avatar VARCHAR(255),
  invite_code VARCHAR(8) UNIQUE NOT NULL,
  captain_id UUID REFERENCES users(id),
  level INTEGER DEFAULT 1,
  total_xp INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Team Members
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member',
  contribution_xp INTEGER DEFAULT 0,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(team_id, user_id)
);

-- Shared Lists
CREATE TABLE shared_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(list_id, team_id)
);

-- Activity Feed
CREATE TABLE activity_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_tasks_user ON tasks(user_id);
CREATE INDEX idx_tasks_list ON tasks(list_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_completed ON tasks(is_completed);
CREATE INDEX idx_daily_stats_user_date ON daily_stats(user_id, date);
CREATE INDEX idx_activity_team ON activity_feed(team_id);
```

---

## 5. API Structure (Suggested)

### Authentication (Same as Iron Quest)
```
POST /api/auth/register     - Create account
POST /api/auth/login        - Login with email/password
POST /api/auth/google       - Google OAuth
GET  /api/auth/me           - Get current user
PUT  /api/auth/me           - Update profile
```

### Lists
```
GET    /api/lists           - Get all user lists
POST   /api/lists           - Create new list
PUT    /api/lists/:id       - Update list
DELETE /api/lists/:id       - Delete list
POST   /api/lists/:id/share - Share list with team
```

### Tasks
```
GET    /api/tasks              - Get tasks (filter by list, status, due date)
POST   /api/tasks              - Create task
PUT    /api/tasks/:id          - Update task
DELETE /api/tasks/:id          - Delete task
POST   /api/tasks/:id/complete - Mark complete (triggers XP calculation)
POST   /api/tasks/:id/subtasks - Add subtask
```

### Stats & Gamification
```
GET /api/stats/summary      - Get user stats summary
GET /api/stats/daily        - Get daily breakdown
GET /api/stats/achievements - Get achievements
GET /api/stats/records      - Get personal records
GET /api/stats/streaks      - Get streak info
```

### Teams
```
GET  /api/teams             - Get user's teams
POST /api/teams             - Create team
POST /api/teams/join        - Join by invite code
GET  /api/teams/:id         - Get team details
GET  /api/teams/:id/activity - Get activity feed
GET  /api/teams/:id/leaderboard - Get team leaderboard
```

---

## 6. Frontend Structure (Suggested)

```
gamify-today/
├── index.html              # Landing page (Dreamcast theme)
├── app.html                # Main SPA
├── css/
│   └── styles.css          # Design system (based on Iron Quest)
├── js/
│   ├── app.js              # Main application logic
│   └── api.js              # API client wrapper
├── assets/
│   ├── icons/              # Custom icons
│   └── sounds/             # Achievement sounds (optional)
├── server/
│   ├── package.json
│   └── src/
│       ├── index.js        # Express entry
│       ├── db/
│       │   ├── config.js
│       │   └── schema.sql
│       ├── routes/
│       │   ├── auth.js
│       │   ├── lists.js
│       │   ├── tasks.js
│       │   ├── stats.js
│       │   └── teams.js
│       ├── middleware/
│       │   └── auth.js
│       └── socket/
│           └── handler.js
└── docs/
    └── API.md
```

---

## 7. Key UI Components to Build

### 1. Task Card
- Title with tier indicator (color-coded)
- Due date badge (orange if soon, red if overdue)
- Difficulty icon
- XP preview
- Checkbox with satisfying animation
- Subtask progress bar

### 2. XP Status Bar (Header)
- Current level (Press Start 2P font)
- XP progress bar with glow animation
- XP number display
- Level-up animation trigger

### 3. Streak Display
- Flame icon for active streak
- Day counter (pixel font)
- Streak calendar visualization

### 4. Achievement Toast
- Slide-in notification
- Badge icon + name
- XP earned display
- Sound effect (optional)

### 5. List Sidebar
- Inbox, Today, Upcoming sections
- Custom lists with color dots
- Shared team lists indicator
- Quick-add button

### 6. Stats Dashboard
- Weekly XP chart
- Completion rate donut
- Personal records cards
- Achievement showcase

---

## 8. Cross-App Integration Ideas

### Shared User Accounts
- Single sign-on between Iron Quest and gamify.today
- Combined XP/level system (or separate with total display)
- Unified achievement showcase

### Activity Synergy
- "Completed workout" could auto-complete a fitness task
- Team challenges spanning both apps
- Combined leaderboards

### Design Consistency
- Identical color palette
- Shared component library
- Consistent animations and micro-interactions
- Same avatar system

---

## 9. Development Priorities

### Phase 1: Core MVP
1. User authentication (email + Google)
2. Basic task CRUD
3. Simple list management
4. XP calculation on completion
5. Level system
6. Basic streak tracking

### Phase 2: Gamification
1. Achievement system
2. Personal records
3. Daily/weekly stats
4. Streak bonuses
5. Task tiers and difficulty

### Phase 3: Social
1. Teams
2. Shared lists
3. Activity feed
4. Team leaderboards
5. Real-time updates (Socket.io)

### Phase 4: Polish
1. Recurring tasks
2. Reminders/notifications
3. Calendar view
4. Mobile optimization
5. Offline mode with sync

---

## 10. Reference Files from Iron Quest

When building gamify.today, reference these Iron Quest files:

| File | What to Reference |
|------|-------------------|
| `/css/styles.css` | Complete design system, variables, animations |
| `/js/app.js` | XP calculation logic, achievement system, state management |
| `/js/api.js` | API client pattern, Socket.io integration |
| `/server/src/routes/auth.js` | Authentication flow, Google OAuth |
| `/server/src/db/schema.sql` | Database patterns, user table structure |
| `/server/src/middleware/auth.js` | JWT middleware |
| `/index.html` | Landing page design, hero section |
| `/app.html` | SPA structure, screen patterns |

---

## Quick Start Commands

```bash
# Clone and setup (after creating repo)
git clone https://github.com/yourusername/gamify-today.git
cd gamify-today

# Backend setup
cd server
npm init -y
npm install express pg cors dotenv jsonwebtoken bcryptjs uuid socket.io google-auth-library
npm install -D nodemon

# Create .env
cp .env.example .env
# Edit with your DATABASE_URL, JWT_SECRET, GOOGLE_CLIENT_ID

# Initialize database
npm run db:init

# Start development
npm run dev
```

---

*This document provides the foundation for building gamify.today with the Iron Quest design language and gamification philosophy. The goal is a cohesive ecosystem where users feel at home moving between fitness tracking and task management.*
