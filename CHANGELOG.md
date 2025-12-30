# Iron Quest Changelog

## [Unreleased] - Dev Branch

### Phase 1: Google Authentication
- Added Google Sign-In support using Google Identity Services SDK
- Users can now sign in with their Google account
- New users can select role (Athlete/Coach) during first sign-in
- Kept "Play Offline" option for local-only usage
- Database: Added `google_id`, `google_email`, `google_avatar_url`, `auth_provider`, `role` columns to users table

### Phase 2: Offline Sync
- Added IndexedDB for offline workout storage
- Implemented sync queue for offline actions
- Auto-sync on reconnection to internet
- Sync status indicator in UI (synced/syncing/offline/pending)
- New endpoints: `/api/sync/push`, `/api/sync/pull`, `/api/sync/resolve`

### Phase 3: Campaign System
- **Campaign Management**
  - Create personal or team campaigns with target dates
  - Set multiple goals per campaign (1RM, reps at weight, tonnage)
  - Track progress automatically based on workout completion
  - View campaign progress with visual progress bars and rings
  - Delete campaigns

- **Campaign Creator Wizard**
  - 3-step wizard: Type/Info, Goals, Review
  - Support for personal and team campaigns
  - Exercise selection with goal type configuration
  - Target date picker

- **Campaign Progress Tracking**
  - Automatic progress updates when workouts are completed
  - 1RM goals: Track best estimated 1RM
  - Rep goals: Track reps achieved at target weight
  - Tonnage goals: Cumulative volume tracking
  - Goal achievement notifications

- **New Endpoints**
  - `GET /api/campaigns` - List campaigns
  - `POST /api/campaigns` - Create campaign
  - `GET /api/campaigns/:id` - Get campaign details
  - `PUT /api/campaigns/:id` - Update campaign
  - `DELETE /api/campaigns/:id` - Delete campaign
  - `POST /api/campaigns/:id/goals` - Add goal
  - `PUT /api/campaigns/:id/goals/:goalId/progress` - Update progress
  - `DELETE /api/campaigns/:id/goals/:goalId` - Remove goal

### Phase 4: Coach Mode
- **Coach-Client Relationships**
  - Coaches can invite clients by email
  - Clients can accept/decline coach invitations
  - View permissions system (workouts, stats, progress, campaigns)
  - Clients can view and disconnect from coaches

- **Coach Dashboard**
  - Client list with activity overview (last workout, weekly workouts)
  - Detailed client view with tabs: Workouts, PRs, Campaigns
  - Client stats overview (total workouts, weekly workouts, total volume)
  - Assign campaigns to clients directly

- **My Coaches Section (for Athletes)**
  - View pending coach invitations
  - Accept/decline invitations
  - View connected coaches
  - Disconnect from coaches

- **New Endpoints**
  - `GET /api/coach/clients` - List coach's clients
  - `GET /api/coach/clients/:id` - Client details
  - `GET /api/coach/clients/:id/workouts` - Client workouts
  - `GET /api/coach/clients/:id/stats` - Client stats and PRs
  - `GET /api/coach/clients/:id/campaigns` - Client campaigns
  - `POST /api/coach/invite` - Invite client
  - `GET /api/coach/invitations` - Pending invitations (for clients)
  - `POST /api/coach/invitations/:id/accept` - Accept invitation
  - `POST /api/coach/invitations/:id/decline` - Decline invitation
  - `GET /api/coach/my-coaches` - List user's coaches
  - `DELETE /api/coach/clients/:id` - Remove client
  - `DELETE /api/coach/my-coaches/:id` - Disconnect from coach
  - `POST /api/coach/clients/:id/assign-campaign` - Assign campaign

### Bug Fixes
- Fixed bodyweight exercise volume calculation to use `(bodyweight + additionalWeight) x reps`
- Added 'dip' and 'bench_dip' to bodyweight exercises list

---

## [1.0.0] - Production Release

### Features
- Gamified workout tracking with XP and leveling system
- Pre-built workout routines (PPL, Upper/Lower, Full Body, etc.)
- Custom workout and exercise creation
- Personal record tracking
- Team system with leaderboards and challenges
- Real-time team chat
- Workout history with calendar view
- Progress statistics and charts
- Avatar customization
- Achievement system
- Mobile-responsive Dreamcast-inspired UI
