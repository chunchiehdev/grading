// assignments.grade.tsx
import { type ActionFunctionArgs } from "@remix-run/node";
import type { MetaFunction } from "@remix-run/node";
import { useActionData, useNavigation, useFetcher } from "@remix-run/react";
import { useState, useCallback, useMemo, useEffect } from "react";
import { GradingContainer } from "~/components/grading/GradingContainer";
import { gradeAssignment } from "~/services/grading.server";
import {
  validateAssignment,
  SECTION_VALIDATION_RULES,
} from "~/utils/validation";
import { ValidationError, GradingServiceError } from "~/types/errors";
import { useEventSource } from "remix-utils/sse/react";
import { ProgressService } from '~/services/progress.server';


export const meta: MetaFunction = () => {
  return [
    { title: "評分系統" },
    { name: "description", content: "專業的教育評分管理平台" },
  ];
};

import type {
  FeedbackData,
  ValidationResult,
  GradingStatus,
  AssignmentSubmission,
  Section,
} from "~/types/grading";

interface ActionErrorData {
  error: string;
  feedback?: never;
  validationErrors?: string[];
  taskId?: never;
}

interface ActionSuccessData {
  feedback: FeedbackData;
  error?: never;
  validationErrors?: never;
  taskId: string;
}

type ActionData = ActionErrorData | ActionSuccessData;


const SECTION_CONFIG: Section[] = [
  {
    id: "summary",
    title: "摘要",
    content: "",
    placeholder: "請輸入摘要內容...",
    maxLength: SECTION_VALIDATION_RULES.summary.maxLength,
    required: true,
    order: 1,
    minLength: SECTION_VALIDATION_RULES.summary.minLength,
  },
  {
    id: "reflection",
    title: "反思",
    content: "",
    placeholder: "請輸入反思內容...",
    maxLength: SECTION_VALIDATION_RULES.reflection.maxLength,
    required: true,
    order: 2,
    minLength: SECTION_VALIDATION_RULES.reflection.minLength,
  },
  {
    id: "questions",
    title: "問題",
    content: "",
    placeholder: "請輸入問題內容...",
    maxLength: SECTION_VALIDATION_RULES.questions.maxLength,
    required: true,
    order: 3,
    minLength: SECTION_VALIDATION_RULES.questions.minLength,
  },
];


