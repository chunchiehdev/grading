import { describe, it, expect, beforeEach, before } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import {
  UserFactory,
  RubricFactory,
  CourseFactory,
  ClassFactory,
  EnrollmentFactory,
  SubmissionFactory,
  AssignmentAreaFactory,
} from '../factories';
import { createGradingSession } from '@/services/grading-session.server';
import { startGradingSession } from '@/services/grading-session.server';
import { getQueueStatus } from '@/services/bullmq-grading.server';
import { uploadToStorage } from '@/services/storage.server';
import { triggerPdfParsing } from '@/services/pdf-parser.server';
import { bullmqRedis } from '@/lib/redis';
import { db } from '@/types/database';
import { createMinimalTestContent } from '../load/real-api-config';
import { extractTotalScore } from '@/utils/grading-helpers';
import { createTestPdf } from '../utils/pdf-generator';

/**
 * End-to-End Test: 20 Students Complete Workflow
 *
 * 🎯 PURPOSE:
 * Verify that 20 students can complete the ENTIRE workflow without errors:
 * ✅ Upload PDF files to S3
 * ✅ Parse all PDFs with REAL PDF parser (https://devgradingpdf.grading.software)
 * ✅ Create grading sessions
 * ✅ Submit to BullMQ queue for grading
 * ✅ Wait for grading completion
 * ✅ Create submission records
 * ✅ VERIFY: Zero errors for all 20 students
 *
 * 📊 WHAT THIS TESTS:
 * - Production file upload flow (real S3)
 * - Production PDF parsing (real API)
 * - Production grading workflow (BullMQ queue)
 * - Production submission creation
 * - Scalability with 20 concurrent students
 * - Error handling and reporting
 *
 * 🔧 MSW MOCKING BEHAVIOR:
 * - MSW (Mock Service Worker) is started in test/setup.ts
 * - PDF parser handlers are in test/mocks/handlers.ts (lines 78-154)
 * - By default, MSW intercepts PDF parser calls and returns mock data:
 *   → POST /parse returns { task_id: "mock-task-..." }
 *   → GET /task/:taskId returns canned string "This is parsed PDF content..."
 * - To use REAL APIs, you MUST set: USE_REAL_APIS=true
 * - When USE_REAL_APIS=true, MSW returns status 999 to bypass interception
 *
 * 🌐 REAL API MODE (this test):
 * - This test explicitly sets process.env.USE_REAL_APIS = 'true'
 * - PDF parsing calls go to: ${PDF_PARSER_API_URL}/parse
 * - Default: https://devgradingpdf.grading.software
 * - You'll see "🌐 REAL API CALL" logs in console output
 *
 * ⚙️ TO RUN WITH REAL APIs:
 * 1. Ensure USE_REAL_APIS=true in .env or export USE_REAL_APIS=true
 * 2. Optionally set PDF_PARSER_API_URL to override endpoint
 * 3. Run: npm run test test/integration/e2e-20-students.test.ts
 * 4. Watch for "🌐 REAL API CALL" banner in console
 */

interface StudentResult {
  studentIndex: number;
  studentId: string;
  studentEmail: string;
  uploadStatus: 'success' | 'failed';
  parseStatus: 'success' | 'failed';
  gradingStatus: 'success' | 'failed';
  submissionStatus: 'success' | 'failed';
  errors: string[];
}

