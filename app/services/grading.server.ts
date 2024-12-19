import OpenAI from "openai";
import type { FeedbackData, AssignmentSubmission } from "~/types/grading";
import type {
  ChatCompletionMessageParam,
  ChatCompletionUserMessageParam,
  ChatCompletionSystemMessageParam,
  ChatCompletionAssistantMessageParam,
} from "openai/resources/chat/completions";
import _ from "lodash";

type ChatMessage = ChatCompletionUserMessageParam | ChatCompletionSystemMessageParam | ChatCompletionAssistantMessageParam;
type ProgressCallback = (
  phase: string,
  progress: number,
  message: string
) => void;
type OllamaMessage = {
  role: "user" | "system" | "assistant";
  content: string;
};

type ApiClient = "ollama" | "openai";

const CONFIG = {
  MIN_PHASE_DURATION: {
    check: 1500,
    grade: 5000, 
    verify: 3000,
  },
  RETRY_ATTEMPTS: {
    ollama: 3,
    openai: 2,
  },
  PROGRESS_RANGES: {
    ollama: { start: 20, end: 40 },
    openai: { start: 40, end: 70 },
  },
} as const;

const API_CONFIG = {
  ollama: {
    baseUrl: _.get(
      process.env,
      "OLLAMA_API_URL",
      "https://ollama.lazyinwork.com/api/chat/completions"
    ),
    apiKey: process.env.OLLAMA_API_KEY,
    model: _.get(process.env, "OLLAMA_MODEL", "llama3.1:8b"),
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
          maxLength: 1000,
        },
        summaryStrengths: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          maxItems: 1,
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
    options: {
      temperature: 0.1,
      top_p: 0.5,
      top_k: 10,
      seed: 42,
      repeat_penalty: 1.5,
      num_predict: 2000,
    },
  },
  openai: {
    model: "gpt-4o-mini",
    temperature: 0.3,
    max_tokens: 2000,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
  },
} as const;

class ApiService {
  constructor(private progressManager: ProgressManager) {}

  private async callOllamaAPI(messages: OllamaMessage[]) {
    const requestBody = {
      model: API_CONFIG.ollama.model,
      messages,
      format: {
        type: "json_object",
        schema: API_CONFIG.ollama.schema,
      },
      options: API_CONFIG.ollama.options,
      stream: false,
    };

    const response = await fetch(API_CONFIG.ollama.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_CONFIG.ollama.apiKey || ""}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Ollama API error: ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();
    const content = _.get(data, "choices[0].message.content");

    if (!content) {
      throw new Error("API response missing required content");
    }

    return {
      choices: [
        {
          message: {
            content: _.isString(content) ? content : JSON.stringify(content),
          },
        },
      ],
    };
  }

  private async executeWithRetry<T>(
    client: ApiClient,
    fn: () => Promise<T>,
    errorMessage: string
  ): Promise<T> {
    const { start: baseProgress } = CONFIG.PROGRESS_RANGES[client];
    const maxAttempts = CONFIG.RETRY_ATTEMPTS[client];

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.progressManager.update(
          "grade",
          baseProgress + attempt * 5,
          `${errorMessage}（第 ${attempt} 次嘗試）`
        );
        return await fn();
      } catch (error) {
        const delay = 1000 * Math.pow(2, attempt - 1);
        console.warn(`${errorMessage}，將在 ${delay}ms 後重試`, error);

        if (attempt === maxAttempts) throw error;

        this.progressManager.update(
          "grade",
          baseProgress + attempt * 5,
          `重試中...（第 ${attempt} 次）`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error(errorMessage);
  }

  async processWithAPI(messages: ChatMessage[]): Promise<any> {
    try {

      this.progressManager.update("grade", 20, "正在使用 Ollama 進行評分...");
      const ollamaMessages = messages.map(msg => ({
        role: msg.role,
        content: String(msg.content || "")
      }));

      return await this.executeWithRetry(
        'ollama',
        () => this.callOllamaAPI(ollamaMessages),
        "Ollama API 呼叫失敗"
      );
      
    } catch (ollamaError) {
      console.warn("Ollama API 多次嘗試失敗，切換到 OpenAI", ollamaError);
      this.progressManager.update("grade", 40, "切換到 OpenAI 進行評分...");

      const openai = ApiClientFactory.createOpenAIClient();
      if (!openai) {
        throw new Error("無可用的 API");
      }

      this.progressManager.update("grade", 60, "OpenAI 評分處理中...");

      return await this.executeWithRetry(
        "openai",
        () => openai.chat.completions.create({
          ...API_CONFIG.openai,
          messages: messages as ChatCompletionMessageParam[],
          response_format: { type: "json_object" },
        }),
        "OpenAI API 呼叫失敗"
      );
      
    }
  }
}

class ProgressManager {
  private currentProgress = 0;

