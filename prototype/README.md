# Iron Quest Prototype

A simplified, multi-user workout tracker using **CSV storage** for prototyping, with a clear migration path to PostgreSQL.

## Quick Start

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Open http://localhost:3001 in your browser
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Express Server                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                   API Routes                             ││
│  │   POST /api/auth/register                                ││
│  │   POST /api/auth/login                                   ││
│  │   GET  /api/auth/me                                      ││
│  │   GET  /api/workouts                                     ││
│  │   POST /api/workouts                                     ││
│  │   GET  /api/records                                      ││
│  │   GET  /api/export                                       ││
│  └──────────────────────┬──────────────────────────────────┘│
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────────────┐│
│  │            Storage Abstraction (IStorage)                ││
│  └──────────────────────┬──────────────────────────────────┘│
│                         │                                    │
│         ┌───────────────┼───────────────┐                   │
│         ▼               ▼               ▼                   │
│   CSVAdapter      SQLiteAdapter   PostgresAdapter           │
│   (active)        (future)        (future)                  │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
              /data/*.csv files
```

## Data Storage

All data is stored in CSV files in the `./data/` directory:

```
data/
├── users.csv        # User accounts
├── workouts.csv     # Workout logs
├── exercises.csv    # Custom exercises
├── records.csv      # Personal records
└── characters.csv   # Game save states
```

### User Isolation

Every record includes a `userId` field. The API enforces that users can **only** access their own data:

```typescript
// API automatically scopes all queries to the authenticated user
const workouts = await storage.getWorkouts(req.user.id);  // Only returns this user's workouts
```

## Features

- **User Registration/Login** - JWT-based authentication
- **Workout Logging** - Log workouts with exercises and sets
- **Personal Records** - Automatic PR tracking
- **Data Export** - Download your data as JSON
- **Multi-user** - Each user's data is completely isolated

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/workouts` | List workouts |
| POST | `/api/workouts` | Log a workout |
| DELETE | `/api/workouts/:id` | Delete workout |
| GET | `/api/exercises` | List custom exercises |
| POST | `/api/exercises` | Create custom exercise |
| GET | `/api/records` | List personal records |
| GET | `/api/characters` | List game saves |
| PUT | `/api/characters/:slot` | Save game state |
| GET | `/api/export` | Export all user data |

## Migration to PostgreSQL

When you're ready to scale beyond 10 users:

### 1. Create PostgreSQL database

```bash
# Create database
createdb ironquest

# Run schema
psql ironquest < scripts/postgres-schema.sql
```

### 2. Install PostgreSQL client

```bash
npm install pg @types/pg
```

### 3. Complete the PostgresAdapter

Edit `storage/postgres-adapter.ts` and implement the TODO methods.

### 4. Change one line in server.ts

```typescript
// Before (CSV):
const storage = new CSVStorageAdapter('./data');

// After (PostgreSQL):
const storage = new PostgresStorageAdapter(process.env.DATABASE_URL!);
```

### 5. Migrate existing data

```bash
DATABASE_URL=postgres://... npm run migrate-to-postgres
```

That's it! The API doesn't change at all.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `JWT_SECRET` | dev-secret-... | JWT signing key |
| `DATABASE_URL` | - | PostgreSQL URL (when migrating) |
| `ADMIN_KEY` | - | Admin API key for bulk exports |

## Development

```bash
# Run with auto-reload
npm run dev

# Build TypeScript
npm run build

# Run migration script
npm run migrate-to-postgres
```

## File Structure

```
prototype/
├── server.ts              # Express server & API routes
├── storage/
│   ├── types.ts           # Data models & IStorage interface
│   ├── csv-adapter.ts     # CSV file storage implementation
│   └── postgres-adapter.ts # PostgreSQL template (incomplete)
├── scripts/
│   ├── migrate-to-postgres.ts  # Migration script
│   └── postgres-schema.sql     # Database schema
├── public/
│   └── index.html         # Test frontend
├── data/                  # CSV data files (gitignored)
├── package.json
├── tsconfig.json
└── README.md
```

## Scaling Path

| Users | Recommended Storage | Notes |
|-------|-------------------|-------|
| 1-10 | CSV (current) | Simple, inspectable, no setup |
| 10-100 | SQLite | Single file, SQL queries |
| 100-10K | PostgreSQL | Full ACID, concurrent access |
| 10K+ | PostgreSQL + Redis | Add caching layer |

## License

MIT
