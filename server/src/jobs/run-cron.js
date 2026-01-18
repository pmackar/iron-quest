#!/usr/bin/env node

/**
 * Cron Job Runner CLI
 * Usage:
 *   node src/jobs/run-cron.js nightly    - Run nightly jobs
 *   node src/jobs/run-cron.js weekly     - Run weekly jobs
 *   node src/jobs/run-cron.js wagers     - Resolve wagers only
 *   node src/jobs/run-cron.js encounters - Resolve encounters only
 *   node src/jobs/run-cron.js cleanup    - Run cleanup only
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const {
    runNightlyJobs,
    runWeeklyJobs,
    resolveExpiredWagers,
    resolveCompletedEncounters,
    resetWeeklyStats,
    startWeeklyShowdowns,
    cleanupExpiredData
} = require('../lib/cron-jobs');

const command = process.argv[2];

async function main() {
    console.log('Iron Quest Cron Runner');
    console.log('======================\n');

    let result;

    try {
        switch (command) {
            case 'nightly':
                console.log('Running nightly jobs...\n');
                result = await runNightlyJobs();
                break;

            case 'weekly':
                console.log('Running weekly jobs...\n');
                result = await runWeeklyJobs();
                break;

            case 'wagers':
                console.log('Resolving expired wagers...\n');
                result = await resolveExpiredWagers();
                break;

            case 'encounters':
                console.log('Resolving completed encounters...\n');
                result = await resolveCompletedEncounters();
                break;

            case 'reset':
                console.log('Resetting weekly stats...\n');
                result = await resetWeeklyStats();
                break;

            case 'showdowns':
                console.log('Starting weekly showdowns...\n');
                result = await startWeeklyShowdowns();
                break;

            case 'cleanup':
                console.log('Cleaning up expired data...\n');
                result = await cleanupExpiredData();
                break;

            default:
                console.log('Usage:');
                console.log('  node src/jobs/run-cron.js <command>\n');
                console.log('Commands:');
                console.log('  nightly    - Run all nightly jobs');
                console.log('  weekly     - Run all weekly jobs');
                console.log('  wagers     - Resolve expired wagers');
                console.log('  encounters - Resolve completed encounters');
                console.log('  reset      - Reset weekly stats');
                console.log('  showdowns  - Start weekly showdowns');
                console.log('  cleanup    - Clean up expired data');
                process.exit(1);
        }

        console.log('\nResult:', JSON.stringify(result, null, 2));
        console.log('\nJob completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('\nError running job:', error.message);
        process.exit(1);
    }
}

main();
