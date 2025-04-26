import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher, useSearchParams } from "@remix-run/react";
import { useState, useEffect } from "react";
import { GradingContainer } from "@/components/grading/GradingContainer";
import { LTI_CONTEXT_CACHE } from "@/services/api.server";
import type { Section, FeedbackData, GradingStatus } from "@/types/grading";
import { SECTION_CONFIG } from "@/utils/validation";
import { useEventSource } from "remix-utils/sse/react";
import { ProgressService } from "@/services/progress.server";
import crypto from "crypto";

// LTI Loader response type
interface LtiLoaderSuccess {
  ltiUser: string;
  ltiContext: string;
  isInstructor: boolean;
  assignmentData: { id: string; title: string } | null;
  token: string;
}

interface LtiLoaderError {
  error: string;
}

type LtiLoaderResponse = LtiLoaderSuccess | LtiLoaderError;

// LTI Action response type
interface LtiActionSuccess {
  feedback: FeedbackData;
  taskId: string;
  returnUrl?: string;
}

interface LtiActionError {
  error: string;
}

type LtiActionResponse = LtiActionSuccess | LtiActionError;

/**
 * LTI 評分頁面
 * 用於透過 LTI 整合在 LMS 中嵌入評分功能
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const assignmentId = url.searchParams.get("assignment_id");
  
  // 驗證 LTI 會話令牌
  if (!token) {
    // 如果沒有令牌，可能是直接訪問，重定向到首頁
    return redirect("/");
  }
  
  // 從令牌緩存中獲取 LTI 上下文
  const cachedData = LTI_CONTEXT_CACHE.get(token);
  if (!cachedData) {
    // 令牌無效或已過期
    return json<LtiLoaderError>({ error: "無效或已過期的 LTI 會話" }, { status: 401 });
  }
  
  const ltiContext = cachedData.context;
  
  // 獲取學生身份和作業信息
  const userId = ltiContext.user_id;
  const contextId = ltiContext.context_id;
  const roles = ltiContext.roles || [];
  const isInstructor = roles.some((role: string) => 
    role.toLowerCase().includes("instructor") || 
    role.toLowerCase().includes("teacher") || 
    role.toLowerCase().includes("admin")
  );
  
  // 如果有指定的作業 ID，可以嘗試載入該作業的數據
  // 這裡只是一個示例，實際應該從資料庫查詢
  const assignmentData = assignmentId 
    ? { id: assignmentId, title: "LMS 作業" }
    : null;
  
  return json<LtiLoaderSuccess>({ 
    ltiUser: userId,
    ltiContext: contextId,
    isInstructor,
    assignmentData,
    token
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  
  // 驗證 LTI 會話令牌
  if (!token) {
    return json<LtiActionError>({ error: "缺少 LTI 會話令牌" }, { status: 401 });
  }
  
  // 從令牌緩存中獲取 LTI 上下文
  const cachedData = LTI_CONTEXT_CACHE.get(token);
  if (!cachedData) {
    return json<LtiActionError>({ error: "無效或已過期的 LTI 會話" }, { status: 401 });
  }
  
  // 處理表單提交
  const formData = await request.formData();
  
  // 獲取 taskId 或生成新的
  const taskId = (formData.get("taskId") as string) || crypto.randomUUID();
  
  // 獲取 LTI 用戶 ID 作為作者 ID
  const authorId = cachedData.context.user_id;
  
  // 構建部分
  const sections: Section[] = SECTION_CONFIG.map((config: Section) => ({
    ...config,
    content: String(formData.get(config.id) || ""),
  }));
  
  // 創建提交
  const submission = {
    sections,
    metadata: {
      submittedAt: new Date(),
      authorId,
      ltiContextId: cachedData.context.context_id,
      ltiResourceId: cachedData.context.resource_link_id,
    },
  };
  
  try {
    // 這裡重用現有的評分邏輯
    const { gradeAssignment } = await import("@/services/aiProcessor.server");
    const feedback = await gradeAssignment(
      submission,
      async (phase, progress, message) => {
        await ProgressService.set(taskId, { phase, progress, message });
      }
    );
    
    // 如果定義了返回 URL，可以準備重定向
    const returnUrl = cachedData.context.custom_params?.return_url;
    
    return json<LtiActionSuccess>({ 
      feedback, 
      taskId,
      returnUrl
    });
  } catch (error) {
    console.error("LTI grading error:", error);
    return json<LtiActionError>({ 
      error: error instanceof Error ? error.message : "評分過程中發生錯誤"
    }, { status: 500 });
  }
}

export default function LtiGradingPage() {
  const loaderData = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const [gradingProgress, setGradingProgress] = useState(0);
  const [gradingPhase, setGradingPhase] = useState("check");
  const [gradingMessage, setGradingMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [localTaskId, setLocalTaskId] = useState<string | null>(null);
  const [localFeedback, setLocalFeedback] = useState<FeedbackData | undefined>(undefined);
  
  const fetcher = useFetcher<typeof action>();
  const fetcherData = fetcher.data as LtiActionResponse | undefined;
  
  // Check if loader data has error
  const hasLoaderError = 'error' in loaderData;
  const loaderError = hasLoaderError ? loaderData.error : undefined;
  
  // Extract loader data if no error
  const ltiUser = !hasLoaderError ? loaderData.ltiUser : undefined;
  const ltiContext = !hasLoaderError ? loaderData.ltiContext : undefined;
  const isInstructor = !hasLoaderError ? loaderData.isInstructor : undefined;
  const assignmentData = !hasLoaderError ? loaderData.assignmentData : undefined;
  const token = !hasLoaderError ? loaderData.token : undefined;
  
  // Check if fetcher data has error or feedback
  const hasFetcherError = fetcherData && 'error' in fetcherData;
  const hasFetcherFeedback = fetcherData && 'feedback' in fetcherData;
  const fetcherError = hasFetcherError ? fetcherData.error : undefined;
  const feedback = hasFetcherFeedback ? fetcherData.feedback : undefined;
  const returnUrl = hasFetcherFeedback ? fetcherData.returnUrl : undefined;
  
  const error = loaderError || fetcherError;
  
  useEffect(() => {
    if (hasFetcherFeedback) {
      setLocalFeedback(feedback);
    }
    
    // 如果完成評分並有返回 URL，可以自動重定向回 LMS
    if (hasFetcherFeedback && returnUrl) {
      const timeoutId = setTimeout(() => {
        window.location.href = returnUrl;
      }, 5000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [fetcherData, hasFetcherFeedback, feedback, returnUrl]);
  
  useEffect(() => {
    if (fetcher.state === "submitting") {
      const formData = fetcher.formData;
      const taskId = formData?.get("taskId") as string;
      if (taskId) {
        setLocalTaskId(taskId);
      }
    } else if (fetcher.state === "idle" && hasFetcherFeedback) {
      setLocalTaskId(null);
    }
  }, [fetcher.state, hasFetcherFeedback]);
  
  // 確定當前狀態
  const status: GradingStatus = error 
    ? "error" 
    : fetcher.state === "submitting" || localTaskId 
      ? "processing" 
      : localFeedback 
        ? "completed" 
        : "idle";
  
  // 設置進度追蹤 URL
  const progressUrl = localTaskId ? `/api/grading-progress?taskId=${localTaskId}` : "";
  
  // 使用 SSE 取得實時進度
  const progressData = useEventSource(progressUrl, {
    event: "grading-progress",
    enabled: Boolean(progressUrl)
  });
  
  // 處理進度更新
  useEffect(() => {
    if (!progressData) return;
    
    try {
      const data = JSON.parse(progressData);
      setGradingProgress((prev) => Math.max(prev, data.progress));
      setGradingPhase(data.phase);
      setGradingMessage(data.message || "評分進行中...");
      
      if (data.phase === "complete") {
        setLocalTaskId(null);
      }
    } catch (error) {
      console.error("Error parsing progress data:", error);
    }
  }, [progressData]);
  
  // 重試處理
  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    setGradingProgress(0);
    setGradingPhase("check");
    setGradingMessage("");
    setLocalTaskId(null);
    setLocalFeedback(undefined);
    fetcher.data = undefined;
  };
  
  // 如果有錯誤，顯示錯誤信息
  if (hasLoaderError) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-xl font-bold text-red-600 mb-4">LTI 整合錯誤</h1>
          <p className="text-gray-700 mb-6">{loaderError}</p>
          <div className="text-center">
            <a 
              href="/"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              返回首頁
            </a>
          </div>
        </div>
      </div>
    );
  }
  
  // 顯示評分界面
  return (
    <div className="min-h-screen bg-gradient-to-b">
      <div className="bg-blue-600 text-white py-2 px-4 text-sm flex justify-between items-center">
        <div>
          LTI 整合模式 | 用戶: {ltiUser} | 課程: {ltiContext}
        </div>
        {assignmentData && (
          <div>作業: {assignmentData.title}</div>
        )}
      </div>
      
      <GradingContainer
        key={`lti-${retryCount}-${token}`}
        sections={SECTION_CONFIG}
        feedback={localFeedback}
        error={error}
        status={status}
        gradingProgress={gradingProgress}
        gradingPhase={gradingPhase}
        gradingMessage={gradingMessage}
        onRetry={handleRetry}
        fetcher={fetcher as any}
      />
      
      {status === "completed" && returnUrl && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg">
          <p className="mb-2">評分已完成！5秒後將返回學習平台。</p>
          <button
            onClick={() => window.location.href = returnUrl}
            className="px-4 py-2 bg-white text-green-600 rounded hover:bg-gray-100"
          >
            立即返回
          </button>
        </div>
      )}
    </div>
  );
} 