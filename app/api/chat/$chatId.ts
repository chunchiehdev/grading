import type { LoaderFunctionArgs } from "react-router";
import { db } from "@/lib/db.server";
import { getUser } from "../../services/auth.server.js";
import { validateApiKey } from "../../middleware/api-key.server.js";
import { ChatPaginationService } from "../../services/pagination.server.js";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { chatId } = params;

  if (!chatId) {
    return Response.json({ success: false, error: 'Chat ID is required' }, { status: 400 });
  }

  try {
    const hasValidApiKey = validateApiKey(request);

    const url = new URL(request.url);
    const cursor = url.searchParams.get('cursor') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '20');

    let chat;
    if (!hasValidApiKey) {
      const user = await getUser(request);
      if (!user) {
        return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }

      chat = await db.chat.findFirst({
        where: { 
          id: chatId,
          userId: user.id 
        },
        select: {
          id: true,
          userId: true,
          title: true,
          context: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!chat) {
        return Response.json({ success: false, error: 'Chat not found' }, { status: 404 });
      }

      const messagesResult = await ChatPaginationService.getPaginatedChatMessages(
        chatId,
        user.id,
        { cursor, limit }
      );

      return Response.json({
        success: true,
        data: {
          ...chat,
          msgs: messagesResult.data,
          pagination: {
            nextCursor: messagesResult.nextCursor,
            hasNextPage: messagesResult.hasNextPage
          }
        },
      });

    } else {
      chat = await db.chat.findFirst({
        where: { id: chatId },
        include: {
          msgs: {
            orderBy: { time: 'desc' },
            take: limit,
          },
        },
      });
    }

    if (!chat) {
      return Response.json({ success: false, error: 'Chat not found' }, { status: 404 });
    }

    return Response.json({
      success: true,
      data: {
        id: chat.id,
        userId: chat.userId,
        title: chat.title,
        context: chat.context,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        msgs: chat.msgs.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          time: msg.time,
        })),
      },
    });

  } catch (error) {
    console.error('Error getting chat:', error);
    return Response.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}