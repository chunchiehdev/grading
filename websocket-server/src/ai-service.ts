import { GoogleGenAI } from "@google/genai";
import logger from './logger.js';
import type { RubricGenerationRequest } from './types.js';

export async function generateRubricResponse(request: RubricGenerationRequest): Promise<string> {
  const { message, conversationHistory, context } = request;
  
  logger.info(`Generating rubric with AI - messageLength: ${message.length}, hasContext: ${!!context}, historyLength: ${conversationHistory.length}`);

  const prompt = createRubricPrompt(message, conversationHistory, context);

  try {
    const response = await callGeminiForRubric(prompt);
    logger.info('Successfully generated rubric with Gemini');
    return response;
  } catch (geminiError: any) {
    logger.warn(`Gemini API failed, trying OpenAI fallback: ${geminiError.message}`);
    
    try {
      const response = await callOpenAIForRubric(prompt);
      logger.info('Successfully generated rubric with OpenAI fallback');
      return response;
    } catch (openaiError) {
      logger.error(`Both AI services failed - Gemini: ${geminiError.message}, OpenAI: ${openaiError}`);
      throw new Error('AI 服務暫時不可用，請稍後再試');
    }
  }
}

function createRubricPrompt(message: string, conversationHistory: any[], context?: any): string {
  const contextInfo = context ? `\n當前評分標準內容：${JSON.stringify(context, null, 2)}\n` : '';
  
  const historyText = conversationHistory.length > 0 
    ? `\n對話歷史：\n${conversationHistory.map(h => `${h.role}: ${h.content}`).join('\n')}\n`
    : '';

  return `你是一個專業的教育評分標準生成助手。請根據用戶的需求，生成詳細且實用的評分標準。

${historyText}${contextInfo}

用戶最新需求：${message}

請遵循以下原則：
1. **理解用戶意圖**：仔細分析用戶的需求，判斷是要生成新的評分標準、修改現有標準、還是回答相關問題
2. **專業性**：評分標準要符合教育評估的專業要求
3. **實用性**：每個等級的描述都要具體、可操作、易於理解
4. **完整性**：包含完整的評分類別、標準項目和等級描述
5. **一致性**：整個評分標準的邏輯和風格要保持一致

**回應格式要求：**
- 如果需要生成評分標準，請在回應中包含 JSON 格式的評分標準，用 \`\`\`json 和 \`\`\` 包裝
- 如果需要詢問更多資訊，請以對話方式回應
- 如果是修改建議，請説明具體的修改方向

**評分標準 JSON 格式：**
\`\`\`json
{
  "name": "評分標準名稱",
  "description": "評分標準的詳細描述和使用說明",
  "categories": [
    {
      "name": "類別名稱",
      "criteria": [
        {
          "name": "評分項目名稱",
          "description": "評分項目的詳細說明和評估重點",
          "levels": [
            {
              "score": 4,
              "description": "優秀等級的具體表現描述（要具體、可測量）"
            },
            {
              "score": 3,
              "description": "良好等級的具體表現描述"
            },
            {
              "score": 2,
              "description": "及格等級的具體表現描述"
            },
            {
              "score": 1,
              "description": "需改進等級的具體表現描述"
            }
          ]
        }
      ]
    }
  ]
}
\`\`\`

請根據用戶需求生成或回應：`;
}

async function callGeminiForRubric(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    });

    const text = response.text;

    if (!text) {
      throw new Error('Empty response from Gemini API');
    }

    return text;
  } catch (error: any) {
    logger.error(`Gemini API detailed error: ${error.message} (status: ${error.status}, statusText: ${error.statusText}, name: ${error.name})`);
    
    throw error;
  }
}

async function callOpenAIForRubric(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '你是一個專業的教育評分標準生成助手，擅長創建清晰、實用的評分標準。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error('Empty response from OpenAI API');
    }

    return text;
  } catch (error) {
    logger.error(`OpenAI API error: ${error}`);
    throw error;
  }
}