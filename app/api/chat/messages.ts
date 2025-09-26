import type { ActionFunctionArgs } from "react-router";
import { db } from "@/lib/db.server";
import { z } from "zod";
import { getUser } from "../../services/auth.server.js";
import { validateApiKey } from "../../middleware/api-key.server.js";
import { EventPublisher } from "../../services/events.server.js";
import { ChatCacheService } from "../../services/cache.server.js";

const CreateMessageSchema = z.object({
  chatId: z.string(),
  role: z.enum(['USER', 'AI']),
  content: z.string().min(1),
});

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await request.json();
    const validatedData = CreateMessageSchema.parse(body);

    console.log('Messages API called:', {
      method: request.method,
      hasApiKey: !!request.headers.get('x-api-key'),
      chatId: validatedData.chatId,
      role: validatedData.role
    });

    // 檢查是否有有效的 API Key（內部服務）
    const hasValidApiKey = validateApiKey(request);
    console.log('API Key validation result:', hasValidApiKey);

    if (!hasValidApiKey) {
      // 沒有 API Key，需要用戶身份驗證
      const user = await getUser(request);
      if (!user) {
        return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }

      // 驗證用戶是否有權限對該聊天進行操作
      const chat = await db.chat.findFirst({
        where: { 
          id: validatedData.chatId,
          userId: user.id 
        },
      });

      if (!chat) {
        return Response.json({ success: false, error: 'Chat not found or access denied' }, { status: 404 });
      }
    } else {
      // 有 API Key，只需要檢查 chat 是否存在
      const chat = await db.chat.findUnique({
        where: { id: validatedData.chatId },
      });

      if (!chat) {
        return Response.json({ success: false, error: 'Chat not found' }, { status: 404 });
      }
    }

    // 防止重複訊息：檢查最近的訊息
    const recentMessage = await db.msg.findFirst({
      where: {
        chatId: validatedData.chatId,
        role: validatedData.role,
        content: validatedData.content,
        time: {
          gte: new Date(Date.now() - 10000) // 最近10秒內的重複訊息
        }
      },
      orderBy: { time: 'desc' }
    });

    if (recentMessage) {
      console.log('Duplicate message detected, returning existing:', recentMessage.id);
      return Response.json({
        success: true,
        data: {
          id: recentMessage.id,
          role: recentMessage.role,
          content: recentMessage.content,
          time: recentMessage.time,
        },
      });
    }

    // 使用交易確保資料一致性
    const result = await db.$transaction(async (tx) => {
      // 建立訊息
      const message = await tx.msg.create({
        data: {
          chatId: validatedData.chatId,
          role: validatedData.role,
          content: validatedData.content,
        },
      });

      // 獲取用戶信息用於快取失效
      const currentUser = hasValidApiKey ? null : await getUser(request);
      const userId = currentUser?.id || 'anonymous';

      // 發布事件 - 訊息已創建，包含完整訊息資料
      await EventPublisher.publishMessageCreated(
        validatedData.chatId,
        userId,
        message.id,
        {
          id: message.id,
          role: message.role,
          content: message.content,
          time: message.time
        }
      );

      // 快取失效 - 有新訊息時清除相關快取
      if (currentUser) {
        await ChatCacheService.invalidateChatCache(validatedData.chatId, currentUser.id);
      }

      console.log(`Message created: ${message.id} in chat ${validatedData.chatId} by user ${userId}`);

      // 如果是用戶訊息，觸發 AI 回應（攜帶 messageId 供去重）
      if (validatedData.role === 'USER') {
        await EventPublisher.publishAIResponseNeeded(
          validatedData.chatId,
          userId,
          validatedData.content,
          message.id
        );
      }

      return message;
    });

    return Response.json({
      success: true,
      data: {
        id: result.id,
        role: result.role,
        content: result.content,
        time: result.time,
      },
    });

  } catch (error) {
    console.error('Error creating message:', error);
    
    if (error instanceof z.ZodError) {
      return Response.json({ 
        success: false, 
        error: 'Invalid request data',
        details: error.errors 
      }, { status: 400 });
    }

    return Response.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
