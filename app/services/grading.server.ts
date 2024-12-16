import OpenAI from "openai";
import type { FeedbackData, AssignmentSubmission } from "~/types/grading";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import util from "util";

function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("OpenAI API key is missing");
    return null;
  }
  return new OpenAI({ apiKey });
}

const OLLAMA_CONFIG = {
  baseUrl:
    process.env.OLLAMA_API_URL ||
    "https://ollama.lazyinwork.com/api/chat/completions",
  apiKey: process.env.OLLAMA_API_KEY,
  model: process.env.OLLAMA_MODEL || "llama3.1:8b",
} as const;

const openai = createOpenAIClient();

const OPENAI_CONFIG = {
  model: "gpt-4o-mini",
  temperature: 0.3,
  max_tokens: 2000,
  frequency_penalty: 0.0,
  presence_penalty: 0.0,
} as const;

type ProgressCallback = (
  phase: string,
  progress: number,
  message: string
) => void;

type OllamaMessage = {
  role: string;
  content: string;
};
const mockFeedback: FeedbackData = {
  score: 85,
  summaryComments:
    "摘要清晰地概述了學習的多面向性，並善用了柏拉圖和洛克的思維進行對比。論述結構完整，層次分明。",
  summaryStrengths: ["概念闡述清晰", "理論引用恰當", "結構層次分明"],
  reflectionComments:
    "反思部分深入探討了不同身分角色的學習需求，展現了多角度的思考方式和深刻的個人見解。",
  reflectionStrengths: ["多角度思考", "個人見解深刻", "例證具體充實"],
  questionComments:
    "提出的問題具有時代性和前瞻性，關注到科技與學習的結合，以及知識傳遞的可行性問題。",
  questionStrengths: ["問題具前瞻性", "思考面向完整", "關注實踐可行性"],
  overallSuggestions:
    "建議可以在反思部分增加更多個人經驗的連結，並在問題部分提供一些可能的解決方向。同時，摘要部分可以更緊扣核心概念進行論述。",
  createdAt: new Date(),
  gradingDuration: 5000,
};

function buildSystemPrompt(): string {
  return `IMPORTANT: You must:
1. Always respond in valid JSON format
你是一位專精於學習理論的教育學教授，特別熟悉包括行為主義、認知主義、建構主義、社會學習理論、人本主義等各種學習理論。
請你以教育專家的角度，依據以下評分標準來評估學生的學習理論申論：

STEP 1 - CONTENT VALIDATION:
首先必須嚴格檢查內容是否有意義。如果發現以下任一情況：
- 內容只有標點符號
- 內容少於 10 個有意義的字
- 重複的字符
- 無法理解的文字
- 空白內容
- 亂碼或隨機字符

必須立即回傳以下固定格式，不需要進行任何評估：
{
  "score": 0,
  "summaryComments": "無效的提交內容：內容不符合基本要求。",
  "summaryStrengths": ["需要提供有意義的摘要"],
  "reflectionComments": "無法進行評估：未提供有效內容",
  "reflectionStrengths": ["需要提供有意義的反思"],
  "questionComments": "無法進行評估：未提供有效內容",
  "questionStrengths": ["需要提供有意義的問題"],
  "overallSuggestions": "請重新提交包含實質內容的學習理論論述。不接受空白、無意義符號或重複文字。"
}

STEP 2 - NORMAL EVALUATION:
只有在通過上述內容驗證後，才進行以下正常評分...

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

Response must strictly follow this JSON format:

{
  "score": 85,
  "summaryComments": "對摘要部分的詳細評語",
  "summaryStrengths": ["優點1", "優點2", "優點3"],
  "reflectionComments": "對反思部分的詳細評語",
  "reflectionStrengths": ["優點1", "優點2", "優點3"],
  "questionComments": "對問題部分的詳細評語",
  "questionStrengths": ["優點1", "優點2", "優點3"],
  "overallSuggestions": "整體改進建議"
}`;

}

function formatSubmissionForGrading(submission: AssignmentSubmission): string {
  return submission.sections
    .sort((a, b) => a.order - b.order)
    .map((section) => `${section.title}:\n${section.content}`)
    .join("\n\n");
}

function validateSubmissionFormat(content: string) {
  if (!content.trim()) {
    throw new Error("提交內容不能為空");
  }
}

