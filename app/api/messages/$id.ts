import type { LoaderFunctionArgs } from 'react-router';
import { db } from '@/lib/db.server';
import { validateApiKey } from '@/middleware/api-key.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    const messageId = params.id;
    if (!messageId) {
      return Response.json({ success: false, error: 'Message ID required' }, { status: 400 });
    }

    // 檢查 API Key（內部服務調用）
    const hasValidApiKey = validateApiKey(request);

    if (!hasValidApiKey) {
      return Response.json({ success: false, error: 'Invalid or missing API key' }, { status: 401 });
    }

    // 從資料庫獲取訊息
    const message = await db.msg.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        role: true,
        content: true,
        time: true,
        data: true,
      },
    });

    if (!message) {
      return Response.json({ success: false, error: 'Message not found' }, { status: 404 });
    }

    return Response.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error('Error fetching message:', error);
    return Response.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
