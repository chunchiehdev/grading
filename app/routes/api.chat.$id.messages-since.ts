import type { ActionFunctionArgs } from 'react-router';
import { db } from '@/lib/db.server';
import { z } from 'zod';
import { getUser } from '../services/auth.server.js';

const MessagesSinceSchema = z.object({
  since: z.string().datetime(),
});

export async function action({ request, params }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const chatId = params.id;
    if (!chatId) {
      return Response.json({ success: false, error: 'Chat ID required' }, { status: 400 });
    }

    const user = await getUser(request);
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = MessagesSinceSchema.parse(body);
    const sinceDate = new Date(validatedData.since);

    // 驗證用戶是否有權限存取該聊天
    const chat = await db.chat.findFirst({
      where: {
        id: chatId,
        userId: user.id,
      },
      select: { id: true },
    });

    if (!chat) {
      return Response.json({ success: false, error: 'Chat not found or access denied' }, { status: 404 });
    }

    // 查詢指定時間後的訊息
    const messages = await db.msg.findMany({
      where: {
        chatId: chatId,
        time: {
          gt: sinceDate,
        },
      },
      orderBy: { time: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        time: true,
      },
    });

    return Response.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('Error fetching messages since:', error);

    if (error instanceof z.ZodError) {
      return Response.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return Response.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
