import { handleBatchGradingRequest, getBatchGradingStatus } from '@/services/api.server';
import { authenticateApiRequest } from '@/services/auth.server';

/**
 * 批量評分 API 端點
 *
 * POST /api/batch-grading
 * - 接收批量作業評分請求
 * - 需要 API 身份驗證
 * - 回傳批次 ID 用於後續查詢狀態
 *
 * GET /api/batch-grading?batch_id=xxx
 * - 查詢批量評分進度
 * - 需要 API 身份驗證
 */
export async function action({ request }: { request: Request }) {
  // 檢查 API 權限
  const authResult = await authenticateApiRequest(request);
  if (!authResult.isAuthenticated) {
    return Response.json({ error: '未授權的訪問' }, { status: 401 });
  }

  // 檢查相關權限
  const hasWritePermission = authResult.scopes?.includes('grading:write');
  if (!hasWritePermission) {
    return Response.json({ error: '不具備批量評分寫入權限' }, { status: 403 });
  }

  try {
    // 只接受 POST 請求
    if (request.method !== 'POST') {
      return Response.json({ error: '方法不允許' }, { status: 405 });
    }

    // 解析請求內容
    const contentType = request.headers.get('Content-Type') || '';
    if (!contentType.includes('application/json')) {
      return Response.json({ error: '內容類型必須是 application/json' }, { status: 415 });
    }

    const requestData = await request.json();

    if (!requestData.assignments || !Array.isArray(requestData.assignments)) {
      return Response.json({ error: '無效的批量作業提交格式，必須包含 assignments 陣列' }, { status: 400 });
    }

    // 處理批量評分請求
    const result = await handleBatchGradingRequest(requestData);

    // 如果有錯誤，回傳錯誤訊息
    if (result.error) {
      return Response.json({ error: result.error, batch_id: result.batch_id }, { status: 400 });
    }

    // 回傳批次 ID
    return Response.json(
      {
        message: '批量評分請求已接受，正在處理中',
        batch_id: result.batch_id,
      },
      { status: 202 }
    ); // 202 Accepted
  } catch (error) {
    console.error('Batch grading API error:', error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : '處理批量評分請求時發生錯誤',
      },
      { status: 500 }
    );
  }
}

/**
 * 查詢批量評分狀態
 */
export async function loader({ request }: { request: Request }) {
  // 檢查 API 權限
  const authResult = await authenticateApiRequest(request);
  if (!authResult.isAuthenticated) {
    return Response.json({ error: '未授權的訪問' }, { status: 401 });
  }

  // 檢查相關權限
  const hasReadPermission = authResult.scopes?.includes('grading:read');
  if (!hasReadPermission) {
    return Response.json({ error: '不具備批量評分讀取權限' }, { status: 403 });
  }

  try {
    // 獲取查詢參數
    const url = new URL(request.url);
    const batchId = url.searchParams.get('batch_id');

    if (!batchId) {
      return Response.json({ error: '缺少必要參數 batch_id' }, { status: 400 });
    }

    // 獲取批次狀態
    const batchStatus = getBatchGradingStatus(batchId);

    if (!batchStatus) {
      return Response.json({ error: '找不到指定的批次處理記錄' }, { status: 404 });
    }

    // 回傳批次狀態
    return Response.json(batchStatus, { status: 200 });
  } catch (error) {
    console.error('Batch status query error:', error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : '查詢批次狀態時發生錯誤',
      },
      { status: 500 }
    );
  }
}
