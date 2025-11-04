/**
 * Script to clean up stuck BullMQ jobs from Redis
 * Run this when you have stuck jobs that are continuously failing
 */

import { Queue } from 'bullmq';
import Redis from 'ioredis';

const QUEUE_NAME = 'grading';

async function cleanupJobs() {
  console.log('🧹 Starting BullMQ cleanup...\n');

  // Create Redis connection
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || 'dev_password',
    maxRetriesPerRequest: null,
  });

  // Create Queue instance
  const queue = new Queue(QUEUE_NAME, { connection: redis });

  try {
    // Get counts before cleanup
    const countsBefore = await queue.getJobCounts();
    console.log('Job counts BEFORE cleanup:');
    console.log(JSON.stringify(countsBefore, null, 2));
    console.log('');

    // Clean failed jobs (older than 1 second, basically all of them)
    console.log('🗑️  Cleaning failed jobs...');
    const failedCleaned = await queue.clean(1000, 100, 'failed');
    console.log(`   Removed ${failedCleaned.length} failed jobs`);

    // Clean completed jobs
    console.log('🗑️  Cleaning completed jobs...');
    const completedCleaned = await queue.clean(1000, 100, 'completed');
    console.log(`   Removed ${completedCleaned.length} completed jobs`);

    // Clean waiting jobs
    console.log('🗑️  Cleaning waiting jobs...');
    const waitingCleaned = await queue.clean(0, 100, 'wait');
    console.log(`   Removed ${waitingCleaned.length} waiting jobs`);

    // Clean delayed jobs
    console.log('🗑️  Cleaning delayed jobs...');
    const delayedCleaned = await queue.clean(0, 100, 'delayed');
    console.log(`   Removed ${delayedCleaned.length} delayed jobs`);

    // Clean active jobs (jobs currently being processed)
    console.log('🗑️  Cleaning active jobs...');
    const activeCleaned = await queue.clean(0, 100, 'active');
    console.log(`   Removed ${activeCleaned.length} active jobs`);

    // Obliterate (removes all jobs and queue data) - use with caution!
    // Uncomment if you want to completely reset the queue
    // console.log('☢️  Obliterating queue (complete reset)...');
    // await queue.obliterate();
    // console.log('   Queue obliterated');

    console.log('');

    // Get counts after cleanup
    const countsAfter = await queue.getJobCounts();
    console.log('Job counts AFTER cleanup:');
    console.log(JSON.stringify(countsAfter, null, 2));
    console.log('');

    console.log('Cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    // Close connections
    await queue.close();
    await redis.quit();
  }
}

// Run the cleanup
cleanupJobs()
  .then(() => {
    console.log('\n All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n Fatal error:', error);
    process.exit(1);
  });
