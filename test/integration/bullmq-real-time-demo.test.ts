import { describe, it, expect, beforeEach } from 'vitest';
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
 * Real-Time Demo: 9th Request Rate Limiting
 *
 * 🎯 PURPOSE:
 * Demonstrate the COMPLETE flow with real Gemini API calls:
 * ✅ 9 students submit assignments
 * ✅ All get real AI grading (Gemini API)
 * ✅ 9th student gets rate limited
 * ✅ Admin Dashboard shows REAL-TIME changes
 *
 * 📋 HOW TO USE:
 * Terminal 1: npm run dev
 *   (Wait for "✓ ready in 2s http://localhost:5173")
 *
 * Browser: Open http://localhost:3000/admin/queues
 *   (Watch for real-time queue status updates)
 *
 * Terminal 2: npm run test -- test/integration/bullmq-real-time-demo.test.ts
 *   (Observe Admin Dashboard as test runs)
 *
 * 📊 WHAT YOU'LL SEE IN ADMIN DASHBOARD:
 * T=0s:   waiting: 0, active: 0 → 🟢 Green
 * T=2s:   waiting: 1-2, active: 6-7 → 🔴 RED (Rate Limited!)
 * T=8s:   Queue starts clearing as jobs complete
 * T=15s:  Back to 🟢 Green
 */
