# IRON QUEST - Product Roadmap

## Phase 1: Multi-Character System
**Foundation for individual profiles**

### Features
- [ ] Character Creation Screen
- [ ] Individual save slots with unique names, avatars, stats
- [ ] Delete/reset character option
- [ ] Character-specific achievements and PRs

### Technical Requirements
- Refactor localStorage to support multiple profiles
- Create character management UI
- Unique character IDs for future backend sync

---

## Phase 2: Workout History
**Complete logging and historical data**

### Features
- [ ] Workout log with date/time stamps
- [ ] Calendar view showing workout days
- [ ] Individual workout detail view (exercises, sets, weights, reps)
- [ ] Edit/delete past workouts
- [ ] Workout notes/comments
- [ ] Workout duration tracking

### Data Structure
```javascript
{
  id: "uuid",
  date: "2024-01-15T10:30:00Z",
  type: "push",
  duration: 3600, // seconds
  exercises: [
    { id: "bench", sets: [{weight: 135, reps: 10}, ...] }
  ],
  notes: "Felt strong today",
  xpEarned: 450
}
```

---

## Phase 3: Stats & Analytics
**Visualize progress over time**

### Features
- [ ] Progress charts per exercise (weight over time)
- [ ] Volume tracking (total weight lifted per session/week/month)
- [ ] Personal records timeline
- [ ] Streak statistics and history
- [ ] Body part volume distribution
- [ ] Workout frequency heatmap
- [ ] Estimated 1RM calculations

### Charts Needed
- Line chart: Weight progression per lift
- Bar chart: Weekly volume comparison
- Heatmap: Workout consistency calendar
- Pie chart: Muscle group distribution

### Libraries to Consider
- Chart.js (lightweight, no dependencies)
- D3.js (more complex, full control)

---

## Phase 4: Coach Sharing
**Connect athletes with coaches**

### Features
- [ ] Generate shareable profile link/code
- [ ] Coach dashboard view (read-only)
- [ ] Export workout data (PDF/CSV)
- [ ] Coach notes on workouts
- [ ] Workout plan assignments from coach
- [ ] Progress photo timeline (optional)
- [ ] Direct messaging

### Access Levels
| Role    | View Stats | View History | Edit Workouts | Assign Plans |
|---------|------------|--------------|---------------|--------------|
| Athlete | ✓          | ✓            | ✓             | -            |
| Coach   | ✓          | ✓            | -             | ✓            |

### Technical Requirements
- Backend API (Node.js/Express or similar)
- User authentication (OAuth or email/password)
- Database (PostgreSQL or MongoDB)
- Unique share codes with expiry

---

## Phase 5: Teams & Social
**Compete and train together**

### Features
- [ ] Create/join teams (invite code)
- [ ] Team leaderboards (XP, volume, streaks)
- [ ] Team challenges (weekly goals)
- [ ] Activity feed (teammate PRs, achievements)
- [ ] Team chat
- [ ] Guild/team leveling system
- [ ] Team vs team competitions

### Team Structure
```javascript
{
  id: "team-uuid",
  name: "Iron Warriors",
  avatar: "shield",
  level: 5,
  members: [
    { id: "user-1", role: "captain" },
    { id: "user-2", role: "member" }
  ],
  weeklyXP: 12500,
  challenges: [...]
}
```

### Gamification Additions
- Team achievements (collective milestones)
- Seasonal competitions
- Team badges/banners
- Contribution rankings

---

## Phase 6: Backend Infrastructure
**Required for Phases 4-5**

### Stack Recommendation
```
Frontend:  Current HTML/CSS/JS → Consider React/Vue migration
Backend:   Node.js + Express
Database:  PostgreSQL (relational data fits well)
Auth:      JWT + OAuth (Google/Apple)
Hosting:   Vercel (frontend) + Railway/Render (backend)
Real-time: Socket.io (for chat/live updates)
```

### API Endpoints Needed
```
POST   /auth/register
POST   /auth/login
GET    /users/:id
PUT    /users/:id

GET    /workouts
POST   /workouts
GET    /workouts/:id
PUT    /workouts/:id
DELETE /workouts/:id

GET    /teams
POST   /teams
POST   /teams/:id/join
GET    /teams/:id/leaderboard

POST   /coach/share
GET    /coach/:code
```

---

## Implementation Priority

| Phase | Effort | Value | Priority |
|-------|--------|-------|----------|
| 1. Multi-Character | Low | Medium | ★★★★★ |
| 2. Workout History | Medium | High | ★★★★★ |
| 3. Stats & Analytics | Medium | High | ★★★★☆ |
| 4. Coach Sharing | High | Medium | ★★★☆☆ |
| 5. Teams & Social | High | Medium | ★★★☆☆ |
| 6. Backend | High | Required | ★★★★★ |

---

## Quick Wins (No Backend Required)

These can be built into the current demo immediately:

1. **Multiple characters** - localStorage with profile switching
2. **Workout history** - Store completed workouts in localStorage
3. **Basic charts** - Chart.js for progress visualization
4. **Export to CSV** - Client-side data export
5. **Share via screenshot** - HTML2Canvas for shareable images

---

## Future Considerations

- **Mobile app**: React Native or PWA
- **Wearable sync**: Apple Watch, Garmin integration
- **AI coaching**: Form analysis, program recommendations
- **Marketplace**: Custom workout programs, team themes
- **Premium tier**: Advanced analytics, unlimited history
