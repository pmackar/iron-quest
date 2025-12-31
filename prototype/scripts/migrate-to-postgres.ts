/**
 * Migration Script: CSV → PostgreSQL
 *
 * This script demonstrates how easy it is to migrate from CSV to Postgres
 * thanks to the storage abstraction layer.
 *
 * Usage:
 *   DATABASE_URL=postgres://... npx tsx scripts/migrate-to-postgres.ts
 */

import { CSVStorageAdapter } from '../storage/csv-adapter';
// import { PostgresStorageAdapter } from '../storage/postgres-adapter';

async function migrate() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║          CSV → PostgreSQL Migration Script             ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // Step 1: Export all data from CSV
  console.log('📂 Reading data from CSV files...');
  const csvStorage = new CSVStorageAdapter('./data');
  const data = await csvStorage.exportAllData();

  console.log(`   Found:`);
  console.log(`   - ${data.users.length} users`);
  console.log(`   - ${data.workouts.length} workouts`);
  console.log(`   - ${data.exercises.length} custom exercises`);
  console.log(`   - ${data.records.length} personal records`);
  console.log(`   - ${data.characters.length} character saves\n`);

  // Step 2: Import into PostgreSQL
  // Uncomment when you're ready to use Postgres:
  //
  // console.log('🐘 Connecting to PostgreSQL...');
  // const pgStorage = new PostgresStorageAdapter(process.env.DATABASE_URL!);
  // await pgStorage.importAllData(data);
  // console.log('✅ Migration complete!\n');

  // For now, just output the data as SQL
  console.log('📝 Generated SQL for migration:\n');
  console.log('-- Users');
  for (const user of data.users) {
    console.log(`INSERT INTO users (id, email, username, password_hash, avatar, level, xp, xp_to_next, total_workouts, total_volume, created_at, updated_at)`);
    console.log(`VALUES ('${user.id}', '${user.email}', '${user.username}', '${user.passwordHash}', ${user.avatar}, ${user.level}, ${user.xp}, ${user.xpToNext}, ${user.totalWorkouts}, ${user.totalVolume}, '${user.createdAt}', '${user.updatedAt}');`);
  }

  console.log('\n-- Workouts');
  for (const workout of data.workouts) {
    console.log(`INSERT INTO workouts (id, user_id, name, type, duration, total_sets, total_volume, xp_earned, exercises, completed_at)`);
    console.log(`VALUES ('${workout.id}', '${workout.userId}', '${workout.name}', '${workout.type}', ${workout.duration}, ${workout.totalSets}, ${workout.totalVolume}, ${workout.xpEarned}, '${JSON.stringify(workout.exercises).replace(/'/g, "''")}', '${workout.completedAt}');`);
  }

  console.log('\n-- Personal Records');
  for (const record of data.records) {
    console.log(`INSERT INTO personal_records (id, user_id, exercise_id, exercise_name, weight, achieved_at)`);
    console.log(`VALUES ('${record.id}', '${record.userId}', '${record.exerciseId}', '${record.exerciseName}', ${record.weight}, '${record.achievedAt}');`);
  }

  console.log('\n-- Custom Exercises');
  for (const exercise of data.exercises) {
    console.log(`INSERT INTO custom_exercises (id, user_id, name, muscle_group, equipment, created_at)`);
    console.log(`VALUES ('${exercise.id}', '${exercise.userId}', '${exercise.name}', '${exercise.muscleGroup}', '${exercise.equipment}', '${exercise.createdAt}');`);
  }

  console.log('\n-- Characters');
  for (const char of data.characters) {
    console.log(`INSERT INTO characters (id, user_id, slot_index, name, game_state, updated_at)`);
    console.log(`VALUES ('${char.id}', '${char.userId}', ${char.slotIndex}, '${char.name}', '${JSON.stringify(char.gameState).replace(/'/g, "''")}', '${char.updatedAt}');`);
  }

  console.log('\n✅ SQL generation complete!');
  console.log('\n💡 To actually migrate:');
  console.log('   1. Create a PostgreSQL database');
  console.log('   2. Run the schema (see scripts/postgres-schema.sql)');
  console.log('   3. Uncomment the PostgresStorageAdapter code above');
  console.log('   4. Run: DATABASE_URL=postgres://... npm run migrate-to-postgres');
}

migrate().catch(console.error);
