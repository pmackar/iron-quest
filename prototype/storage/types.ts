// Core data types for Iron Quest
// These types are storage-agnostic and will work with CSV, SQLite, or Postgres

export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  avatar: number;
  level: number;
  xp: number;
  xpToNext: number;
  totalWorkouts: number;
  totalVolume: number;
  createdAt: string;
  updatedAt: string;
}

export interface Workout {
  id: string;
  userId: string;
  name: string;
  type: 'Push' | 'Pull' | 'Legs' | 'Upper' | 'Lower' | 'Full Body' | 'Custom';
  duration: number; // minutes
  totalSets: number;
  totalVolume: number; // total weight lifted
  xpEarned: number;
  exercises: WorkoutExercise[];
  completedAt: string;
}

export interface WorkoutExercise {
  exerciseId: string;
  exerciseName: string;
  sets: ExerciseSet[];
}

export interface ExerciseSet {
  setNumber: number;
  weight: number;
  reps: number;
}

export interface CustomExercise {
  id: string;
  userId: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  createdAt: string;
}

export interface PersonalRecord {
  id: string;
  userId: string;
  exerciseId: string;
  exerciseName: string;
  weight: number;
  achievedAt: string;
}

export interface Character {
  id: string;
  userId: string;
  slotIndex: number;
  name: string;
  gameState: GameState;
  updatedAt: string;
}

export interface GameState {
  playerName: string;
  level: number;
  xp: number;
  xpToNext: number;
  avatar: number;
  totalWorkouts: number;
  totalSets: number;
  totalWeight: number;
  achievements: string[];
  personalRecords: Record<string, number>;
  workoutHistory: string[]; // workout IDs
}

// Storage interface - implement this for any backend
export interface IStorage {
  // Users
  getUser(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | null>;

  // Workouts
  getWorkouts(userId: string, limit?: number): Promise<Workout[]>;
  getWorkout(userId: string, workoutId: string): Promise<Workout | null>;
  createWorkout(userId: string, workout: Omit<Workout, 'id' | 'userId'>): Promise<Workout>;
  deleteWorkout(userId: string, workoutId: string): Promise<boolean>;

  // Custom Exercises
  getExercises(userId: string): Promise<CustomExercise[]>;
  createExercise(userId: string, exercise: Omit<CustomExercise, 'id' | 'userId' | 'createdAt'>): Promise<CustomExercise>;
  deleteExercise(userId: string, exerciseId: string): Promise<boolean>;

  // Personal Records
  getRecords(userId: string): Promise<PersonalRecord[]>;
  upsertRecord(userId: string, record: Omit<PersonalRecord, 'id' | 'userId'>): Promise<PersonalRecord>;

  // Characters (game saves)
  getCharacters(userId: string): Promise<Character[]>;
  saveCharacter(userId: string, slotIndex: number, character: Omit<Character, 'id' | 'userId' | 'updatedAt'>): Promise<Character>;
  deleteCharacter(userId: string, slotIndex: number): Promise<boolean>;

  // Bulk operations for migration
  exportAllData(): Promise<ExportData>;
  importAllData(data: ExportData): Promise<void>;
}

export interface ExportData {
  users: User[];
  workouts: Workout[];
  exercises: CustomExercise[];
  records: PersonalRecord[];
  characters: Character[];
  exportedAt: string;
  version: string;
}
