import * as fs from 'fs/promises';
import * as path from 'path';
import {
  IStorage,
  User,
  Workout,
  CustomExercise,
  PersonalRecord,
  Character,
  ExportData,
} from './types';

// Simple CSV parser and stringifier
function parseCSV<T>(content: string, headers: string[]): T[] {
  const lines = content.trim().split('\n');
  if (lines.length <= 1) return [];

  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const obj: Record<string, unknown> = {};
    headers.forEach((header, i) => {
      const value = values[i] || '';
      // Parse JSON fields
      if (header.endsWith('_json') || header === 'exercises' || header === 'gameState') {
        try {
          obj[header.replace('_json', '')] = JSON.parse(value);
        } catch {
          obj[header.replace('_json', '')] = value;
        }
      } else if (['level', 'xp', 'xpToNext', 'totalWorkouts', 'totalVolume', 'totalSets', 'duration', 'weight', 'reps', 'setNumber', 'avatar', 'slotIndex', 'xpEarned'].includes(header)) {
        obj[header] = Number(value) || 0;
      } else {
        obj[header] = value;
      }
    });
    return obj as T;
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function toCSV<T extends Record<string, unknown>>(data: T[], headers: string[]): string {
  const headerLine = headers.join(',');
  const lines = data.map((row) => {
    return headers
      .map((header) => {
        const rawHeader = header.replace('_json', '');
        let value = row[rawHeader];
        if (value === undefined || value === null) return '';
        if (typeof value === 'object') {
          value = JSON.stringify(value);
        }
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(',');
  });
  return [headerLine, ...lines].join('\n');
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function now(): string {
  return new Date().toISOString();
}

// CSV column definitions
const COLUMNS = {
  users: ['id', 'email', 'username', 'passwordHash', 'avatar', 'level', 'xp', 'xpToNext', 'totalWorkouts', 'totalVolume', 'createdAt', 'updatedAt'],
  workouts: ['id', 'userId', 'name', 'type', 'duration', 'totalSets', 'totalVolume', 'xpEarned', 'exercises_json', 'completedAt'],
  exercises: ['id', 'userId', 'name', 'muscleGroup', 'equipment', 'createdAt'],
  records: ['id', 'userId', 'exerciseId', 'exerciseName', 'weight', 'achievedAt'],
  characters: ['id', 'userId', 'slotIndex', 'name', 'gameState_json', 'updatedAt'],
};

export class CSVStorageAdapter implements IStorage {
  private dataDir: string;

  constructor(dataDir: string = './data') {
    this.dataDir = dataDir;
  }

  private filePath(name: string): string {
    return path.join(this.dataDir, `${name}.csv`);
  }

  private async ensureDir(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch {
      // Directory exists
    }
  }

  private async readFile<T>(name: string): Promise<T[]> {
    try {
      const content = await fs.readFile(this.filePath(name), 'utf-8');
      return parseCSV<T>(content, COLUMNS[name as keyof typeof COLUMNS]);
    } catch {
      return [];
    }
  }

  private async writeFile<T extends Record<string, unknown>>(name: string, data: T[]): Promise<void> {
    await this.ensureDir();
    const csv = toCSV(data, COLUMNS[name as keyof typeof COLUMNS]);
    await fs.writeFile(this.filePath(name), csv, 'utf-8');
  }

  // ============ Users ============

  async getUser(id: string): Promise<User | null> {
    const users = await this.readFile<User>('users');
    return users.find((u) => u.id === id) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const users = await this.readFile<User>('users');
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const users = await this.readFile<User>('users');
    const user: User = {
      ...userData,
      id: generateId('usr'),
      createdAt: now(),
      updatedAt: now(),
    };
    users.push(user);
    await this.writeFile('users', users);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const users = await this.readFile<User>('users');
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    users[index] = { ...users[index], ...updates, updatedAt: now() };
    await this.writeFile('users', users);
    return users[index];
  }

  // ============ Workouts ============

  async getWorkouts(userId: string, limit = 50): Promise<Workout[]> {
    const workouts = await this.readFile<Workout>('workouts');
    return workouts
      .filter((w) => w.userId === userId)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, limit);
  }

  async getWorkout(userId: string, workoutId: string): Promise<Workout | null> {
    const workouts = await this.readFile<Workout>('workouts');
    return workouts.find((w) => w.id === workoutId && w.userId === userId) || null;
  }

  async createWorkout(userId: string, workoutData: Omit<Workout, 'id' | 'userId'>): Promise<Workout> {
    const workouts = await this.readFile<Workout>('workouts');
    const workout: Workout = {
      ...workoutData,
      id: generateId('wkt'),
      userId,
    };
    workouts.push(workout);
    await this.writeFile('workouts', workouts);
    return workout;
  }

  async deleteWorkout(userId: string, workoutId: string): Promise<boolean> {
    const workouts = await this.readFile<Workout>('workouts');
    const filtered = workouts.filter((w) => !(w.id === workoutId && w.userId === userId));
    if (filtered.length === workouts.length) return false;
    await this.writeFile('workouts', filtered);
    return true;
  }

  // ============ Custom Exercises ============

  async getExercises(userId: string): Promise<CustomExercise[]> {
    const exercises = await this.readFile<CustomExercise>('exercises');
    return exercises.filter((e) => e.userId === userId);
  }

  async createExercise(
    userId: string,
    exerciseData: Omit<CustomExercise, 'id' | 'userId' | 'createdAt'>
  ): Promise<CustomExercise> {
    const exercises = await this.readFile<CustomExercise>('exercises');
    const exercise: CustomExercise = {
      ...exerciseData,
      id: generateId('ex'),
      userId,
      createdAt: now(),
    };
    exercises.push(exercise);
    await this.writeFile('exercises', exercises);
    return exercise;
  }

  async deleteExercise(userId: string, exerciseId: string): Promise<boolean> {
    const exercises = await this.readFile<CustomExercise>('exercises');
    const filtered = exercises.filter((e) => !(e.id === exerciseId && e.userId === userId));
    if (filtered.length === exercises.length) return false;
    await this.writeFile('exercises', filtered);
    return true;
  }

  // ============ Personal Records ============

  async getRecords(userId: string): Promise<PersonalRecord[]> {
    const records = await this.readFile<PersonalRecord>('records');
    return records.filter((r) => r.userId === userId);
  }

  async upsertRecord(
    userId: string,
    recordData: Omit<PersonalRecord, 'id' | 'userId'>
  ): Promise<PersonalRecord> {
    const records = await this.readFile<PersonalRecord>('records');
    const existingIndex = records.findIndex(
      (r) => r.userId === userId && r.exerciseId === recordData.exerciseId
    );

    if (existingIndex >= 0) {
      // Only update if new weight is higher
      if (recordData.weight > records[existingIndex].weight) {
        records[existingIndex] = {
          ...records[existingIndex],
          weight: recordData.weight,
          achievedAt: recordData.achievedAt,
        };
        await this.writeFile('records', records);
      }
      return records[existingIndex];
    } else {
      const record: PersonalRecord = {
        ...recordData,
        id: generateId('pr'),
        userId,
      };
      records.push(record);
      await this.writeFile('records', records);
      return record;
    }
  }

  // ============ Characters (Game Saves) ============

  async getCharacters(userId: string): Promise<Character[]> {
    const characters = await this.readFile<Character>('characters');
    return characters.filter((c) => c.userId === userId).sort((a, b) => a.slotIndex - b.slotIndex);
  }

  async saveCharacter(
    userId: string,
    slotIndex: number,
    characterData: Omit<Character, 'id' | 'userId' | 'updatedAt'>
  ): Promise<Character> {
    const characters = await this.readFile<Character>('characters');
    const existingIndex = characters.findIndex(
      (c) => c.userId === userId && c.slotIndex === slotIndex
    );

    const character: Character = {
      ...characterData,
      id: existingIndex >= 0 ? characters[existingIndex].id : generateId('chr'),
      userId,
      slotIndex,
      updatedAt: now(),
    };

    if (existingIndex >= 0) {
      characters[existingIndex] = character;
    } else {
      characters.push(character);
    }

    await this.writeFile('characters', characters);
    return character;
  }

  async deleteCharacter(userId: string, slotIndex: number): Promise<boolean> {
    const characters = await this.readFile<Character>('characters');
    const filtered = characters.filter(
      (c) => !(c.userId === userId && c.slotIndex === slotIndex)
    );
    if (filtered.length === characters.length) return false;
    await this.writeFile('characters', filtered);
    return true;
  }

  // ============ Bulk Operations ============

  async exportAllData(): Promise<ExportData> {
    const [users, workouts, exercises, records, characters] = await Promise.all([
      this.readFile<User>('users'),
      this.readFile<Workout>('workouts'),
      this.readFile<CustomExercise>('exercises'),
      this.readFile<PersonalRecord>('records'),
      this.readFile<Character>('characters'),
    ]);

    return {
      users,
      workouts,
      exercises,
      records,
      characters,
      exportedAt: now(),
      version: '1.0.0',
    };
  }

  async importAllData(data: ExportData): Promise<void> {
    await Promise.all([
      this.writeFile('users', data.users),
      this.writeFile('workouts', data.workouts),
      this.writeFile('exercises', data.exercises),
      this.writeFile('records', data.records),
      this.writeFile('characters', data.characters),
    ]);
  }

  // ============ Utility ============

  async getUserStats(userId: string): Promise<{
    totalWorkouts: number;
    totalVolume: number;
    totalSets: number;
    personalRecords: number;
  }> {
    const [workouts, records] = await Promise.all([
      this.getWorkouts(userId, 1000),
      this.getRecords(userId),
    ]);

    return {
      totalWorkouts: workouts.length,
      totalVolume: workouts.reduce((sum, w) => sum + w.totalVolume, 0),
      totalSets: workouts.reduce((sum, w) => sum + w.totalSets, 0),
      personalRecords: records.length,
    };
  }
}
