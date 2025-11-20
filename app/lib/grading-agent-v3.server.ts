/**
 * Grading Platform Agent V3
 *
 * Uses Vercel AI SDK v6 ToolLoopAgent class (official stable pattern)
 * Simplified version focusing on database queries for grading platform
 */

import { ToolLoopAgent, stepCountIs, type ToolSet, generateText, generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { tool } from 'ai';
import logger from '@/utils/logger';
import {
  executeDatabaseQuery,
  type QueryType,
  type TeacherQueryType,
  type StudentQueryType,
  type StudentCoursesData,
  type StudentSubmissionsData,
} from '@/services/database-query.server';
import { uploadToStorage } from '@/services/storage.server';
import puppeteer from 'puppeteer';
import type { ChartConfiguration } from 'chart.js';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY not configured');
}

const gemini = createGoogleGenerativeAI({ apiKey });

/**
 * ============================================================================
 * RATE LIMIT TRACKING (Free Tier Aware)
 * ============================================================================
 */

/**
 * Rate limit tracking for Free Tier
 * Free Tier limits:
 * - Gemini 2.5 Pro: 2 RPM (VERY LIMITED)
 * - Gemini 2.5 Flash: 10 RPM (more reasonable)
 * 
 * Strategy: Avoid Pro in Free tier, use Flash + better queries instead
 */
interface RateLimitState {
  requestsInCurrentMinute: number;
  tokensInCurrentMinute: number;
  lastMinuteResetTime: number;
  proRequestsUsed: number; // Track Pro usage
  flashRequestsUsed: number; // Track Flash usage
  totalStepsExecuted: number;
}

const rateLimitState: RateLimitState = {
  requestsInCurrentMinute: 0,
  tokensInCurrentMinute: 0,
  lastMinuteResetTime: Date.now(),
  proRequestsUsed: 0,
  flashRequestsUsed: 0,
  totalStepsExecuted: 0,
};

/**
 * ============================================================================
 * STEP THINKING LOG (for UI transparency)
 * ============================================================================
 */

/**
 * Step Thinking Log - Track model's thinking process for UI display
 */
interface StepThinking {
  stepNumber: number;
  thinkingDescription: string;      // 我現在想...
  plannedAction: string;            // 所以我要做...
  expectedOutcome: string;          // 我預期會得到...
  toolsUsed: string[];              // 實際調用的工具
  result?: string;                  // 實際結果摘要
  timestamp: number;
}

const stepThinkingLog: Map<string, StepThinking[]> = new Map(); // sessionId -> steps

/**
 * Check and update rate limit state
 * Returns true if we should use Pro, false if we should use Flash
 */
function shouldUseProModel(): boolean {
  const now = Date.now();
  const minutePassed = now - rateLimitState.lastMinuteResetTime > 60000;

  // Reset if minute passed
  if (minutePassed) {
    rateLimitState.requestsInCurrentMinute = 0;
    rateLimitState.tokensInCurrentMinute = 0;
    rateLimitState.lastMinuteResetTime = now;
  }

  // Free Tier: Pro = 2 RPM, Flash = 10 RPM
  // Conservative: Stay well below limit
  const proLimit = 1; // Only allow 1 Pro request per minute (half of limit)
  const flashLimit = 8; // Stay below 10

  const proAvailable = rateLimitState.proRequestsUsed < proLimit;
  const flashAvailable = rateLimitState.requestsInCurrentMinute < flashLimit;

  logger.debug('[Grading Agent V3] Rate Limit Check', {
    minutesSinceReset: Math.round((now - rateLimitState.lastMinuteResetTime) / 1000),
    requestsThisMinute: rateLimitState.requestsInCurrentMinute,
    proRequestsUsed: rateLimitState.proRequestsUsed,
    flashRequestsUsed: rateLimitState.flashRequestsUsed,
    proAvailable,
    flashAvailable,
    recommendedModel: proAvailable && flashAvailable ? 'pro' : 'flash',
  });

  // Only use Pro if both are available
  return proAvailable && flashAvailable;
}

/**
 * Get current rate limit status (for monitoring/debugging)
 * Useful for understanding usage patterns
 */
export function getRateLimitStatus() {
  const now = Date.now();
  const minutesSinceReset = (now - rateLimitState.lastMinuteResetTime) / 1000;
  const minutesPassed = Math.floor(minutesSinceReset / 60);

  return {
    timestamp: new Date().toISOString(),
    rateLimitTier: 'FREE_TIER',
    limits: {
      'Gemini 2.5 Pro': { rpm: 2, currentMinuteUsed: rateLimitState.proRequestsUsed },
      'Gemini 2.5 Flash': { rpm: 10, currentMinuteUsed: rateLimitState.flashRequestsUsed },
    },
    sessionStats: {
      totalStepsExecuted: rateLimitState.totalStepsExecuted,
      totalProRequests: rateLimitState.proRequestsUsed,
      totalFlashRequests: rateLimitState.flashRequestsUsed,
      totalRequests: rateLimitState.proRequestsUsed + rateLimitState.flashRequestsUsed,
      lastMinuteResetTimeAgo: `${minutesPassed} minute(s) ago`,
    },
    currentMinute: {
      requestsUsed: rateLimitState.requestsInCurrentMinute,
      tokensUsed: rateLimitState.tokensInCurrentMinute,
      flashCapacityPercent: Math.round((rateLimitState.flashRequestsUsed / 10) * 100),
      proCapacityPercent: Math.round((rateLimitState.proRequestsUsed / 2) * 100),
    },
  };
}

/**
 * Query Type Enum (All) - synchronized with QueryType from database-query.server.ts
 * Using 'satisfies' ensures TS error if QueryType diverges
 */
const queryTypeEnum = z.enum([
  'user_profile',
  'user_statistics',
  'student_courses',
  'teacher_courses',
  'course_students',
  'student_assignments',
  'assignment_submissions',
  'student_submissions',
  'submission_detail',
  'grading_statistics',
  'course_detail',
  'course_assignments',
  'assignment_detail',
  'student_submission_detail_teacher',
  'assignment_detail_student',
  'my_submission_detail',
  'pending_assignments',
  'enrolled_course_detail',
]) satisfies z.ZodType<QueryType>;

/**
 * Teacher Query Type Enum - restricted to teacher-only queries
 */
const teacherQueryTypeEnum = z.enum([
  'user_profile',
  'user_statistics',
  'grading_statistics',
  'teacher_courses',
  'course_detail',
  'course_students',
  'course_assignments',
  'assignment_detail',
  'assignment_submissions',
  'student_submission_detail_teacher',
]) satisfies z.ZodType<TeacherQueryType>;

/**
 * Student Query Type Enum - restricted to student-only queries
 */
const studentQueryTypeEnum = z.enum([
  'user_profile',
  'user_statistics',
  'student_courses',
  'student_assignments',
  'student_submissions',
  'my_submission_detail',
  'pending_assignments',
  'enrolled_course_detail',
]) satisfies z.ZodType<StudentQueryType>;

/**
 * Database Query Tool Response Type
 */