function preprocessApiResponse(response: any): FeedbackData {
  const defaultResponse: FeedbackData = {
    score: 75,
    summaryComments: "內容需要進一步改進",
    summaryStrengths: ["基本概念理解正確"],
    reflectionComments: "反思部分需要加強",
    reflectionStrengths: ["有嘗試進行個人反思"],
    questionComments: "問題部分需要深化",
    questionStrengths: ["提出了基本問題"],
    overallSuggestions: "建議增加更多細節和深度",
    createdAt: new Date(),
    gradingDuration: 5000,
  };

  if (!response) {
    console.warn("API response is null or undefined, using default response");
    return defaultResponse;
  }

  const result = { ...defaultResponse, ...response };

  const arrayFields = [
    "summaryStrengths",
    "reflectionStrengths",
    "questionStrengths",
  ] as const;
  arrayFields.forEach((field) => {
    if (!Array.isArray(result[field]) || result[field].length === 0) {
      result[field] = defaultResponse[field];
    }
  });
  console.log("result", result)

  result.score = Math.max(0, Math.min(100, Number(result.score) || 0));

  return result;
}

async function mockGradeAssignment(
  submission: AssignmentSubmission,
  onProgress?: ProgressCallback
): Promise<FeedbackData> {
  const startTime = Date.now();
  let lastProgress = 0;

  try {
    for (let i = 0; i <= 30; i += 5) {
      const progress = Math.max(lastProgress, i);
      onProgress?.("check", progress, "正在檢查作業格式與內容...");
      lastProgress = progress;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    for (let i = 35; i <= 70; i += 5) {
      const progress = Math.max(lastProgress, i);
      onProgress?.("grade", progress, "正在進行作業評分...");
      lastProgress = progress;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    for (let i = 75; i <= 100; i += 5) {
      const progress = Math.max(lastProgress, i);
      onProgress?.("verify", progress, "正在驗證評分結果...");
      lastProgress = progress;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    onProgress?.("complete", 100, "評分流程完成！");

    return {
      ...mockFeedback,
      score: Math.floor(Math.random() * 20) + 75,
      createdAt: new Date(),
      gradingDuration: Date.now() - startTime,
    };
  } catch (error) {
    console.error("Mock grading error:", error);
    throw error;
  }
}

function validateFeedbackData(data: unknown): asserts data is FeedbackData {
  const feedback = data as FeedbackData;

  const requiredStringFields: (keyof FeedbackData)[] = [
    "summaryComments",
    "reflectionComments",
    "questionComments",
    "overallSuggestions",
  ];

  const requiredArrayFields: (keyof FeedbackData)[] = [
    "summaryStrengths",
    "reflectionStrengths",
    "questionStrengths",
  ];

  for (const field of requiredStringFields) {
    if (typeof feedback[field] !== "string" || !feedback[field]) {
      throw new Error(`缺少必要欄位或欄位類型錯誤: ${field}`);
    }
  }

  for (const field of requiredArrayFields) {
    if (!Array.isArray(feedback[field]) || !feedback[field].length) {
      throw new Error(`缺少必要欄位或欄位類型錯誤: ${field}`);
    }
  }

  if (
    typeof feedback.score !== "number" ||
    feedback.score < 0 ||
    feedback.score > 100
  ) {
    throw new Error("分數必須是 0-100 之間的數字");
  }

  if (!(feedback.createdAt instanceof Date)) {
    throw new Error("createdAt 必須是有效的日期");
  }

  if (
    typeof feedback.gradingDuration !== "number" ||
    feedback.gradingDuration <= 0
  ) {
    throw new Error("gradingDuration 必須是正數");
  }
}

async function callOllamaAPI(messages: OllamaMessage[]) {
  try {
    const requestBody = {
      model: OLLAMA_CONFIG.model,
      messages,
      format: {
        type: "json_object",
        schema: {
          additionalProperties: false,  
          description: "詳細的評分回饋",  
          type: "object",
          properties: {
            score: {
              type: "number",
              minimum: 0,
              maximum: 100,
            },
            summaryComments: { 
              type: "string",
              minLength: 500,      
              maxLength: 1000       
            },
            summaryStrengths: {
              type: "array",
              items: { type: "string" },
              minItems: 1,
              maxItems: 1
            },
            reflectionComments: { type: "string" },
            reflectionStrengths: {
              type: "array",
              items: { type: "string" },
              minItems: 1,
            },
            questionComments: { type: "string" },
            questionStrengths: {
              type: "array",
              items: { type: "string" },
              minItems: 1,
            },
            overallSuggestions: { type: "string" },
          },
          required: [
            "score",
            "summaryComments",
            "summaryStrengths",
            "reflectionComments",
            "reflectionStrengths",
            "questionComments",
            "questionStrengths",
            "overallSuggestions",
          ],
        },
      },
      options: {
        temperature: 0.1,
        top_p: 0.5,
        top_k: 10,
        seed: 42,
        repeat_penalty: 1.5,
        num_predict: 2000,
      },
      stream: false,
    };

    console.log("Sending request to Ollama API:", {
      url: OLLAMA_CONFIG.baseUrl,
      model: OLLAMA_CONFIG.model,
      messageCount: messages.length,
    });

    const response = await fetch(OLLAMA_CONFIG.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OLLAMA_CONFIG.apiKey}` || "",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Ollama API error response:", errorText);
      throw new Error(
        `Ollama API error: ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();
    // console.log("Raw Ollama API response:", data);

    console.log(
      "Raw Ollama API response:",
      util.inspect(data, {
        depth: null, // 完整展示所有層級
        colors: true, // 啟用顏色
        maxArrayLength: null, // 顯示完整陣列
        maxStringLength: null, // 顯示完整字串
      })
    );

    if (!data.choices?.[0]?.message?.content) {
      console.error("Invalid API response structure:", data);
      throw new Error("API response missing required content");
    }

    return {
      choices: [
        {
          message: {
            content:
              typeof data.choices[0].message.content === "string"
                ? data.choices[0].message.content
                : JSON.stringify(data.choices[0].message.content),
          },
        },
      ],
    };
  } catch (error) {
    console.error("Ollama API call failed:", error);
    throw error;
  }
}

function convertToOllamaMessages(
  messages: ChatCompletionMessageParam[]
): OllamaMessage[] {
  return messages.map((msg) => ({
    role: msg.role,
    content: String(msg.content || ""),
  }));
}

export async function gradeAssignment(
  submission: AssignmentSubmission,
  onProgress?: ProgressCallback,
  useOllama: boolean = true
): Promise<FeedbackData> {
  // 在開發環境中使用 mock 數據
  // if (process.env.NODE_ENV === 'development') {
  //   return mockGradeAssignment(submission, (phase, progress, message) => {
  //     try {
  //       onProgress?.(phase, progress, message);
  //     } catch (error) {
  //       console.error('Progress callback error:', error);
  //     }
  //   });
  // }

  // if (!openai) {
  //   console.warn("OpenAI client not available, using mock data");
  //   return mockGradeAssignment(submission, onProgress);
  // }

  const startTime = Date.now();

  try {
    onProgress?.("check", 0, "開始檢查作業格式與內容...");
    validateSubmissionFormat(formatSubmissionForGrading(submission));

    onProgress?.("check", 30, "作業格式檢查完成");

    onProgress?.("grade", 40, "正在進行作業評分...");

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: formatSubmissionForGrading(submission) },
    ];

    let attempts = 0;
    const maxAttempts = 3;
    let lastError: Error | null = null;

    while (attempts < maxAttempts) {
      try {
        console.log(`API call attempt ${attempts + 1} of ${maxAttempts}`);

        let response;

        if (useOllama) {
          
          const ollamaMessages = convertToOllamaMessages(messages);
          const ollamaResponse = await callOllamaAPI(ollamaMessages);
          response = ollamaResponse;
        } else if (openai) {
          response = await openai.chat.completions.create({
            ...OPENAI_CONFIG,
            messages,
            response_format: { type: "json_object" },
          });
        } else {
          throw new Error("No API client available");
        }

        console.log("OpenAI API response received", {
          type: useOllama ? "Ollama" : "OpenAI",
          status: "success",
          duration: Date.now() - startTime,
          responseLength: response.choices[0]?.message?.content?.length || 0,
        });

        onProgress?.("grade", 70, "評分完成，正在處理結果...");

        onProgress?.("verify", 80, "正在驗證評分結果...");
        const messageContent = response.choices[0]?.message?.content;
        if (!messageContent) {
          throw new Error("API 回應中沒有內容");
        }

        let apiResponse;
        try {
          apiResponse = JSON.parse(messageContent);

          console.log("API response parsed successfully", {
            hasScore: "score" in apiResponse,
            hasComments: "summaryComments" in apiResponse,
          });

          apiResponse = preprocessApiResponse(apiResponse);
        } catch (error) {
          console.error("JSON parsing error:", error);
          throw new Error("無法解析 API 回應的 JSON 格式");
        }

        onProgress?.("verify", 90, "正在進行最終確認...");

        const result: FeedbackData = {
          ...apiResponse,
          createdAt: new Date(),
          gradingDuration: Date.now() - startTime,
        };

        validateFeedbackData(result);
        onProgress?.("complete", 100, "評分流程完成！");

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("未知錯誤");
        attempts++;
        if (attempts === maxAttempts) {
          throw lastError;
        }
        const delay = 1000 * attempts;
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        onProgress?.("grade", 40, `重試中... (第 ${attempts} 次)`);
      }
    }

    throw lastError || new Error("評分失敗");
  } catch (error) {
    console.error("Grading error:", error);
    if (process.env.NODE_ENV === "production") {
      throw error instanceof Error ? error : new Error("評分過程發生未知錯誤");
    }
    console.warn("API call failed in development, using mock data");
    return mockGradeAssignment(submission, onProgress);
  }
}
