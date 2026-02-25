import { redis } from '@/lib/redis';
import logger from '@/utils/logger';
import { createHash } from 'crypto';
/**
 * 聊天系統快取服務
 * 實現智能快取策略，減少資料庫查詢
 */
export class ChatCacheService {
  // 快取鍵前綴
  private static readonly CHAT_LIST_PREFIX = 'cache:chat:list:';
  private static readonly CHAT_MESSAGES_PREFIX = 'cache:chat:messages:';
  private static readonly USER_ONLINE_PREFIX = 'cache:user:online:';
  private static readonly AI_RESPONSE_PREFIX = 'cache:ai:response:';

  // 快取過期時間（秒）
  private static readonly CACHE_TTL = {
    CHAT_LIST: 300, // 5分鐘
    CHAT_MESSAGES: 600, // 10分鐘
    USER_ONLINE: 60, // 1分鐘
    AI_RESPONSE: 3600, // 1小時
  };

  /**
   * 快取用戶聊天列表
   */
  static async setChatList(userId: string, chatList: any[]): Promise<void> {
    try {
      const key = `${this.CHAT_LIST_PREFIX}${userId}`;
      const data = JSON.stringify({
        data: chatList,
        timestamp: Date.now(),
        version: 1,
      });

      await redis.setex(key, this.CACHE_TTL.CHAT_LIST, data);
      logger.debug({ data: userId }, 'Chat list cached for user:');
    } catch (error) {
      logger.error({ err: error }, 'Failed to cache chat list:');
    }
  }

  /**
   * 獲取快取的用戶聊天列表
   */
  static async getChatList(userId: string): Promise<any[] | null> {
    try {
      const key = `${this.CHAT_LIST_PREFIX}${userId}`;
      const cached = await redis.get(key);

      if (!cached) return null;

      const parsed = JSON.parse(cached);
      logger.debug({ data: userId }, 'Chat list cache hit for user:');
      return parsed.data;
    } catch (error) {
      logger.error({ err: error }, 'Failed to get cached chat list:');
      return null;
    }
  }

  /**
   * 快取聊天訊息（最近N條）
   */
  static async setChatMessages(chatId: string, messages: any[]): Promise<void> {
    try {
      const key = `${this.CHAT_MESSAGES_PREFIX}${chatId}`;
      const data = JSON.stringify({
        data: messages.slice(0, 20), // 只快取最近20條
        timestamp: Date.now(),
        version: 1,
      });

      await redis.setex(key, this.CACHE_TTL.CHAT_MESSAGES, data);
      logger.debug({ data: chatId }, 'Chat messages cached:');
    } catch (error) {
      logger.error({ err: error }, 'Failed to cache chat messages:');
    }
  }

  /**
   * 獲取快取的聊天訊息
   */
  static async getChatMessages(chatId: string): Promise<any[] | null> {
    try {
      const key = `${this.CHAT_MESSAGES_PREFIX}${chatId}`;
      const cached = await redis.get(key);

      if (!cached) return null;

      const parsed = JSON.parse(cached);
      logger.debug({ data: chatId }, 'Chat messages cache hit:');
      return parsed.data;
    } catch (error) {
      logger.error({ err: error }, 'Failed to get cached chat messages:');
      return null;
    }
  }

  /**
   * 清除聊天相關快取（當有新訊息時）
   */
  static async invalidateChatCache(chatId: string, userId: string): Promise<void> {
    try {
      const keys = [`${this.CHAT_MESSAGES_PREFIX}${chatId}`, `${this.CHAT_LIST_PREFIX}${userId}`];

      await redis.del(...keys);
      logger.debug({ data: chatId }, 'Cache invalidated for chat:');
    } catch (error) {
      logger.error({ err: error }, 'Failed to invalidate cache:');
    }
  }

