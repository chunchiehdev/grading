import OpenAI from "openai";
import type { FeedbackData, AssignmentSubmission } from "@/types/grading";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import _ from "lodash";

const createOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  return apiKey ? new OpenAI({ apiKey }) : null;
};

const OLLAMA_CONFIG = {
  baseUrl: _.get(
    process.env,
    "OLLAMA_API_URL",
    "https://ollama.lazyinwork.com/api/chat/completions"
  ),
  apiKey: process.env.OLLAMA_API_KEY,
  model: _.get(process.env, "OLLAMA_MODEL", "llama3.1:8b"),
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
type OllamaMessage = { role: string; content: string };

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

const callOllamaAPI = async (messages: OllamaMessage[]) => {
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

  try {
    const response = await fetch(OLLAMA_CONFIG.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OLLAMA_CONFIG.apiKey || ""}`,
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
  } catch (error) {
    console.error("Ollama API call failed:", error);
    throw error;
  }
};

const convertToOllamaMessages = (
  messages: ChatCompletionMessageParam[]
): OllamaMessage[] =>
  _.map(messages, (msg) => ({
    role: msg.role,
    content: String(msg.content || ""),
  }));

const executeWithRetry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  errorMessage: string,
  onProgress?: ProgressCallback,
  baseProgressStart: number = 40
): Promise<T> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const currentProgress = baseProgressStart + attempt * 5;
      onProgress?.(
        "grade",
        currentProgress,
        `${errorMessage}（第 ${attempt} 次嘗試）`
      );
      return await fn();
    } catch (error) {
      const delay = 1000 * Math.pow(2, attempt - 1);
      console.warn(`${errorMessage}，將在 ${delay}ms 後重試`, error);

      if (attempt === maxAttempts) throw error;

      onProgress?.(
        "grade",
        baseProgressStart + attempt * 5,
        `重試中...（第 ${attempt} 次）`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error(errorMessage);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const MIN_PHASE_DURATION = {
  check: 1500,
  grade: 3000,
  verify: 5000,
} as const;


const getProgressMessage = (phase: string): string => {
  switch (phase) {
    case "check":
      return "正在分析您的作業內容...";
    case "grade":
      return "正在評分中...請稍候";
    case "verify":
      return "正在整理評分結果...";
    case "complete":
      return "評分完成！";
    case "error":
      return "評分過程遇到了一些問題";
    default:
      return "處理中...";
  }
};

const ensureMinDuration = async (
  phase: string,
  fn: () => Promise<any>,
  onProgress?: ProgressCallback
): Promise<any> => {
  const startTime = Date.now();
  const result = await fn();
  const elapsed = Date.now() - startTime;
  const minDuration =
    MIN_PHASE_DURATION[phase as keyof typeof MIN_PHASE_DURATION] || 0;

  if (elapsed < minDuration) {
    const remainingTime = minDuration - elapsed;
    const steps = Math.floor(remainingTime / 100);
    for (let i = 0; i < steps; i++) {
      await sleep(100);
      if (onProgress) {
        const progress = Math.min(100, Math.floor((i / steps) * 100));
        onProgress(phase, progress, getProgressMessage(phase));  // 修改這裡

      }
    }
  }

  return result;
};

export const gradeAssignment = async (
  submission: AssignmentSubmission,
  onProgress?: ProgressCallback,
  useOllama: boolean = true
): Promise<FeedbackData> => {

  const CONFIG = {
    MAX_OLLAMA_ATTEMPTS: 3,
    MAX_OPENAI_ATTEMPTS: 2,
  };

  const startTime = Date.now();
  let currentProgress = 0;
  let apiResponse = null;

  const updateApiProgress = (
    phase: string,
    progress: number,
    message: string
  ) => {
    currentProgress = Math.max(currentProgress, progress);
    const userMessage = message.includes("第")
      ? getProgressMessage(
          phase
        )
      : getProgressMessage(phase);
    onProgress?.(phase, currentProgress, userMessage);

    console.log(
      `Phase: ${phase}, Progress: ${currentProgress}, Message: ${message}`
    );
  };

  try {
    await ensureMinDuration(
      "check",
      async () => {
        updateApiProgress("check", 0, "開始檢查作業格式與內容...");
        validateSubmissionFormat(formatSubmissionForGrading(submission));
        updateApiProgress("check", 30, "作業格式檢查完成");
      },
      onProgress
    );

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: formatSubmissionForGrading(submission) },
    ];

    let response = null;
    if (useOllama) {
      try {
        response = await ensureMinDuration(
          "grade",
          async () => {
            updateApiProgress("grade", 40, "正在使用 Ollama 進行評分...");
            const result = await executeWithRetry(
              async () => callOllamaAPI(convertToOllamaMessages(messages)),
              CONFIG.MAX_OLLAMA_ATTEMPTS,
              "Ollama API 呼叫失敗",
              (phase, progress, message) =>
                updateApiProgress(phase, progress + 40, message),
              0
            );
            updateApiProgress("grade", 60, "Ollama 評分完成");
            return result;
          },
          onProgress
        );
      } catch (ollamaError) {
        console.warn("Ollama API 多次嘗試失敗，切換到 OpenAI", ollamaError);

        if (!openai) {
          updateApiProgress("error", currentProgress, "無可用的 API");
          throw new Error("無可用的 API");
        }

        response = await ensureMinDuration(
          "grade",
          async () => {
            updateApiProgress("grade", 65, "切換到 OpenAI API");
            const result = await executeWithRetry(
              async () =>
                openai.chat.completions.create({
                  ...OPENAI_CONFIG,
                  messages,
                  response_format: { type: "json_object" },
                }),
              CONFIG.MAX_OPENAI_ATTEMPTS,
              "OpenAI API 呼叫失敗",
              (phase, progress, message) =>
                updateApiProgress(phase, progress + 65, message),
              0
            );
            updateApiProgress("grade", 75, "OpenAI 評分完成");
            return result;
          },
          onProgress
        );
      }
    }

    if (!response) {
      throw new Error("未收到 API 回應");
    }

    await ensureMinDuration(
      "verify",
      async () => {
        updateApiProgress("grade", 80, "評分完成，正在處理結果...");

        const messageContent = _.get(response, "choices[0].message.content");
        if (!messageContent) {
          throw new Error("API 回應中沒有內容");
        }

        try {
          apiResponse = preprocessApiResponse(JSON.parse(messageContent));
        } catch (error) {
          console.error("JSON 解析錯誤:", error);
          throw new Error("無法解析 API 回應的 JSON 格式");
        }

        updateApiProgress("verify", 90, "正在驗證評分結果...");

        const result: FeedbackData = {
          ...apiResponse,
          createdAt: new Date(),
          gradingDuration: Date.now() - startTime,
        };

        validateFeedbackData(result);
        updateApiProgress("complete", 100, "評分流程完成！");
        return result;
      },
      onProgress
    );

    if (!apiResponse) {
      throw new Error("未能成功取得評分結果");
    }

    return apiResponse;
  } catch (error) {
    console.error("評分失敗:", error);
    updateApiProgress(
      "error",
      currentProgress,
      `評分發生錯誤: ${_.get(error, "message", "未知錯誤")}`
    );

    if (process.env.NODE_ENV !== "production") {
      console.warn("API 呼叫失敗，使用 mock 數據");
      return mockGradeAssignment(submission, onProgress);
    }

    throw _.isError(error) ? error : new Error("評分過程發生未知錯誤");
  } finally {
    if (currentProgress < 100) {
      updateApiProgress("complete", 100, "評分流程結束");
    }
  }
};