import type { Route } from './+types/api.ai.rubric-chat';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, convertToCoreMessages, convertToModelMessages  } from 'ai';
import { getUserId } from '@/services/auth.server';
import logger from '@/utils/logger';

/**
 * System prompt for rubric generation assistant
 */
const RUBRIC_SYSTEM_PROMPT = `你是一個專業的教育評估專家，專門協助教師制定詳細的評分標準和學習評量工具。

你的職責是：
1. 根據教師的需求生成結構化的評分標準（Rubric）
2. 提供專業的教育評估建議
3. 根據對話歷史調整和優化評分標準

評分標準格式要求：
- 使用 JSON 格式包裹在 \`\`\`json 代碼塊中
- 必須包含：name（評分標準名稱）、description（描述）、categories（類別陣列）
- 每個 category 包含：id（UUID）、name（類別名稱）、criteria（評分標準陣列）
- 每個 criterion 包含：id（UUID）、name（標準名稱）、description（描述）、levels（等級陣列）
- 每個 level 包含：score（1-4的整數）、description（等級描述）

回應格式範例：
\`\`\`json
{
  "name": "程式設計作業評分標準",
  "description": "評估學生程式設計能力的評分標準",
  "categories": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "程式碼品質",
      "criteria": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440001",
          "name": "程式碼可讀性",
          "description": "評估程式碼的命名、註解和結構",
          "levels": [
            { "score": 4, "description": "程式碼清晰易懂，命名規範，註解完整" },
            { "score": 3, "description": "程式碼大致清晰，有基本註解" },
            { "score": 2, "description": "程式碼可讀性一般，缺少註解" },
            { "score": 1, "description": "程式碼難以閱讀，缺乏結構" }
          ]
        }
      ]
    }
  ]
}
\`\`\`

請在 JSON 之外提供中文說明，幫助教師理解評分標準的設計理念和使用建議。

重要原則：
1. **教育專業性**：提供符合教育理論和實務的評分標準
2. **實用性**：確保評分標準易於理解和執行
3. **全面性**：涵蓋學習目標的各個面向
4. **差異化**：提供不同程度的評分級距（通常使用 1-4 分）
5. **上下文感知**：根據對話歷史調整建議，避免重複內容
6. **UUID 生成**：為每個 category 和 criterion 生成唯一的 UUID

當用戶要求修改時，請根據之前的對話內容和生成的評分標準進行調整。`;

/**
 * POST /api/ai/rubric-chat
 * Streaming chat endpoint for AI-powered rubric generation
 *
 * Accepts a messages array and returns a streaming text response
 * Compatible with Vercel AI SDK's useChat hook
 */
export async function action({ request }: Route.ActionArgs) {
  try {
    // 1. Authentication
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { messages, data } = body;

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: 'Invalid request: messages array required' }, { status: 400 });
    }

    logger.info('Rubric chat request received', {
      userId,
      messageCount: messages.length,
      hasData: !!data,
    });

    // 3. Get API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.error('GEMINI_API_KEY not configured');
      return Response.json({ error: 'AI service not configured' }, { status: 500 });
    }

    // 4. Convert messages to AI SDK format
    const coreMessages = convertToModelMessages(messages);

    // 5. Create Google provider with explicit API key
    const googleProvider = createGoogleGenerativeAI({
      apiKey: apiKey,
    });

    // 6. Create streaming response
    const result = streamText({
      model: googleProvider('gemini-2.0-flash-exp'),
      system: RUBRIC_SYSTEM_PROMPT,
      messages: coreMessages,
      temperature: 0.8,
      maxOutputTokens: 4096,
      onFinish: ({ text, finishReason, usage }) => {
        logger.info('Rubric chat stream finished', {
          userId,
          finishReason,
          tokens: usage.totalTokens,
          textLength: text.length,
        });
      },
    });

    // 7. Return streaming response in UI Message Stream format (required by useChat)
    return result.toUIMessageStreamResponse();
  } catch (error) {
    logger.error('Rubric chat error:', error);

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
