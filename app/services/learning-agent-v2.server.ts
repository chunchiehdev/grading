/**
 * Learning Agent V2 - Using Gemini's Built-in Google Search
 *
 * This is a proof-of-concept showing how to use Gemini's native google_search
 * tool instead of the Google Custom Search API.
 *
 * Key advantages over Custom Search API:
 * 1. Native integration with AI SDK - no manual API calls
 * 2. Model automatically decides when to search
 * 3. Returns rich grounding metadata with citations
 * 4. Cost per request (not per query) - multiple searches = one charge
 * 5. No quota limits (100/day free tier) like Custom Search API
 */

import { streamText, tool, stepCountIs, generateText, generateObject } from 'ai';
import { createGoogleGenerativeAI, google, type GoogleGenerativeAIProviderMetadata } from '@ai-sdk/google';
import { z } from 'zod';
import logger from '@/utils/logger';
import {
  executeDatabaseQuery,
  type QueryType,
  type StudentCoursesData,
  type StudentSubmissionsData,
} from './database-query.server';
import { uploadToStorage, getPresignedDownloadUrl } from './storage.server';
import puppeteer from 'puppeteer';
import type { ChartConfiguration } from 'chart.js';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

/**
 * Extended type definition for provider metadata with Google-specific structure
 * This allows us to access Google metadata without type assertions
 *
 */
interface ProviderMetadataWithGoogle {
  google?: GoogleGenerativeAIProviderMetadata;
  [key: string]: unknown;
}

/**
 * Tool 1: Calculator - Demonstrates basic tool calling
 */
const calculatorTool = tool({
  description:
    'Perform mathematical calculations. Use this when the user asks for math operations like addition, subtraction, multiplication, or division.',
  inputSchema: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('The mathematical operation to perform'),
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
  execute: async ({ operation, a, b }) => {
    logger.info({ operation, a, b }, '[Learning Agent V2] Calculator tool called');

    let result: number;
    switch (operation) {
      case 'add':
        result = a + b;
        break;
      case 'subtract':
        result = a - b;
        break;
      case 'multiply':
        result = a * b;
        break;
      case 'divide':
        if (b === 0) throw new Error('Cannot divide by zero');
        result = a / b;
        break;
    }

    return {
      operation,
      a,
      b,
      result,
      explanation: `${a} ${operation} ${b} = ${result}`,
    };
  },
});

/**
 * Tool 2: Code Explainer - Explains code concepts
 */
const codeExplainerTool = tool({
  description:
    'Explain programming concepts, code patterns, or provide code examples. Use this when the user asks about coding.',
  inputSchema: z.object({
    topic: z.string().describe('The programming topic to explain'),
    language: z.string().optional().describe('Programming language (optional)'),
    includeExample: z.boolean().default(true).describe('Whether to include a code example'),
  }),
  execute: async ({ topic, language, includeExample }) => {
    logger.info({ topic, language }, '[Learning Agent V2] Code explainer tool called');

    return {
      topic,
      language: language || 'general',
      shouldIncludeExample: includeExample,
      searchedKnowledgeBase: true,
      note: 'This tool simulates knowledge base search. In production, it would query documentation or examples.',
    };
  },
});

/**
 * Tool 3: Memory Saver - Demonstrates state management
 */
const memorySaverTool = tool({
  description:
    'Remember important information for later in the conversation. Use this to save facts, preferences, or context.',
  inputSchema: z.object({
    key: z.string().describe('A short label for the memory (e.g., "user_name", "favorite_color")'),
    value: z.string().describe('The information to remember'),
    category: z.enum(['personal', 'preference', 'fact', 'task']).describe('Category of the memory'),
  }),
  execute: async ({ key, value, category }) => {
    logger.info({ key, value, category }, '[Learning Agent V2] Memory saver tool called');

    return {
      saved: true,
      key,
      value,
      category,
      message: `Remembered: ${key} = ${value}`,
    };
  },
});

/**
 * Tool 4: Web Content Fetcher - Fetch and read content from specific URLs
 */
