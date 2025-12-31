import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { CSVStorageAdapter } from './storage/csv-adapter';
import { User, Workout, ExportData } from './storage/types';

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// Initialize storage adapter - swap this line to change backends!
const storage = new CSVStorageAdapter('./data');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Auth middleware
interface AuthRequest extends Request {
  user?: User;
}

async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ============ Auth Routes ============

app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username, and password required' });
    }

    const existing = await storage.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await storage.createUser({
      email,
      username,
      passwordHash,
      avatar: 1,
      level: 1,
      xp: 0,
      xpToNext: 100,
      totalWorkouts: 0,
      totalVolume: 0,
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user.id, email: user.email, username: user.username, level: user.level },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user.id, email: user.email, username: user.username, level: user.level },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  res.json({
    id: user.id,
    email: user.email,
    username: user.username,
    avatar: user.avatar,
    level: user.level,
    xp: user.xp,
    xpToNext: user.xpToNext,
    totalWorkouts: user.totalWorkouts,
    totalVolume: user.totalVolume,
  });
});

// ============ Workout Routes ============

app.get('/api/workouts', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const workouts = await storage.getWorkouts(req.user!.id, limit);
    res.json(workouts);
  } catch (error) {
    console.error('Get workouts error:', error);
    res.status(500).json({ error: 'Failed to get workouts' });
  }
});

app.get('/api/workouts/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const workout = await storage.getWorkout(req.user!.id, req.params.id);
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    res.json(workout);
  } catch (error) {
    console.error('Get workout error:', error);
    res.status(500).json({ error: 'Failed to get workout' });
  }
});

app.post('/api/workouts', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, duration, totalSets, totalVolume, xpEarned, exercises, completedAt } = req.body;

    const workout = await storage.createWorkout(req.user!.id, {
      name,
      type,
      duration,
      totalSets,
      totalVolume,
      xpEarned,
      exercises: exercises || [],
      completedAt: completedAt || new Date().toISOString(),
    });

    // Update user stats
    await storage.updateUser(req.user!.id, {
      totalWorkouts: req.user!.totalWorkouts + 1,
      totalVolume: req.user!.totalVolume + totalVolume,
      xp: req.user!.xp + xpEarned,
    });

    // Check for PRs in exercises
    if (exercises) {
      for (const exercise of exercises) {
        const maxWeight = Math.max(...exercise.sets.map((s: { weight: number }) => s.weight));
        if (maxWeight > 0) {
          await storage.upsertRecord(req.user!.id, {
            exerciseId: exercise.exerciseId,
            exerciseName: exercise.exerciseName,
            weight: maxWeight,
            achievedAt: workout.completedAt,
          });
        }
      }
    }

    res.json(workout);
  } catch (error) {
    console.error('Create workout error:', error);
    res.status(500).json({ error: 'Failed to create workout' });
  }
});

app.delete('/api/workouts/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await storage.deleteWorkout(req.user!.id, req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete workout error:', error);
    res.status(500).json({ error: 'Failed to delete workout' });
  }
});

// ============ Exercise Routes ============

app.get('/api/exercises', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const exercises = await storage.getExercises(req.user!.id);
    res.json(exercises);
  } catch (error) {
    console.error('Get exercises error:', error);
    res.status(500).json({ error: 'Failed to get exercises' });
  }
});

app.post('/api/exercises', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, muscleGroup, equipment } = req.body;
    const exercise = await storage.createExercise(req.user!.id, {
      name,
      muscleGroup,
      equipment,
    });
    res.json(exercise);
  } catch (error) {
    console.error('Create exercise error:', error);
    res.status(500).json({ error: 'Failed to create exercise' });
  }
});

app.delete('/api/exercises/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await storage.deleteExercise(req.user!.id, req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete exercise error:', error);
    res.status(500).json({ error: 'Failed to delete exercise' });
  }
});

// ============ Personal Records Routes ============

app.get('/api/records', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const records = await storage.getRecords(req.user!.id);
    res.json(records);
  } catch (error) {
    console.error('Get records error:', error);
    res.status(500).json({ error: 'Failed to get records' });
  }
});

// ============ Character Routes ============

app.get('/api/characters', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const characters = await storage.getCharacters(req.user!.id);
    res.json(characters);
  } catch (error) {
    console.error('Get characters error:', error);
    res.status(500).json({ error: 'Failed to get characters' });
  }
});

app.put('/api/characters/:slotIndex', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const slotIndex = parseInt(req.params.slotIndex);
    const { name, gameState } = req.body;

    const character = await storage.saveCharacter(req.user!.id, slotIndex, {
      name,
      slotIndex,
      gameState,
    });
    res.json(character);
  } catch (error) {
    console.error('Save character error:', error);
    res.status(500).json({ error: 'Failed to save character' });
  }
});

app.delete('/api/characters/:slotIndex', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const slotIndex = parseInt(req.params.slotIndex);
    const deleted = await storage.deleteCharacter(req.user!.id, slotIndex);
    if (!deleted) {
      return res.status(404).json({ error: 'Character not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete character error:', error);
    res.status(500).json({ error: 'Failed to delete character' });
  }
});

// ============ Export/Import Routes ============

app.get('/api/export', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Export only this user's data
    const [workouts, exercises, records, characters] = await Promise.all([
      storage.getWorkouts(req.user!.id, 10000),
      storage.getExercises(req.user!.id),
      storage.getRecords(req.user!.id),
      storage.getCharacters(req.user!.id),
    ]);

    const exportData = {
      user: {
        id: req.user!.id,
        email: req.user!.email,
        username: req.user!.username,
        level: req.user!.level,
        xp: req.user!.xp,
      },
      workouts,
      exercises,
      records,
      characters,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="ironquest-export-${req.user!.username}.json"`);
    res.json(exportData);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Admin-only: Export all data as CSV
app.get('/api/admin/export-all', async (req: Request, res: Response) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const data = await storage.exportAllData();
    res.json(data);
  } catch (error) {
    console.error('Export all error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// ============ Stats Routes ============

app.get('/api/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await (storage as CSVStorageAdapter).getUserStats(req.user!.id);
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// ============ Start Server ============

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    IRON QUEST PROTOTYPE                    ║
╠═══════════════════════════════════════════════════════════╣
║  Server running at: http://localhost:${PORT}                 ║
║  Storage: CSV files in ./data/                             ║
║                                                            ║
║  To switch to database later, just swap:                   ║
║    const storage = new CSVStorageAdapter('./data');        ║
║  with:                                                     ║
║    const storage = new PostgresAdapter(connectionString);  ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
