import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import logger from '@/utils/logger';
import type { ChatAIRequest, ChatAIResponse, ChatContext } from '@/types/chat';

/**
 * 生成聊天回應的專業 Prompt
 */
function createChatPrompt(
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  context?: ChatContext
): string {
  // 根據不同的上下文類型提供專業化的系統提示
  let systemPrompt = '';

  if (context?.type === 'rubric_generation') {
    systemPrompt = `你是一個專業的教育評估專家，專門協助教師制定詳細的評分標準和學習評量工具。請遵循以下原則：

1. **教育專業性**：提供符合教育理論和實務的評分標準
2. **實用性**：確保評分標準易於理解和執行
3. **全面性**：涵蓋學習目標的各個面向
4. **差異化**：提供不同程度的評分級距
5. **上下文感知**：根據對話歷史調整建議，避免重複內容

特別注意：
- 如果用戶重複詢問類似問題，請基於之前的討論提供更深入或不同角度的建議
- 主動詢問用戶是否需要針對特定情境或程度調整標準
- 提供具體可操作的評分項目和描述`;
  } else {
    systemPrompt = `你是一個專業且友善的AI助手，專門協助用戶解答問題和提供幫助。請遵循以下原則：

1. **友善親切**：以溫暖、專業的語調回應
2. **準確有用**：提供準確且實用的資訊
3. **簡潔明瞭**：回答要清晰易懂，避免過於冗長
4. **上下文理解**：充分考慮對話歷史和情境
5. **中文回應**：請用繁體中文回應`;
  }

  const contextInfo = context ? `\n聊天情境：${JSON.stringify(context, null, 2)}\n` : '';

  const historyText =
    conversationHistory.length > 0
      ? `\n對話歷史：\n${conversationHistory.map((h, index) => `${index + 1}. ${h.role}: ${h.content}`).join('\n')}\n`
      : '';

  return `${systemPrompt}

${historyText}${contextInfo}

用戶最新訊息：${message}

請根據以上的對話歷史和情境，提供有針對性的專業回應：`;
}

/**
 * 測試 Gemini API 連接性
 */
async function testGeminiConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.warn('GEMINI_API_KEY not found in environment variables');
      return { success: false, error: 'GEMINI_API_KEY not configured' };
    }

    logger.debug('Testing Gemini connection with API key:', apiKey.substring(0, 10) + '...');

    const ai = new GoogleGenAI({ apiKey });

    // 發送簡單的測試請求
    logger.debug('Sending test request to Gemini...');
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: 'Hello',
    });

    logger.debug('Test request completed, checking response...');
    const text = response.text;

    if (text) {
      return { success: true };
    } else {
      return { success: false, error: 'Empty response from test request' };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Connection test failed: ${errorMessage}`,
    };
  }
}

/**
 * 調用 Gemini API 生成聊天回應
 */
async function callGeminiForChat(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.error('Gemini API key not found');
    throw new Error('Gemini API key not configured');
  }

  logger.debug('Calling Gemini API with key:', apiKey.substring(0, 10) + '...');
  const ai = new GoogleGenAI({ apiKey });

  try {
    logger.debug('Sending request to Gemini API...', {
      model: 'gemini-2.0-flash',
      promptLength: prompt.length,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        temperature: 0.8,
        maxOutputTokens: 2048,
      },
    });

    logger.debug('Received response from Gemini API');
    const text = response.text;

    if (!text) {
      throw new Error('Empty response from Gemini API');
    }

    return text;
  } catch (error: unknown) {
    const errorDetails = error instanceof Error
      ? {
          message: error.message,
          name: error.name,
        }
      : { error };

    logger.error('Gemini API chat error:', errorDetails);
    throw error;
  }
}

/**
 * 調用 OpenAI API 生成聊天回應（備用方案）
 */
async function callOpenAIForChat(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const client = new OpenAI({ apiKey });

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '你是一個專業且友善的AI助手，專門協助用戶解答問題和提供幫助。請用繁體中文回應。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 2000,
      temperature: 0.8,
    });

    const text = response.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error('Empty response from OpenAI API');
    }

    return text;
  } catch (error) {
    logger.error('OpenAI API chat error:', error);
    throw error;
  }
}

/**
 * 生成聊天回應的主要函數
 * 支援多個 AI 服務的 fallback 機制
 */
export async function generateChatResponse(request: ChatAIRequest): Promise<string> {
  const { message, conversationHistory, context } = request;

  // 建構專業的 prompt
  const prompt = createChatPrompt(message, conversationHistory, context);

  logger.info('Generating chat response with AI', {
    messageLength: message.length,
    hasContext: !!context,
    historyLength: conversationHistory.length,
  });

  // 先測試 Gemini API 連接性
  const connectionTest = await testGeminiConnection();
  if (!connectionTest.success) {
    logger.warn('Gemini API connection test failed', { error: connectionTest.error });
    // 直接跳到 OpenAI 備用方案
    try {
      const response = await callOpenAIForChat(prompt);
      logger.info('Successfully generated chat response with OpenAI (Gemini connection failed)');
      return response;
    } catch (openaiError) {
      logger.error('Both AI services failed for chat', {
        geminiError: connectionTest.error,
        openaiError,
      });
      throw new Error('AI 服務暫時不可用，請稍後再試');
    }
  }

  // 嘗試使用 Gemini API
  try {
    const response = await callGeminiForChat(prompt);
    logger.info('Successfully generated chat response with Gemini');
    return response;
  } catch (geminiError: unknown) {
    const errorMsg = geminiError instanceof Error ? geminiError.message : 'Unknown error';
    logger.warn('Gemini API failed for chat, trying OpenAI fallback', {
      error: errorMsg,
    });

    // 使用 OpenAI 作為備用方案
    try {
      const response = await callOpenAIForChat(prompt);
      logger.info('Successfully generated chat response with OpenAI fallback');
      return response;
    } catch (openaiError) {
      logger.error('Both AI services failed for chat', { geminiError, openaiError });

      // 兩個 AI 服務都失敗時，拋出錯誤讓上層處理
      throw new Error('AI 服務暫時不可用，請稍後再試');
    }
  }
}
