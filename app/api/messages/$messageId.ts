import type { LoaderFunctionArgs } from "react-router";
import { db } from "@/lib/db.server";
import { validateApiKey } from "../../middleware/api-key.server.js";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { messageId } = params;

  if (!messageId) {
    return Response.json({ success: false, error: 'Message ID is required' }, { status: 400 });
  }

  try {
    // 只允許 API Key 訪問（內部服務調用）
    const hasValidApiKey = validateApiKey(request);
    
    if (!hasValidApiKey) {
      return Response.json({ success: false, error: 'API Key required for this endpoint' }, { status: 401 });
    }

    // 獲取訊息
    const message = await db.msg.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return Response.json({ success: false, error: 'Message not found' }, { status: 404 });
    }

    return Response.json({
      success: true,
      data: {
        id: message.id,
        role: message.role,
        content: message.content,
        time: message.time,
        chatId: message.chatId,
      },
    });

  } catch (error) {
    console.error('Error getting message:', error);
    return Response.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}