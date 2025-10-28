import '@testing-library/jest-dom';
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { db } from '@/types/database';
import { server } from './mocks/server';
import fs from 'fs';
import path from 'path';

// Load .env file for tests
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const [key, ...values] = line.split('=');
    if (key && !key.startsWith('#') && !process.env[key]) {
      process.env[key] = values.join('=').trim().replace(/^"(.*)"$/, '$1');
    }
  });
}

// Global test setup
beforeAll(async () => {
  console.log('🚀 Starting test suite...');

  // Start MSW server
  server.listen({ onUnhandledRequest: 'error' });

  // Verify database connection
  try {
    await db.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
});

// ⚠️ WARNING: Do NOT call cleanupTestData() globally!
// It deletes ALL database records, which will destroy user data
// Individual tests should handle their own cleanup if needed

// Reset MSW handlers after each test
afterEach(() => {
  server.resetHandlers();
});

// Global cleanup
afterAll(async () => {
  console.log('🔌 Shutting down...');
  server.close();
  await db.$disconnect();
});

/**
 * Clean up all test data from the database
 * Order matters due to foreign key constraints
 */
export async function cleanupTestData(): Promise<void> {
  try {
    // Delete in reverse order of dependencies to avoid FK constraint errors
    // Most dependent records first, then work backwards

    // 1. Delete grading results first (depends on session, file, rubric)
    await db.gradingResult.deleteMany({});

    // 2. Delete submissions (depends on student, assignment area)
    await db.submission.deleteMany({});

    // 3. Delete grading sessions (depends on user)
    await db.gradingSession.deleteMany({});

    // 4. Delete uploaded files (depends on user)
    await db.uploadedFile.deleteMany({});

    // 5. Delete assignment areas (depends on course, rubric) - BEFORE rubrics
    await db.assignmentArea.deleteMany({});

    // 6. Delete enrollments (depends on student, course)
    await db.enrollment.deleteMany({});

    // 7. Delete invitation codes (depends on course)
    await db.invitationCode.deleteMany({});

    // 8. Delete courses (depends on teacher)
    await db.course.deleteMany({});

    // 9. Delete rubrics (depends on user) - AFTER assignment areas
    await db.rubric.deleteMany({});

    // 10. Finally delete users (everything else depends on users)
    await db.user.deleteMany({});

    console.log('✨ Test data cleaned successfully');
  } catch (error) {
    console.error('❌ Failed to clean test data:', error);
    throw error;
  }
}
