// app/services/grading.server.ts

import OpenAI from "openai";
import type { 
  FeedbackData, 
  AssignmentSubmission 
} from "~/types/grading";

// OpenAI 客戶端配置
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// OpenAI API 配置
const API_CONFIG = {
  model: "gpt-4",
  temperature: 0.3,
  max_tokens: 2000,
  frequency_penalty: 0.0,
  presence_penalty: 0.0,
} as const;

// 模擬數據
const mockFeedback: FeedbackData = {
  score: 85,
  summaryComments: "摘要清晰地概述了學習的多面向性，並善用了柏拉圖和洛克的思維進行對比。論述結構完整，層次分明。",
  summaryStrengths: ["概念闡述清晰", "理論引用恰當", "結構層次分明"],
  reflectionComments: "反思部分深入探討了不同身分角色的學習需求，展現了多角度的思考方式和深刻的個人見解。",
  reflectionStrengths: ["多角度思考", "個人見解深刻", "例證具體充實"],
  questionComments: "提出的問題具有時代性和前瞻性，關注到科技與學習的結合，以及知識傳遞的可行性問題。",
  questionStrengths: ["問題具前瞻性", "思考面向完整", "關注實踐可行性"],
  overallSuggestions: "建議可以在反思部分增加更多個人經驗的連結，並在問題部分提供一些可能的解決方向。同時，摘要部分可以更緊扣核心概念進行論述。",
  createdAt: new Date(),
  gradingDuration: 5000, // 5 秒
};

// 系統提示詞構建函數
function buildSystemPrompt(): string {
  return `你是一位專精於學習理論的教育學教授，特別熟悉包括行為主義、認知主義、建構主義、社會學習理論、人本主義等各種學習理論。

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

請按照指定的 JSON 格式提供詳細的評分回饋。`;
}

// 轉換提交內容為評分請求文本
function formatSubmissionForGrading(submission: AssignmentSubmission): string {
  return submission.sections
    .sort((a, b) => a.order - b.order)
    .map(section => `${section.title}:\n${section.content}`)
    .join('\n\n');
}

export async function gradeAssignment(submission: AssignmentSubmission): Promise<FeedbackData> {
  const startTime = Date.now();

  // 檢查環境變數
  if (!process.env.OPENAI_API_KEY || process.env.NODE_ENV === 'development') {
    console.warn('Using mock data:', process.env.NODE_ENV === 'development' ? 'development mode' : 'missing API key');
    return generateMockFeedback();
  }

  try {
    const formattedContent = formatSubmissionForGrading(submission);
    
    const response = await openai.chat.completions.create({
      ...API_CONFIG,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: formattedContent }
      ],
      response_format: { type: "json_object" }
    });

    const messageContent = response.choices[0]?.message?.content;
    if (!messageContent) {
      throw new Error('API 回應中沒有內容');
    }

    const apiResponse = JSON.parse(messageContent);
    const gradingDuration = Date.now() - startTime;

    const result: FeedbackData = {
      ...apiResponse,
      createdAt: new Date(),
      gradingDuration,
    };

    validateFeedbackData(result);
    return result;

  } catch (error) {
    console.error('OpenAI API Error:', error);
    if (process.env.NODE_ENV === 'production') {
      if (error instanceof Error) {
        throw new Error(`評分失敗: ${error.message}`);
      }
      throw new Error('評分過程發生未知錯誤');
    }
    return generateMockFeedback();
  }
}

function generateMockFeedback(): FeedbackData {
  return {
    ...mockFeedback,
    score: Math.floor(Math.random() * 20) + 75, // 75-95 的隨機分數
    createdAt: new Date(),
    gradingDuration: Math.floor(Math.random() * 3000) + 2000, // 2-5 秒
  };
}

function validateFeedbackData(data: unknown): asserts data is FeedbackData {
  const feedback = data as FeedbackData;
  
  const requiredStringFields: (keyof FeedbackData)[] = [
    'summaryComments',
    'reflectionComments',
    'questionComments',
    'overallSuggestions'
  ];

  const requiredArrayFields: (keyof FeedbackData)[] = [
    'summaryStrengths',
    'reflectionStrengths',
    'questionStrengths'
  ];

  // 檢查必要的字串欄位
  for (const field of requiredStringFields) {
    if (typeof feedback[field] !== 'string' || !feedback[field]) {
      throw new Error(`缺少必要欄位或欄位類型錯誤: ${field}`);
    }
  }

  // 檢查必要的陣列欄位
  for (const field of requiredArrayFields) {
    if (!Array.isArray(feedback[field]) || !feedback[field].length) {
      throw new Error(`缺少必要欄位或欄位類型錯誤: ${field}`);
    }
  }

  // 檢查分數
  if (typeof feedback.score !== 'number' || feedback.score < 0 || feedback.score > 100) {
    throw new Error('分數必須是 0-100 之間的數字');
  }

  // 檢查時間相關欄位
  if (!(feedback.createdAt instanceof Date)) {
    throw new Error('createdAt 必須是有效的日期');
  }

  if (typeof feedback.gradingDuration !== 'number' || feedback.gradingDuration <= 0) {
    throw new Error('gradingDuration 必須是正數');
  }
}