import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { db } from '@/lib/db.server';
import { z } from 'zod';
import { getUser } from '../../services/auth.server.js';
import { ChatPaginationService } from '../../services/pagination.server.js';

const CreateChatSchema = z.object({
  title: z.string().optional(),
  context: z.any().optional(),
});

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const user = await getUser(request);
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    const paginatedResult = await ChatPaginationService.getPaginatedUserChats(user.id, { page, limit });

    return Response.json({
      success: true,
      data: paginatedResult.data,
      pagination: {
        total: paginatedResult.total,
        page: paginatedResult.page,
        limit: paginatedResult.limit,
        totalPages: paginatedResult.totalPages,
        hasNextPage: paginatedResult.hasNextPage,
        hasPreviousPage: paginatedResult.hasPreviousPage,
      },
    });
  } catch (error) {
    console.error('Error loading chats:', error);
    return Response.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const user = await getUser(request);
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = CreateChatSchema.parse(body);

    const chat = await db.chat.create({
      data: {
        userId: user.id,
        title: validatedData.title || '新聊天',
        context: validatedData.context || null,
      },
    });

    return Response.json({
      success: true,
      data: {
        chatId: chat.id,
        title: chat.title,
        createdAt: chat.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating chat:', error);

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