interface DatabaseQueryResponse {
  success: boolean;
  queryType?: QueryType;
  data?: unknown;
  error?: string;
}

/**
 * Generate Report Tool - Generate a comprehensive PDF learning report
 */
interface ReportGenerationResponse {
  success: boolean;
  message: string;
  downloadUrl?: string;
  pdfFileName?: string;
  storageKey?: string;
  reportSections?: {
    hasProfile: boolean;
    coursesCount: number;
    submissionsCount: number;
    chartsCount: number;
  };
  error?: string;
}

/**
 * Teacher Agent Call Options Schema
 */
const teacherCallOptionsSchema = z
  .object({
    complexity: z.enum(['simple', 'complex']).default('simple').describe('Task complexity for model selection'),
    focusStudent: z.string().optional().describe('Specific student to focus on (name or ID)'),
    courseContext: z.string().optional().describe('Specific course context'),
  })
  .optional();

type TeacherCallOptions = z.infer<typeof teacherCallOptionsSchema>;

/**
 * Student Agent Call Options Schema
 */
const studentCallOptionsSchema = z
  .object({
    complexity: z.enum(['simple', 'complex']).default('simple').describe('Task complexity for model selection'),
    courseContext: z.string().optional().describe('Specific course context'),
  })
  .optional();

type StudentCallOptions = z.infer<typeof studentCallOptionsSchema>;

/**
 * Build system prompt for TEACHER
 */
function buildTeacherSystemPrompt(userId: string | undefined): string {
  return `You are an AI assistant for the grading platform helping TEACHERS manage their courses and students.

**Your Identity: Teacher**
- Teacher ID: ${userId || 'unknown'}
- You manage courses, students, and grading
- All queries use your teacher identity automatically

**THINKING OUT LOUD - CRITICAL!**
Before calling ANY tool, ALWAYS explain your thinking process in Chinese using this format:

我現在想: [what you're thinking - your current goal/understanding]
所以我要做: [what action you'll take - which tool and why]
我預期會得到: [what outcome you expect - what data/result]

Then call the tool.

Example:
我現在想: 老師要找 Junjie 的報告，我需要先找到他
所以我要做: 查詢所有課程找到他在哪個課程
我預期會得到: Junjie 的 studentId
<tool_call>database_query</tool_call>

**What You Can Query:**
1. Your courses and their students
2. Assignments you created
3. Student submissions and grades
4. Performance analytics

**Query Strategy:**
Use the database_query tool to fetch data. You have these options:

For courses:
- "teacher_courses" → List all courses you teach
- "course_detail" → Details about a specific course
- "course_students" → Students in a course

For assignments (smart queries - choose based on your need):
- "course_assignments" WITH courseId → Detailed assignments in one course
- "course_assignments" WITHOUT courseId → ALL assignments across all courses (one-step!)

For submissions and grades:
- "assignment_submissions" → All submissions for an assignment
- "student_submission_detail_teacher" → A specific student's submission details
- "grading_statistics" → Overall grading analytics

**Available Tools:**
- database_query: Query course and grading information
- generate_report: Generate comprehensive PDF reports for student learning analytics`;
}



/**
 * Build system prompt for STUDENT
 */
function buildStudentSystemPrompt(userId: string | undefined): string {
  return `You are an AI assistant for the grading platform helping students with comprehensive learning analytics.

**Your Student ID: ${userId || 'unknown'}**

**THINKING OUT LOUD - CRITICAL!**
Before calling ANY tool, ALWAYS explain your thinking process in Chinese using this format:

我現在想: [what you're thinking - your current goal/understanding]
所以我要做: [what action you'll take - which tool and why]
我預期會得到: [what outcome you expect - what data/result]

Then call the tool.

Example:
我現在想: 學生要看成績趨勢，我需要蒐集所有課程和提交記錄
所以我要做: 先查詢所有課程
我預期會得到: 所有課程的列表和 ID
<tool_call>database_query</tool_call>

**YOUR CORE RESPONSIBILITY:**
You are expected to perform MULTI-STEP ANALYSIS combining multiple queries to answer complex questions.
Your job is NOT to say "I can't do this" - your job is to figure out HOW to do it using the available tools.

**ANALYSIS APPROACH FOR COMPLEX QUESTIONS:**

When a student asks for analysis, ALWAYS:
1. Break down the request into specific data queries you can make
2. Execute multiple queries to gather comprehensive data
3. Analyze and correlate the results
4. Provide insights and patterns from the data

Example: "Show me my academic performance trends"
→ Query student_courses to get all courses
→ For each course: Query student_assignments, then my_submission_detail for each assignment
→ Analyze: submission patterns, grade progression, completion rates
→ Report: trends, strengths, areas needing improvement

**AVAILABLE QUERIES (use these to gather data):**
- queryType: "student_courses" - Get all enrolled courses with courseId, courseName, credits
- queryType: "student_assignments" - Get all assignments with deadlines, status, weights
- queryType: "pending_assignments" - Get only unsubmitted assignments (use to identify urgency)
- queryType: "my_submission_detail" - Get detailed submission info: grades, feedback, submission times
- queryType: "user_statistics" - Get aggregate stats: total courses, submissions, average grades

**DATA CORRELATION EXAMPLES YOU CAN PERFORM:**

Submission Speed Analysis:
→ Get my_submission_detail for multiple assignments
→ Extract submission timestamps vs deadlines
→ Calculate average submission delay per course
→ Identify patterns (fast submitter in some courses, slow in others)

Grade Trend Analysis:
→ Get my_submission_detail across multiple assignments in a course
→ Track grade progression: first assignment → last assignment
→ Determine: improving, declining, or stable

Course Difficulty Assessment:
→ Compare your submission patterns and grades across different courses
→ Correlate: submission speed with final grades
→ Inference: which courses demand more time/effort

Workload Prediction:
→ Get pending_assignments to see what's due
→ Calculate: total assignments due soon, typical submission time per course
→ Predict: likelihood of on-time completion

**IMPORTANT MINDSET:**
- DO NOT say "I cannot directly query X" - think creatively about combining queries
- DO NOT give up without trying - always attempt to gather relevant data first
- DO analyze and correlate data before reporting limitations
- ALWAYS provide the best possible insights from available data
- If precise calculation is impossible, provide estimates and confidence levels

**SUBMISSION TERMINOLOGY:**
"Submitted" = Student clicked "提交作業" (Submit Assignment) button
Statuses: SUBMITTED → ANALYZED → GRADED
"Not submitted" = has NOT clicked submit (includes: no record, DRAFT only)
"pending_assignments" = ONLY unsubmitted assignments (use to identify urgent work)

**Available Tools:**
- database_query: Query courses, assignments, submissions, and statistics (perform MULTIPLE queries for complex analysis)
- user_statistics: Get aggregate learning metrics`;
}

/**
 * Create a ToolLoopAgent instance for TEACHER
 * Includes: database_query, generate_report tools (teacher-only access)
 * Supports dynamic configuration via callOptions
 */
