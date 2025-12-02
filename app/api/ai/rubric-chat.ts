import type { ActionFunctionArgs } from 'react-router';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamObject } from 'ai';
import { getUserId } from '@/services/auth.server';
import logger from '@/utils/logger';
import { UIRubricDataSchema } from '@/schemas/rubric';

/**
 * System prompt for rubric generation assistant
 */
const RUBRIC_SYSTEM_PROMPT = `你是一個專業的教育評估專家，專門協助教師制定詳細的評分標準和學習評量工具。

你的職責是：
1. 根據教師的需求生成結構化的評分標準（Rubric）
2. 提供專業的教育評估建議
3. 根據對話歷史調整和優化評分標準

評分標準結構要求：
- 必須包含：name（評分標準名稱）、description（描述）、categories（類別陣列）
- 每個 category 包含：id（UUID）、name（類別名稱）、criteria（評分標準陣列）
- 每個 criterion 包含：id（UUID）、name（標準名稱）、description（描述）、levels（等級陣列）
- 每個 level 包含：score（1-4的整數）、description（等級描述）

重要原則：
1. **教育專業性**：提供符合教育理論和實務的評分標準
2. **實用性**：確保評分標準易於理解和執行
3. **全面性**：涵蓋學習目標的各個面向
4. **差異化**：提供不同程度的評分級距（1-4 分）
5. **上下文感知**：根據對話歷史調整建議，避免重複內容
6. **UUID 生成**：為每個 category 和 criterion 生成唯一的 UUID（格式：550e8400-e29b-41d4-a716-446655440000）

當用戶要求修改時，請根據之前的對話內容和生成的評分標準進行調整。`;

/**
 * POST /api/ai/rubric-chat
 * Streaming object endpoint for AI-powered rubric generation
 * Works with experimental_useObject hook from @ai-sdk/react
 */
export async function action({ request }: ActionFunctionArgs) {
  try {
    logger.info('Rubric chat endpoint called', {
      method: request.method,
      url: request.url,
      contentType: request.headers.get('content-type'),
    });

    // 1. Authentication
    const userId = await getUserId(request);
    if (!userId) {
      logger.error('Unauthorized request - no userId');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('User authenticated', { userId });

    // 2. Parse request body - submit() sends the data as JSON body
    let body: any;
    try {
      body = await request.json();
      logger.info('Request body parsed', {
        bodyKeys: body ? Object.keys(body) : [],
        bodyType: typeof body,
      });
    } catch (parseError) {
      logger.error('Failed to parse request body:', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
      });
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // 3. Extract messages from body
    // useObject.submit() sends the data directly as the body
    // We expect: { messages: [...], currentRubric?: {...} }
    const messages = body?.messages;

    console.log('Messages extracted from body:', messages);
    console.log('Messages type:', typeof messages);
    console.log('Is array?', Array.isArray(messages));
    console.log('Messages full:', JSON.stringify(messages));

    if (!messages || !Array.isArray(messages)) {
      logger.error('Invalid messages format', {
        userId,
        hasMessages: !!messages,
        messageType: typeof messages,
        messagesValue: messages,
      });
      return Response.json({ error: 'Invalid request: messages array required' }, { status: 400 });
    }

    logger.info('Rubric object stream request received', {
      userId,
      messageCount: messages.length,
      firstMessage: messages[0],
    });

    // 4. Get API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.error('GEMINI_API_KEY not configured');
      return Response.json({ error: 'AI service not configured' }, { status: 500 });
    }

    logger.info('API key present, converting messages', { messageCount: messages.length });

    // 5. Convert messages to AI SDK format
    let coreMessages: any;
    try {
      // convertToModelMessages expects messages with role and content
      // But seems to have an issue, let's try a direct mapping
      coreMessages = messages.map((msg: any) => {
        console.log('Mapping message:', msg);
        if (typeof msg.content === 'string') {
          return msg; // Already in correct format
        }
        return msg;
      });
      
      console.log('Mapped messages:', JSON.stringify(coreMessages));
      logger.info('Messages mapped successfully', {
        mappedMessageCount: coreMessages.length,
      });
    } catch (convertError) {
      console.error('Message mapping error:', convertError);
      logger.error('Failed to map messages', {
        error: convertError instanceof Error ? convertError.message : String(convertError),
        stack: convertError instanceof Error ? convertError.stack : undefined,
        messagesSample: JSON.stringify(messages.slice(0, 1)),
      });
      throw convertError;
    }

    // 6. Create Google provider
    logger.info('Creating Google provider');
    const googleProvider = createGoogleGenerativeAI({ apiKey });

    // 7. Stream object using messages (for multi-turn conversation)
    logger.info('Calling streamObject', {
      model: 'gemini-2.0-flash',
      schemaFields: Object.keys(UIRubricDataSchema.shape || {}),
      messagesCount: coreMessages.length,
      temperature: 0.7,
    });

    const result = streamObject({
      model: googleProvider('gemini-2.0-flash'),
      schema: UIRubricDataSchema,
      system: RUBRIC_SYSTEM_PROMPT,
      messages: coreMessages as any,  // Messages already in correct format: { role, content }
      temperature: 0.7,
      maxOutputTokens: 4096,
      onFinish: ({ object, usage }) => {
        logger.info('Rubric object stream finished', {
          userId,
          tokens: usage.totalTokens,
          hasRubric: !!object,
          objectKeys: object ? Object.keys(object) : null,
        });
      },
    });

    logger.info('streamObject called successfully, converting to text stream response');

    // 8. Return streaming response compatible with useObject
    const textStreamResponse = result.toTextStreamResponse();
    logger.info('Text stream response created successfully');
    return textStreamResponse;
  } catch (error) {
    console.error('Full error object:', error);
    console.error('Error string:', String(error));
    console.error('Error JSON:', JSON.stringify(error, null, 2));
    
    logger.error('Rubric object stream error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error?.constructor?.name,
      errorString: String(error),
    });

    // Log more detailed error info
    if (error instanceof Error) {
      logger.error('Error details:', {
        name: error.name,
        message: error.message,
        cause: (error as any).cause,
        stack: error.stack,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return Response.json(
      {
        error: 'Failed to generate response',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
