/**
 * Thought Summary Formatter Service
 *
 * 將 AI 的原始思考過程格式化為學生友好的 Markdown 內容
 *
 * Features:
 * - 使用 Gemini API 格式化（主要）
 * - 失敗時 fallback 到 OpenAI
 * - 移除 JSON 和技術細節
 * - 轉換為清晰的 Markdown 結構
 *
 * Architecture:
 * - 使用 Vercel AI SDK 的 generateText
 * - 與現有 AI providers 整合
 * - 錯誤處理和降級策略
 */

import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import logger from '@/utils/logger';
import { getKeyHealthTracker } from './gemini-key-health.server';

interface FormatThoughtParams {
  rawThought: string;
  language?: 'zh' | 'en';
}

interface FormatThoughtResult {
  success: boolean;
  formattedThought?: string;
  provider?: 'gemini' | 'openai' | 'fallback';
  error?: string;
}

/**
 * 格式化思考過程 - 使用 Gemini，失敗時 fallback 到 OpenAI
 */
export async function formatThoughtSummary(params: FormatThoughtParams): Promise<FormatThoughtResult> {
  const { rawThought, language = 'zh' } = params;

  // 如果原始內容太短或為空，直接返回
  if (!rawThought || rawThought.trim().length < 50) {
    logger.info('Thought summary too short, skipping formatting');
    return {
      success: true,
      formattedThought: rawThought,
      provider: 'fallback',
    };
  }

  // 先嘗試 Gemini
  const geminiResult = await formatWithGemini(rawThought, language);
  if (geminiResult.success) {
    return geminiResult;
  }

  logger.warn('Gemini formatting failed, falling back to OpenAI');

  // Fallback 到 OpenAI
  const openaiResult = await formatWithOpenAI(rawThought, language);
  if (openaiResult.success) {
    return openaiResult;
  }

  // 兩者都失敗，返回原始內容
  logger.error('All formatting attempts failed, using raw thought');
  return {
    success: false,
    formattedThought: rawThought,
    provider: 'fallback',
    error: 'All formatting providers failed',
  };
}

/**
 * 使用 Gemini 格式化思考過程
 */
async function formatWithGemini(rawThought: string, language: 'zh' | 'en'): Promise<FormatThoughtResult> {
  const healthTracker = getKeyHealthTracker();

  // Check if multiple keys are available
  const hasMultipleKeys = !!(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY2 &&
    process.env.GEMINI_API_KEY3
  );

  const availableKeyIds = hasMultipleKeys ? ['1', '2', '3'] : ['1'];
  const selectedKeyId = await healthTracker.selectBestKey(availableKeyIds);

  if (!selectedKeyId) {
    return {
      success: false,
      error: 'No healthy Gemini API keys available',
    };
  }

  // Map key ID to environment variable
  const keyMap: Record<string, string | undefined> = {
    '1': process.env.GEMINI_API_KEY,
    '2': process.env.GEMINI_API_KEY2,
    '3': process.env.GEMINI_API_KEY3,
  };

  const apiKey = keyMap[selectedKeyId];
  if (!apiKey) {
    return {
      success: false,
      error: `Gemini API key ${selectedKeyId} not found`,
    };
  }

  const geminiProvider = createGoogleGenerativeAI({ apiKey });
  const startTime = Date.now();

  try {
    logger.info({
      keyId: selectedKeyId,
      inputLength: rawThought.length,
      language,
    }, 'Formatting thought summary with Gemini');

    const prompt = generateFormattingPrompt(rawThought, language);

    const result = await generateText({
      model: geminiProvider('gemini-2.0-flash'),
      prompt,
      temperature: 0.3,
    });

    const responseTimeMs = Date.now() - startTime;

    // 記錄成功
    await healthTracker.recordSuccess(selectedKeyId, responseTimeMs);

    logger.info({
      keyId: selectedKeyId,
      responseTimeMs,
      inputLength: rawThought.length,
      outputLength: result.text.length,
    }, 'Gemini formatting succeeded');

    return {
      success: true,
      formattedThought: result.text,
      provider: 'gemini',
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;

    // 記錄失敗
    await healthTracker.recordFailure(selectedKeyId, 'other', String(error));

    logger.error({
      keyId: selectedKeyId,
      responseTimeMs,
      error: error instanceof Error ? error.message : String(error),
    }, 'Gemini formatting failed');

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Gemini error',
    };
  }
}

