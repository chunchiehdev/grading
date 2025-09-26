import { redis } from '@/lib/redis';
import logger from '@/utils/logger';

/**
 * 事件類型定義
 */
export type ChatEvent = {
  type: 'MESSAGE_CREATED' | 'AI_RESPONSE_NEEDED' | 'AI_RESPONSE_GENERATED';
  chatId: string;
  userId: string;
  messageId?: string;
  data?: any;
  timestamp: Date;
};

/**
 * 事件發布服務
 */
export class EventPublisher {
  private static readonly CHAT_EVENTS_CHANNEL = 'chat:events';

  /**
   * 發布聊天事件
   */
  static async publishChatEvent(event: ChatEvent): Promise<void> {
    try {
      const eventData = {
        ...event,
        timestamp: new Date().toISOString()
      };
      
      await redis.publish(this.CHAT_EVENTS_CHANNEL, JSON.stringify(eventData));
      logger.debug('Event published:', eventData);
    } catch (error) {
      logger.error('Failed to publish event:', error);
      throw error;
    }
  }

  /**
   * 發布用戶訊息創建事件
   */
  static async publishMessageCreated(chatId: string, userId: string, messageId: string, messageData?: any): Promise<void> {
    await this.publishChatEvent({
      type: 'MESSAGE_CREATED',
      chatId,
      userId,
      messageId,
      data: messageData,
      timestamp: new Date()
    });
  }

  /**
   * 發布 AI 回應需求事件
   */
  static async publishAIResponseNeeded(chatId: string, userId: string, messageContent: string, messageId?: string): Promise<void> {
    await this.publishChatEvent({
      type: 'AI_RESPONSE_NEEDED',
      chatId,
      userId,
      messageId,
      data: { messageContent },
      timestamp: new Date()
    });
  }

  /**
   * 發布 AI 回應完成事件
   */
  static async publishAIResponseGenerated(chatId: string, messageId: string, messageData?: any): Promise<void> {
    await this.publishChatEvent({
      type: 'AI_RESPONSE_GENERATED',
      chatId,
      userId: 'ai',
      messageId,
      data: messageData,
      timestamp: new Date()
    });
  }
}

/**
 * 事件訂閱服務
 */
export class EventSubscriber {
  private subscriber: typeof redis;
  private handlers: Map<string, (event: ChatEvent) => Promise<void>> = new Map();

  constructor() {
    this.subscriber = redis.duplicate();
  }

  /**
   * 訂閱聊天事件
   */
  async subscribeToChatEvents(): Promise<void> {
    logger.info('Subscribing to Redis chat events channel...');
    
    await this.subscriber.subscribe('chat:events');
    logger.info('✅ Successfully subscribed to Redis chat:events channel');
    
    this.subscriber.on('message', async (channel, message) => {
      if (channel === 'chat:events') {
        try {
          const event: ChatEvent = JSON.parse(message);
          logger.debug('📨 Event received from Redis:', { type: event.type, chatId: event.chatId });
          await this.handleEvent(event);
        } catch (error) {
          logger.error('Failed to handle event:', error);
        }
      }
    });

    logger.info('✅ Redis event listener registered successfully');
  }

  /**
   * 註冊事件處理器
   */
  registerHandler(eventType: string, handler: (event: ChatEvent) => Promise<void>): void {
    this.handlers.set(eventType, handler);
  }

  /**
   * 處理事件
   */
  private async handleEvent(event: ChatEvent): Promise<void> {
    const handler = this.handlers.get(event.type);
    if (handler) {
      logger.debug('📋 Executing handler for event:', { 
        type: event.type, 
        chatId: event.chatId,
        hasHandler: true
      });
      await handler(event);
    } else {
      logger.debug('No handler registered for event type:', {
        eventType: event.type,
        chatId: event.chatId,
        registeredHandlers: Array.from(this.handlers.keys())
      });
    }
  }

  /**
   * 取消訂閱
   */
  async unsubscribe(): Promise<void> {
    await this.subscriber.unsubscribe();
    this.subscriber.disconnect();
  }
}