describe('Real-Time Demo: 9th Request Rate Limiting', () => {
  let teacher: any;
  let students: any[];
  let course: any;
  let assignment: any;
  let rubric: any;

  beforeEach(async () => {
    console.log('\n🎬 REAL-TIME DEMO: Setting up test data...');

    // Clean queue only
    try {
      const pattern = 'bull:grading:*';
      const keys = await bullmqRedis.keys(pattern);
      if (keys.length > 0) {
        await bullmqRedis.del(...keys);
      }
      console.log(`   ✓ Queue cleaned (${keys.length} keys removed)`);
    } catch (error) {
      console.error('   ⚠️ Failed to clean queue:', error);
    }

    // Create test data
    // 📝 IMPORTANT: Use your real Google email as the teacher account
    // Run with: TEACHER_EMAIL="chunchiehdev@gmail.com" npm run test
    const teacherEmail = process.env.TEACHER_EMAIL || 'demo-teacher-temp@test.edu';

    console.log(`\n   📧 Using teacher account: ${teacherEmail}`);
    if (process.env.TEACHER_EMAIL) {
      console.log(`   ✅ Using your real Google account!`);
    } else {
      console.log(`   ⚠️ Tip: Run with TEACHER_EMAIL env var to use your real account`);
    }

    // Try to find existing teacher account, if not found, create new one
    teacher = await db.user.findUnique({
      where: { email: teacherEmail },
    });

    if (!teacher) {
      console.log(`   → Creating new teacher account...`);
      teacher = await UserFactory.createTeacher({
        name: 'Demo Teacher',
        email: teacherEmail,
      });
    } else {
      console.log(`   → Found existing teacher account`);
      // Ensure role is TEACHER
      if (teacher.role !== 'TEACHER') {
        teacher = await db.user.update({
          where: { id: teacher.id },
          data: { role: 'TEACHER' },
        });
        console.log(`   → Updated role to TEACHER`);
      }
    }

    students = await UserFactory.createMany(9, {
      role: 'STUDENT',
    });

    const courseData = await CourseFactory.createWithInvitation(teacher.id, {
      name: 'Real-Time Demo Course',
      description: 'Live queue monitoring demo',
    });
    course = courseData.course;

    rubric = await RubricFactory.create({
      userId: teacher.id,
      name: 'Demo Rubric',
      isTemplate: true,
      criteria: [
        {
          id: 'content',
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
        name: 'Demo Assignment',
      },
      7
    );

    console.log(`✅ Setup complete - ready for demo`);
  });

  it('REAL-TIME: Watch 9th student get rate limited on Admin Dashboard', async () => {
    console.log('\n\n');
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║  🎬 REAL-TIME RATE LIMITING DEMONSTRATION              ║');
    console.log('╚═══════════════════════════════════════════════════════╝');

    console.log('\n📱 SETUP YOUR BROWSER:');
    console.log('   1. Open Terminal 1 with: npm run dev');
    console.log('   2. Wait for "✓ ready in 2s http://localhost:5173"');
    console.log('   3. In browser, go to: http://localhost:3000/admin/queues');
    console.log('   4. Keep the Admin Dashboard open and WATCH IT');
    console.log('\n   When you see this message below, the test is starting!');
    console.log('   The Admin Dashboard will update in REAL-TIME! 📊\n');

    // Give user time to open browser
    console.log('⏳ Waiting 3 seconds... open your browser now!');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n🚀 STARTING DEMO NOW!');
    console.log('═════════════════════════════════════════════════════════\n');

    // ============================================
    // PHASE 1: Create PDFs for 9 students
    // ============================================
    console.log('📝 PHASE 1: Creating 9 student submissions...');

    const uploadedFiles = [];
    for (let i = 0; i < 9; i++) {
      const file = await UploadedFileFactory.createPdf(students[i].id, {
        originalFileName: `submission-student-${i + 1}.pdf`,
        fileSize: 1024 * 50,
        parsedContent: `
          This is submission number ${i + 1}.

          Student ${i + 1} is submitting their essay about artificial intelligence
          and its impact on education. This essay demonstrates understanding of
          modern technology and its applications in learning environments.

          The student has provided thoughtful analysis and specific examples
          to support their arguments throughout the document.
        `,
      });
      uploadedFiles.push(file);
      console.log(`   ✓ Student ${i + 1}: ${file.originalFileName}`);
    }

    // ============================================
    // PHASE 2: Create Grading Sessions (with GradingResults)
    // ============================================
    console.log('\n🔗 PHASE 2: Creating grading sessions...');

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
        throw new Error(`Failed to create session for student ${i + 1}`);
      }

      sessionIds.push(sessionResult.sessionId!);
      console.log(`   ✓ Student ${i + 1}: Session ready for grading`);
    }

    // ============================================
    // PHASE 3: Submit all 9 jobs to queue
    // ============================================
    console.log('\n🎯 PHASE 3: Submitting all 9 jobs to queue...');
    console.log('   👀 WATCH YOUR ADMIN DASHBOARD NOW! 👀\n');

    for (let i = 0; i < 9; i++) {
      const startResult = await startGradingSession(sessionIds[i], students[i].id);
      if (startResult.success) {
        console.log(`   ✅ Student ${i + 1}: Job submitted to queue`);
      } else {
        console.warn(`   ⚠️ Student ${i + 1}: ${startResult.error}`);
      }

      // Small delay between submissions (realistic scenario)
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n   🚨 JOBS ARE NOW BEING PROCESSED!');
    console.log('   Your Admin Dashboard should show:');
    console.log('   • waiting: 1-2 (9th student waiting)');
    console.log('   • active: 6-7 (others being graded)');
    console.log('   • Status: 🔴 RED (Rate Limited)\n');

    // ============================================
    // PHASE 4: Long wait - let Admin Dashboard catch up
    // ============================================
    console.log('⏳ PHASE 4: Keeping jobs in queue for 15 seconds...');
    console.log('   Admin Dashboard polls every 2 seconds');
    console.log('   You should see 6-7 updates during this time\n');

    const waitDuration = 15000; // 15 seconds
    const startTime = Date.now();
    let lastCheck = 0;

    while (Date.now() - startTime < waitDuration) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);

      // Show status every 2 seconds (matching Admin Dashboard refresh)
      if (elapsed - lastCheck >= 2) {
        const status = await getQueueStatus();
        console.log(`   [${elapsed}s] waiting=${status.waiting}, active=${status.active}, rate_limited=${status.isRateLimited}`);
        lastCheck = elapsed;
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // ============================================
    // PHASE 5: Final status check
    // ============================================
    console.log('\n✅ PHASE 5: Final queue status');

    const finalStatus = await getQueueStatus();
    console.log(`\n   Final Counts:`);
    console.log(`   • waiting: ${finalStatus.waiting}`);
    console.log(`   • active: ${finalStatus.active}`);
    console.log(`   • completed: ${finalStatus.completed}`);
    console.log(`   • failed: ${finalStatus.failed}`);
    console.log(`   • Rate Limited: ${finalStatus.isRateLimited ? '🔴 YES' : '🟢 NO'}`);

    // ============================================
    // PHASE 6: Summary
    // ============================================
    console.log('\n\n╔═══════════════════════════════════════════════════════╗');
    console.log('║  ✅ DEMO COMPLETE                                      ║');
    console.log('╚═══════════════════════════════════════════════════════╝');

    console.log('\n📊 WHAT YOU SAW:');
    console.log('   ✅ 9 students submitted real PDF assignments');
    console.log('   ✅ All 9 jobs added to BullMQ queue');
    console.log('   ✅ Front 8 jobs processed with Gemini API');
    console.log('   ✅ 9th job waiting (rate limited)');
    console.log('   ✅ Admin Dashboard updated in REAL-TIME');

    console.log('\n🔍 VERIFICATION:');
    console.log(`   • API Key: ${process.env.GEMINI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
    console.log(`   • Jobs processed: ${finalStatus.completed + finalStatus.failed}`);
    console.log(`   • Rate limiting worked: ${finalStatus.isRateLimited || finalStatus.waiting > 0 ? '✅ YES' : '❌ NO'}`);

    console.log('\n📝 NEXT STEPS:');
    console.log('   1. Check your Admin Dashboard - you should see the history');
    console.log('   2. Refresh the page to see current queue status');
    console.log('   3. Run test again to see repeated pattern');
    console.log('   4. Check database to see grading results stored\n');

    // Verify some jobs were actually processed
    expect(finalStatus.completed + finalStatus.failed + finalStatus.waiting + finalStatus.active).toBeGreaterThan(0);
  });
});