/**
 * 使用 OpenAI 格式化思考過程
 */
async function formatWithOpenAI(rawThought: string, language: 'zh' | 'en'): Promise<FormatThoughtResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: 'OpenAI API key not configured',
    };
  }

  const openaiProvider = createOpenAI({ apiKey });
  const startTime = Date.now();

  try {
    logger.info({
      inputLength: rawThought.length,
      language,
    }, 'Formatting thought summary with OpenAI');

    const prompt = generateFormattingPrompt(rawThought, language);

    const result = await generateText({
      model: openaiProvider('gpt-4o-mini'),
      prompt,
      temperature: 0.3,
    });

    const responseTimeMs = Date.now() - startTime;

    logger.info({
      responseTimeMs,
      inputLength: rawThought.length,
      outputLength: result.text.length,
    }, 'OpenAI formatting succeeded');

    return {
      success: true,
      formattedThought: result.text,
      provider: 'openai',
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;

    logger.error({
      responseTimeMs,
      error: error instanceof Error ? error.message : String(error),
    }, 'OpenAI formatting failed');

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown OpenAI error',
    };
  }
}

/**
 * 生成格式化提示詞
 */
function generateFormattingPrompt(rawThought: string, language: 'zh' | 'en'): string {
  if (language === 'zh') {
    return `
以下是 AI 評分系統的原始思考過程，其中可能包含 JSON 格式、技術細節和混亂的結構。

請將其整理成**適合學生閱讀**的 Markdown 格式：

## 要求：

1. **使用清晰的 Markdown 結構**
   - 使用標題（##、###）組織內容
   - 使用列表（-、1.）突出要點
   - 使用粗體（**）強調關鍵詞

2. **移除技術細節**
   - 刪除所有 JSON 代碼塊
   - 移除 API 調用、ID、技術參數
   - 去除元數據和系統訊息

3. **保留評分邏輯**
   - 保留評分的推理過程
   - 說明如何得出各項分數
   - 解釋評分的關鍵考量點

4. **學生友好的語言**
   - 使用清晰易懂的繁體中文
   - 避免過於技術化的表達
   - 突出對學生有幫助的洞察

5. **結構建議**（可調整）：
   - ## 評分思考過程
   - ### 主要發現
   - ### 評分邏輯
   - ### 關鍵考量

## 原始思考過程：

${rawThought}

---

**請直接輸出整理後的 Markdown 內容，不要加任何前綴或後綴說明。**
`.trim();
  } else {
    return `
Below is the raw thinking process from an AI grading system, which may contain JSON formats, technical details, and unstructured content.

Please reorganize it into **student-friendly** Markdown format:

## Requirements:

1. **Use clear Markdown structure**
   - Use headings (##, ###) to organize content
   - Use lists (-, 1.) to highlight key points
   - Use bold (**) to emphasize keywords

2. **Remove technical details**
   - Delete all JSON code blocks
   - Remove API calls, IDs, technical parameters
   - Remove metadata and system messages

3. **Preserve grading logic**
   - Keep the reasoning process for scoring
   - Explain how each score was determined
   - Describe key considerations in grading

4. **Student-friendly language**
   - Use clear and understandable English
   - Avoid overly technical expressions
   - Highlight insights helpful to students

5. **Suggested structure** (adjustable):
   - ## Grading Thought Process
   - ### Key Findings
   - ### Scoring Logic
   - ### Critical Considerations

## Raw Thinking Process:

${rawThought}

---

**Please output the formatted Markdown content directly, without any prefix or suffix explanations.**
`.trim();
  }
}