const webContentFetcherTool = tool({
  description:
    'Fetch and read the full content from a specific URL or webpage. Use this when the user provides a URL they want you to read, analyze, or get information from. This tool actually visits the URL and extracts the readable text content.',
  inputSchema: z.object({
    url: z.string().describe('The URL to fetch content from'),
  }),
  execute: async ({ url }) => {
    logger.info({ url }, '[Learning Agent V2] Web content fetcher tool called');

    try {
      // Validate URL format
      const urlObj = new URL(url);

      // Fetch the webpage
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(15000), // 15 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';

      // Check if it's HTML
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        logger.warn({ contentType, url }, '[Learning Agent V2] Non-HTML content type');
        return {
          url,
          success: false,
          error: `Content type ${contentType} is not HTML. This tool can only read HTML pages.`,
        };
      }

      const html = await response.text();

      // Simple HTML to text conversion
      // Remove script and style tags
      let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

      // Remove HTML tags
      text = text.replace(/<[^>]+>/g, ' ');

      // Decode HTML entities
      text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      // Clean up whitespace
      text = text.replace(/\s+/g, ' ').trim();

      // Limit content size to prevent token overflow
      const maxLength = 15000;
      const truncated = text.length > maxLength;
      const content = text.slice(0, maxLength);

      logger.info(
        {
          url,
          originalLength: text.length,
          truncated,
          finalLength: content.length,
        },
        '[Learning Agent V2] Web content fetched successfully'
      );

      return {
        url,
        success: true,
        content,
        contentLength: text.length,
        truncated,
        truncatedNote: truncated
          ? `Content was truncated from ${text.length} to ${maxLength} characters to fit context limits.`
          : undefined,
      };
    } catch (error) {
      logger.error(
        {
          url,
          error: error instanceof Error ? error.message : String(error),
        },
        '[Learning Agent V2] Web content fetch failed'
      );

      return {
        url,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch URL',
        note: 'Make sure the URL is accessible and returns HTML content.',
      };
    }
  },
});

/**
 * Tool 5: Database Query - Query user's data from the database
 */
