/**
 * Grading Platform Agent V3
 *
 * Uses Vercel AI SDK v6 ToolLoopAgent class (official stable pattern)
 * Simplified version using Gemini 2.5 Flash for all operations
 * Focuses on database queries and report generation for grading platform
 */

import { ToolLoopAgent, stepCountIs, type ToolSet, generateText, generateObject, type LanguageModel, convertToModelMessages } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { tool } from 'ai';
import logger from '@/utils/logger';

interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  [key: string]: any;
}
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

// vLLM / Ollama Configuration
const VLLM_CONFIG = {
  baseURL: process.env.VLLM_BASE_URL || '',
  modelName: process.env.VLLM_MODEL_NAME || '',
  apiKey: process.env.VLLM_API_KEY || '', // vLLM/Ollama usually ignores this, but SDK needs it
  timeoutMs: 1500, // 1.5s timeout for health check
};

/**
 * User Preference for Model Provider
 */
export type ModelProvider = 'gemini' | 'local' | 'auto';

/**
 * Resilient Model Factory (Session-Level Circuit Breaker)
 * 
 * Checks if vLLM is available before starting the session.
 * If available -> Returns vLLM model (Privacy & Local Compute)
 * If broken/timeout -> Returns Gemini model (Cloud Fallback)
 * 
 * Update: Supports user preference
 * - 'gemini': Force Gemini
 * - 'local': Force Local (Throws if unavailable)
 * - 'auto': Try Local, Fallback to Gemini
 */
