import { handleGradingRequest } from "@/services/api.server";
import { authenticateApiRequest } from "@/services/auth.server";

/**
 * 評分 API 端點
 * 
 * POST /api/grading
 * - 接收單個作業評分請求
 * - 需要 API 身份驗證
 * - 回傳評分結果或進度追蹤 ID
 */
export async function action({ request }: { request: Request }) {
  // 檢查 API 權限
  const authResult = await authenticateApiRequest(request);
  if (!authResult.isAuthenticated) {
    return Response.json({ error: "未授權的訪問" }, { status: 401 });
  }

  try {
    // 只接受 POST 請求
    if (request.method !== "POST") {
      return Response.json({ error: "方法不允許" }, { status: 405 });
    }

    // 解析請求內容
    const contentType = request.headers.get("Content-Type") || "";
    if (!contentType.includes("application/json")) {
      return Response.json({ error: "內容類型必須是 application/json" }, { status: 415 });
    }

    const submission = await request.json();
    if (!submission || !submission.sections) {
      return Response.json({ error: "無效的作業提交格式" }, { status: 400 });
    }

    // 處理評分請求
    const result = await handleGradingRequest(submission);

    // 如果有錯誤，回傳錯誤訊息
    if (result.error) {
      return Response.json({ error: result.error, requestId: result.requestId }, { status: 400 });
    }

    // 回傳評分結果
    return Response.json({
      requestId: result.requestId,
      feedback: result.feedback
    }, { status: 200 });

  } catch (error) {
    console.error("Grading API error:", error);
    return Response.json({ 
      error: error instanceof Error ? error.message : "處理評分請求時發生錯誤"
    }, { status: 500 });
  }
}

/**
 * GET 請求不支援
 */
export async function loader({ request }: { request: Request }) {
  return Response.json({ error: "請使用 POST 方法提交評分請求" }, { status: 405 });
} 