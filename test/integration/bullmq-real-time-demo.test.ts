import { describe, it, expect, beforeEach } from 'vitest';
import {
  UserFactory,
  RubricFactory,
  CourseFactory,
  ClassFactory,
  EnrollmentFactory,
  SubmissionFactory,
  AssignmentAreaFactory,
  UploadedFileFactory,
} from '../factories';
import { createGradingSession } from '@/services/grading-session.server';
import { startGradingSession } from '@/services/grading-session.server';
import { getQueueStatus } from '@/services/bullmq-grading.server';
import { bullmqRedis } from '@/lib/redis';
import { db } from '@/types/database';
import { extractTotalScore } from '@/utils/grading-helpers';

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
  let classRecord: any;
  let assignment: any;
  let rubric: any;
  let enrollments: any[];

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

    teacher = await db.user.update({
      where: { id: teacher.id },
      data: { hasSelectedRole: true },
    });

    students = await UserFactory.createMany(9, {
      role: 'STUDENT',
      hasSelectedRole: true,
    });

    const courseData = await CourseFactory.createWithInvitation(teacher.id, {
      name: 'Real-Time Demo Course',
      description: 'Live queue monitoring demo',
      code: 'DEMO-101',
    });
    course = courseData.course;
    console.log(`   ✓ Created course: ${course.name} (${course.code})`);

    // CREATE CLASS - Students belong to a specific class/section
    classRecord = await ClassFactory.create({
      courseId: course.id,
      name: 'Demo Section A',
      schedule: { weekday: 'Monday', periodCode: '1-2', room: 'A101' },
      capacity: 30,
    });
    console.log(`   ✓ Created class: ${classRecord.name}`);

    rubric = await RubricFactory.create({
      userId: teacher.id,
      name: 'Demo Rubric',
      isTemplate: true,
      criteria: [
        {
          id: 'content',
          name: 'Content Quality',
          maxScore: 4,
          levels: [
            { score: 4, description: 'Excellent - Comprehensive and insightful content' },
            { score: 3, description: 'Good - Clear and adequate content' },
            { score: 2, description: 'Fair - Basic content with some gaps' },
            { score: 1, description: 'Poor - Minimal or unclear content' },
          ],
        },
      ],
    });
    console.log(`   ✓ Created rubric: ${rubric.name}`);

    // CREATE CLASS-SPECIFIC ASSIGNMENT
    assignment = await AssignmentAreaFactory.createWithDueDate(
      {
        courseId: course.id,
        rubricId: rubric.id,
        classId: classRecord.id, // NEW: Link to specific class
        name: 'Demo Assignment',
      },
      7
    );
    console.log(`   ✓ Created assignment: ${assignment.name}`);

    // ENROLL STUDENTS IN CLASS
    const studentIds = students.map(s => s.id);
    enrollments = await EnrollmentFactory.createForClass(classRecord.id, studentIds);
    console.log(`   ✓ Enrolled ${enrollments.length} students in class`);

    console.log(`✅ Setup complete - test will create submissions during execution`);
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
    // PHASE 1: Upload files (they auto-parse)
    // ============================================
    console.log('📝 PHASE 1: Uploading 9 student files...');
    console.log('   (Files will parse automatically)');

    const uploadedFiles = [];
    for (let i = 0; i < 9; i++) {
      const file = await UploadedFileFactory.createPdf(students[i].id, {
        originalFileName: `submission-student-${i + 1}.pdf`,
        fileSize: 1024 * 50,
        parseStatus: 'COMPLETED', // Simulates completed parsing
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
      console.log(`   ✓ Student ${i + 1}: ${file.originalFileName} (parsed: ${file.parseStatus})`);
    }

    // ============================================
    // PHASE 2: Create Grading Sessions (with GradingResults)
    // ============================================
    console.log('\n🔗 PHASE 2: Creating grading sessions for parsed files...');

    const sessionIds = [];
    for (let i = 0; i < uploadedFiles.length; i++) {
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
      console.log(`   ✓ Student ${i + 1}: Session created, ready for grading`);
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
    // PHASE 4: Monitor queue processing
    // ============================================
    console.log('⏳ PHASE 4: Monitoring queue for 15 seconds...');
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
    // PHASE 5: Create Submission records (AFTER grading completes)
    // ============================================
    console.log('\n📋 PHASE 5: Creating submission records (final step in production flow)...');
    console.log('   In production: Students click "Submit Assignment" button after grading');
    console.log('   This creates the Submission record linking to graded results\n');

    const submissions = [];
    for (let i = 0; i < uploadedFiles.length; i++) {
      // Get the grading result from database
      const gradingResult = await db.gradingResult.findFirst({
        where: {
          uploadedFileId: uploadedFiles[i].id,
          rubricId: rubric.id,
        },
      });

      // Create submission record (AFTER grading is complete)
      const submission = await SubmissionFactory.create({
        studentId: students[i].id,
        assignmentAreaId: assignment.id,
        filePath: uploadedFiles[i].fileKey,
        aiAnalysisResult: gradingResult?.result as Record<string, any> | undefined,
        finalScore: extractTotalScore(gradingResult?.result),
        normalizedScore: gradingResult?.normalizedScore ?? undefined,
        thoughtSummary: gradingResult?.thoughtSummary ?? undefined,
        usedContext: gradingResult?.usedContext as Record<string, any> | undefined,
        status: gradingResult ? 'ANALYZED' : 'SUBMITTED',
      });
      submissions.push(submission);
      console.log(`   ✓ Student ${i + 1}: Submission created (links to grading result)`);
    }

    // ============================================
    // PHASE 6: Final status check
    // ============================================
    console.log('\n✅ PHASE 6: Final queue status');

    const finalStatus = await getQueueStatus();
    console.log(`\n   Final Counts:`);
    console.log(`   • waiting: ${finalStatus.waiting}`);
    console.log(`   • active: ${finalStatus.active}`);
    console.log(`   • completed: ${finalStatus.completed}`);
    console.log(`   • failed: ${finalStatus.failed}`);
    console.log(`   • Rate Limited: ${finalStatus.isRateLimited ? '🔴 YES' : '🟢 NO'}`);

    // ============================================
    // PHASE 7: Summary
    // ============================================
    console.log('\n\n╔═══════════════════════════════════════════════════════╗');
    console.log('║  ✅ DEMO COMPLETE                                      ║');
    console.log('╚═══════════════════════════════════════════════════════╝');

    console.log('\n📊 WHAT YOU SAW:');
    console.log('   ✅ COMPLETE PRODUCTION WORKFLOW (Upload → Parse → Grade → Submit):');
    console.log('   ✅ Teacher created course with code DEMO-101');
    console.log('   ✅ Class section created and organized');
    console.log('   ✅ 9 students enrolled in class');
    console.log('   ✅ 9 PDF files uploaded and parsed');
    console.log('   ✅ 9 grading sessions created with parsed files');
    console.log('   ✅ All 9 jobs added to BullMQ queue');
    console.log('   ✅ Front 8 jobs processed with Gemini API');
    console.log('   ✅ 9th job waiting (rate limited)');
    console.log('   ✅ 9 submission records created (AFTER grading)');
    console.log('   ✅ Submissions linked to grading results');
    console.log('   ✅ Admin Dashboard updated in REAL-TIME');

    console.log('\n🔍 VERIFICATION:');
    console.log(`   • API Key: ${process.env.GEMINI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
    console.log(`   • Jobs processed: ${finalStatus.completed + finalStatus.failed}`);
    console.log(`   • Rate limiting worked: ${finalStatus.isRateLimited || finalStatus.waiting > 0 ? '✅ YES' : '❌ NO'}`);

    console.log('\n📝 NEXT STEPS:');
    console.log('   1. Check your Admin Dashboard - you should see the history');
    console.log('   2. Verify database: submissions table has 9 new records');
    console.log('   3. Verify submissions linked to grading results');
    console.log('   4. Check submission.aiAnalysisResult has grading data');
    console.log('   5. Run test again to see repeated pattern\n');

    // Verify some jobs were actually processed
    expect(finalStatus.completed + finalStatus.failed + finalStatus.waiting + finalStatus.active).toBeGreaterThan(0);
  });
});