async function selectResilientModel(sessionId: string, preferredProvider: ModelProvider = 'auto'): Promise<{ model: LanguageModel; provider: string }> {
  // 0. Check User Preference - specific overrides
  if (preferredProvider === 'gemini') {
    logger.info('[Model Factory] Using Gemini (User Preference)', { sessionId });
    return { 
      model: gemini('gemini-2.5-flash'), 
      provider: 'Gemini' 
    };
  }
  const start = Date.now();
  
  try {
    // 1. Health Check (Ping)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), VLLM_CONFIG.timeoutMs);
    
    logger.debug('[Model Factory] Checking vLLM health...', { url: VLLM_CONFIG.baseURL });

    // Use a lightweight call to check availability (list models)
    const response = await fetch(`${VLLM_CONFIG.baseURL}/models`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${VLLM_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (response.ok) {
      logger.info('[Model Factory] vLLM is HEALTHY. Using local model.', { 
        latency: Date.now() - start,
        model: VLLM_CONFIG.modelName 
      });

      const openai = createOpenAI({
        baseURL: VLLM_CONFIG.baseURL,
        apiKey: VLLM_CONFIG.apiKey,
      });

      // CRITICAL: Use openai.chat() NOT openai() to force /v1/chat/completions endpoint
      // Vercel AI SDK v6+ defaults to /v1/responses API, which vLLM doesn't fully support
      // vLLM returns 500 errors with 'role' validation failure on /v1/responses endpoint
      // Using .chat() ensures compatibility with vLLM's OpenAI-compatible chat completions API
      //
      // Tool call format is controlled by vLLM server configuration:
      // Server must be started with: --enable-auto-tool-choice --tool-call-parser hermes
      // This ensures OpenAI JSON tool calls instead of Qwen XML tags
      // See: docs/vllm-server-config.md for details
      
      logger.info('[Model Factory] Using vLLM with OpenAI-compatible endpoint', {
        model: VLLM_CONFIG.modelName,
        baseURL: VLLM_CONFIG.baseURL,
        endpoint: '/v1/chat/completions (forced via openai.chat())',
        note: 'Ensure vLLM is configured with --tool-call-parser hermes'
      });

      return { 
        model: openai.chat(VLLM_CONFIG.modelName), 
        provider: 'vLLM' 
      };
    } else {
      logger.warn('[Model Factory] vLLM returned error status', { status: response.status });
    }
  } catch (error) {
    logger.warn('[Model Factory] vLLM unreachable (Circuit Open)', { 
      error: error instanceof Error ? error.message : String(error),
      latency: Date.now() - start
    });
  }

    // 2. Fallback / Limit Logic
    if (preferredProvider === 'local') {
       logger.error('[Model Factory] vLLM unreachable but required by user preference', { sessionId });
       throw new Error('Local model is unreachable. Please check your connection or switch to Auto/Gemini mode.');
    }

  // 3. Fallback to Gemini (Auto mode or default)
  logger.info('[Model Factory] Falling back to Gemini 2.5 Flash', { sessionId });
  return { 
    model: gemini('gemini-2.5-flash'), 
    provider: 'Gemini' 
  };
}

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
  'assignment_detail_student', // Added for detailed assignment info
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

**Core Instructions:**
- Use the available tools to answer user questions.
- If you need data, call database_query immediately.

**Language Requirement:**
- **STRICTLY USE TRADITIONAL CHINESE (繁體中文)** for all responses.
- Do NOT use Simplified Chinese (简体中文).
- If the Context or Tools return Simplified Chinese, you MUST translate it to Traditional Chinese in your final response.

**Anti-Hallucination & Honest Fallback (CRITICAL):**
- **Verify Tools First:** Before answering, check if you have a tool that *actually* provides this information.

**Your Goal:**
Help teachers manage their courses by retrieving accurate data about students, assignments, and grades.

**Data Relationships & Tool Usage:**
- **Courses**: You teach specific courses. use "teacher_courses" to find them.
- **Assignments**: assignments belong to courses. Use "course_assignments" to list them.
- **Submissions**: students submit work to assignments. Use "assignment_submissions" to see who submitted.
- **Details**: "student_submission_detail_teacher" provides the full content, feedback and AI analysis for a specific submission.

**Thinking Process:**
1. Identify what data the user needs (e.g., "how is Junjie doing?").
2. Determine which tool provides that data (e.g., "I need his submissions").
3. Check if you have the required explicit IDs (courseId, assignmentId, etc.).
4. If ID is missing, query parent data first (e.g., query "course_students" to find Junjie's studentId).
5. Chain queries logically to reach the specific data point.
- "student_submission_detail_teacher" → A specific student's submission details
- "grading_statistics" → Overall grading analytics

**Available Tools:**
- database_query: Query course and grading information
- generate_report: Generate comprehensive PDF reports for student learning analytics

**Language Guidelines:**
- Prefer Traditional Chinese (繁體中文) with Taiwan-style expressions for local users
- Respect user's explicit language requests (e.g., "use English", "用日文回答")
- Adapt to the user's input language when appropriate
- Use friendly, warm, and encouraging tone`;
}



/**
 * Build system prompt for STUDENT
 */
function buildStudentSystemPrompt(userId: string | undefined): string {
  return `You are an AI assistant for the grading platform helping students with comprehensive learning analytics.

**Your Student ID: ${userId || 'unknown'}**

**Core Instructions:**
- Use the available tools to answer user questions.
- If you need data, call database_query immediately.

**Language Requirement:**
- **STRICTLY USE TRADITIONAL CHINESE (繁體中文)** for all responses.
- Do NOT use Simplified Chinese (简体中文).
- If the Context or Tools return Simplified Chinese, you MUST translate it to Traditional Chinese in your final response.

**Anti-Hallucination & Honest Fallback (CRITICAL):**
- **Scope Limitation:** You strictly see **ONLY your own data**. You cannot see other students' grades, submissions, or personal info.

**Your Goal:**
Act as a smart learning analytics assistant. Help students understand their progress, deadlines, and performance.

**Tool Capabilities & Data Relationships:**

1.  **Finding What to Do (Deadlines):**
    - "pending_assignments" is your primary tool for "what do I need to do?".
    - "student_assignments" lists ALL assignments (done and undone) but lacks details (rubrics).
    - "assignment_detail_student" provides the actual content/rubric.

2.  **Checking Performance (Grades):**
    - "student_submissions" lists your history but NOT the full feedback.
    - "my_submission_detail" is CRITICAL for seeing the actual Grade, Teacher Feedback, and AI Analysis.
    - **Principle**: If asked about "how did I do?", always drill down to 'my_submission_detail'.

3.  **Discovery (Courses):**
    - "student_courses" is the entry point to find courseIds.

**Autonomous Reasoning:**
- You are NOT a simple Q&A bot. You are an analyst.
- **Combine functions**: If a user asks "Am I improving?", one query isn't enough. You must fetch multiple submissions and compare them.
- **Self-Correction**: If 'student_assignments' doesn't show the rubric, realize you need 'assignment_detail_student' and call it.
- **Proactive Insights**: When reporting grades, also mention if they are trending up or down.

**Important:**
- precise "rubric" or "description" requires 'assignment_detail_student'.
- precise "feedback" or "score" requires 'my_submission_detail'.

**Available Tools:**
- database_query: Query your learning data
- generate_report: Generate your personal PDF learning report

**Language Guidelines:**
- Prefer Traditional Chinese (繁體中文) with Taiwan-style expressions for local users
- Respect user's explicit language requests (e.g., "use English", "用日文回答")
- Adapt to the user's input language when appropriate
- Use friendly, warm, and encouraging tone`;
}

/**
 * Create a ToolLoopAgent instance for TEACHER
 * Includes: database_query, generate_report tools (teacher-only access)
 * Supports dynamic configuration via callOptions
 */
/**
 * Create a ToolLoopAgent instance for TEACHER
 * Includes: database_query, generate_report tools (teacher-only access)
 * Supports dynamic configuration via callOptions
 */
function createTeacherAgent(userId: string | undefined, model: LanguageModel) {
  const teacherTools = {
    database_query: tool({
      description: `Query the grading system database to retrieve course and grading information.

      **YOU ARE A TEACHER - Remember:**
      - You query YOUR COURSES and YOUR STUDENTS
      - NOT your own assignments/grades (you're not a student)
      - If user asks "my pending assignments", that's a student question - clarify your role

**TEACHER-SPECIFIC QUERIES (READ-ONLY):**

**1. Hierarchy & Discovery:**
- "teacher_courses": Start here. Lists all courses you teach.
- "course_detail": Stats for a specific course.
- "course_students": Roster of a specific course.

**2. Assignments:**
- "course_assignments": Lists assignments.
  - param: 'courseId' -> Get assignments for that course.
  - no params -> Get ALL assignments across ALL your courses (Useful overview).
- "assignment_detail": Get the actual content/rubric of an assignment.

**3. Grading & Feedback:**
- "assignment_submissions": List who submitted what (status, grade).
- "student_submission_detail_teacher": **Deep Dive**. Get the actual text, AI analysis, and specific feedback for one submission.
- "grading_statistics": High-level dashboard stats.

**Usage Principle:**
You are an intelligent agent. If you don't have an ID (like 'assignmentId'), look for a parent object (like 'course_assignments') to find it.`,
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
    model: model, // Use selected resilient model
    tools: teacherTools,
    instructions: buildTeacherSystemPrompt(userId),
    stopWhen: stepCountIs(15),
    callOptionsSchema: teacherCallOptionsSchema,
    // Explicitly set toolChoice to 'auto' to ensure vLLM receives the correct signal
    prepareStep: async ({ stepNumber, steps, messages, model }) => {
      logger.debug('[Grading Agent V3] Teacher prepareStep', {
        stepNumber,
        messageCount: messages.length,
        previousStepCount: steps.length,
      });

      // Context Management - Keep conversation within token limits
      if (messages.length > 25) {
        logger.info('[Grading Agent V3] Teacher pruning messages', {
          stepNumber,
          beforeCount: messages.length,
          afterCount: 13,
          reason: 'Token optimization - keeping system + recent messages',
        });

        // Force language reminder even when pruning
        return {
          messages: [
            messages[0], // Keep system message
            ...messages.slice(-12), // Keep last 12 messages
            { 
              role: 'user', 
              content: 'IMPORTANT: You must output strictly in Traditional Chinese (繁體中文). Do not use Simplified Chinese.'
            }
          ],
          toolChoice: 'auto',
        };
      }

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
      
      // Inject language reminder to use Traditional Chinese
      return {
        messages: [
          ...messages,
          { 
            role: 'user', 
            content: 'IMPORTANT: You must output strictly in Traditional Chinese (繁體中文). Do not use Simplified Chinese.'
          }
        ],
        toolChoice: 'auto',
      };
    },
  });
}

/**
 * Create a ToolLoopAgent instance for STUDENT
 * Includes: database_query tool only (read-only student data)
 * Supports dynamic configuration via callOptions
 */
/**
 * Create a ToolLoopAgent instance for STUDENT
 * Includes: database_query tool only (read-only student data)
 * Supports dynamic configuration via callOptions
 */
function createStudentAgent(userId: string | undefined, model: LanguageModel) {
  const studentTools = {
    database_query: tool({
      description: `Query the grading system database to retrieve your learning analytics and course information.

**STUDENT-SPECIFIC QUERIES (READ-ONLY):**

**1. Discovery (The "What"):**
- "student_courses": Your enrolled courses. Start here to get 'courseId'.
- "student_assignments": Lists assignments for a course. **NOTE: Only returns Name & Date.**

**2. Details (The "How"):**
- "assignment_detail_student": **Crucial**. Returns the Description and Rubric. Use this when asked "what is this assignment?"
- "enrolled_course_detail": Course syllabus/info.

**3. Performance (The "Results"):**
- "pending_assignments": What is due soon? (Unsubmitted only).
- "student_submissions": Your submission history list.
- "my_submission_detail": **Deep Dive**. Returns your Score, Teacher Feedback, and AI Analysis.

**4. Stats:**
- "user_statistics": High-level numbers.

**Autonomous Usage:**
Combine these tools to answer questions.
- Need detailed grades? Find submissionId -> Call my_submission_detail.
- Need assignment info? Find assignmentId -> Call assignment_detail_student.`,
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
    model: model,
    instructions: buildStudentSystemPrompt(userId),
    tools: studentTools,
    stopWhen: stepCountIs(15),
    callOptionsSchema: studentCallOptionsSchema,
    prepareStep: async ({ stepNumber, steps, messages, model }) => {
      logger.debug('[Grading Agent V3] Student prepareStep', {
        stepNumber,
        messageCount: messages.length,
        previousStepCount: steps.length,
      });

      // Context Management - Keep conversation within token limits
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
             { 
              role: 'user', 
              content: 'IMPORTANT: You must output strictly in Traditional Chinese (繁體中文). Do not use Simplified Chinese.'
            }
          ],
          toolChoice: 'auto',
        };
      }

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
      
      // Inject language reminder to use Traditional Chinese
      return {
        messages: [
          ...messages,
           { 
            role: 'user', 
            content: 'IMPORTANT: You must output strictly in Traditional Chinese (繁體中文). Do not use Simplified Chinese.'
          }
        ],
        toolChoice: 'auto',
      };
    },
  });
}