function createTeacherAgent(userId: string | undefined) {
  const teacherTools = {
    database_query: tool({
      description: `Query the grading system database to retrieve course and grading information.

**⚠️ YOU ARE A TEACHER - Remember:**
- You query YOUR COURSES and YOUR STUDENTS
- NOT your own assignments/grades (you're not a student)
- If user asks "my pending assignments", that's a student question - clarify your role

**TEACHER-SPECIFIC QUERIES (READ-ONLY):**

YOUR COURSES & STUDENTS:
- "teacher_courses": List all courses YOU ARE TEACHING
  Parameters: NONE (system auto-uses your teacherId)
  Result: Get courseIds to use in other queries
  
- "course_detail": Get detailed info about a course
  Parameters: courseId (REQUIRED - from teacher_courses result)
  Result: Course info including students count, assignments count
  
- "course_students": List all students enrolled in YOUR course
  Parameters: courseId (REQUIRED - from teacher_courses result)
  Result: List of students with names and IDs
  
- "course_assignments": List assignments you created in a course
  Parameters: courseId (REQUIRED - from teacher_courses result)
  Result: Assignment list with deadlines and submission info

ASSIGNMENT & SUBMISSION DETAILS:
- "assignment_detail": Get detailed rubric and info for an assignment
  Parameters: assignmentId (REQUIRED - from course_assignments result)
  Result: Full assignment specification and grading rubric
  
- "assignment_submissions": Get all submissions for an assignment
  Parameters: assignmentId (REQUIRED - from course_assignments result)
  Result: Submission list with status and grades
  
- "student_submission_detail_teacher": View a student's detailed submission
  Parameters: submissionId (REQUIRED - from assignment_submissions result)
  Result: Full submission with grades, AI analysis, and feedback

STATISTICS:
- "user_profile": Get your basic info
  Parameters: NONE
  
- "user_statistics": Get your statistics (courses, assignments, submissions)
  Parameters: NONE
  
- "grading_statistics": Get grading analytics
  Parameters: NONE

**SINGLE-STEP vs TWO-STEP QUERIES:**

course_assignments is smart - you can use it TWO WAYS:

Option 1 - List ALL assignments across ALL courses (SINGLE STEP):
  Query: "course_assignments" with NO params
  Result: All assignments from all your courses with courseNames
  
Option 2 - List assignments in a SPECIFIC course (DETAILED):
  Query: "course_assignments" with courseId: "course-123"
  Result: Detailed assignments just for that course

**FLOW EXAMPLES:**

User asks: "Show me all assignments in my courses"
→ Query "course_assignments" with NO params → get ALL assignments → DONE (1 step!)

User asks: "Show me assignments in Data Structures course"
→ Step 1: Query "teacher_courses" → find course with name "Data Structures" → get courseId
→ Step 2: Query "course_assignments" with that courseId → get detailed assignments

User asks: "Who submitted assignment X?":
→ Step 1: Query "assignment_submissions" with assignmentId → get submissionIds
→ Step 2: Query "student_submission_detail_teacher" for each submission → get details

User asks: "Show me student 'Junjie's progress":
→ Step 1: Query "teacher_courses" → get courseIds
→ Step 2: For each course, query "course_students" → find 'Junjie' by name → get studentId
→ Step 3: Query relevant assignment/submission data for that studentId
`,
      inputSchema: z.object({
        queryType: teacherQueryTypeEnum.describe('Teacher query type - use ONLY teacher queries (teacher_courses, course_detail, course_students, etc.)'),
        params: z.record(z.any()).optional().describe('Query parameters like courseId, assignmentId, submissionId, etc. REQUIRED params depend on queryType - check usage flow above'),
      }),
      execute: async (input: { queryType: TeacherQueryType; params?: Record<string, any> }): Promise<DatabaseQueryResponse> => {
        logger.info(
          { 
            queryType: input.queryType, 
            hasParams: !!input.params,
            teacherId: userId || 'UNDEFINED'
          },
          '[Grading Agent V3] Teacher database_query tool called'
        );
        
        if (input.params) {
          logger.debug(
            { queryType: input.queryType, params: JSON.stringify(input.params) },
            '[Grading Agent V3] Teacher query parameters'
          );
        }

        try {
          const result = await executeDatabaseQuery(input.queryType as QueryType, { 
            teacherId: userId,
            ...input.params 
          });

          if (!result.success) {
            logger.warn(
              { 
                queryType: input.queryType, 
                error: result.error,
              },
              '[Grading Agent V3] Teacher database_query failed'
            );

            return {
              success: false,
              error: result.error,
            };
          }

          return {
            success: true,
            queryType: input.queryType as QueryType,
            data: result.data,
          };
        } catch (error) {
          logger.error(
            { queryType: input.queryType, error: error instanceof Error ? error.message : String(error) },
            '[Grading Agent V3] Teacher database_query failed'
          );
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      },
    }),
    generate_report: tool({
      description: `Generate a comprehensive PDF learning report for a student including their courses, assignments, grades, and performance analytics with visualizations.

      This tool will:
      1. Query the database for the student's data (courses, assignments, submissions, grades)
      2. Generate statistical analysis and insights
      3. Create visualizations (charts) using Chart.js
      4. Produce a professional HTML report
      5. Convert it to PDF using Puppeteer

      Use this tool when a teacher asks to:
      - "Generate a report for this student"
      - "Create a PDF report for Jun Jie"
      - "I want to see a detailed report of a student's progress"`,
      inputSchema: z.object({
        studentId: z.string().describe('The student user ID'),
        includeCharts: z.boolean().default(true).describe('Whether to include visualizations/charts'),
      }),
      execute: async (input: { studentId: string; includeCharts?: boolean }): Promise<ReportGenerationResponse> => {
        logger.info(
          { studentId: input.studentId, includeCharts: input.includeCharts },
          '[Grading Agent V3] Generate report tool called'
        );

        try {
          // Step 1: Query all necessary data from database
          const [userProfile, userStats, studentCourses, studentSubmissions, gradingStats] = await Promise.all([
            executeDatabaseQuery('user_profile', { userId: input.studentId }),
            executeDatabaseQuery('user_statistics', { userId: input.studentId }),
            executeDatabaseQuery('student_courses', { studentId: input.studentId }),
            executeDatabaseQuery('student_submissions', { studentId: input.studentId, limit: 100 }),
            executeDatabaseQuery('grading_statistics', { userId: input.studentId }),
          ]);

          // Check if queries were successful
          if (!userProfile.success || !studentCourses.success) {
            return {
              success: false,
              error: 'Failed to query student data from database',
              message: 'Unable to generate report. The student might not exist or data is unavailable.',
            };
          }

          // Extract data arrays from query results with proper typing
          const coursesData = studentCourses.data as StudentCoursesData | undefined;
          const submissionsData = studentSubmissions.data as StudentSubmissionsData | undefined;

          logger.info(
            {
              coursesCount: coursesData?.courses?.length || 0,
              submissionsCount: submissionsData?.submissions?.length || 0,
            },
            '[Grading Agent V3] Data queried successfully'
          );

          // Step 2: Generate chart configurations if requested
          let chartConfigs: ChartConfiguration[] = [];

          if (input.includeCharts && submissionsData?.submissions && submissionsData.submissions.length > 0) {
            // Use Gemini to extract chart data from submissions
            const { object: chartData } = await generateObject({
              model: gemini('gemini-2.5-flash'),
              schema: z.object({
                chartConfigurations: z.array(
                  z.object({
                    type: z.enum(['bar', 'line']).describe('The type of chart'),
                    labels: z.array(z.string()).describe('Chart labels'),
                    data: z.array(z.number()).describe('Chart data points'),
                    label: z.string().describe('Chart dataset label'),
                    colors: z.array(z.string()).describe('Chart colors in rgba format'),
                  })
                ),
              }),
              prompt: `Given the following student submission and grading data, create 2-3 meaningful charts to visualize:
              1. Grade distribution across assignments
              2. Performance trend over time
              3. Comparison with class average (if available)

              Student Data:
              - Courses: ${JSON.stringify(coursesData)}
              - Submissions: ${JSON.stringify(submissionsData)}
              - Statistics: ${JSON.stringify(gradingStats.data)}

              Generate chart configurations with appropriate labels, data, and colors.`,
            });

            // Convert to Chart.js format
            chartConfigs = chartData.chartConfigurations.map((config) => ({
              type: config.type,
              data: {
                labels: config.labels,
                datasets: [
                  {
                    label: config.label,
                    data: config.data,
                    borderWidth: 1,
                    ...(config.type === 'bar' && { backgroundColor: config.colors }),
                    ...(config.type === 'line' && config.colors.length > 0 && { borderColor: config.colors[0] }),
                  },
                ],
              },
              options: {
                animation: { duration: 0 },
                responsive: true,
                maintainAspectRatio: false,
              },
            }));

            logger.info(
              { chartsGenerated: chartConfigs.length },
              '[Grading Agent V3] Chart configurations generated'
            );
          }

          // Step 3: Generate HTML report using Gemini
          const { text: htmlReport } = await generateText({
            model: gemini('gemini-2.5-flash'),
            prompt: `You are an expert educational report writer.
            Generate a comprehensive, professional HTML learning report for a student.

            **Instructions:**
            1. Create a complete HTML document with proper structure and UTF-8 charset
            2. IMPORTANT: Add Chinese font support in CSS with: font-family: 'Noto Sans', 'Noto Sans CJK TC', 'WenQuanYi Zen Hei', 'Microsoft YaHei', 'Arial', sans-serif;
            3. Use modern, clean CSS styling embedded in <style> tag:
              - Background: light neutral color, content in white boxes
              - Headings: bold and clear
              - Tables and charts: centered, with adequate spacing
              - Use subtle borders, shadows, and spacing for sections
            4. Include the student's profile, course list, performance summary, and insights
            5. If charts are provided, create <canvas> elements and <script> blocks to render them
            6. Provide actionable insights and recommendations for improvement
            7. Use a professional, encouraging tone, highlighting strengths and providing constructive feedback.
            8. Include proper headings, sections, and formatting
            9. Make sure all sections are visually distinct and easy to read.
            10. Ensure charts use readable colors, proper labels, and responsive sizing.

            **Chart Rendering:**
            ${
              input.includeCharts
                ? `
            Include this script in the head: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            For each chart, use:
            <div style="width: 100%; max-width: 800px; height: 400px; margin: 20px auto;">
              <canvas id="chartX"></canvas>
            </div>
            <script>
              new Chart(document.getElementById('chartX'), chartConfigX);
            </script>
            `
                : ''
            }

            **Student Data:**
            - Profile: ${JSON.stringify(userProfile.data)}
            - Statistics: ${JSON.stringify(userStats.data)}
            - Courses: ${JSON.stringify(coursesData)}
            - Recent Submissions: ${JSON.stringify(submissionsData?.submissions?.slice(0, 10) || [])}
            - Grading Stats: ${JSON.stringify(gradingStats.data)}
            ${input.includeCharts ? `- Chart Configurations: ${JSON.stringify(chartConfigs)}` : ''}

            **Report Sections:**
            1. Header with student name and report date
            2. Executive Summary
            3. Course Overview
            4. Performance Analysis ${input.includeCharts ? '(with charts)' : ''}
            5. Strengths and Areas for Improvement
            6. Recommendations

            Return only the raw HTML code, no markdown code blocks.`,
          });

          // Clean up potential markdown wrapper
          const finalHtml = htmlReport.replace(/^```html\n/, '').replace(/\n```$/, '');

          // Step 4: Generate PDF using Puppeteer
          const timestamp = Date.now();
          const pdfFileName = `student-report-${input.studentId}-${timestamp}.pdf`;

          // Use temporary directory for PDF generation
          const tmpDir = tmpdir();
          const pdfPath = path.join(tmpDir, pdfFileName);

          logger.info({ pdfPath }, '[Grading Agent V3] Generating PDF');

          const browser = await puppeteer.launch({
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
          });

          const page = await browser.newPage();
          await page.setContent(finalHtml, { waitUntil: 'networkidle0' });

          await page.pdf({
            path: pdfPath,
            format: 'A4',
            printBackground: true,
            margin: {
              top: '20mm',
              right: '15mm',
              bottom: '20mm',
              left: '15mm',
            },
          });

          await browser.close();

          const fileSize = (await fs.stat(pdfPath)).size;
          logger.info({ pdfPath, fileSize }, '[Grading Agent V3] PDF generated successfully');

          // Step 5: Upload to MinIO
          const storageKey = `reports/${input.studentId}/${pdfFileName}`;
          const pdfBuffer = await fs.readFile(pdfPath);

          await uploadToStorage(pdfBuffer, storageKey, 'application/pdf');

          logger.info({ storageKey, fileSize }, '[Grading Agent V3] PDF uploaded to storage');

          // Clean up temporary file
          await fs.unlink(pdfPath);

          // Step 6: Generate download URL with proper 'key' parameter
          const downloadUrl = `/api/reports/download?key=${encodeURIComponent(storageKey)}`;

          return {
            success: true,
            message: 'Learning report generated successfully',
            downloadUrl,
            pdfFileName,
            storageKey,
            reportSections: {
              hasProfile: !!userProfile.data,
              coursesCount: coursesData?.courses?.length || 0,
              submissionsCount: submissionsData?.submissions?.length || 0,
              chartsCount: chartConfigs.length,
            },
          };
        } catch (error) {
          logger.error(
            {
              studentId: input.studentId,
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            },
            '[Grading Agent V3] Generate report failed'
          );
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            message: 'Failed to generate report',
          };
        }
      },
    }),
  } satisfies ToolSet;

  return new ToolLoopAgent({
    model: gemini('gemini-2.5-flash'), // Start with fast model
    instructions: buildTeacherSystemPrompt(userId),
    tools: teacherTools,
    stopWhen: stepCountIs(15),
    callOptionsSchema: teacherCallOptionsSchema,
    prepareStep: async ({ stepNumber, steps, messages, model }) => {
      rateLimitState.totalStepsExecuted = stepNumber;
      rateLimitState.requestsInCurrentMinute++;

      const stepInfo = {
        stepNumber,
        messageCount: messages.length,
        previousStepCount: steps.length,
        rateLimitState: {
          requestsThisMinute: rateLimitState.requestsInCurrentMinute,
          proUsed: rateLimitState.proRequestsUsed,
          flashUsed: rateLimitState.flashRequestsUsed,
        },
      };

      logger.debug('[Grading Agent V3] Teacher prepareStep START', stepInfo);

      // ============================================================================
      // PHASE 1: Initial Query Phase (steps 0-2) - Always Flash (cheap queries)
      // - Find student by querying teacher_courses and course_students
      // - Allow agent to decide when to call tools
      // ============================================================================
      if (stepNumber <= 2) {
        logger.info('[Grading Agent V3] Teacher Phase 1 (Initial Query)', {
          stepNumber,
          phase: 'finding_student',
          modelUsed: 'flash',
          reason: 'Simple database queries - Flash sufficient',
        });

        let enhancedSystem = buildTeacherSystemPrompt(userId);
        enhancedSystem += `

**PHASE 1 - FINDING STUDENT (Using efficient model):**
Your goal in these first steps is to find the student the teacher is asking about.
1. Query "teacher_courses" to get all courses
2. For each course, query "course_students" to find the student by name
3. Report the studentId when found

Use ONLY database_query tool in this phase.`;

        rateLimitState.flashRequestsUsed++;

        logger.debug('[Grading Agent V3] Teacher Phase 1 returning', {
          stepNumber,
          modelSelected: 'gemini-2.5-flash',
          toolsAllowed: ['database_query'],
        });

        return {
          model: gemini('gemini-2.5-flash'), // Always Flash for queries
          system: enhancedSystem,
          activeTools: ['database_query'],
        };
      }

      // ============================================================================
      // PHASE 2: Analysis Phase (steps 3-5) - Always Flash (more queries)
      // - Get detailed submission data
      // - Still just reading from DB, no complex reasoning needed
      // ============================================================================
      if (stepNumber >= 3 && stepNumber <= 5) {
        logger.info('[Grading Agent V3] Teacher Phase 2 (Analysis)', {
          stepNumber,
          phase: 'analyzing_data',
          modelUsed: 'flash',
          reason: 'Database queries for student data - Flash sufficient',
        });

        let enhancedSystem = buildTeacherSystemPrompt(userId);
        enhancedSystem += `

**PHASE 2 - ANALYZING STUDENT DATA (Using efficient queries):**
You have already identified the student. Now analyze their performance:
1. Query course details and assignments they're enrolled in
2. Get their submission history
3. Analyze their grades and progress

Use efficient queries to gather all necessary data.`;

        rateLimitState.flashRequestsUsed++;

        logger.debug('[Grading Agent V3] Teacher Phase 2 returning', {
          stepNumber,
          modelSelected: 'gemini-2.5-flash',
          toolsAllowed: ['database_query'],
        });

        return {
          model: gemini('gemini-2.5-flash'), // Still Flash for more queries
          system: enhancedSystem,
          activeTools: ['database_query'],
        };
      }

      // ============================================================================
      // PHASE 3: Report Generation Phase (steps 6+)
      // - Can use Pro IF rate limits allow, otherwise use Flash
      // - This is where Pro would be most valuable
      // ============================================================================
      if (stepNumber >= 6) {
        const useProModel = shouldUseProModel();

        logger.info('[Grading Agent V3] Teacher Phase 3 (Report Generation)', {
          stepNumber,
          phase: 'generating_report',
          modelRecommended: useProModel ? 'pro' : 'flash',
          reason: useProModel
            ? 'Complex analysis task + rate limit available'
            : 'Rate limit approaching - falling back to Flash',
          rateLimitStatus: {
            proUsed: rateLimitState.proRequestsUsed,
            flashUsed: rateLimitState.flashRequestsUsed,
            requestsThisMinute: rateLimitState.requestsInCurrentMinute,
          },
        });

        let enhancedSystem = buildTeacherSystemPrompt(userId);
        enhancedSystem += `

**PHASE 3 - GENERATING COMPREHENSIVE REPORT:**
You have all the student data. Now generate a professional PDF report.
Use the generate_report tool with the studentId you found.
${
          useProModel
            ? 'This is a complex task - use advanced reasoning for comprehensive analysis.'
            : 'Generate the report efficiently using available context.'
        }`;

        const selectedModel = useProModel ? gemini('gemini-2.5-pro') : gemini('gemini-2.5-flash');

        if (useProModel) {
          rateLimitState.proRequestsUsed++;
        } else {
          rateLimitState.flashRequestsUsed++;
        }

        logger.debug('[Grading Agent V3] Teacher Phase 3 returning', {
          stepNumber,
          modelSelected: useProModel ? 'gemini-2.5-pro' : 'gemini-2.5-flash',
          toolsAllowed: ['database_query', 'generate_report'],
          rateLimitStateAfter: {
            proUsed: rateLimitState.proRequestsUsed,
            flashUsed: rateLimitState.flashRequestsUsed,
          },
        });

        return {
          model: selectedModel,
          system: enhancedSystem,
          activeTools: ['database_query', 'generate_report'],
        };
      }

      // ============================================================================
      // Context Management - Keep conversation within token limits
      // ============================================================================
      if (messages.length > 25) {
        logger.info('[Grading Agent V3] Teacher pruning messages', {
          stepNumber,
          beforeCount: messages.length,
          afterCount: 13,
          reason: 'Token optimization - keeping system + recent messages',
        });

        return {
          messages: [
            messages[0], // Keep system message
            ...messages.slice(-12), // Keep last 12 messages
          ],
        };
      }

      logger.debug('[Grading Agent V3] Teacher prepareStep END - no changes', stepInfo);
      
      // Extract and log thinking from previous steps for UI display
      if (steps.length > 0) {
        const lastStep = steps[steps.length - 1];
        const toolsUsed = lastStep.toolCalls?.map(c => c.toolName) || [];
        
        if (toolsUsed.length > 0) {
          logger.info('[Grading Agent V3] Teacher Step Thinking', {
            stepNumber: steps.length - 1,
            toolsUsed,
            timestamp: Date.now(),
          });
        }
      }
      
      return {};
    },
  });
}

