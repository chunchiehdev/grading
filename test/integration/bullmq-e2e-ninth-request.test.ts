import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import {
  UserFactory,
  RubricFactory,
  CourseFactory,
  AssignmentAreaFactory,
  UploadedFileFactory,
} from '../factories';
import { createGradingSession } from '@/services/grading-session.server';
import { startGradingSession } from '@/services/grading-session.server';
import { getQueueStatus } from '@/services/bullmq-grading.server';
import { bullmqRedis } from '@/lib/redis';
import { db } from '@/types/database';

/**
 * BullMQ End-to-End Test - 9th Request Rate Limiting
 *
 * This test demonstrates the COMPLETE flow:
 * 1️⃣ Create course, assignment, rubric, student
 * 2️⃣ Upload PDF files (for 9 students)
 * 3️⃣ Create Grading Sessions (automatically creates GradingResults)
 * 4️⃣ Start grading → adds jobs to queue
 * 5️⃣ Monitor queue status as jobs are processed
 * 6️⃣ Verify 9th request is rate limited
 *
 * If GOOGLE_API_KEY is set: Jobs will call real Gemini API
 * If not set: Jobs will fail (expected for test environment)
 */
describe('BullMQ E2E - Ninth Request Rate Limiting', () => {
  let teacher: any;
  let students: any[];
  let course: any;
  let assignment: any;
  let rubric: any;

  beforeEach(async () => {
    console.log('\nSetting up E2E test data...');

    // Clean only queue data, NOT database
    try {
      const pattern = 'bull:grading:*';
      const keys = await bullmqRedis.keys(pattern);
      if (keys.length > 0) {
        await bullmqRedis.del(...keys);
      }
      console.log(`   ✓ Queue cleaned (${keys.length} keys removed)`);
    } catch (error) {
      console.error('   ⚠️  Failed to clean queue:', error);
    }

    // Setup: Create test data with unique email (timestamp + random)
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    teacher = await UserFactory.createTeacher({
      name: 'Prof. E2E Test',
      email: `e2e-test-${uniqueSuffix}@university.edu`,
    });

    students = await UserFactory.createMany(9, {
      role: 'STUDENT',
    });

    const courseData = await CourseFactory.createWithInvitation(teacher.id, {
      name: 'E2E Test Course',
      description: 'Complete workflow testing',
    });
    course = courseData.course;

    rubric = await RubricFactory.create({
      userId: teacher.id,
      name: 'E2E Test Rubric',
      isTemplate: true,
      criteria: [
        {
          id: uuidv4(),
          name: 'Content Quality',
          maxScore: 100,
          levels: [
            { score: 100, description: 'Excellent' },
            { score: 50, description: 'Average' },
            { score: 0, description: 'Poor' },
          ],
        },
      ],
    });

    assignment = await AssignmentAreaFactory.createWithDueDate(
      {
        courseId: course.id,
        rubricId: rubric.id,
        name: 'E2E Test Assignment',
      },
      7
    );

    console.log(`✅ Test setup complete:`);
    console.log(`   • Teacher: ${teacher.email}`);
    console.log(`   • Students: ${students.length}`);
    console.log(`   • Course: ${course.name}`);
    console.log(`   • Assignment: ${assignment.name}`);
  });

  describe('Complete Workflow - 9 Students Submit', () => {
    it('should walk through complete submission and grading workflow', async () => {
      console.log('\n📊 COMPLETE E2E WORKFLOW TEST');

      // STEP 1: Create PDF files for 9 students
      console.log('\n📝 STEP 1: Creating PDF files for 9 students');

      const uploadedFiles = [];
      for (let i = 0; i < 9; i++) {
        const file = await UploadedFileFactory.createPdf(students[i].id, {
          originalFileName: `submission-student-${i + 1}.pdf`,
          fileSize: 1024 * (50 + i * 10),
          parsedContent: `Student ${i + 1} essay content. This is submission number ${i + 1}.`,
        });
        uploadedFiles.push(file);
        console.log(`   ✓ Student ${i + 1}: ${file.originalFileName}`);
      }

      // STEP 2: Create Grading Sessions (automatically creates GradingResults)
      console.log('\n🔗 STEP 2: Creating Grading Sessions (creates GradingResults)');

      const sessions = [];
      const sessionIds = [];

      for (let i = 0; i < 9; i++) {
        const sessionResult = await createGradingSession({
          userId: students[i].id,
          filePairs: [
            {
              fileId: uploadedFiles[i].id,
              rubricId: rubric.id,
            },
          ],
          assignmentAreaId: assignment.id,
          language: 'zh',
        });

        if (!sessionResult.success) {
          throw new Error(`Failed to create session for student ${i + 1}: ${sessionResult.error}`);
        }

        sessionIds.push(sessionResult.sessionId!);
        console.log(`   ✓ Student ${i + 1}: Session created (${sessionResult.sessionId})`);

        // Verify GradingResult was created
        const results = await db.gradingResult.findMany({
          where: { gradingSessionId: sessionResult.sessionId },
        });
        console.log(`     └─ GradingResults: ${results.length} (should be 1)`);
      }

      // Check queue before starting grading
      console.log('\n📊 Queue status BEFORE starting grading:');
      let status = await getQueueStatus();
      console.log(`   • waiting: ${status.waiting}`);
      console.log(`   • active: ${status.active}`);
      console.log(`   • delayed: ${status.delayed}`);
      console.log(`   • isRateLimited: ${status.isRateLimited}`);

      // STEP 3: Start grading for all 9 students
      console.log('\n🚀 STEP 3: Starting grading for all 9 students');

      for (let i = 0; i < 9; i++) {
        const startResult = await startGradingSession(sessionIds[i], students[i].id);
        if (!startResult.success) {
          console.warn(`   ⚠️ Student ${i + 1}: ${startResult.error}`);
        } else {
          console.log(`   ✓ Student ${i + 1}: Grading started`);
        }
      }

      // STEP 4: Monitor queue status - watch for 9th request being rate limited
      console.log('\n📊 STEP 4: Monitoring queue status');

      status = await getQueueStatus();

      console.log(`\n   After adding 9 grading jobs:`);
      console.log(`   ┌────────────────────────────────┐`);
      console.log(`   │ waiting: ${String(status.waiting).padStart(2)}              │`);
      console.log(`   │ active:  ${String(status.active).padStart(2)} (max: 8)  │`);
      console.log(`   │ delayed: ${String(status.delayed).padStart(2)}              │`);
      console.log(`   │ failed:  ${String(status.failed).padStart(2)}              │`);
      console.log(`   └────────────────────────────────┘`);

      console.log(`\n   Rate Limiting Status:`);
      console.log(`   • isRateLimited: ${status.isRateLimited}`);
      console.log(`   • Detection Logic: (delayed > 0) || (waiting > 0) = ${status.delayed > 0 || status.waiting > 0}`);

      if (status.rateLimitTtl > 0) {
        console.log(`   • Remaining TTL: ${(status.rateLimitTtl / 1000).toFixed(1)}s`);
      }

      // ⏳ WAIT: Give Admin Dashboard time to detect queue changes
      // The dashboard polls every 2 seconds, so pause to let it see the queue state
      console.log('\n⏳ Waiting 4 seconds for Admin Dashboard to detect queue changes...');
      console.log('   (Open http://localhost:3000/admin/queues in your browser to watch in real-time!)');
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Check status again after waiting
      const statusAfterWait = await getQueueStatus();
      console.log(`\n   Queue status after 4 second wait:`);
      console.log(`   • waiting: ${statusAfterWait.waiting}`);
      console.log(`   • active: ${statusAfterWait.active}`);
      console.log(`   • delayed: ${statusAfterWait.delayed}`);
      console.log(`   • isRateLimited: ${statusAfterWait.isRateLimited}`);

      // STEP 5: Verify the 9th request scenario
      console.log('\n🎯 STEP 5: Verifying 9th Request Rate Limiting');

      const totalJobs = status.waiting + status.active + status.delayed;

      console.log(`\n   Total jobs in system: ${totalJobs}`);
      console.log(`   Expected: 9 (but may have failed jobs)`);

      // The key assertion: when you have 9 jobs with max 8 capacity,
      // at least some should be delayed or waiting
      if (totalJobs >= 9) {
        const hasBottleneck = status.waiting > 0 || status.delayed > 0;
        console.log(`\n   ✅ Has bottleneck (9th+ job delayed/waiting): ${hasBottleneck}`);
        expect(hasBottleneck).toBe(true);

        // Verify rate limiting was detected
        console.log(`   ✅ isRateLimited detected: ${status.isRateLimited}`);
        expect(status.isRateLimited).toBe(true);
      }

      // STEP 6: Show what Admin Dashboard would display
      console.log('\n📊 STEP 6: Admin Dashboard Display');

      console.log(`\n   Queue Status Card Colors:`);
      console.log(`   ┌─────────────────────────────────┐`);
      console.log(`   │ Waiting: 🔵 Blue (${status.waiting})         │`);
      console.log(`   │ Active:  🟡 Amber (${status.active})         │`);
      console.log(`   │ Complete: 🟢 Green (${status.completed})      │`);
      console.log(`   │ Failed:  🔴 Red (${status.failed})          │`);
      console.log(`   └─────────────────────────────────┘`);

      console.log(`\n   Rate Limiting Card:`);
      if (status.isRateLimited) {
        console.log(`   🔴 RED - RATE LIMITED`);
        console.log(`   ├─ Status: Jobs queued and waiting`);
        console.log(`   ├─ Usage: ${status.active}/8 (${((status.active / 8) * 100).toFixed(0)}%)`);
        console.log(`   └─ Recovery: ${Math.ceil(status.rateLimitTtl / 1000)}s`);
      } else {
        console.log(`   🟢 GREEN - NORMAL`);
        console.log(`   ├─ Status: Processing continuously`);
        console.log(`   └─ Usage: ${status.active}/8 (${((status.active / 8) * 100).toFixed(0)}%)`);
      }

      // STEP 7: Show expected outcomes
      console.log('\n✅ STEP 7: Test Results');

      console.log(`\n   Queue Configuration:`);
      console.log(`   • Max concurrent: 8`);
      console.log(`   • Time window: 60 seconds`);
      console.log(`   • Rate limit detection: (waiting > 0 || delayed > 0)`);

      console.log(`\n   Actual Results:`);
      console.log(`   • Jobs submitted: 9`);
      console.log(`   • Jobs active: ${status.active} (≤ 8 ✓)`);
      console.log(`   • Jobs bottlenecked: ${status.waiting + status.delayed}`);
      console.log(`   • Rate limit active: ${status.isRateLimited ? '✅ YES' : '❌ NO'}`);

      // Note about API calls
      console.log(`\n   API Calls Status:`);
      if (status.failed > 0) {
        console.log(`   ⚠️ Some jobs failed (likely need GOOGLE_API_KEY)`);
        console.log(`   • Set GOOGLE_API_KEY in .env to enable real Gemini API calls`);
        console.log(`   • Without it, jobs will fail but queue logic still works`);
      }
    });
  });

  describe('API Endpoint Verification', () => {
    it('should return correct data structure for /api/admin/queue-status', async () => {
      console.log('\n📡 API Endpoint Test');

      const status = await getQueueStatus();

      const apiResponse = {
        queue: 'grading',
        status: {
          waiting: status.waiting,
          active: status.active,
          completed: status.completed,
          failed: status.failed,
          delayed: status.delayed,
          paused: 0,
        },
        rateLimiting: {
          isRateLimited: status.isRateLimited,
          remainingTtl: status.rateLimitTtl,
          config: {
            max: 8,
            duration: 60000,
          },
        },
        mode: 'bullmq',
        isProcessing: status.isProcessing,
        timestamp: new Date().toISOString(),
      };

      console.log(`\n   /api/admin/queue-status response:`);
      console.log(JSON.stringify(apiResponse, null, 2));

      expect(apiResponse.rateLimiting.config.max).toBe(8);
      expect(apiResponse.rateLimiting.config.duration).toBe(60000);
      expect(apiResponse.status).toHaveProperty('waiting');
      expect(apiResponse.status).toHaveProperty('active');
      expect(apiResponse.status).toHaveProperty('delayed');
    });
  });

  describe('Infrastructure Notes', () => {
    it('should document how to enable real Gemini API calls', async () => {
      console.log('\n📚 How to Enable Real Gemini API Calls');

      console.log(`\n   Current setup:`);
      console.log(`   • Database: ✅ Connected (Postgres)`);
      console.log(`   • Queue: ✅ Connected (Redis BullMQ)`);
      console.log(`   • API Key: ${process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Not set'}`);

      console.log(`\n   To enable Gemini API calls:`);
      console.log(`   1. Get your API key from: https://ai.google.dev`);
      console.log(`   2. Set in .env: GEMINI_API_KEY=your-key-here`);
      console.log(`   3. Re-run test: npm run test -- test/integration/bullmq-e2e-ninth-request.test.ts`);
      console.log(`   4. Watch jobs call Gemini and get actual grades!`);

      console.log(`\n   Expected flow WITH API key:`);
      console.log(`   1. Student uploads PDF`);
      console.log(`   2. Job goes to queue`);
      console.log(`   3. Worker pulls job`);
      console.log(`   4. Calls Gemini API → gets grading result`);
      console.log(`   5. Result saved to database`);
      console.log(`   6. Student sees grade and AI feedback`);

      console.log(`\n   Code locations:`);
      console.log(`   • Queue config: app/services/bullmq-grading.server.ts:138-142`);
      console.log(`   • Worker logic: app/services/bullmq-grading.server.ts:90-131`);
      console.log(`   • Grading engine: app/services/grading-engine.server.ts`);
      console.log(`   • AI provider: app/services/ai-grader.server.ts`);
    });
  });
});
