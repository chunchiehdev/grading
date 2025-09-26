import { db } from '@/lib/db.server';
import { ChatCacheService } from './cache.server.js';

/**
 * 分頁查詢服務
 * 提供通用的分頁功能，避免 N+1 查詢問題
 */

export interface PaginationOptions {
  page?: number;
  limit?: number;
  cursor?: string; // 游標分頁用
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: string;
  previousCursor?: string;
}

export interface CursorPaginationResult<T> {
  data: T[];
  nextCursor?: string;
  hasNextPage: boolean;
}

/**
 * 標準分頁參數驗證和標準化
 */
export function normalizePaginationOptions(options: PaginationOptions = {}): Required<Omit<PaginationOptions, 'cursor'>> & Pick<PaginationOptions, 'cursor'> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(Math.max(1, options.limit || 20), 100); // 最大 100 筆
  
  return {
    page,
    limit,
    cursor: options.cursor
  };
}

/**
 * 計算分頁偏移量
 */
export function getPaginationOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * 創建分頁結果
 */
export function createPaginationResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginationResult<T> {
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * 游標分頁結果創建
 * 用於大資料集的高效分頁
 */
export function createCursorPaginationResult<T extends { id: string }>(
  data: T[],
  limit: number
): CursorPaginationResult<T> {
  const hasNextPage = data.length > limit;
  const actualData = hasNextPage ? data.slice(0, limit) : data;
  const nextCursor = hasNextPage ? actualData[actualData.length - 1]?.id : undefined;
  
  return {
    data: actualData,
    nextCursor,
    hasNextPage
  };
}

/**
 * 聊天列表專用分頁查詢
 */
export class ChatPaginationService {
  /**
   * 獲取用戶聊天列表（優化版 + 快取）
   */
  static async getPaginatedUserChats(
    userId: string,
    options: PaginationOptions = {}
  ) {
    const { page, limit } = normalizePaginationOptions(options);
    
    // 只快取第一頁的結果
    if (page === 1) {
      const cached = await ChatCacheService.getChatList(userId);
      if (cached) {
        const paginatedData = cached.slice(0, limit);
        return createPaginationResult(paginatedData, cached.length, page, limit);
      }
    }
    
    const offset = getPaginationOffset(page, limit);

    // 並行執行計數和資料查詢
    const [chats, total] = await Promise.all([
      // 資料查詢 - 使用優化的索引
      db.chat.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          msgs: {
            orderBy: { time: 'desc' },
            take: 1, // 只取最後一條訊息
            select: {
              id: true,
              content: true,
              time: true,
              role: true
            }
          },
          _count: {
            select: { msgs: true }
          }
        }
      }),
      
      // 總數查詢
      db.chat.count({
        where: { userId }
      })
    ]);

    // 轉換資料格式
    const chatList = chats.map(chat => ({
      id: chat.id,
      title: chat.title || '未命名聊天',
      lastMsg: chat.msgs[0]?.content || '無訊息',
      lastTime: chat.msgs[0]?.time || chat.createdAt,
      msgCount: chat._count.msgs
    }));

    // 快取第一頁結果
    if (page === 1 && chatList.length > 0) {
      await ChatCacheService.setChatList(userId, chatList);
    }

    return createPaginationResult(chatList, total, page, limit);
  }

  /**
   * 獲取聊天訊息（游標分頁）
   */
  static async getPaginatedChatMessages(
    chatId: string,
    userId: string,
    options: PaginationOptions = {}
  ) {
    const { limit, cursor } = normalizePaginationOptions(options);

    // 驗證用戶權限
    const chatAccess = await db.chat.findFirst({
      where: { id: chatId, userId },
      select: { id: true }
    });

    if (!chatAccess) {
      throw new Error('Chat not found or access denied');
    }

    // 構建游標查詢條件
    const whereClause: any = { chatId };
    if (cursor) {
      // 游標分頁：查詢比指定 ID 更早的訊息
      whereClause.id = {
        lt: cursor
      };
    }

    // 查詢訊息（多取一筆來判斷是否有下一頁）
    const messages = await db.msg.findMany({
      where: whereClause,
      orderBy: { time: 'desc' },
      take: limit + 1,
      select: {
        id: true,
        role: true,
        content: true,
        time: true
      }
    });

    return createCursorPaginationResult(messages, limit);
  }
}