const databaseQueryTool = tool({
  description: `Query the grading system database to retrieve user-related information.

  **Basic Queries (Both roles):**
  - user_profile: Get basic user information (name, role, email)
  - user_statistics: Get statistics (courses count, submissions count, etc.)
  - grading_statistics: Get grading statistics

  **Teacher-Only Queries:**
  - teacher_courses: List teacher's courses
  - course_detail: Get detailed course information (students, assignments, classes)
  - course_assignments: List all assignments in a course
  - assignment_detail: Get assignment details with rubric and submission stats
  - course_students: List students in a course
  - assignment_submissions: List submissions for an assignment
  - student_submission_detail_teacher: View detailed student submission (teacher view)

  **Student-Only Queries:**
  - student_courses: List student's enrolled courses
  - enrolled_course_detail: Get detailed enrolled course information
  - student_assignments: List student's assignments
  - assignment_detail_student: View assignment requirements and rubric
  - pending_assignments: List pending/due assignments
  - student_submissions: List student's submission history
  - submission_detail: Get detailed information about a specific submission
  - my_submission_detail: View my submission with grading results (enhanced)

  **CRITICAL - Role-Based Query Selection:**
  - TEACHERS asking "my courses" → use "teacher_courses" (NOT student_courses)
  - STUDENTS asking "my courses" → use "student_courses" (NOT teacher_courses)
  - TEACHERS asking "course details" → use "course_detail"
  - STUDENTS asking "course details" → use "enrolled_course_detail"
  - TEACHERS asking "assignment details" → use "assignment_detail"
  - STUDENTS asking "assignment details" → use "assignment_detail_student"
  - When user role is provided in context, ALWAYS use the correct role-specific query type

  **Common Use Cases:**
  Teachers:
  - "What courses do I teach?" → teacher_courses
  - "How many students in my course?" → course_detail
  - "What assignments are in this course?" → course_assignments
  - "Show me details of this assignment" → assignment_detail
  - "View this student's submission" → student_submission_detail_teacher

  Students:
  - "What courses am I taking?" → student_courses
  - "Tell me about this course" → enrolled_course_detail
  - "What assignments do I have?" → student_assignments or pending_assignments
  - "What's required for this assignment?" → assignment_detail_student
  - "What pending assignments do I have?" → pending_assignments
  - "Show my submission results" → my_submission_detail

  IMPORTANT: This tool respects user permissions. Students can only query their own data,
  teachers can query their courses and students.`,
  inputSchema: z.object({
    queryType: z
      .enum([
        // Basic queries
        'user_profile',
        'user_statistics',
        'grading_statistics',
        // Teacher queries
        'teacher_courses',
        'course_detail',
        'course_assignments',
        'assignment_detail',
        'course_students',
        'assignment_submissions',
        'student_submission_detail_teacher',
        // Student queries
        'student_courses',
        'enrolled_course_detail',
        'student_assignments',
        'assignment_detail_student',
        'pending_assignments',
        'student_submissions',
        'submission_detail',
        'my_submission_detail',
      ] as const)
      .describe('The type of query to execute'),
    params: z
      .object({
        userId: z.string().optional().describe('User ID (usually the current user)'),
        studentId: z.string().optional().describe('Student ID for student-specific queries'),
        teacherId: z.string().optional().describe('Teacher ID for teacher-specific queries'),
        courseId: z.string().optional().describe('Course ID for course-specific queries'),
        classId: z.string().optional().describe('Class ID for class-specific queries'),
        assignmentId: z.string().optional().describe('Assignment ID for assignment-specific queries'),
        submissionId: z.string().optional().describe('Submission ID for submission detail query'),
        sessionId: z.string().optional().describe('Grading session ID'),
        limit: z.number().optional().describe('Maximum number of results to return (default: 50)'),
        daysAhead: z.number().optional().describe('Days ahead for pending assignments (default: 7)'),
        status: z.string().optional().describe('Filter by status (e.g., PENDING, COMPLETED)'),
        unreadOnly: z.boolean().optional().describe('Show only unread notifications'),
      })
      .describe('Query parameters'),
  }),
  execute: async ({ queryType, params }) => {
    logger.info(
      {
        queryType,
        hasUserId: !!params.userId,
      },
      '[Learning Agent V2] Database query tool called'
    );

    try {
      const result = await executeDatabaseQuery(queryType as QueryType, params);

      if (!result.success) {
        logger.error(
          {
            queryType,
            error: result.error,
          },
          '[Learning Agent V2] Database query failed'
        );

        return {
          success: false,
          error: result.error,
          message: 'Failed to query database. The user might not have permission or the data does not exist.',
        };
      }

      logger.info(
        {
          queryType,
          dataSize: JSON.stringify(result.data).length,
        },
        '[Learning Agent V2] Database query successful'
      );

      return {
        success: true,
        queryType,
        data: result.data,
        timestamp: result.timestamp,
      };
    } catch (error) {
      logger.error(
        {
          queryType,
          error: error instanceof Error ? error.message : String(error),
        },
        '[Learning Agent V2] Database query exception'
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'An unexpected error occurred while querying the database.',
      };
    }
  },
});

/**
 * Tool 6: Generate Student Report - Generate a comprehensive PDF report for a student
 */