/**
 * Create appropriate agent based on user role
 */
function createGradingAgent(userRole: 'TEACHER' | 'STUDENT', userId: string | undefined, model: LanguageModel) {
  if (userRole === 'TEACHER') {
    return createTeacherAgent(userId, model);
  }
  return createStudentAgent(userId, model);
}

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
  callOptions?: TeacherCallOptions | StudentCallOptions,
  onFinish?: (result: { text: string; usage: TokenUsage; toolCalls?: any[]; provider?: string }) => Promise<void>,
  preferredProvider: ModelProvider = 'auto'
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
    // 1. Select Model (Circuit Breaker)
    const { model, provider } = await selectResilientModel(sessionId, preferredProvider);
    
    logger.info('[Grading Agent V3] Model selected', { sessionId, provider });

    // 2. Create agent with role-specific configuration and selected model
    const agent = createGradingAgent(userRole, userId, model);

    logger.debug('[Grading Agent V3] Agent created successfully');

    // Use manual conversion flow to ensure robustness
    // 1. Convert UIMessages to ModelMessages
    // 2. Stream with agent
    // 3. Convert back to UIMessageStreamResponse
    logger.info('[Grading Agent V3] Using manual convertToModelMessages -> agent.stream() flow', { 
      hasOptions: !!callOptions,
      sessionId,
      messagesCount: messages?.length || 0,
    });
    
    try {
      // 1. Convert UIMessages to ModelMessages explicitly
      const modelMessages = await convertToModelMessages(messages as any[]);
      
      logger.debug('[Grading Agent V3] Converted to ModelMessages', {
        count: modelMessages.length,
        firstRole: modelMessages[0]?.role,
      });

      // 2. Stream the agent with ModelMessages
      const streamResult = await agent.stream({
        messages: modelMessages,
        options: callOptions || undefined,
      } as any);

      logger.info('[Grading Agent V3] Agent stream created successfully', { sessionId });

      // Handle onFinish callback if provided
      if (onFinish) {
        // We need to consume the stream to get the final text and usage
        streamResult.text.then(async (finalText) => {
          try {
            let usage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
            try {
              const resultUsage = await streamResult.usage as any;
              usage = {
                promptTokens: resultUsage.promptTokens || 0,
                completionTokens: resultUsage.completionTokens || 0,
                totalTokens: resultUsage.totalTokens || 0,
              };
            } catch (usageError) {
              logger.warn('[Grading Agent V3] Could not retrieve token usage', { sessionId });
            }
            
            await onFinish({ 
              text: finalText,
              usage,
              provider 
            });
          } catch (err) {
            logger.error('[Grading Agent V3] Failed to process onFinish', err);
          }
        });
      }

      // Return the stream response - agent streams should use toUIMessageStreamResponse for useChat compatibility
      const response = streamResult.toUIMessageStreamResponse();
      
      logger.info('[Grading Agent V3] Stream response created successfully', { sessionId });
      
      return response;
      
    } catch (streamError) {
      // Extract detailed error information
      const errorDetails: any = {
        sessionId,
        message: streamError instanceof Error ? streamError.message : String(streamError),
        type: streamError?.constructor?.name,
      };

      // Try to extract more details from the error
      if (streamError instanceof Error) {
        errorDetails.stack = streamError.stack;
        
        // Check if it's a response error with details
        if ('response' in streamError) {
          errorDetails.response = (streamError as any).response;
        }
        if ('cause' in streamError) {
          errorDetails.cause = (streamError as any).cause;
        }
        if ('statusCode' in streamError) {
          errorDetails.statusCode = (streamError as any).statusCode;
        }
        
        // Log the full error object structure
        errorDetails.errorKeys = Object.keys(streamError);
      }

      logger.error('[Grading Agent V3] Stream failed - DETAILED ERROR', errorDetails);
      
      // Also log as string for easy reading
      logger.error('[Grading Agent V3] Stream failed - STRING', {
        sessionId,
        errorString: JSON.stringify(streamError, null, 2),
      });
      
      throw streamError;
    }
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
