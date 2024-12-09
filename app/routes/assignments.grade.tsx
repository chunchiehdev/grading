// app/routes/assignments.grade.tsx

import { type ActionFunctionArgs } from "@remix-run/node";
import { useActionData, useNavigation, useFetcher } from "@remix-run/react";
import { useState, useCallback, useMemo } from "react";
import { GradingContainer } from "~/components/grading/GradingContainer";
import { gradeAssignment } from "~/services/grading.server";
import { validateAssignment } from "~/utils/validation";
import { ValidationError, GradingServiceError } from "~/types/errors";

import type {
  FeedbackData,
  ValidationResult,
  GradingStatus,
  AssignmentSubmission,
  Section,
} from "~/types/grading";

// Action 回傳資料的類型定義
interface ActionErrorData {
  error: string;
  feedback?: never;
  validationErrors?: string[];
}

interface ActionSuccessData {
  feedback: FeedbackData;
  error?: never;
  validationErrors?: never;
}

type ActionData = ActionErrorData | ActionSuccessData;

// 定義基本的部分順序和配置
const SECTION_CONFIG: Section[] = [
  {
    id: "summary",
    title: "摘要",
    content: "",
    placeholder: "請輸入摘要內容...",
    maxLength: 500,
    required: true,
    order: 1,
    minLength: 10,
  },
  {
    id: "reflection",
    title: "反思",
    content: "",
    placeholder: "請輸入反思內容...",
    maxLength: 1000,
    required: true,
    order: 2,
    minLength: 10,
  },
  {
    id: "questions",
    title: "問題",
    content: "",
    placeholder: "請輸入問題內容...",
    maxLength: 300,
    required: true,
    order: 3,
    minLength: 10,
  },
];

// Action 處理函數
export async function action({
  request,
}: ActionFunctionArgs): Promise<ActionData> {
  try {
    const formData = await request.formData();

    console.log("接收到的表單數據:", Object.fromEntries(formData));

    const authorId = formData.get("authorId");
    const courseId = formData.get("courseId");

    if (!authorId || !courseId) {
      return {
        error: "缺少必要欄位",
        validationErrors: ["authorId 和 courseId 為必填欄位"],
      };
    }

    // 構建 AssignmentSubmission 物件
    const sections: Section[] = SECTION_CONFIG.map((config) => {
      const content = formData.get(config.id);
      return {
        ...config,
        content: typeof content === "string" ? content : "",
      };
    });

    for (const config of SECTION_CONFIG) {
      const content = formData.get(config.id);
      if (!content && config.required) {
        return {
          error: "缺少必要內容",
          validationErrors: [`${config.title}為必填項目`],
        };
      }
    }

    const submission: AssignmentSubmission = {
      sections,
      metadata: {
        submittedAt: new Date(),
        authorId: String(formData.get("authorId")),
        courseId: String(formData.get("courseId")),
      },
    };

    console.log("準備驗證的提交內容:", submission);

    // 驗證提交內容
    const validationResult = validateAssignment(submission);
    console.log("驗證結果:", validationResult);

    if (!validationResult.isValid) {
      throw new ValidationError(validationResult.errors);
    }
    console.log("開始調用評分服務");

    // 調用評分服務
    const feedback = await gradeAssignment(submission);

    console.log("評分服務返回結果:", feedback);

    return { feedback };
  } catch (error) {
    console.error("Grading error:", error);

    if (error instanceof ValidationError) {
      return {
        error: "驗證失敗",
        validationErrors: error.errors,
      };
    }

    if (error instanceof GradingServiceError) {
      return {
        error: "評分服務暫時無法使用，請稍後再試",
      };
    }

    return {
      error:
        error instanceof Error
          ? error.message
          : "系統發生未預期的錯誤，請聯繫系統管理員",
    };
  }
}

export default function AssignmentGradingPage() {
  const [retryCount, setRetryCount] = useState(0);
  const fetcher = useFetcher<typeof action>();

  const feedback = fetcher.data?.feedback;
  const error = fetcher.data?.error;
  const validationErrors = fetcher.data?.validationErrors;

  // 計算當前狀態
  const status = useMemo((): GradingStatus => {
    if (fetcher.state === "submitting") return "processing";
    if (error) return "error";
    if (feedback) return "completed";
    return "idle";
  }, [fetcher.state, error, feedback]);

  // 處理驗證完成
  const handleValidationComplete = useCallback((result: ValidationResult) => {
    if (!result.isValid) {
      console.log("Validation failed:", result.errors);
    }
  }, []);

  // 處理重試
  const handleRetry = useCallback(() => {
    setRetryCount((prev) => prev + 1);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8">
      <GradingContainer
        key={retryCount}
        sections={SECTION_CONFIG}
        feedback={feedback}
        error={error}
        validationErrors={validationErrors}
        status={status}
        onValidationComplete={handleValidationComplete}
        onRetry={handleRetry}
        fetcher={fetcher}  
      />
    </div>
  );
}
