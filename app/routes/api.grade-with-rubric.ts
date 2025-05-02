import { gradeDocument, getRubric } from '@/services/rubric.server';
import { withErrorHandler, createApiResponse } from '@/middleware/api.server';

export async function action({ request }: { request: Request }) {
  return withErrorHandler(async () => {
    if (request.method !== 'POST') {
      return createApiResponse({ success: false, error: 'Method not allowed' }, 405);
    }

    const requestId = `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    console.log(`[${requestId}] 收到評分請求`);

    // Parse the incoming form data
    const formData = await request.formData();
    const fileKey = formData.get('fileKey') as string;
    const rubricId = formData.get('rubricId') as string;

    console.log(`[${requestId}] 評分參數:`, { fileKey, rubricId });

    if (!fileKey || !rubricId) {
      console.error(`[${requestId}] 缺少必要參數:`, { fileKey, rubricId });
      return createApiResponse({ success: false, error: 'Missing required fields' }, 400);
    }

    // 獲取評分標準
    const { rubric, error: rubricError } = await getRubric(rubricId);

    if (rubricError || !rubric) {
      console.error(`[${requestId}] 無法獲取評分標準:`, rubricError);
      return createApiResponse({ success: false, error: rubricError || '無法獲取評分標準' }, 400);
    }

    // 進行評分
    console.log(`[${requestId}] 開始評分過程 (fileKey: ${fileKey}, rubricId: ${rubricId})`);
    const startTime = Date.now();
    const { success, gradingResult, error } = await gradeDocument(fileKey, rubricId);
    const gradingDuration = Date.now() - startTime;
    console.log(`[${requestId}] 評分過程完成，耗時: ${gradingDuration}ms，結果: ${success ? '成功' : '失敗'}`);

    if (!success || !gradingResult) {
      console.error(`[${requestId}] 評分失敗:`, error);
      return createApiResponse({ success: false, error: error || '評分失敗' }, 500);
    }

    // 處理評分結果
    const feedbackData = gradingResult;

    console.log(`[${requestId}] 返回評分結果，總分: ${feedbackData.score || 0}`);
    return createApiResponse({
      success: true,
      feedback: feedbackData,
    });
  });
}
