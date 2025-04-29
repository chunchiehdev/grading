import { gradeDocument , getRubric } from "@/services/rubric.server";

export const action = async ({ request }: { request: Request }) => {
  const requestId = `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  console.log(`[${requestId}] 收到評分請求`);

  try {
    const formData = await request.formData();
    const fileKey = formData.get("fileKey")?.toString();
    const rubricId = formData.get("rubricId")?.toString();

    console.log(`[${requestId}] 評分參數:`, { fileKey, rubricId });

    if (!fileKey || !rubricId) {
      console.error(`[${requestId}] 缺少必要參數:`, { fileKey, rubricId });
      return Response.json(
        { success: false, error: "缺少必要參數" },
        { status: 400 }
      );
    }

    // 獲取評分標準
    console.log(`[${requestId}] 獲取評分標準 (ID: ${rubricId})`);
    const { rubric, error: rubricError } = await getRubric(rubricId);
    if (rubricError || !rubric) {
      console.error(`[${requestId}] 無法獲取評分標準:`, rubricError);
      return Response.json(
        { success: false, error: rubricError || "無法獲取評分標準" },
        { status: 400 }
      );
    }
    console.log(`[${requestId}] 成功獲取評分標準:`, { name: rubric.name, criteriaCount: rubric.criteria.length });

    // 進行評分
    console.log(`[${requestId}] 開始評分過程 (fileKey: ${fileKey}, rubricId: ${rubricId})`);
    const startTime = Date.now();
    const { success, gradingResult, error } = await gradeDocument(fileKey, rubricId);
    const gradingDuration = Date.now() - startTime;
    console.log(`[${requestId}] 評分過程完成，耗時: ${gradingDuration}ms，結果: ${success ? '成功' : '失敗'}`);

    if (!success || !gradingResult) {
      console.error(`[${requestId}] 評分失敗:`, error);
      return Response.json(
        { success: false, error: error || "評分失敗" },
        { status: 500 }
      );
    }

    // 處理評分結果
    console.log(`[${requestId}] 處理評分結果，分數: ${gradingResult.score || '未知'}`);
    const createdAt = new Date();

    // 保留原始的 LLM 輸出
    const feedbackData = {
      ...gradingResult,  // 直接使用完整的 LLM 輸出
      createdAt,
      gradingDuration,
    };

    console.log(`[${requestId}] 返回評分結果，總分: ${feedbackData.score || 0}`);
    return Response.json({ success: true, feedback: feedbackData });
  } catch (error: any) {
    console.error(`[${requestId}] 評分過程中發生錯誤:`, error);
    // 獲取更詳細的錯誤信息
    const errorMessage = error.message || "評分過程中發生未知錯誤";
    const errorStack = error.stack || "";

    console.error(`[${requestId}] 詳細錯誤: ${errorMessage}\n${errorStack}`);

    return Response.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
};