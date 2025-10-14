import { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { requireAuthForApi } from '@/services/auth.server';
import { db } from '@/lib/db.server';
import logger from '@/utils/logger';

// Create new chat
export async function action({ request }: ActionFunctionArgs) {
  try {
    const user = await requireAuthForApi(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { title, context } = await request.json();

    const chat = await db.chat.create({
      data: {
        userId: user.id,
        title: title || null,
        context: context || null,
      }
    });

    // Create welcome message
    await db.msg.create({
      data: {
        chatId: chat.id,
        role: 'AI',
        content: '您好！我是 AI 評分標準助手 ✨\n\n請告訴我您想要創建什麼類型的評分標準，我會為您自動生成詳細的評分項目和等級描述。',
      }
    });

    logger.info('New chat created', { chatId: chat.id, userId: user.id });

    return Response.json({ 
      success: true, 
      data: { chatId: chat.id } 
    });

  } catch (error) {
    logger.error('Failed to create chat:', error);
    return Response.json(
      { success: false, error: '建立聊天失敗' },
      { status: 500 }
    );
  }
}

// Get user chats list
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const user = await requireAuthForApi(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const chats = await db.chat.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: {
        msgs: {
          orderBy: { time: 'desc' },
          take: 1, // Latest message for preview
        },
        _count: {
          select: { msgs: true }
        }
      }
    });

    const chatList = chats.map(chat => ({
      id: chat.id,
      title: chat.title || chat.msgs[0]?.content.substring(0, 50) + '...' || '新聊天',
      lastMsg: chat.msgs[0]?.content || '',
      lastTime: chat.msgs[0]?.time || chat.createdAt,
      msgCount: chat._count.msgs,
    }));

    return Response.json({ 
      success: true, 
      data: chatList 
    });

  } catch (error) {
    logger.error('Failed to get chats:', error);
    return Response.json(
      { success: false, error: '獲取聊天清單失敗' },
      { status: 500 }
    );
  }
}