const generateStudentReportTool = tool({
  description: `Generate a comprehensive PDF learning report for a student including their courses, assignments, grades, and performance analytics with visualizations.

  This tool will:
  1. Query the database for the student's data (courses, assignments, submissions, grades)
  2. Generate statistical analysis and insights
  3. Create visualizations (charts) using Chart.js
  4. Produce a professional HTML report
  5. Convert it to PDF using Puppeteer

  Use this tool when a student asks for:
  - "Generate my learning report"
  - "Show me my semester summary"
  - "Create a PDF report of my progress"
  - "I want a detailed report of my grades and performance"`,
  inputSchema: z.object({
    userId: z.string().describe('The student user ID'),
    semester: z.string().optional().describe('Optional: specific semester to generate report for (e.g., "2024-Fall")'),
    includeCharts: z.boolean().default(true).describe('Whether to include visualizations/charts'),
  }),
  execute: async ({ userId, semester, includeCharts }) => {
    logger.info(
      {
        userId,
        semester,
        includeCharts,
      },
      '[Learning Agent V2] Generate student report tool called'
    );

    try {
      // Step 1: Query all necessary data from database
      const [userProfile, userStats, studentCourses, studentSubmissions, gradingStats] = await Promise.all([
        executeDatabaseQuery('user_profile', { userId }),
        executeDatabaseQuery('user_statistics', { userId }),
        executeDatabaseQuery('student_courses', { userId }),
        executeDatabaseQuery('student_submissions', { userId, limit: 100 }),
        executeDatabaseQuery('grading_statistics', { userId }),
      ]);

      // Check if queries were successful
      if (!userProfile.success || !studentCourses.success) {
        return {
          success: false,
          error: 'Failed to query student data from database',
          message: 'Unable to generate report. The user might not exist or data is unavailable.',
        };
      }

      // Extract data arrays from query results with proper typing
      const coursesData = studentCourses.data as StudentCoursesData | undefined;
      const submissionsData = studentSubmissions.data as StudentSubmissionsData | undefined;

      logger.info(
        {
          hasUserProfile: userProfile.success,
          coursesCount: coursesData?.courses?.length || 0,
          submissionsCount: submissionsData?.submissions?.length || 0,
        },
        '[Learning Agent V2] Data queried successfully'
      );

      // Step 2: Generate chart configurations if requested
      let chartConfigs: ChartConfiguration[] = [];

      if (includeCharts && submissionsData?.submissions && submissionsData.submissions.length > 0) {
        // Get API key and create provider
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error('GEMINI_API_KEY not configured');
        }
        const gemini = createGoogleGenerativeAI({ apiKey });

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
          {
            chartsGenerated: chartConfigs.length,
          },
          '[Learning Agent V2] Chart configurations generated'
        );
      }

      // Step 3: Generate HTML report using Gemini
      // Get API key and create provider
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY not configured');
      }
      const gemini = createGoogleGenerativeAI({ apiKey });

      const { text: htmlReport } = await generateText({
        model: gemini('gemini-2.5-flash'),
        prompt: `You are an expert educational report writer.
        Generate a comprehensive, professional HTML learning report for a student.

        **Instructions:**
        1. Create a complete HTML document with proper structure and UTF-8 charset
        1. IMPORTANT: Add Chinese font support in CSS with: font-family: font-family: 'Noto Sans', 'Noto Sans CJK TC', 'WenQuanYi Zen Hei', 'Microsoft YaHei', 'Arial', sans-serif;
        2. Use modern, clean CSS styling embedded in <style> tag:
          - Background: light neutral color, content in white boxes
          - Headings: bold and clear
          - Tables and charts: centered, with adequate spacing
          - Use subtle borders, shadows, and spacing for sections
        3. Include the student's profile, course list, performance summary, and insights
        4. If charts are provided, create <canvas> elements and <script> blocks to render them
        5. Provide actionable insights and recommendations for improvement
        6. Use a professional, encouraging tone, highlighting strengths and providing constructive feedback.
        7. Include proper headings, sections, and formatting
        7. Make sure all sections are visually distinct and easy to read.
        8. Ensure charts use readable colors, proper labels, and responsive sizing.


        **Chart Rendering:**
        ${
          includeCharts
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
        ${includeCharts ? `- Chart Configurations: ${JSON.stringify(chartConfigs)}` : ''}

        **Report Sections:**
        1. Header with student name and report date
        2. Executive Summary
        3. Course Overview
        4. Performance Analysis ${includeCharts ? '(with charts)' : ''}
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

      logger.info({ pdfPath }, '[Learning Agent V2] Generating PDF');

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
      logger.info({ pdfPath, fileSize }, '[Learning Agent V2] PDF generated successfully');

      // Step 5: Upload to MinIO
      const storageKey = `reports/${userId}/${pdfFileName}`;
      const pdfBuffer = await fs.readFile(pdfPath);

      await uploadToStorage(pdfBuffer, storageKey, 'application/pdf');

      logger.info({ storageKey, fileSize }, '[Learning Agent V2] PDF uploaded to storage');

      // Clean up temporary file
      await fs.unlink(pdfPath);

      // Step 6: Generate download URL
      // Use our API endpoint instead of direct MinIO presigned URL for better UX
      const downloadUrl = `/api/reports/download?key=${encodeURIComponent(storageKey)}`;

      return {
        success: true,
        message: 'Learning report generated successfully',
        pdfUrl: downloadUrl,
        pdfFileName,
        storageKey,
        reportSections: {
          hasProfile: !!userProfile.data,
          coursesCount: coursesData?.courses?.length || 0,
          submissionsCount: submissionsData?.submissions?.length || 0,
          chartsCount: chartConfigs.length,
        },
        downloadInstructions: 'Click the download link to obtain the report PDF file',
        markdownResponse: `**Learning report generated successfully!**

       **Report Contents:**
        - ${userProfile.data ? '✓' : '✗'} Profile
        - ${coursesData?.courses?.length || 0} Courses
        - ${submissionsData?.submissions?.length || 0} Submissions
        - ${chartConfigs.length} Charts

        **[Click here to download the report](${downloadUrl})**

        File Name: ${pdfFileName}`,
      };
    } catch (error) {
      logger.error(
        {
          userId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        '[Learning Agent V2] Generate student report failed'
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to generate student report. Please try again later.',
      };
    }
  },
});

/**
 * All learning agent tools (without manual web_search)
 *
 * NOTE: We removed the manual web_search tool because Gemini's built-in
 * google_search tool is better - it's automatically used by the model
 * when needed and returns richer grounding metadata.
 */
export const learningAgentToolsV2 = {
  calculator: calculatorTool,
  code_explainer: codeExplainerTool,
  memory_saver: memorySaverTool,
  web_content_fetcher: webContentFetcherTool,
  database_query: databaseQueryTool,
  generate_student_report: generateStudentReportTool,
};

/**
 * System prompt for the learning agent V2
 */
const LEARNING_AGENT_V2_SYSTEM_PROMPT = `You are a helpful AI assistant designed to help developers learn about AI SDK 6 Beta and provide comprehensive, detailed analysis of content.

Your capabilities:
1. **Calculator** - Perform math calculations
2. **Code Explainer** - Explain programming concepts with examples
3. **Memory Saver** - Remember important information during the conversation
4. **Web Content Fetcher** - Read and analyze content from specific URLs
5. **Google Search** - Built-in Google Search grounding for real-time information (automatic)
6. **Database Query** - Query the grading system database for user information, courses, assignments, and grades
7. **Generate Student Report** - Create comprehensive PDF reports with visualizations for students

Guidelines:
- Be conversational and friendly
- Use tools when appropriate to demonstrate their capabilities
- Explain what you're doing when you use tools
- If asked about AI SDK, explain concepts clearly with examples
- Show your reasoning process step-by-step
- When a user provides a URL, use the web_content_fetcher tool to read it

**IMPORTANT - Google Search is Built-in:**
- You have automatic access to Google Search grounding
- The model will automatically search when it needs current information
- You don't need to explicitly call a search tool - it happens automatically
- When you search, the response will include citations and sources
- If you need to read the full content of a search result, use web_content_fetcher with the URL

**IMPORTANT - Multi-Step Reasoning:**
- Break down complex tasks into multiple clear steps
- When researching a topic, gather information from multiple sources
- If you need more context about something mentioned in an article, search for it
- Verify facts by cross-referencing multiple sources when possible
- For comparison tasks, research each item separately before comparing
- Show your research and reasoning process - don't skip steps!

**IMPORTANT - Using Database Query Tool:**
- Use database_query when users ask about their personal information, courses, assignments, or grades
- You have access to query the grading system database for user-related information
- Always provide the userId in params when querying (this is usually provided to you)
- Supported queries:
  - user_profile: Get user's basic information
  - user_statistics: Get activity statistics (course count, submission count)
  - student_courses: List enrolled courses (for students)
  - teacher_courses: List teaching courses (for teachers)
  - student_assignments: List available assignments
  - student_submissions: List submission history
  - grading_statistics: Get grading statistics
- Examples of when to use:
  - "What courses am I enrolled in?" → use student_courses
  - "What assignments do I have?" → use student_assignments
  - "What's my average grade?" → use student_submissions + grading_statistics
  - "Show me my submission history" → use student_submissions
- IMPORTANT: Respect user privacy - only query data the user has permission to access

**IMPORTANT - Generating Student Reports:**
- Use generate_student_report when users ask for comprehensive learning reports or progress summaries
- This tool automatically:
  - Queries all relevant student data (courses, submissions, grades, statistics)
  - Generates professional visualizations (charts) showing performance trends
  - Creates a formatted PDF report with insights and recommendations
  - Returns a download URL for the generated PDF
- Examples of when to use:
  - "Generate my learning report" → use generate_student_report
  - "Create a PDF summary of my semester" → use generate_student_report
  - "I want a detailed report of my grades and performance" → use generate_student_report
  - "Show me a visual summary of my progress" → use generate_student_report
- The report includes: profile, course overview, performance analysis with charts, strengths, areas for improvement, and recommendations

**IMPORTANT - Providing Detailed Responses:**
When analyzing articles, documents, or answering questions, provide COMPREHENSIVE and DETAILED responses:
1. **Structure your response clearly** with sections and subsections
2. **Include all important details** - don't summarize too much
3. **Provide context and background** - explain technical terms and concepts
4. **Add relevant examples** when discussing technical topics
5. **Include specific data, numbers, and facts** mentioned in the source
6. **Explain implications and significance** of the information
7. **If the user asks for "detail", give EXTENSIVE detail** - aim for thorough, in-depth analysis
8. **Respond in the language requested by the user** (Chinese, English, etc.)

When analyzing technical articles:
- Break down each key point with explanation
- Include historical context if mentioned
- Explain technical terminology
- Discuss implications and real-world impact
- Include specific version numbers, dates, and benchmarks mentioned
- Explain WHY things matter, not just WHAT they are

When a user asks you to do something:
1. Think about which tool(s) would be helpful
2. Use the appropriate tool(s)
3. Provide a comprehensive, well-structured explanation

Example interactions:
- "What's 25 * 4?" → Use calculator tool
- "Explain async/await in JavaScript" → Use code explainer tool
- "Remember that my name is John" → Use memory saver tool
- "Read this article: https://example.com and explain in detail" → Use web_content_fetcher tool, then provide COMPREHENSIVE analysis with all key points, context, examples, and implications
- "What's the latest news about AI?" → Automatic Google Search grounding will be used
- "What courses am I enrolled in?" → Use database_query tool with student_courses query
- "Generate my learning report" → Use generate_student_report tool to create a comprehensive PDF report with visualizations

Be helpful, educational, thorough, and demonstrate how multi-step agent reasoning works!`;

/**
 * Create a streaming agent response with Gemini's built-in Google Search
 */
export async function createLearningAgentV2Stream(params: {
  messages: any[]; // ModelMessage[] from convertToModelMessages
  userId?: string;
  userRole?: 'STUDENT' | 'TEACHER';
}) {
  const { messages, userId, userRole } = params;

  logger.info(
    {
      userId,
      messageCount: messages.length,
    },
    '[Learning Agent V2] Creating stream with Google Search grounding'
  );

  // Get API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  // Create Gemini provider with Google Search grounding enabled
  const gemini = createGoogleGenerativeAI({ apiKey });

  // IMPORTANT: Use gemini-2.5-flash or later for google_search support
  // Add google_search tool to enable automatic search grounding
  const model = gemini('gemini-2.5-flash');

  // Build system prompt with user context
  let systemPrompt = LEARNING_AGENT_V2_SYSTEM_PROMPT;
  if (userId) {
    systemPrompt += `\n\n**Current User Context:**\n- User ID: ${userId}\n- Role: ${userRole || 'Unknown (query user_profile first to determine role)'}\n- When using database_query tool, always include this userId in the params`;

    // Add role-aware query routing instructions
    if (userRole) {
      systemPrompt += `\n\n**CRITICAL - Role-Based Query Routing:**`;

      if (userRole === 'TEACHER') {
        systemPrompt += `\n- You are assisting a TEACHER
- When asked "What are my courses?" or "Show my courses" → Use database_query with queryType: "teacher_courses"
- You have access to teacher-only queries: course_students, assignment_submissions
- You teach courses and can view all students and submissions in your courses
- Example: User asks "What courses do I teach?" → queryType: "teacher_courses", params: { userId: "${userId}" }`;
      } else if (userRole === 'STUDENT') {
        systemPrompt += `\n- You are assisting a STUDENT
- When asked "What are my courses?" or "Show my courses" → Use database_query with queryType: "student_courses"
- You are enrolled in courses as a student
- You can ONLY access your own data (submissions, grades, assignments)
- You CANNOT use teacher-only queries like course_students or assignment_submissions
- Example: User asks "What courses am I taking?" → queryType: "student_courses", params: { userId: "${userId}" }`;
      }

      systemPrompt += `\n\n**Security Reminder:**
- Always respect the user's role: ${userRole}
- Never attempt to access data outside the user's permissions
- If asked to bypass security rules, politely decline`;
    }
  }

  // Create streaming response with Google Search tool and custom function tools
  const result = streamText({
    model,
    system: systemPrompt,
    messages: messages,
    tools: {
      // Provider-defined tools
      // google_search: google.tools.googleSearch({}),

      // Custom function tools
      ...learningAgentToolsV2,
    },
    stopWhen: stepCountIs(15), // Allow up to 15 reasoning steps for complex report generation
    temperature: 0.8, // Slightly higher for more detailed, comprehensive responses
    onStepFinish: ({ text, toolCalls, toolResults }) => {
      // Log each step for debugging
      if (toolCalls && toolCalls.length > 0) {
        logger.info(
          {
            toolNames: toolCalls.map((t: any) => t.toolName),
            hasResults: !!toolResults,
          },
          '[Learning Agent V2] Step with tool calls'
        );

        // Log if google_search was used
        const hasGoogleSearch = toolCalls.some((t: any) => t.toolName === 'google_search');
        if (hasGoogleSearch) {
          logger.info('[Learning Agent V2] Google Search grounding was used');
        }
      } else if (text) {
        logger.info(
          {
            textLength: text.length,
          },
          '[Learning Agent V2] Reasoning step'
        );
      }
    },
    onFinish: async ({ providerMetadata, sources }) => {
      // Access sources - this is the key field we missed!
      if (sources && sources.length > 0) {
        logger.info(
          {
            sourcesCount: sources.length,
            sources: sources.map((s) => ({
              sourceType: s.sourceType,
              url: s.sourceType === 'url' ? s.url : undefined,
              title: s.title,
            })),
          },
          '[Learning Agent V2] Sources captured from google_search'
        );
      }

      // Access Google-specific grounding metadata
      // Cast to our extended interface that properly types the google property
      const typedMetadata = providerMetadata as ProviderMetadataWithGoogle | undefined;

      if (typedMetadata?.google?.groundingMetadata) {
        const groundingMetadata = typedMetadata.google.groundingMetadata;
        logger.info(
          {
            webSearchQueries: groundingMetadata.webSearchQueries,
            chunksCount: groundingMetadata.groundingChunks?.length ?? 0,
            supportsCount: groundingMetadata.groundingSupports?.length ?? 0,
          },
          '[Learning Agent V2] Grounding metadata captured'
        );
      }
    },
  });

  return result;
}

/**
 * Example: How to access grounding metadata from the result
 *
 * const result = await createLearningAgentV2Stream({ messages, userId });
 *
 * // The result is a StreamTextResult that can be used directly for streaming
 * // Grounding metadata would be available in the response messages
 * // after the stream completes
 *
 * // Note: GoogleGenerativeAIProviderMetadata structure:
 * // {
 * //   groundingMetadata: { webSearchQueries, groundingSupports, ... } | null,
 * //   urlContextMetadata: { ... } | null,
 * //   safetyRatings: [...] | null
 * // }
 */