export async function action({
  request,
}: ActionFunctionArgs): Promise<ActionData> {
  try {
    const formData = await request.formData();
    console.log("Action started with taskId:", formData.get("taskId"));
    const taskId = (formData.get("taskId") as string) || crypto.randomUUID();

    const authorId = formData.get("authorId");
    const courseId = formData.get("courseId");

    if (!taskId) {
      throw new Error("Missing taskId");
    }

    if (!authorId || !courseId) {
      return {
        error: "缺少必要欄位",
        validationErrors: ["authorId 和 courseId 為必填欄位"],
      };
    }

    const sections: Section[] = SECTION_CONFIG.map((config) => ({
      ...config,
      content: String(formData.get(config.id) || ""),
    }));

    const missingFields = sections
      .filter((section) => section.required && !section.content)
      .map((section) => section.title);

    if (missingFields.length > 0) {
      return {
        error: "缺少必要內容",
        validationErrors: missingFields.map((title) => `${title}為必填項目`),
      };
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

    const validationResult = validateAssignment(submission);
    console.log("驗證結果:", validationResult);

    if (!validationResult.isValid) {
      throw new ValidationError(validationResult.errors);
    }
    console.log("開始調用評分服務");

    const feedback = await gradeAssignment(
      submission,
      async (phase, progress, message) => {
        console.log("Progress update:", { taskId, phase, progress, message });
        await ProgressService.set(taskId, { phase, progress, message });
      }
    );

    console.log("Action completed with:", { feedback, taskId });

    return { feedback, taskId };
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
  const [gradingProgress, setGradingProgress] = useState(0);
  const [gradingPhase, setGradingPhase] = useState("check");
  const [gradingMessage, setGradingMessage] = useState("");

  const actionData = useActionData<typeof action>();
  const feedback = fetcher.data?.feedback;
  const error = fetcher.data?.error;
  const validationErrors = fetcher.data?.validationErrors;
  const [localTaskId, setLocalTaskId] = useState<string | null>(null);

  const status = useMemo((): GradingStatus => {
    console.log("Status calculation:", {
      fetcherState: fetcher.state,
      hasLocalTaskId: !!localTaskId,
      hasError: !!error,
      hasFeedback: !!feedback,
    });

    if (error) return "error";
    if (feedback) return "completed";
    if (fetcher.state === "submitting" || localTaskId) return "processing";
    return "idle";
  }, [fetcher.state, fetcher.data, error, feedback, localTaskId]);


  useEffect(() => {
    if (fetcher.state === "submitting") {
      const formData = fetcher.formData;
      const taskId = formData?.get("taskId") as string;
      if (taskId) {
        console.log("Setting taskId from form:", taskId);
        setLocalTaskId(taskId);
      }
    } else if (fetcher.state === "idle" && feedback) {

      setLocalTaskId(null);
    }
  }, [fetcher.state, feedback]);

  const progressUrl = useMemo(() => {
    const shouldConnect = status === "processing" && localTaskId;
    console.log("Progress URL calculation:", {
      status,
      localTaskId,
      shouldConnect,
      url: shouldConnect ? `/api/grading-progress?taskId=${localTaskId}` : "",
    });
    return shouldConnect ? `/api/grading-progress?taskId=${localTaskId}` : "";
  }, [status, localTaskId]);

  const progressData = useEventSource(progressUrl, {
    event: "grading-progress",
  });


  const handleRetry = useCallback(() => {
    setRetryCount((prev) => prev + 1);
    setGradingProgress(0);
    setGradingPhase("check");
    setGradingMessage("");
    setLocalTaskId(null);

    fetcher.data = undefined;
  }, [fetcher]);

  const handleValidationComplete = useCallback((result: ValidationResult) => {
    if (!result.isValid) {
      console.log("Validation failed:", result.errors);
    }
  }, []);

  useEffect(() => {
    return () => {
      setGradingProgress(0);
      setGradingPhase("check");
      setGradingMessage("");
      setLocalTaskId(null);
    };
  }, []);

  useEffect(() => {
    if (status === "idle" || status === "completed" || status === "error") {
      setGradingProgress(0);
      setGradingPhase("check");
      setGradingMessage("");
      setLocalTaskId(null);
    }
  }, [status]);

  useEffect(() => {
    if (!progressData) return;

    console.log("=== Progress Update ===");
    console.log("Progress URL:", progressUrl);
    console.log("Received Data:", progressData);

    try {
      const data = JSON.parse(progressData);
      console.log("Parsed Data:", data);

      setGradingProgress((prev) => Math.max(prev, data.progress));
      setGradingPhase(data.phase);
      setGradingMessage(data.message || "評分進行中...");


      if (data.phase === "complete") {
        setLocalTaskId(null);
      }
    } catch (error) {
      console.error("Error parsing progress data:", error);
    }
  }, [progressData, progressUrl]);

  useEffect(() => {
    console.log("=== Status/TaskId Update ===");
    console.log("Current status:", status);
    console.log("Current localTaskId:", localTaskId);
  }, [status, localTaskId]);

  return (
    <div className="min-h-screen bg-gradient-to-b">
      <GradingContainer
        key={retryCount}
        sections={SECTION_CONFIG}
        feedback={feedback}
        error={error}
        validationErrors={validationErrors}
        status={status}
        gradingProgress={gradingProgress}
        gradingPhase={gradingPhase}
        gradingMessage={gradingMessage}
        onValidationComplete={handleValidationComplete}
        onRetry={handleRetry}
        fetcher={fetcher}
      />
    </div>
  );
}