  /**
   * 設定用戶在線狀態
   */
  static async setUserOnline(userId: string, isOnline: boolean = true): Promise<void> {
    try {
      const key = `${this.USER_ONLINE_PREFIX}${userId}`;

      if (isOnline) {
        await redis.setex(key, this.CACHE_TTL.USER_ONLINE, '1');
      } else {
        await redis.del(key);
      }

      // 廣播用戶狀態變更
      await redis.publish(
        'user:status',
        JSON.stringify({
          userId,
          isOnline,
          timestamp: new Date().toISOString(),
        })
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to set user online status:');
    }
  }

  /**
   * 獲取用戶在線狀態
   */
  static async getUserOnlineStatus(userId: string): Promise<boolean> {
    try {
      const key = `${this.USER_ONLINE_PREFIX}${userId}`;
      const result = await redis.get(key);
      return result === '1';
    } catch (error) {
      logger.error({ err: error }, 'Failed to get user online status:');
      return false;
    }
  }

  /**
   * 獲取多個用戶的在線狀態
   */
  static async getBatchUserOnlineStatus(userIds: string[]): Promise<Record<string, boolean>> {
    try {
      if (userIds.length === 0) return {};

      const keys = userIds.map((id) => `${this.USER_ONLINE_PREFIX}${id}`);
      const results = await redis.mget(...keys);

      const statusMap: Record<string, boolean> = {};
      userIds.forEach((userId, index) => {
        statusMap[userId] = results[index] === '1';
      });

      return statusMap;
    } catch (error) {
      logger.error({ err: error }, 'Failed to get batch user online status:');
      return {};
    }
  }

  /**
   * 快取 AI 回應（避免重複問題重複計算）
   */
  static async cacheAIResponse(questionHash: string, response: string): Promise<void> {
    try {
      const key = `${this.AI_RESPONSE_PREFIX}${questionHash}`;
      const data = JSON.stringify({
        response,
        timestamp: Date.now(),
        version: 1,
      });

      await redis.setex(key, this.CACHE_TTL.AI_RESPONSE, data);
      logger.debug({ data: questionHash }, 'AI response cached:');
    } catch (error) {
      logger.error({ err: error }, 'Failed to cache AI response:');
    }
  }

  /**
   * 獲取快取的 AI 回應
   */
  static async getCachedAIResponse(questionHash: string): Promise<string | null> {
    try {
      const key = `${this.AI_RESPONSE_PREFIX}${questionHash}`;
      const cached = await redis.get(key);

      if (!cached) return null;

      const parsed = JSON.parse(cached);
      logger.debug({ data: questionHash }, 'AI response cache hit:');
      return parsed.response;
    } catch (error) {
      logger.error({ err: error }, 'Failed to get cached AI response:');
      return null;
    }
  }

  /**
   * 生成問題的快取鍵（基於內容雜湊）
   */
  static generateQuestionHash(content: string, context?: any): string {
    const combined = content + JSON.stringify(context || {});
    return createHash('md5').update(combined).digest('hex');
  }

  /**
   * 批次快取預熱（系統啟動時）
   */
  static async warmupCache(): Promise<void> {
    try {
      logger.info('Starting cache warmup...');

      // 可以在這裡加入預熱邏輯
      // 例如：預先載入最活躍用戶的聊天列表

      logger.info('Cache warmup completed');
    } catch (error) {
      logger.error({ err: error }, 'Cache warmup failed:');
    }
  }

  /**
   * 快取統計資訊
   */
  static async getCacheStats(): Promise<any> {
    try {
      const info = await redis.info('memory');
      const keyspace = await redis.info('keyspace');

      return {
        memory: info,
        keyspace,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error({ err: error }, 'Failed to get cache stats:');
      return null;
    }
  }

  /**
   * 清除所有快取（謹慎使用）
   */
  static async clearAllCache(): Promise<void> {
    try {
      const patterns = [
        `${this.CHAT_LIST_PREFIX}*`,
        `${this.CHAT_MESSAGES_PREFIX}*`,
        `${this.USER_ONLINE_PREFIX}*`,
        `${this.AI_RESPONSE_PREFIX}*`,
      ];

      for (const pattern of patterns) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      }

      logger.info('All cache cleared');
    } catch (error) {
      logger.error({ err: error }, 'Failed to clear cache:');
    }
  }
}
