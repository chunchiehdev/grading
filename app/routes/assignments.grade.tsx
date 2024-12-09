// app/routes/assignments.grade.tsx

import { type ActionFunctionArgs } from "@remix-run/node";
import { useActionData, useNavigation } from "@remix-run/react";
import { useState, useCallback } from "react";
import { GradingContainer } from "~/components/grading/GradingContainer";
import { gradeAssignment } from "~/services/grading.server";
import { validateAssignment } from "~/utils/validation";
import type { 
  FeedbackData, 
  ValidationResult, 
  GradingStatus,
  AssignmentSubmission,
  Section 
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
    minLength: 50
  },
  {
    id: "reflection",
    title: "反思",
    content: "",
    placeholder: "請輸入反思內容...",
    maxLength: 1000,
    required: true,
    order: 2,
    minLength: 100
  },
  {
    id: "questions",
    title: "問題",
    content: "",
    placeholder: "請輸入問題內容...",
    maxLength: 300,
    required: true,
    order: 3,
    minLength: 30
  }
];

// Action 處理函數
export async function action({ request }: ActionFunctionArgs): Promise<ActionData> {
  try {
    const formData = await request.formData();

    console.log("接收到的表單數據:", Object.fromEntries(formData));

    
    // 構建 AssignmentSubmission 物件
    const sections: Section[] = SECTION_CONFIG.map(config => ({
      ...config,
      content: formData.get(config.id) as string || ""
    }));

    const submission: AssignmentSubmission = {
      sections,
      metadata: {
        submittedAt: new Date(),
        authorId: formData.get("authorId") as string,
        courseId: formData.get("courseId") as string
      }
    };

    // 驗證提交內容
    const validationResult = validateAssignment(submission);

    if (!validationResult.isValid) {
      return {
        error: "驗證失敗",
        validationErrors: validationResult.errors
      };
    }

    // 調用評分服務
    const feedback = await gradeAssignment(submission);
    return { feedback };

  } catch (error) {
    console.error("Grading error:", error);
    return {
      error: error instanceof Error 
        ? error.message 
        : "評分過程發生未知錯誤"
    };
  }
}

// 頁面組件
export default function AssignmentGradingPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [retryCount, setRetryCount] = useState(0);

  // 處理各種狀態
  const isGrading = navigation.state === "submitting";
  const feedback = actionData && 'feedback' in actionData ? actionData.feedback : undefined;
  const error = actionData && 'error' in actionData ? actionData.error : undefined;
  const validationErrors = actionData && 'validationErrors' in actionData 
    ? actionData.validationErrors 
    : undefined;

  // 計算當前狀態
  const status: GradingStatus = isGrading 
    ? "processing" 
    : error 
    ? "error" 
    : feedback 
    ? "completed" 
    : "idle";

  // 處理驗證完成
  const handleValidationComplete = useCallback((result: ValidationResult) => {
    if (!result.isValid) {
      console.log("Validation failed:", result.errors);
    }
  }, []);

  // 處理重試
  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8">
      <GradingContainer
        key={retryCount}
        sections={SECTION_CONFIG}
        isGrading={isGrading}
        feedback={feedback}
        error={error}
        validationErrors={validationErrors}
        status={status}
        onValidationComplete={handleValidationComplete}
        onRetry={handleRetry}
      />
    </div>
  );
}