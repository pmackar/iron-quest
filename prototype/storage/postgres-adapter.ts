/**
 * PostgreSQL Storage Adapter
 *
 * This is a template showing how to implement the IStorage interface for PostgreSQL.
 * When you're ready to migrate from CSV, just:
 *
 * 1. Install pg: npm install pg @types/pg
 * 2. Complete the TODO items below
 * 3. Change server.ts to use: const storage = new PostgresStorageAdapter(DATABASE_URL);
 *
 * That's it! The API doesn't change at all.
 */

import {
  IStorage,
  User,
  Workout,
  CustomExercise,
  PersonalRecord,
  Character,
  ExportData,
} from './types';

// Uncomment when ready to use:
// import { Pool } from 'pg';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function now(): string {
  return new Date().toISOString();
}

export class PostgresStorageAdapter implements IStorage {
  // private pool: Pool;

  constructor(connectionString: string) {
    // Uncomment when ready:
    // this.pool = new Pool({ connectionString });
    console.log('PostgresStorageAdapter initialized with:', connectionString);
  }

  // ============ Users ============

  async getUser(id: string): Promise<User | null> {
    // TODO: Implement
    // const result = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    // return result.rows[0] || null;
    throw new Error('Not implemented - install pg and complete this method');
  }

  async getUserByEmail(email: string): Promise<User | null> {
    // TODO: Implement
    // const result = await this.pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    // return result.rows[0] || null;
    throw new Error('Not implemented');
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const user: User = {
      ...userData,
      id: generateId('usr'),
      createdAt: now(),
      updatedAt: now(),
    };

    // TODO: Implement
    // await this.pool.query(
    //   `INSERT INTO users (id, email, username, password_hash, avatar, level, xp, xp_to_next, total_workouts, total_volume, created_at, updated_at)
    //    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    //   [user.id, user.email, user.username, user.passwordHash, user.avatar, user.level, user.xp, user.xpToNext, user.totalWorkouts, user.totalVolume, user.createdAt, user.updatedAt]
    // );

    throw new Error('Not implemented');
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    // TODO: Implement with dynamic SET clause
    throw new Error('Not implemented');
  }

  // ============ Workouts ============

  async getWorkouts(userId: string, limit = 50): Promise<Workout[]> {
    // TODO: Implement
    // const result = await this.pool.query(
    //   'SELECT * FROM workouts WHERE user_id = $1 ORDER BY completed_at DESC LIMIT $2',
    //   [userId, limit]
    // );
    // return result.rows;
    throw new Error('Not implemented');
  }

  async getWorkout(userId: string, workoutId: string): Promise<Workout | null> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async createWorkout(userId: string, workoutData: Omit<Workout, 'id' | 'userId'>): Promise<Workout> {
    const workout: Workout = {
      ...workoutData,
      id: generateId('wkt'),
      userId,
    };

    // TODO: Implement
    // await this.pool.query(
    //   `INSERT INTO workouts (id, user_id, name, type, duration, total_sets, total_volume, xp_earned, exercises, completed_at)
    //    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    //   [workout.id, workout.userId, workout.name, workout.type, workout.duration, workout.totalSets, workout.totalVolume, workout.xpEarned, JSON.stringify(workout.exercises), workout.completedAt]
    // );

    throw new Error('Not implemented');
  }

  async deleteWorkout(userId: string, workoutId: string): Promise<boolean> {
    // TODO: Implement
    // const result = await this.pool.query(
    //   'DELETE FROM workouts WHERE id = $1 AND user_id = $2',
    //   [workoutId, userId]
    // );
    // return result.rowCount > 0;
    throw new Error('Not implemented');
  }

  // ============ Custom Exercises ============

  async getExercises(userId: string): Promise<CustomExercise[]> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async createExercise(
    userId: string,
    exerciseData: Omit<CustomExercise, 'id' | 'userId' | 'createdAt'>
  ): Promise<CustomExercise> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async deleteExercise(userId: string, exerciseId: string): Promise<boolean> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  // ============ Personal Records ============

  async getRecords(userId: string): Promise<PersonalRecord[]> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async upsertRecord(
    userId: string,
    recordData: Omit<PersonalRecord, 'id' | 'userId'>
  ): Promise<PersonalRecord> {
    // TODO: Implement with INSERT ... ON CONFLICT DO UPDATE
    throw new Error('Not implemented');
  }

  // ============ Characters ============

  async getCharacters(userId: string): Promise<Character[]> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  async saveCharacter(
    userId: string,
    slotIndex: number,
    characterData: Omit<Character, 'id' | 'userId' | 'updatedAt'>
  ): Promise<Character> {
    // TODO: Implement with INSERT ... ON CONFLICT DO UPDATE
    throw new Error('Not implemented');
  }

  async deleteCharacter(userId: string, slotIndex: number): Promise<boolean> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  // ============ Bulk Operations ============

  async exportAllData(): Promise<ExportData> {
    // TODO: Implement - query all tables
    throw new Error('Not implemented');
  }

  async importAllData(data: ExportData): Promise<void> {
    // TODO: Implement - insert all data in transaction
    // await this.pool.query('BEGIN');
    // try {
    //   for (const user of data.users) { ... }
    //   for (const workout of data.workouts) { ... }
    //   await this.pool.query('COMMIT');
    // } catch (err) {
    //   await this.pool.query('ROLLBACK');
    //   throw err;
    // }
    throw new Error('Not implemented');
  }
}