  constructor(private callback?: ProgressCallback) {}

  update(phase: string, progress: number, message: string) {
    this.currentProgress = Math.max(this.currentProgress, progress);
    this.callback?.(phase, this.currentProgress, message);
    console.log(
      `Phase: ${phase}, Progress: ${this.currentProgress}, Message: ${message}`
    );
  }

  getCurrentProgress() {
    return this.currentProgress;
  }
}

class ApiClientFactory {
  private static openaiClient: OpenAI | null = null;

  static createOpenAIClient() {
    if (!this.openaiClient) {
      const apiKey = process.env.OPENAI_API_KEY;
      this.openaiClient = apiKey ? new OpenAI({ apiKey }) : null;
    }
    return this.openaiClient;
  }
}



class GradingService {
  private progressManager: ProgressManager;
  private apiService: ApiService;

  constructor(private callback?: ProgressCallback) {
    this.progressManager = new ProgressManager(callback);
    this.apiService = new ApiService(this.progressManager);
  }

  private async ensureMinDuration<T>(
    phase: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const result = await fn();
    const elapsed = Date.now() - startTime;
    const minDuration =
      CONFIG.MIN_PHASE_DURATION[
        phase as keyof typeof CONFIG.MIN_PHASE_DURATION
      ] || 0;

      if (elapsed < minDuration) {
        const remainingTime = minDuration - elapsed;
        const steps = Math.floor(remainingTime / 100);
        const startProgress = this.progressManager.getCurrentProgress();
        
        for (let i = 0; i < steps; i++) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          
          const progressIncrement = (100 - startProgress) / steps;
          const currentProgress = Math.min(
            100,
            startProgress + Math.floor(progressIncrement * (i + 1))
          );
          
          if (currentProgress < 100) {
            this.progressManager.update(
              phase,
              currentProgress,
              `${phase === "check" ? "檢查" : phase === "grade" ? "評分" : "驗證"}進行中...`
            );
          }
        }
      }

    return result;
  }

  async grade(submission: AssignmentSubmission): Promise<FeedbackData> {
    const startTime = Date.now();

    try {
      
      await this.ensureMinDuration("check", async () => {
        this.progressManager.update("check", 0, "開始檢查作業格式與內容...");
        validateSubmissionFormat(formatSubmissionForGrading(submission));
        this.progressManager.update("check", 30, "作業格式檢查完成");
      });

      
      const messages: ChatMessage[] = [
        { role: "system", content: buildSystemPrompt() } as const,
        { role: "user", content: formatSubmissionForGrading(submission) } as const,
      ];

      const response = await this.ensureMinDuration("grade", async () => {
        return await this.apiService.processWithAPI(messages);
      });

      
      const result = await this.ensureMinDuration("verify", async () => {
        this.progressManager.update("grade", 70, "評分完成，正在處理結果...");

        const messageContent = _.get(response, "choices[0].message.content");
        if (!messageContent) {
          throw new Error("API 回應中沒有內容");
        }

        const apiResponse = preprocessApiResponse(JSON.parse(messageContent));
        const feedback: FeedbackData = {
          ...apiResponse,
          createdAt: new Date(),
          gradingDuration: Date.now() - startTime,
        };
        this.progressManager.update("verify", 85, "正在進行結果驗證...");

        validateFeedbackData(feedback);
        this.progressManager.update("complete", 100, "評分流程完成！");
        return feedback;
      });

      return result;
    } catch (error) {
      console.error("評分失敗:", error);
      this.progressManager.update(
        "error",
        this.progressManager.getCurrentProgress(),
        `評分發生錯誤: ${_.get(error, "message", "未知錯誤")}`
      );

      if (process.env.NODE_ENV !== "production") {
        console.warn("API 呼叫失敗，使用 mock 數據");
        return mockGradeAssignment(submission, this.callback);
      }

      throw _.isError(error) ? error : new Error("評分過程發生未知錯誤");
    } finally {
      if (this.progressManager.getCurrentProgress() < 100) {
        this.progressManager.update("complete", 100, "評分流程結束");
      }
    }
  }
}