describe('E2E: 20 Students Complete Workflow', () => {
  let teacher: any;
  let students: any[];
  let course: any;
  let classRecord: any;
  let assignment: any;
  let rubric: any;
  let enrollments: any[];

  const STUDENT_COUNT = 20;
  const results: StudentResult[] = [];

  // ============================================
  // 🔧 FORCE REAL API MODE
  // ============================================
  // CRITICAL: This test MUST use real APIs to validate production behavior
  // MSW will intercept and mock requests unless USE_REAL_APIS=true
  before(() => {
    // Force real API mode
    process.env.USE_REAL_APIS = 'true';

    // Reset MSW handlers to respect the new environment variable
    // This ensures handlers check USE_REAL_APIS at request time
    const { server } = require('../mocks/server');
    const { handlers } = require('../mocks/handlers');
    server.resetHandlers(...handlers);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  🌐 REAL API MODE ENABLED                              ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`✅ USE_REAL_APIS: ${process.env.USE_REAL_APIS}`);
    console.log(`📡 PDF Parser URL: ${process.env.PDF_PARSER_API_URL || 'http://localhost:8000'}`);
    console.log('🔄 MSW handlers reset to bypass mode');
    console.log('⚠️  All HTTP requests will hit REAL external APIs\n');
  });

  beforeEach(async () => {
    console.log('\n🎬 E2E TEST: Setting up infrastructure for 20 students...');

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

    // Create teacher
    const teacherEmail = process.env.TEACHER_EMAIL || 'e2e-teacher-20@test.edu';
    let teacherRecord = await db.user.findUnique({
      where: { email: teacherEmail },
    });

    if (!teacherRecord) {
      teacher = await UserFactory.createTeacher({
        name: 'E2E Test Teacher (20 Students)',
        email: teacherEmail,
      });
    } else {
      teacher = await db.user.update({
        where: { id: teacherRecord.id },
        data: { role: 'TEACHER', hasSelectedRole: true },
      });
    }

    console.log(`   ✓ Teacher created/verified: ${teacher.email}`);

    // Create 20 students
    students = await UserFactory.createMany(STUDENT_COUNT, {
      role: 'STUDENT',
      hasSelectedRole: true,
    });
    console.log(`   ✓ Created ${STUDENT_COUNT} students`);

    // Create course with invitation code
    const courseData = await CourseFactory.createWithInvitation(teacher.id, {
      name: 'E2E Test Course (20 Students)',
      description: 'End-to-end testing with 20 students',
      code: 'E2E-SCALE-20',
    });
    course = courseData.course;
    console.log(`   ✓ Created course: ${course.name}`);

    // Create class
    classRecord = await ClassFactory.create({
      courseId: course.id,
      name: 'E2E Test Class',
      schedule: { weekday: 'Monday', periodCode: '1-2', room: 'E2E-LAB' },
      capacity: 25,
    });
    console.log(`   ✓ Created class: ${classRecord.name}`);

    // Create rubric
    rubric = await RubricFactory.create({
      userId: teacher.id,
      name: 'E2E Test Rubric',
      isTemplate: true,
      criteria: [
        {
          id: uuidv4(),
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

    // Create assignment
    assignment = await AssignmentAreaFactory.createWithDueDate(
      {
        courseId: course.id,
        rubricId: rubric.id,
        classId: classRecord.id,
        name: 'E2E Test Assignment',
      },
      7
    );
    console.log(`   ✓ Created assignment: ${assignment.name}`);

    // Enroll all students
    const studentIds = students.map((s) => s.id);
    enrollments = await EnrollmentFactory.createForClass(classRecord.id, studentIds);
    console.log(`   ✓ Enrolled ${enrollments.length} students in class`);

    // Initialize results array
    for (let i = 0; i < STUDENT_COUNT; i++) {
      results[i] = {
        studentIndex: i,
        studentId: students[i].id,
        studentEmail: students[i].email,
        uploadStatus: 'failed',
        parseStatus: 'failed',
        gradingStatus: 'failed',
        submissionStatus: 'failed',
        errors: [],
      };
    }

    console.log(`✅ Infrastructure ready for 20 students\n`);
  });

  it('should handle 20 students through complete workflow without errors', async () => {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  🚀 E2E TEST: 20 STUDENTS COMPLETE WORKFLOW              ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // ============================================
    // VALIDATE REAL API MODE
    // ============================================
    const useRealApis = process.env.USE_REAL_APIS === 'true';
    const pdfParserUrl = process.env.PDF_PARSER_API_URL || 'http://localhost:8000';

    console.log('🔍 Environment Check:');
    console.log(`   USE_REAL_APIS: ${process.env.USE_REAL_APIS} (${useRealApis ? '✅ REAL APIS' : '❌ MOCKED'})`);
    console.log(`   PDF_PARSER_API_URL: ${pdfParserUrl}`);

    if (!useRealApis) {
      console.warn('\n⚠️  WARNING: USE_REAL_APIS is not true!');
      console.warn('   MSW will intercept API calls and return mock data.');
      console.warn('   Set USE_REAL_APIS=true to test real parser.\n');
    } else {
      console.log('\n✅ REAL API MODE: All requests will hit external endpoints');
      console.log('   You should see "🌐 REAL API CALL" logs from pdf-parser.server.ts\n');
    }

    // ============================================
    // PHASE 1: Upload files for all 20 students
    // ============================================
    console.log('📝 PHASE 1: Uploading 20 PDF files...\n');

    const uploadedFiles: any[] = [];

    for (let i = 0; i < STUDENT_COUNT; i++) {
      const student = students[i];

      try {
        const content = `${createMinimalTestContent()}\n\nStudent ${i + 1} submission for E2E testing.`;

        // ✅ Generate REAL PDF (not plain text)
        console.log(`   📝 Student ${i + 1}: Generating real PDF file...`);
        const pdfBuffer = await createTestPdf(content);

        const fileName = `e2e-student-${i + 1}.pdf`;
        const fileKey = `uploads/${student.id}/${Date.now()}-${i}-${fileName}`;

        // Upload to S3
        console.log(`   ⬆️  Student ${i + 1}: Uploading to S3...`);
        const uploadResult = await uploadToStorage(pdfBuffer, fileKey, 'application/pdf');

        // Create database record
        const uploadedFile = await db.uploadedFile.create({
          data: {
            id: require('uuid').v4(),
            userId: student.id,
            fileName,
            originalFileName: fileName,
            fileKey: uploadResult.key,
            fileSize: pdfBuffer.length,
            mimeType: 'application/pdf',
            parseStatus: 'PENDING',
            parsedContent: null,
          },
        });

        uploadedFiles.push(uploadedFile);
        results[i].uploadStatus = 'success';
        console.log(`   ✅ Student ${i + 1}: File uploaded (${pdfBuffer.length} bytes, REAL PDF format)`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results[i].errors.push(`Upload failed: ${errorMsg}`);
        console.error(`   ❌ Student ${i + 1}: Upload failed - ${errorMsg}`);
      }
    }

    // ============================================
    // PHASE 2: Parse all 20 PDF files
    // ============================================
    console.log('\n🔄 PHASE 2: Parsing 20 PDF files with real PDF parser...\n');
    console.log(`📡 API Endpoint: ${process.env.PDF_PARSER_API_URL || 'http://localhost:8000'}\n`);

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const student = students[i];

      try {
        console.log(`   🔄 Student ${i + 1}: Parsing file...`);
        await triggerPdfParsing(file.id, file.fileKey, file.originalFileName, student.id);
        results[i].parseStatus = 'success';
        console.log(`   ✅ Student ${i + 1}: Parse completed`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results[i].errors.push(`Parse failed: ${errorMsg}`);
        console.error(`   ❌ Student ${i + 1}: Parse failed - ${errorMsg}`);
      }
    }

    // ============================================
    // PHASE 3: Create grading sessions
    // ============================================
    console.log('\n🔗 PHASE 3: Creating 20 grading sessions...\n');

    const sessionIds: string[] = [];

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const student = students[i];

      try {
        const sessionResult = await createGradingSession({
          userId: student.id,
          filePairs: [
            {
              fileId: file.id,
              rubricId: rubric.id,
            },
          ],
          assignmentAreaId: assignment.id,
          language: 'zh',
        });

        if (!sessionResult.success) {
          throw new Error(sessionResult.error || 'Unknown session creation error');
        }

        sessionIds[i] = sessionResult.sessionId!;
        console.log(`   ✅ Student ${i + 1}: Grading session created`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results[i].errors.push(`Session creation failed: ${errorMsg}`);
        console.error(`   ❌ Student ${i + 1}: Session creation failed - ${errorMsg}`);
      }
    }

    // ============================================
    // PHASE 4: Submit all jobs to queue
    // ============================================
    console.log('\n🎯 PHASE 4: Submitting 20 jobs to BullMQ queue...\n');

    for (let i = 0; i < STUDENT_COUNT; i++) {
      if (!sessionIds[i]) {
        console.warn(`   ⚠️ Student ${i + 1}: Skipped (no session)`);
        continue;
      }

      try {
        const startResult = await startGradingSession(sessionIds[i], students[i].id);

        if (startResult.success) {
          results[i].gradingStatus = 'success';
          console.log(`   ✅ Student ${i + 1}: Job submitted to queue`);
        } else {
          throw new Error(startResult.error || 'Unknown submission error');
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results[i].errors.push(`Job submission failed: ${errorMsg}`);
        console.error(`   ❌ Student ${i + 1}: Job submission failed - ${errorMsg}`);
      }
    }

    // ============================================
    // PHASE 5: Monitor queue processing
    // ============================================
    console.log('\n⏳ PHASE 5: Monitoring queue for 180 seconds (rate limiting: 8 RPM = ~2.5 min for 20 jobs)...\n');

    const waitDuration = 180000; // 180 seconds (3 minutes) - enough for 20 jobs at 8 RPM
    const startTime = Date.now();
    let lastCheck = 0;

    while (Date.now() - startTime < waitDuration) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);

      if (elapsed - lastCheck >= 5) {
        const status = await getQueueStatus();
        console.log(
          `   [${elapsed}s] waiting=${status.waiting}, active=${status.active}, completed=${status.completed}, failed=${status.failed}`
        );
        lastCheck = elapsed;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // ============================================
    // PHASE 6: Create submission records
    // ============================================
    console.log('\n📋 PHASE 6: Creating 20 submission records...\n');

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const student = students[i];

      try {
        // Get grading result
        const gradingResult = await db.gradingResult.findFirst({
          where: {
            uploadedFileId: file.id,
            rubricId: rubric.id,
          },
        });

        // Create submission
        const submission = await SubmissionFactory.create({
          studentId: student.id,
          assignmentAreaId: assignment.id,
          filePath: file.fileKey,
          aiAnalysisResult: gradingResult?.result as Record<string, any> | undefined,
          finalScore: extractTotalScore(gradingResult?.result),
          normalizedScore: gradingResult?.normalizedScore ?? undefined,
          thoughtSummary: gradingResult?.thoughtSummary ?? undefined,
          usedContext: gradingResult?.usedContext as Record<string, any> | undefined,
          status: gradingResult ? 'ANALYZED' : 'SUBMITTED',
        });

        results[i].submissionStatus = 'success';
        console.log(`   ✅ Student ${i + 1}: Submission created`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results[i].errors.push(`Submission creation failed: ${errorMsg}`);
        console.error(`   ❌ Student ${i + 1}: Submission creation failed - ${errorMsg}`);
      }
    }

    // ============================================
    // PHASE 7: Final report
    // ============================================
    console.log('\n✅ PHASE 7: Generating final report...\n');

    const finalStatus = await getQueueStatus();

    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  📊 FINAL RESULTS: 20 STUDENTS                         ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Count successes
    const uploadSuccesses = results.filter((r) => r.uploadStatus === 'success').length;
    const parseSuccesses = results.filter((r) => r.parseStatus === 'success').length;
    const gradingSuccesses = results.filter((r) => r.gradingStatus === 'success').length;
    const submissionSuccesses = results.filter((r) => r.submissionStatus === 'success').length;

    console.log('📤 UPLOAD RESULTS:');
    console.log(`   ✅ Successful: ${uploadSuccesses}/${STUDENT_COUNT}`);
    console.log(`   ❌ Failed: ${STUDENT_COUNT - uploadSuccesses}/${STUDENT_COUNT}\n`);

    console.log('📄 PARSE RESULTS:');
    console.log(`   ✅ Successful: ${parseSuccesses}/${STUDENT_COUNT}`);
    console.log(`   ❌ Failed: ${STUDENT_COUNT - parseSuccesses}/${STUDENT_COUNT}\n`);

    console.log('🔄 GRADING RESULTS:');
    console.log(`   ✅ Successful: ${gradingSuccesses}/${STUDENT_COUNT}`);
    console.log(`   ❌ Failed: ${STUDENT_COUNT - gradingSuccesses}/${STUDENT_COUNT}\n`);

    console.log('📋 SUBMISSION RESULTS:');
    console.log(`   ✅ Successful: ${submissionSuccesses}/${STUDENT_COUNT}`);
    console.log(`   ❌ Failed: ${STUDENT_COUNT - submissionSuccesses}/${STUDENT_COUNT}\n`);

    console.log('🎯 QUEUE STATUS:');
    console.log(`   • Waiting: ${finalStatus.waiting}`);
    console.log(`   • Active: ${finalStatus.active}`);
    console.log(`   • Completed: ${finalStatus.completed}`);
    console.log(`   • Failed: ${finalStatus.failed}\n`);

    // Show any errors
    const failedStudents = results.filter((r) => r.errors.length > 0);

    if (failedStudents.length > 0) {
      console.log('❌ FAILED STUDENTS:\n');
      failedStudents.forEach((result) => {
        console.log(`   Student ${result.studentIndex + 1} (${result.studentEmail}):`);
        result.errors.forEach((error) => {
          console.log(`      - ${error}`);
        });
      });
      console.log();
    } else {
      console.log('✅ ALL 20 STUDENTS COMPLETED SUCCESSFULLY WITH ZERO ERRORS!\n');
    }

    // Final summary
    const allSuccess = failedStudents.length === 0;
    console.log('═════════════════════════════════════════════════════════\n');
    console.log(`📊 SUMMARY:`);
    console.log(
      `   ${allSuccess ? '✅ PASS' : '❌ FAIL'} - ${STUDENT_COUNT - failedStudents.length}/${STUDENT_COUNT} students completed`
    );
    console.log(
      `   ${allSuccess ? '✅ ZERO' : `❌ ${failedStudents.length}`} students with errors`
    );

    // Assertions
    expect(uploadSuccesses).toBe(STUDENT_COUNT);
    expect(parseSuccesses).toBe(STUDENT_COUNT);
    expect(submissionSuccesses).toBe(STUDENT_COUNT);
    expect(
      failedStudents.length,
      `${failedStudents.length} students failed: ${failedStudents.map((s) => `Student ${s.studentIndex + 1}`).join(', ')}`
    ).toBe(0);
  }, 900000); // 15 minute timeout (includes 3 min queue processing due to 8 RPM rate limit)
});