/**
 * Create a ToolLoopAgent instance for STUDENT
 * Includes: database_query tool only (read-only student data)
 * Supports dynamic configuration via callOptions
 */
function createStudentAgent(userId: string | undefined) {
  const studentTools = {
    database_query: tool({
      description: `Query the grading system database to retrieve your learning analytics and course information.

**STUDENT-SPECIFIC QUERIES (READ-ONLY):**

Course & Assignment Info:
- "student_courses": Get all enrolled courses
- "student_assignments": Get all assignments in a specific course
- "enrolled_course_detail": Get details about an enrolled course

Submissions & Grades:
- "student_submissions": List all your submissions (contains submissionId!)
- "my_submission_detail": Get detailed submission data with grades, feedback, timestamps
- "pending_assignments": Get unsubmitted assignments (use to identify urgent work)

Statistics:
- "user_profile": Get your basic info
- "user_statistics": Get your learning statistics

**MULTI-STEP ANALYSIS FLOW:**

To perform deep analysis (grades trends, submission speed, workload prediction):

1. "student_courses" → get all courseIds
2. "student_submissions" → get ALL submissionIds and basic info
3. "my_submission_detail" (submissionId from step 2) → get timestamps, grades, feedback
4. "pending_assignments" → see what's due
5. ANALYZE: correlate data to identify patterns

**KEY INSIGHT - Getting Detailed Submissions:**
- "student_assignments" only lists assignment info
- "student_submissions" lists submissions WITH submissionId
- Use submissionId from "student_submissions" with "my_submission_detail"
- Result: full analytics (grades, timestamps, AI analysis, teacher feedback)

**QUERY PARAMETER GUIDE:**

1. "student_courses" → params: {} (system auto-uses your studentId)
2. "student_assignments" → params: { courseId: "..." } (from student_courses result)
3. "enrolled_course_detail" → params: { courseId: "..." } (from student_courses result)
4. "student_submissions" → params: {} (system auto-uses your studentId)
5. "my_submission_detail" → params: { submissionId: "..." } (from student_submissions result)
6. "pending_assignments" → params: {} (system auto-uses your studentId)
7. "user_statistics" → params: {} (system auto-uses your studentId)
8. "user_profile" → params: {} (no params needed)`,
      inputSchema: z.object({
        queryType: studentQueryTypeEnum.describe('Student query type - use ONLY student queries (student_courses, student_submissions, my_submission_detail, etc.)'),
        params: z.record(z.any()).optional().describe('Query parameters like courseId, submissionId, etc.'),
      }),
      execute: async (input: { queryType: StudentQueryType; params?: Record<string, any> }): Promise<DatabaseQueryResponse> => {
        logger.info(
          { 
            queryType: input.queryType, 
            hasParams: !!input.params,
            studentId: userId || 'UNDEFINED'
          },
          '[Grading Agent V3] Student database_query tool called'
        );

        // Debug log for detailed params
        if (input.params) {
          logger.debug(
            { queryType: input.queryType, params: JSON.stringify(input.params) },
            '[Grading Agent V3] Student query parameters'
          );
        }

        try {
          const result = await executeDatabaseQuery(input.queryType as QueryType, { 
            studentId: userId,
            ...input.params 
          });

          if (!result.success) {
            return {
              success: false,
              error: result.error,
            };
          }

          return {
            success: true,
            queryType: input.queryType as QueryType,
            data: result.data,
          };
        } catch (error) {
          logger.error(
            { queryType: input.queryType, error: error instanceof Error ? error.message : String(error) },
            '[Grading Agent V3] Student database_query failed'
          );
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      },
    }),
    generate_report: tool({
      description: `Generate your personal comprehensive PDF learning report including all your courses, assignments, grades, and performance analytics with visualizations.

      This tool will:
      1. Query your data (courses, assignments, submissions, grades)
      2. Generate statistical analysis and insights
      3. Create visualizations (charts) using Chart.js
      4. Produce a professional HTML report
      5. Convert it to PDF

      Use this tool when you want to:
      - "Generate my learning report"
      - "Create a PDF report of my progress"
      - "Show me my semester summary"
      - "I want a detailed report of my grades and performance"`,
      inputSchema: z.object({
        includeCharts: z.boolean().default(true).describe('Whether to include visualizations/charts'),
      }),
      execute: async (input: { includeCharts?: boolean }): Promise<ReportGenerationResponse> => {
        if (!userId) {
          return {
            success: false,
            error: 'Student ID not available',
            message: 'Unable to generate report. Student context is missing.',
          };
        }

        logger.info(
          { studentId: userId, includeCharts: input.includeCharts },
          '[Grading Agent V3] Student generate report tool called'
        );

        try {
          // Step 1: Query all necessary data from database
          const [userProfile, userStats, studentCourses, studentSubmissions, gradingStats] = await Promise.all([
            executeDatabaseQuery('user_profile', { userId }),
            executeDatabaseQuery('user_statistics', { userId }),
            executeDatabaseQuery('student_courses', { studentId: userId }),
            executeDatabaseQuery('student_submissions', { studentId: userId, limit: 100 }),
            executeDatabaseQuery('grading_statistics', { userId }),
          ]);

          // Check if queries were successful
          if (!userProfile.success || !studentCourses.success) {
            return {
              success: false,
              error: 'Failed to query your data from database',
              message: 'Unable to generate report. Data is unavailable.',
            };
          }

          // Extract data arrays from query results with proper typing
          const coursesData = studentCourses.data as StudentCoursesData | undefined;
          const submissionsData = studentSubmissions.data as StudentSubmissionsData | undefined;

          logger.info(
            {
              coursesCount: coursesData?.courses?.length || 0,
              submissionsCount: submissionsData?.submissions?.length || 0,
            },
            '[Grading Agent V3] Student data queried successfully'
          );

          // Step 2: Generate chart configurations if requested
          let chartConfigs: ChartConfiguration[] = [];

          if (input.includeCharts && submissionsData?.submissions && submissionsData.submissions.length > 0) {
            // Use Gemini to extract chart data from submissions
            const { object: chartData } = await generateObject({
              model: gemini('gemini-2.5-flash'),
              schema: z.object({
                chartConfigurations: z.array(
                  z.object({
                    type: z.enum(['bar', 'line']).describe('The type of chart'),
                    labels: z.array(z.string()).describe('Chart labels'),
                    data: z.array(z.number()).describe('Chart data points'),
                    label: z.string().describe('Chart dataset label'),
                    colors: z.array(z.string()).describe('Chart colors in rgba format'),
                  })
                ),
              }),
              prompt: `Given the following student submission and grading data, create 2-3 meaningful charts to visualize:
              1. Grade distribution across assignments
              2. Performance trend over time
              3. Comparison with class average (if available)

              Student Data:
              - Courses: ${JSON.stringify(coursesData)}
              - Submissions: ${JSON.stringify(submissionsData)}
              - Statistics: ${JSON.stringify(gradingStats.data)}

              Generate chart configurations with appropriate labels, data, and colors.`,
            });

            // Convert to Chart.js format
            chartConfigs = chartData.chartConfigurations.map((config) => ({
              type: config.type,
              data: {
                labels: config.labels,
                datasets: [
                  {
                    label: config.label,
                    data: config.data,
                    borderWidth: 1,
                    ...(config.type === 'bar' && { backgroundColor: config.colors }),
                    ...(config.type === 'line' && config.colors.length > 0 && { borderColor: config.colors[0] }),
                  },
                ],
              },
              options: {
                animation: { duration: 0 },
                responsive: true,
                maintainAspectRatio: false,
              },
            }));

            logger.info(
              { chartsGenerated: chartConfigs.length },
              '[Grading Agent V3] Student chart configurations generated'
            );
          }

          // Step 3: Generate HTML report using Gemini
          const { text: htmlReport } = await generateText({
            model: gemini('gemini-2.5-flash'),
            prompt: `You are an expert educational report writer.
            Generate a comprehensive, professional HTML learning report for a student.

            **Instructions:**
            1. Create a complete HTML document with proper structure and UTF-8 charset
            2. IMPORTANT: Add Chinese font support in CSS with: font-family: 'Noto Sans', 'Noto Sans CJK TC', 'WenQuanYi Zen Hei', 'Microsoft YaHei', 'Arial', sans-serif;
            3. Use modern, clean CSS styling embedded in <style> tag:
              - Background: light neutral color, content in white boxes
              - Headings: bold and clear
              - Tables and charts: centered, with adequate spacing
              - Use subtle borders, shadows, and spacing for sections
            4. Include the student's profile, course list, performance summary, and insights
            5. If charts are provided, create <canvas> elements and <script> blocks to render them
            6. Provide actionable insights and recommendations for improvement
            7. Use a professional, encouraging tone, highlighting strengths and providing constructive feedback.
            8. Include proper headings, sections, and formatting
            9. Make sure all sections are visually distinct and easy to read.
            10. Ensure charts use readable colors, proper labels, and responsive sizing.

            **Chart Rendering:**
            ${
              input.includeCharts
                ? `
            Include this script in the head: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            For each chart, use:
            <div style="width: 100%; max-width: 800px; height: 400px; margin: 20px auto;">
              <canvas id="chartX"></canvas>
            </div>
            <script>
              new Chart(document.getElementById('chartX'), chartConfigX);
            </script>
            `
                : ''
            }

            **Student Data:**
            - Profile: ${JSON.stringify(userProfile.data)}
            - Statistics: ${JSON.stringify(userStats.data)}
            - Courses: ${JSON.stringify(coursesData)}
            - Recent Submissions: ${JSON.stringify(submissionsData?.submissions?.slice(0, 10) || [])}
            - Grading Stats: ${JSON.stringify(gradingStats.data)}
            ${input.includeCharts ? `- Chart Configurations: ${JSON.stringify(chartConfigs)}` : ''}

            **Report Sections:**
            1. Header with student name and report date
            2. Executive Summary
            3. Course Overview
            4. Performance Analysis ${input.includeCharts ? '(with charts)' : ''}
            5. Strengths and Areas for Improvement
            6. Recommendations

            Return only the raw HTML code, no markdown code blocks.`,
          });

          // Clean up potential markdown wrapper
          const finalHtml = htmlReport.replace(/^```html\n/, '').replace(/\n```$/, '');

          // Step 4: Generate PDF using Puppeteer
          const timestamp = Date.now();
          const pdfFileName = `student-report-${userId}-${timestamp}.pdf`;

          // Use temporary directory for PDF generation
          const tmpDir = tmpdir();
          const pdfPath = path.join(tmpDir, pdfFileName);

          logger.info({ pdfPath }, '[Grading Agent V3] Student generating PDF');

          const browser = await puppeteer.launch({
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
          });

          const page = await browser.newPage();
          await page.setContent(finalHtml, { waitUntil: 'networkidle0' });

          await page.pdf({
            path: pdfPath,
            format: 'A4',
            printBackground: true,
            margin: {
              top: '20mm',
              right: '15mm',
              bottom: '20mm',
              left: '15mm',
            },
          });

          await browser.close();

          const fileSize = (await fs.stat(pdfPath)).size;
          logger.info({ pdfPath, fileSize }, '[Grading Agent V3] Student PDF generated successfully');

          // Step 5: Upload to MinIO
          const storageKey = `reports/${userId}/${pdfFileName}`;
          const pdfBuffer = await fs.readFile(pdfPath);

          await uploadToStorage(pdfBuffer, storageKey, 'application/pdf');

          logger.info({ storageKey, fileSize }, '[Grading Agent V3] Student PDF uploaded to storage');

          // Clean up temporary file
          await fs.unlink(pdfPath);

          // Step 6: Generate download URL with proper 'key' parameter
          const downloadUrl = `/api/reports/download?key=${encodeURIComponent(storageKey)}`;

          return {
            success: true,
            message: 'Your learning report has been generated successfully',
            downloadUrl,
            pdfFileName,
            storageKey,
            reportSections: {
              hasProfile: !!userProfile.data,
              coursesCount: coursesData?.courses?.length || 0,
              submissionsCount: submissionsData?.submissions?.length || 0,
              chartsCount: chartConfigs.length,
            },
          };
        } catch (error) {
          logger.error(
            {
              studentId: userId,
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            },
            '[Grading Agent V3] Student generate report failed'
          );
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            message: 'Failed to generate your report',
          };
        }
      },
    }),
  } satisfies ToolSet;

  return new ToolLoopAgent({
    model: gemini('gemini-2.5-flash'),
    instructions: buildStudentSystemPrompt(userId),
    tools: studentTools,
    stopWhen: stepCountIs(15),
    callOptionsSchema: studentCallOptionsSchema,
    prepareStep: async ({ stepNumber, steps, messages, model }) => {
      rateLimitState.totalStepsExecuted = stepNumber;
      rateLimitState.requestsInCurrentMinute++;

      const stepInfo = {
        stepNumber,
        messageCount: messages.length,
        previousStepCount: steps.length,
        rateLimitState: {
          requestsThisMinute: rateLimitState.requestsInCurrentMinute,
          proUsed: rateLimitState.proRequestsUsed,
          flashUsed: rateLimitState.flashRequestsUsed,
        },
      };

      logger.debug('[Grading Agent V3] Student prepareStep START', stepInfo);

      // ============================================================================
      // PHASE 1: Data Gathering Phase (steps 0-2) - Always Flash (efficient queries)
      // - Query courses, assignments, submissions
      // - Allow agent freedom to call tools as needed
      // ============================================================================
      if (stepNumber <= 2) {
        logger.info('[Grading Agent V3] Student Phase 1 (Data Gathering)', {
          stepNumber,
          phase: 'gathering_data',
          modelUsed: 'flash',
          reason: 'Simple database queries - Flash efficient and fast',
        });

        let enhancedSystem = buildStudentSystemPrompt(userId);
        enhancedSystem += `

**PHASE 1 - GATHERING YOUR DATA (Using efficient queries):**
Start by collecting your learning information:
1. Query your enrolled courses
2. Get your assignments and submissions
3. Check pending work and grades

This phase focuses on data collection using database queries only.`;

        rateLimitState.flashRequestsUsed++;

        logger.debug('[Grading Agent V3] Student Phase 1 returning', {
          stepNumber,
          modelSelected: 'gemini-2.5-flash',
          toolsAllowed: ['database_query'],
        });

        return {
          model: gemini('gemini-2.5-flash'),
          system: enhancedSystem,
          activeTools: ['database_query'],
        };
      }

      // ============================================================================
      // PHASE 2: Analysis Phase (steps 3-6) - Always Flash (deep queries)
      // - Get detailed submission analysis
      // - Query my_submission_detail for specific submissions
      // ============================================================================
      if (stepNumber >= 3 && stepNumber <= 6) {
        logger.info('[Grading Agent V3] Student Phase 2 (Deep Analysis)', {
          stepNumber,
          phase: 'analyzing_submissions',
          modelUsed: 'flash',
          reason: 'Detailed queries - Flash sufficient for data retrieval',
        });

        let enhancedSystem = buildStudentSystemPrompt(userId);
        enhancedSystem += `

**PHASE 2 - ANALYZING YOUR PERFORMANCE (Using efficient queries):**
Now perform deep analysis on your data:
1. Get detailed information about key submissions using "my_submission_detail"
2. Analyze grade trends across courses
3. Identify patterns in your performance

Continue using database_query for detailed analysis.`;

        rateLimitState.flashRequestsUsed++;

        logger.debug('[Grading Agent V3] Student Phase 2 returning', {
          stepNumber,
          modelSelected: 'gemini-2.5-flash',
          toolsAllowed: ['database_query'],
        });

        return {
          model: gemini('gemini-2.5-flash'),
          system: enhancedSystem,
          activeTools: ['database_query'],
        };
      }

      // ============================================================================
      // PHASE 3: Report Generation Phase (steps 7+)
      // - Can use Pro IF rate limits allow, otherwise use Flash
      // - This is where advanced analysis would help most
      // ============================================================================
      if (stepNumber >= 7) {
        const useProModel = shouldUseProModel();

        logger.info('[Grading Agent V3] Student Phase 3 (Report Generation)', {
          stepNumber,
          phase: 'generating_report',
          modelRecommended: useProModel ? 'pro' : 'flash',
          reason: useProModel
            ? 'Complex PDF generation + rate limit available'
            : 'Rate limit approaching - falling back to Flash',
          rateLimitStatus: {
            proUsed: rateLimitState.proRequestsUsed,
            flashUsed: rateLimitState.flashRequestsUsed,
            requestsThisMinute: rateLimitState.requestsInCurrentMinute,
          },
        });

        let enhancedSystem = buildStudentSystemPrompt(userId);
        enhancedSystem += `

**PHASE 3 - GENERATING YOUR REPORT:**
You have gathered and analyzed all data. Now generate your comprehensive learning report.
Use the generate_report tool to create a professional PDF with:
- Your complete course overview
- Grade analysis and trends
- Performance insights
- Recommendations for improvement

${
          useProModel
            ? 'This is a complex task - use advanced reasoning for comprehensive insights.'
            : 'Generate the report efficiently using your gathered data.'
        }`;

        const selectedModel = useProModel ? gemini('gemini-2.5-pro') : gemini('gemini-2.5-flash');

        if (useProModel) {
          rateLimitState.proRequestsUsed++;
        } else {
          rateLimitState.flashRequestsUsed++;
        }

        logger.debug('[Grading Agent V3] Student Phase 3 returning', {
          stepNumber,
          modelSelected: useProModel ? 'gemini-2.5-pro' : 'gemini-2.5-flash',
          toolsAllowed: ['database_query', 'generate_report'],
          rateLimitStateAfter: {
            proUsed: rateLimitState.proRequestsUsed,
            flashUsed: rateLimitState.flashRequestsUsed,
          },
        });

        return {
          model: selectedModel,
          system: enhancedSystem,
          activeTools: ['database_query', 'generate_report'],
        };
      }

      // ============================================================================
      // Context Management - Keep conversation within token limits
      // ============================================================================
      if (messages.length > 25) {
        logger.info('[Grading Agent V3] Student pruning messages', {
          stepNumber,
          beforeCount: messages.length,
          afterCount: 13,
          reason: 'Token optimization - keeping system + recent messages',
        });

        return {
          messages: [
            messages[0], // Keep system message
            ...messages.slice(-12), // Keep last 12 messages
          ],
        };
      }

      logger.debug('[Grading Agent V3] Student prepareStep END - no changes', stepInfo);
      
      // Extract and log thinking from previous steps for UI display
      if (steps.length > 0) {
        const lastStep = steps[steps.length - 1];
        const toolsUsed = lastStep.toolCalls?.map(c => c.toolName) || [];
        
        if (toolsUsed.length > 0) {
          logger.info('[Grading Agent V3] Student Step Thinking', {
            stepNumber: steps.length - 1,
            toolsUsed,
            timestamp: Date.now(),
          });
        }
      }
      
      return {};
    },
  });
}