export const gradeAssignment = async (
  submission: AssignmentSubmission,
  onProgress?: ProgressCallback
): Promise<FeedbackData> => {
  const gradingService = new GradingService(onProgress);
  return gradingService.grade(submission);
};

const DEFAULT_FEEDBACK: FeedbackData = {
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

const formatSubmissionForGrading = (submission: AssignmentSubmission): string =>
  _(submission.sections)
    .sortBy("order")
    .map((section) => `${section.title}:\n${section.content}`)
    .join("\n\n");

const validateSubmissionFormat = _.flow([
  _.trim,
  (content) => {
    if (!content) throw new Error("提交內容不能為空");
    return content;
  },
]);

const preprocessApiResponse = (response: any): FeedbackData => {
  if (!response) {
    console.warn("API response is null or undefined, using default response");
    return DEFAULT_FEEDBACK;
  }

  const result = _.defaultsDeep({}, response, DEFAULT_FEEDBACK);

  const arrayFields = [
    "summaryStrengths",
    "reflectionStrengths",
    "questionStrengths",
  ] as const;
  arrayFields.forEach((field) => {
    if (!_.isArray(result[field]) || _.isEmpty(result[field])) {
      result[field] = DEFAULT_FEEDBACK[field];
    }
  });

  result.score = _.clamp(Number(result.score) || 0, 0, 100);
  return result;
};

const mockGradeAssignment = async (
  submission: AssignmentSubmission,
  onProgress?: ProgressCallback
): Promise<FeedbackData> => {
  const startTime = Date.now();
  let lastProgress = 0;

  const updateProgress = async (
    phase: string,
    progressRanges: [number, number],
    message: string
  ) => {
    const [start, end] = progressRanges;
    for (let i = start; i <= end; i += 5) {
      const progress = Math.max(lastProgress, i);
      onProgress?.(phase, progress, message);
      lastProgress = progress;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  };

  try {
    await updateProgress("check", [0, 30], "正在檢查作業格式與內容...");
    await updateProgress("grade", [35, 70], "正在進行作業評分...");
    await updateProgress("verify", [75, 100], "正在驗證評分結果...");

    onProgress?.("complete", 100, "評分流程完成！");

    return {
      ...DEFAULT_FEEDBACK,
      score: _.random(75, 95),
      createdAt: new Date(),
      gradingDuration: Date.now() - startTime,
    };
  } catch (error) {
    console.error("Mock grading error:", error);
    throw error;
  }
};

const validateFeedbackData: (data: unknown) => asserts data is FeedbackData = (
  data
) => {
  const feedback = data as FeedbackData;

  const validationRules = {
    stringFields: [
      "summaryComments",
      "reflectionComments",
      "questionComments",
      "overallSuggestions",
    ],
    arrayFields: [
      "summaryStrengths",
      "reflectionStrengths",
      "questionStrengths",
    ],
  };

  _.forEach(validationRules.stringFields, (field) => {
    if (
      !_.isString(_.get(feedback, field)) ||
      _.isEmpty(_.get(feedback, field))
    ) {
      throw new Error(`缺少必要欄位或欄位類型錯誤: ${field}`);
    }
  });

  _.forEach(validationRules.arrayFields, (field) => {
    if (
      !_.isArray(_.get(feedback, field)) ||
      _.isEmpty(_.get(feedback, field))
    ) {
      throw new Error(`缺少必要欄位或欄位類型錯誤: ${field}`);
    }
  });

  if (!_.inRange(feedback.score, 0, 101)) {
    throw new Error("分數必須是 0-100 之間的數字");
  }

  if (!(feedback.createdAt instanceof Date)) {
    throw new Error("createdAt 必須是有效的日期");
  }

  if (!_.isNumber(feedback.gradingDuration) || feedback.gradingDuration <= 0) {
    throw new Error("gradingDuration 必須是正數");
  }
};
