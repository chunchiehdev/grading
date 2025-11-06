/**
 * Learning Agent - Helps understand AI SDK 6 Beta
 *
 * This agent demonstrates:
 * - Multi-step reasoning
 * - Tool calling
 * - Streaming responses
 * - Conversation memory
 */

import { streamText, tool, stepCountIs } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import logger from '@/utils/logger';
import { executeDatabaseQuery, type QueryType } from './database-query.server';

/**
 * Tool 1: Calculator - Demonstrates basic tool calling
 */
const calculatorTool = tool({
  description: 'Perform mathematical calculations. Use this when the user asks for math operations like addition, subtraction, multiplication, or division.',
  inputSchema: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('The mathematical operation to perform'),
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
  execute: async ({ operation, a, b }) => {
    logger.info({ operation, a, b }, '[Learning Agent] Calculator tool called');

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
  description: 'Explain programming concepts, code patterns, or provide code examples. Use this when the user asks about coding.',
  inputSchema: z.object({
    topic: z.string().describe('The programming topic to explain'),
    language: z.string().optional().describe('Programming language (optional)'),
    includeExample: z.boolean().default(true).describe('Whether to include a code example'),
  }),
  execute: async ({ topic, language, includeExample }) => {
    logger.info({ topic, language }, '[Learning Agent] Code explainer tool called');

    // In a real implementation, this could query a knowledge base
    // For now, we return a structured response that the LLM will use
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
  description: 'Remember important information for later in the conversation. Use this to save facts, preferences, or context.',
  inputSchema: z.object({
    key: z.string().describe('A short label for the memory (e.g., "user_name", "favorite_color")'),
    value: z.string().describe('The information to remember'),
    category: z.enum(['personal', 'preference', 'fact', 'task']).describe('Category of the memory'),
  }),
  execute: async ({ key, value, category }) => {
    logger.info({ key, value, category }, '[Learning Agent] Memory saver tool called');

    // In a real app, you'd save this to a database or session storage
    // For demo, we just acknowledge it
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
  description: 'Fetch and read the full content from a specific URL or webpage. Use this when the user provides a URL they want you to read, analyze, or get information from. This tool actually visits the URL and extracts the readable text content.',
  inputSchema: z.object({
    url: z.string().describe('The URL to fetch content from'),
  }),
  execute: async ({ url }) => {
    logger.info({ url }, '[Learning Agent] Web content fetcher tool called');

    try {
      // Validate URL format
      const urlObj = new URL(url);

      // Fetch the webpage
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(15000), // 15 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';

      // Check if it's HTML
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        logger.warn({ contentType, url }, '[Learning Agent] Non-HTML content type');
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

      logger.info({
        url,
        originalLength: text.length,
        truncated,
        finalLength: content.length,
      }, '[Learning Agent] Web content fetched successfully');

      return {
        url,
        success: true,
        content,
        contentLength: text.length,
        truncated,
        truncatedNote: truncated ? `Content was truncated from ${text.length} to ${maxLength} characters to fit context limits.` : undefined,
      };
    } catch (error) {
      logger.error({
        url,
        error: error instanceof Error ? error.message : String(error),
      }, '[Learning Agent] Web content fetch failed');

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
 * Tool 5: Web Search - Real Google Custom Search API integration
 */
const webSearchTool = tool({
  description: 'Search the web for current information using Google Custom Search. IMPORTANT: This tool ONLY returns search results with titles and short snippets (150-200 characters), NOT full article content. After searching, if you need the full content of any result, you MUST use the web_content_fetcher tool with the URL from the search results. Use this when the user asks about recent events, needs up-to-date information, or wants to find content from specific websites.',
  inputSchema: z.object({
    query: z.string().describe('The search query'),
    maxResults: z.number().default(5).describe('Maximum number of results to return (1-10)'),
  }),
  execute: async ({ query, maxResults }) => {
    logger.info({ query, maxResults }, '[Learning Agent] Web search tool called');

    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    // Check if Google Search API is configured
    if (!apiKey || !searchEngineId || apiKey === 'your_google_custom_search_api_key_here') {
      logger.warn('[Learning Agent] Google Search API not configured, using simulated results');

      // Fallback to simulated results
      return {
        query,
        results: [
          {
            title: `Simulated result for "${query}"`,
            snippet: 'Google Search API is not configured. Add GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID to your .env file to enable real web search.',
            url: 'https://console.cloud.google.com/apis/credentials',
          },
        ],
        source: 'simulated',
        note: '⚠️ Configure Google Custom Search API to get real search results. See .env.example for instructions.',
      };
    }

    try {
      // Call Google Custom Search API
      const url = new URL('https://www.googleapis.com/customsearch/v1');
      url.searchParams.set('key', apiKey);
      url.searchParams.set('cx', searchEngineId);
      url.searchParams.set('q', query);
      url.searchParams.set('num', Math.min(maxResults, 10).toString());

      logger.info({ query, url: url.toString().replace(apiKey, '***') }, '[Learning Agent] Calling Google Search API');

      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({
          status: response.status,
          error: errorText,
        }, '[Learning Agent] Google Search API error');

        throw new Error(`Google Search API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      // Parse search results
      const results = (data.items || []).map((item: any) => ({
        title: item.title || 'No title',
        snippet: item.snippet || 'No description available',
        url: item.link || '',
      }));

      logger.info({
        query,
        resultCount: results.length,
        searchTime: data.searchInformation?.searchTime,
      }, '[Learning Agent] Google Search successful');

      
      console.log('\n========== Web Search Results ==========');
      console.log('Query:', query);
      console.log('Total Results Found:', data.searchInformation?.totalResults || '0');
      console.log('Search Time:', data.searchInformation?.searchTime || 0, 'seconds');
      console.log('Number of Results Returned:', results.length);
      console.log('\n--- Search Results Details ---');
      results.forEach((result: any, index: number) => {
        console.log(`\n[Result ${index + 1}]`);
        console.log('Title:', result.title);
        console.log('URL:', result.url);
        console.log('Snippet:', result.snippet);
      });
      console.log('\n========================================\n');

      return {
        query,
        results,
        source: 'google_custom_search',
        totalResults: data.searchInformation?.totalResults || '0',
        searchTime: data.searchInformation?.searchTime || 0,
      };
    } catch (error) {
      logger.error({
        query,
        error: error instanceof Error ? error.message : String(error),
      }, '[Learning Agent] Web search failed');

      // Return error information
      return {
        query,
        results: [],
        source: 'error',
        error: error instanceof Error ? error.message : 'Search failed',
        note: 'Web search encountered an error. The API might be temporarily unavailable or there may be a configuration issue.',
      };
    }
  },
});

/**
 * Tool 6: Database Query - Query user's data from the database
 */
const databaseQueryTool = tool({
  description: `Query the grading system database to retrieve user-related information.

  Supported query types:
  - user_profile: Get basic user information (name, role, email)
  - user_statistics: Get statistics (courses count, submissions count, etc.)
  - student_courses: List student's enrolled courses
  - teacher_courses: List teacher's courses
  - course_students: List students in a course (teacher only)
  - student_assignments: List student's assignments
  - assignment_submissions: List submissions for an assignment (teacher only)
  - student_submissions: List student's submission history
  - submission_detail: Get detailed information about a specific submission
  - grading_statistics: Get grading statistics

  Use this tool when the user asks about:
  - Their personal information
  - Their courses or assignments
  - Their grades or submissions
  - Statistics about their activity

  IMPORTANT: This tool respects user permissions. Students can only query their own data,
  teachers can query their courses and students.`,
  inputSchema: z.object({
    queryType: z.enum([
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
    ] as const).describe('The type of query to execute'),
    params: z.object({
      userId: z.string().optional().describe('User ID (usually the current user)'),
      studentId: z.string().optional().describe('Student ID for student-specific queries'),
      teacherId: z.string().optional().describe('Teacher ID for teacher-specific queries'),
      courseId: z.string().optional().describe('Course ID for course-specific queries'),
      assignmentId: z.string().optional().describe('Assignment ID for assignment-specific queries'),
      submissionId: z.string().optional().describe('Submission ID for submission detail query'),
      limit: z.number().optional().describe('Maximum number of results to return (default: 50)'),
    }).describe('Query parameters'),
  }),
  execute: async ({ queryType, params }) => {
    logger.info({
      queryType,
      hasUserId: !!params.userId,
    }, '[Learning Agent] Database query tool called');

    try {
      const result = await executeDatabaseQuery(queryType as QueryType, params);

      if (!result.success) {
        logger.error({
          queryType,
          error: result.error,
        }, '[Learning Agent] Database query failed');

        return {
          success: false,
          error: result.error,
          message: 'Failed to query database. The user might not have permission or the data does not exist.',
        };
      }

      logger.info({
        queryType,
        dataSize: JSON.stringify(result.data).length,
      }, '[Learning Agent] Database query successful');

      return {
        success: true,
        queryType,
        data: result.data,
        timestamp: result.timestamp,
      };
    } catch (error) {
      logger.error({
        queryType,
        error: error instanceof Error ? error.message : String(error),
      }, '[Learning Agent] Database query exception');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'An unexpected error occurred while querying the database.',
      };
    }
  },
});

/**
 * All learning agent tools
 */
export const learningAgentTools = {
  calculator: calculatorTool,
  code_explainer: codeExplainerTool,
  memory_saver: memorySaverTool,
  web_content_fetcher: webContentFetcherTool,
  web_search: webSearchTool,
  database_query: databaseQueryTool,
};

/**
 * System prompt for the learning agent
 */
const LEARNING_AGENT_SYSTEM_PROMPT = `You are a helpful AI assistant designed to help developers learn about AI SDK 6 Beta and provide comprehensive, detailed analysis of content.

Your capabilities:
1. **Calculator** - Perform math calculations
2. **Code Explainer** - Explain programming concepts with examples
3. **Memory Saver** - Remember important information during the conversation
4. **Web Content Fetcher** - Read and analyze content from specific URLs
5. **Web Search** - Search the web using Google Custom Search API for real, up-to-date information
6. **Database Query** - Query the grading system database for user information, courses, assignments, and grades

Guidelines:
- Be conversational and friendly
- Use tools when appropriate to demonstrate their capabilities
- Explain what you're doing when you use tools
- If asked about AI SDK, explain concepts clearly with examples
- Show your reasoning process step-by-step
- When a user provides a URL, use the web_content_fetcher tool to read it
- When a user wants to search for something, use the web_search tool

**IMPORTANT - Multi-Step Reasoning:**
- Break down complex tasks into multiple clear steps
- When researching a topic, gather information from multiple sources
- If you need more context about something mentioned in an article, search for it
- Verify facts by cross-referencing multiple sources when possible
- For comparison tasks, research each item separately before comparing
- Show your research and reasoning process - don't skip steps!

**CRITICAL - Using Web Search and Content Fetcher Together:**
- web_search ONLY gives you titles and short snippets (150-200 chars), NOT full articles
- After searching, if you need detailed information, you MUST use web_content_fetcher on the URLs
- Example workflow:
  1. Use web_search to find relevant articles
  2. Use web_content_fetcher to read the most relevant URLs from search results
  3. Then analyze the full content
- Don't make conclusions based only on snippets - read the full articles for accuracy!

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
- "Search for latest AI news" → Use web search tool

Be helpful, educational, thorough, and demonstrate how multi-step agent reasoning works!`;

/**
 * Create a streaming agent response
 */
export async function createLearningAgentStream(params: {
  messages: any[]; // ModelMessage[] from convertToModelMessages
  userId?: string;
}) {
  const { messages, userId } = params;

  logger.info({
    userId,
    messageCount: messages.length,
  }, '[Learning Agent] Creating stream');

  // Get API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  // Create Gemini provider
  const gemini = createGoogleGenerativeAI({ apiKey });
  const model = gemini('gemini-2.5-flash');

  // Messages are already in ModelMessage format from convertToModelMessages
  // No need to transform them again

  // Build system prompt with user context
  let systemPrompt = LEARNING_AGENT_SYSTEM_PROMPT;
  if (userId) {
    systemPrompt += `\n\n**Current User Context:**\n- User ID: ${userId}\n- When using database_query tool, always include this userId in the params`;
  }

  // Create streaming response
  const result = streamText({
    model,
    system: systemPrompt,
    messages: messages,
    tools: learningAgentTools,
    stopWhen: stepCountIs(10), // Allow up to 10 reasoning steps
    temperature: 0.8, // Slightly higher for more detailed, comprehensive responses
    onStepFinish: ({ text, toolCalls, toolResults }) => {
      // Log each step for debugging
      if (toolCalls && toolCalls.length > 0) {
        logger.info({
          toolNames: toolCalls.map((t: any) => t.toolName),
          hasResults: !!toolResults,
        }, '[Learning Agent] Step with tool calls');
      } else if (text) {
        logger.info({
          textLength: text.length,
        }, '[Learning Agent] Reasoning step');
      }
    },
  });

  return result;
}