/**
 * Create appropriate agent based on user role
 */
function createGradingAgent(userRole: 'TEACHER' | 'STUDENT', userId: string | undefined) {
  if (userRole === 'TEACHER') {
    return createTeacherAgent(userId);
  }
  return createStudentAgent(userId);
}

/**
 * ============================================================================
 * MAIN EXPORT
 * ============================================================================
 */

/**
 * Stream the agent response with ToolLoopAgent
 * Supports both TEACHER and STUDENT roles with context-specific prompts
 * 
 * @param userRole - 'TEACHER' or 'STUDENT'
 * @param messages - Chat messages
 * @param userId - User ID
 * @param callOptions - Optional dynamic configuration (teacher or student options)
 */
export async function streamWithGradingAgent(
  userRole: 'TEACHER' | 'STUDENT',
  messages: any[],
  userId?: string,
  callOptions?: TeacherCallOptions | StudentCallOptions
) {
  const sessionId = `${userRole}_${userId}_${Date.now()}`;
  
  logger.info('[Grading Agent V3] Initializing agent stream', {
    userRole,
    messageCount: messages.length,
    userId: userId ? '***' : undefined,
    hasCallOptions: !!callOptions,
    sessionId,
  });

  try {
    // Create agent with role-specific configuration
    const agent = createGradingAgent(userRole, userId);

    logger.debug('[Grading Agent V3] Agent created successfully');

    // Stream the response
    logger.debug('[Grading Agent V3] Starting agent stream', { hasOptions: !!callOptions });
    const streamResult = await agent.stream({
      messages,
      options: callOptions || undefined,
    } as any);

    logger.debug('[Grading Agent V3] Agent stream completed');

    // Convert to UI stream response for client compatibility
    const uiStreamResponse = streamResult.toUIMessageStreamResponse();
    
    // Log thinking process for UI display
    logger.info('[Grading Agent V3] Stream response ready for UI', {
      sessionId,
      hasThinkingLog: stepThinkingLog.has(sessionId),
    });

    return uiStreamResponse;
  } catch (error) {
    logger.error('[Grading Agent V3] Fatal error in streamWithGradingAgent', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userRole,
      sessionId,
    });
    throw error;
  }
}

/**
 * Get thinking process for a session (for debugging/UI display)
 * Can be called after agent execution completes
 */
export function getStepThinkingLog(sessionId: string): StepThinking[] {
  return stepThinkingLog.get(sessionId) || [];
}

/**
 * Clear thinking log for a session
 */
export function clearStepThinkingLog(sessionId: string): void {
  stepThinkingLog.delete(sessionId);
}
