// app/services/grading.server.ts
import OpenAI from "openai";
import type { FeedbackData } from "~/types/grading";

// 初始化 OpenAI 客戶端
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // 注意這裡改用一般的環境變數名稱
});

// 模擬數據，當 API 失敗時使用
const mockFeedback: FeedbackData = {
  score: 85,
  summaryComments: "摘要清晰地概述了學習的多面向性，並善用了柏拉圖和洛克的思維進行對比。論述結構完整，層次分明。",
  summaryStrengths: ["概念闡述清晰", "理論引用恰當", "結構層次分明"],
  reflectionComments: "反思部分深入探討了不同身分角色的學習需求，展現了多角度的思考方式和深刻的個人見解。",
  reflectionStrengths: ["多角度思考", "個人見解深刻", "例證具體充實"],
  questionComments: "提出的問題具有時代性和前瞻性，關注到科技與學習的結合，以及知識傳遞的可行性問題。",
  questionStrengths: ["問題具前瞻性", "思考面向完整", "關注實踐可行性"],
  overallSuggestions: "建議可以在反思部分增加更多個人經驗的連結，並在問題部分提供一些可能的解決方向。同時，摘要部分可以更緊扣核心概念進行論述。"
};

// 定義系統提示詞
const SYSTEM_PROMPT = `你是一位專精於學習理論的教育學教授，特別熟悉包括行為主義、認知主義、建構主義、社會學習理論、人本主義等各種學習理論。

請你以教育專家的角度，依據以下評分標準來評估學生的學習理論申論：

1. 摘要部分評估要點：
- 理論理解的準確性
- 重要概念的掌握程度
- 不同學習理論間的連結與比較
- 論述的邏輯性和完整性

2. 反思部分評估要點：
- 理論與實務的結合度
- 個人經驗與理論的連結
- 思考的深度與廣度
- 觀點的創新性

3. 問題部分評估要點：
- 問題與學習理論的相關性
- 問題的創新性與前瞻性
- 解決方案的可行性
- 理論應用的適切性

請按照以下 JSON 格式提供詳細的評分回饋：
{
  "score": 數字(0-100),
  "summaryComments": "針對摘要部分的詳細評語，著重於理論理解與概念掌握",
  "summaryStrengths": ["優點1", "優點2", "優點3"],
  "reflectionComments": "針對反思部分的詳細評語，著重於理論應用與個人見解",
  "reflectionStrengths": ["優點1", "優點2", "優點3"],
  "questionComments": "針對問題部分的詳細評語，著重於問題的理論基礎與創新性",
  "questionStrengths": ["優點1", "優點2", "優點3"],
  "overallSuggestions": "整體改進建議，包含理論應用與學術寫作方面的具體建議"
}`;

// OpenAI API 配置
const API_CONFIG = {
  model: "gpt-4o-mini",
  temperature: 0.3,
  max_tokens: 2000,
  frequency_penalty: 0.0,
  presence_penalty: 0.0,
} as const;

export async function gradeAssignment(content: string): Promise<FeedbackData> {
  // 檢查環境變數
  console.log("bbb")
  console.log("aaa",process.env.NODE_ENV)
  if (!process.env.OPENAI_API_KEY) {
    console.warn('Missing OpenAI API key, using mock data');
    return generateMockFeedback();
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('Using mock data in development');
    return generateMockFeedback();
  }

  try {
    const response = await openai.chat.completions.create({
      ...API_CONFIG,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content }
      ],
      response_format: { type: "json_object" }
    });

    const messageContent = response.choices[0]?.message?.content;
    if (!messageContent) {
      throw new Error('No content in response');
    }

    const result = JSON.parse(messageContent) as FeedbackData;

    validateFeedbackData(result);
    return result;

  } catch (error) {
    console.error('OpenAI API Error:', error);
    // 在生產環境中拋出錯誤
    if (error instanceof Error) {
      throw new Error(`評分失敗: ${error.message}`);
    }
    throw new Error('評分過程發生未知錯誤');
  }
}

// 生成模擬回饋
function generateMockFeedback(): FeedbackData {
  return {
    ...mockFeedback,
    score: Math.floor(Math.random() * 20) + 75, // 75-95 的隨機分數
  };
}

// 驗證回饋數據格式
function validateFeedbackData(data: unknown): asserts data is FeedbackData {
  const feedback = data as FeedbackData;
  
  if (
    typeof feedback.score !== 'number' ||
    typeof feedback.summaryComments !== 'string' ||
    !Array.isArray(feedback.summaryStrengths) ||
    typeof feedback.reflectionComments !== 'string' ||
    !Array.isArray(feedback.reflectionStrengths) ||
    typeof feedback.questionComments !== 'string' ||
    !Array.isArray(feedback.questionStrengths) ||
    typeof feedback.overallSuggestions !== 'string'
  ) {
    throw new Error('Invalid feedback data format');
  }
}