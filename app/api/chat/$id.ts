import { LoaderFunctionArgs } from 'react-router';
import { requireAuthForApi } from '@/services/auth.server';
import { db } from '@/lib/db.server';
import logger from '@/utils/logger';

// Get chat messages
export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    const user = await requireAuthForApi(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const chatId = params.id;

    if (!chatId) {
      return Response.json({ success: false, error: '缺少聊天ID' }, { status: 400 });
    }

    // Verify chat ownership
    const chat = await db.chat.findUnique({
      where: {
        id: chatId,
        userId: user.id, // Ensure user owns this chat
      },
      include: {
        msgs: {
          orderBy: { time: 'asc' },
        },
      },
    });

    if (!chat) {
      return Response.json({ success: false, error: '聊天不存在或無權限' }, { status: 404 });
    }

    const chatData = {
      id: chat.id,
      title: chat.title,
      context: chat.context,
      createdAt: chat.createdAt,
      msgs: chat.msgs.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        data: msg.data,
        time: msg.time,
      })),
    };

    return Response.json({
      success: true,
      data: chatData,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to get chat:');
    return Response.json({ success: false, error: '獲取聊天記錄失敗' }, { status: 500 });
  }
}
