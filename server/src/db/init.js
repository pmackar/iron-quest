const fs = require('fs');
const path = require('path');
const { pool } = require('./config');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function initDatabase() {
    console.log('Initializing database...');

    try {
        // Read schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Execute schema
        await pool.query(schema);

        console.log('Database schema created successfully!');
        console.log('Tables created:');
        console.log('  - users');
        console.log('  - personal_records');
        console.log('  - workouts');
        console.log('  - workout_exercises');
        console.log('  - exercise_sets');
        console.log('  - custom_exercises');
        console.log('  - custom_workouts');
        console.log('  - custom_workout_exercises');
        console.log('  - teams');
        console.log('  - team_members');
        console.log('  - team_challenges');
        console.log('  - activity_feed');
        console.log('  - team_messages');
        console.log('  - coach_shares');
        console.log('  - characters');

    } catch (error) {
        console.error('Error initializing database:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

initDatabase();
