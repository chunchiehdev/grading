import { redis } from '@/lib/redis';
import logger from '@/utils/logger';

/**
 * 聊天同步服務
 * 解決多設備間的聊天狀態同步問題
 */
export class ChatSyncService {
  private static readonly USER_CHAT_STATE_PREFIX = 'user:chat:state:';
  private static readonly EXPIRATION_TIME = 86400; // 24小時

  /**
   * 獲取用戶的聊天狀態
   */
  static async getUserChatState(userId: string): Promise<any> {
    try {
      const key = `${this.USER_CHAT_STATE_PREFIX}${userId}`;
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get user chat state:', error);
      return null;
    }
  }

  /**
   * 更新用戶的聊天狀態
   */
  static async updateUserChatState(userId: string, state: any): Promise<void> {
    try {
      const key = `${this.USER_CHAT_STATE_PREFIX}${userId}`;
      await redis.set(
        key,
        JSON.stringify({
          ...state,
          lastUpdated: new Date().toISOString(),
        }),
        'EX',
        this.EXPIRATION_TIME
      );

      // 發送同步事件給該用戶的所有設備
      await redis.publish(
        `user:${userId}:sync`,
        JSON.stringify({
          type: 'CHAT_STATE_UPDATE',
          state,
          timestamp: new Date().toISOString(),
        })
      );
    } catch (error) {
      logger.error('Failed to update user chat state:', error);
      throw error;
    }
  }

  /**
   * 訂閱用戶的同步事件
   */
  static async subscribeUserSync(userId: string, callback: (event: any) => void): Promise<() => void> {
    const subscriber = redis.duplicate();
    const channel = `user:${userId}:sync`;

    await subscriber.subscribe(channel);

    subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const event = JSON.parse(message);
          callback(event);
        } catch (error) {
          logger.error('Failed to parse sync event:', error);
        }
      }
    });

    // 返回取消訂閱函數
    return async () => {
      await subscriber.unsubscribe(channel);
      subscriber.disconnect();
    };
  }

  /**
   * 獲取用戶最近的聊天列表
   */
  static async getUserRecentChats(userId: string): Promise<string[]> {
    try {
      const state = await this.getUserChatState(userId);
      return state?.recentChats || [];
    } catch (error) {
      logger.error('Failed to get user recent chats:', error);
      return [];
    }
  }

  /**
   * 更新用戶最近的聊天列表
   */
  static async updateUserRecentChats(userId: string, chatIds: string[]): Promise<void> {
    try {
      const currentState = (await this.getUserChatState(userId)) || {};
      await this.updateUserChatState(userId, {
        ...currentState,
        recentChats: chatIds.slice(0, 10), // 只保留最近 10 個
      });
    } catch (error) {
      logger.error('Failed to update user recent chats:', error);
      throw error;
    }
  }

  /**
   * 清理過期的用戶狀態
   */
  static async cleanupExpiredStates(): Promise<void> {
    try {
      const pattern = `${this.USER_CHAT_STATE_PREFIX}*`;
      const keys = await redis.keys(pattern);

      for (const key of keys) {
        const ttl = await redis.ttl(key);
        if (ttl === -1) {
          // 沒有設置過期時間的鍵，設置過期時間
          await redis.expire(key, this.EXPIRATION_TIME);
        }
      }

      logger.info(`Processed ${keys.length} user chat state keys for cleanup`);
    } catch (error) {
      logger.error('Failed to cleanup expired states:', error);
    }
  }
}
