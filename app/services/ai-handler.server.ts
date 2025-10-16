import { db } from '@/lib/db.server';
import { redis } from '@/lib/redis';
import { EventPublisher, EventSubscriber, type ChatEvent } from './events.server.js';
import { ProtectedAIService, AIServiceUnavailableError, withTimeout } from './ai-protected.server.js';
import logger from '@/utils/logger';

/**
 * AI 回應處理服務
 * 獨立處理 AI 生成邏輯，與 WebSocket 解耦
 */
export class AIHandlerService {
  private eventSubscriber: EventSubscriber;
  private isRunning: boolean = false;
  public static instanceCount: number = 0;
  private instanceId: number;
  private processingEvents: Set<string> = new Set();

  constructor() {
    AIHandlerService.instanceCount++;
    this.instanceId = AIHandlerService.instanceCount;

    logger.info(`=== AI Handler Service Constructor ===`);
    logger.info(`Creating instance #${this.instanceId}`);
    logger.info(`Total instances created: ${AIHandlerService.instanceCount}`);
    logger.info(`======================================`);

    logger.info(`Initializing AI Handler Service #${this.instanceId}`);
    this.eventSubscriber = new EventSubscriber();
    this.setupEventHandlers();
    logger.info(`AI Handler Service #${this.instanceId} constructor completed`);
  }

  /**
   * 啟動 AI 處理服務
   */
  async start(): Promise<void> {
    logger.info(`=== Starting AI Handler Service #${this.instanceId} ===`);

    // 檢查全域運行狀態
    const { isAIHandlerServiceRunning, setAIHandlerServiceRunning } = await import('./ai-handler.server.js');

    if (this.isRunning || isAIHandlerServiceRunning()) {
      logger.warn(`AI Handler Service #${this.instanceId} already running globally, skipping start`);
      return;
    }

    // 檢查是否已有其他實例在運行
    if (AIHandlerService.instanceCount > 1) {
      logger.warn(
        `⚠️  Multiple AI Handler instances detected (${AIHandlerService.instanceCount}), only instance #1 should be active`
      );
      logger.warn(`Multiple AI Handler instances detected: ${AIHandlerService.instanceCount}`);

      // 只允許第一個實例運行
      if (this.instanceId > 1) {
        logger.warn(`🛑 AI Handler Service #${this.instanceId} skipped - only first instance should run`);
        logger.warn(`AI Handler Service #${this.instanceId} skipped - only first instance should run`);
        return;
      }
    }

    logger.info(`AI Handler Service #${this.instanceId} subscribing to events...`);
    logger.info(`Starting AI Handler Service #${this.instanceId}...`);
    await this.eventSubscriber.subscribeToChatEvents();
    this.isRunning = true;
    setAIHandlerServiceRunning(true);
    logger.info(`✅ AI Handler Service #${this.instanceId} started and listening`);
    logger.info(`✅ AI Handler Service #${this.instanceId} started successfully and listening for events`);
  }

  /**
   * 停止服務
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    const { setAIHandlerServiceRunning } = await import('./ai-handler.server.js');

    await this.eventSubscriber.unsubscribe();
    this.isRunning = false;
    setAIHandlerServiceRunning(false);
    logger.info(`AI Handler Service #${this.instanceId} stopped`);
  }

  /**
   * 設置事件處理器
   */
  private setupEventHandlers(): void {
    logger.info('Setting up AI event handlers...');

    // 處理 AI 回應需求
    this.eventSubscriber.registerHandler('AI_RESPONSE_NEEDED', async (event) => {
      logger.debug(`📨 AI_RESPONSE_NEEDED handled by instance #${this.instanceId} for chat: ${event.chatId}`);
      logger.info(`🔄 AI_RESPONSE_NEEDED event handler #${this.instanceId} triggered`, {
        chatId: event.chatId,
        userId: event.userId,
      });
      await this.handleAIResponseNeeded(event);
    });

    logger.info('AI event handlers registered successfully');
  }

  /**
   * 處理 AI 回應需求
   */
  private async handleAIResponseNeeded(event: ChatEvent): Promise<void> {
    // 以 messageId 為主做去重，若缺少再回退至舊的 eventId 計算方式
    const timestamp = event.timestamp instanceof Date ? event.timestamp.getTime() : new Date(event.timestamp).getTime();
    const messageHash = event.data?.messageContent
      ? Buffer.from(event.data.messageContent).toString('base64').slice(0, 8)
      : 'no-content';
    const fallbackEventId = `${event.chatId}-${event.userId}-${timestamp}-${messageHash}`;
    const dedupeId = event.messageId || fallbackEventId;

    // 使用更強大的 Redis 分佈式鎖
    const lockKey = `ai_lock:${dedupeId}`;
    const lockValue = `instance-${this.instanceId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const lockTTL = 120000; // 增加到120秒過期時間

    // 若已處理過，直接跳過（24 小時保護）
    const processedKey = `ai_processed:${dedupeId}`;
    const alreadyProcessed = await redis.get(processedKey);
    if (alreadyProcessed) {
      logger.debug(`🔄 Skip AI processing (already processed) for ${dedupeId}`);
      return;
    }

    // 本地快速去重（第一道防線）
    if (this.processingEvents.has(dedupeId)) {
      logger.debug(`🔄 Event ${dedupeId} already being processed locally by instance #${this.instanceId}, skipping...`);
      return;
    }

    // 全局事件處理計數器檢查（第二道防線）
    const globalCounterKey = `ai_processing_counter:${dedupeId}`;
    try {
      const currentCount = await redis.incr(globalCounterKey);
      await redis.expire(globalCounterKey, 300); // 5分鐘過期

      if (currentCount > 1) {
        logger.debug(`🔄 Global processing counter ${currentCount} for ${dedupeId}, decrementing and skipping...`);
        await redis.decr(globalCounterKey);
        return;
      }
    } catch (counterError) {
      console.error('Failed to check global counter:', counterError);
      // 繼續處理，但記錄錯誤
    }

    try {
      // 使用 Lua 腳本進行原子性鎖檢查和獲取
      const lockScript = `
        local lockKey = KEYS[1]
        local lockValue = ARGV[1]
        local ttl = tonumber(ARGV[2])
        
        -- 檢查鎖是否已存在
        local existingValue = redis.call('get', lockKey)
        if existingValue then
          return {0, existingValue}
        end
        
        -- 原子性設置鎖
        redis.call('set', lockKey, lockValue, 'PX', ttl)
        return {1, lockValue}
      `;

      const lockResult = (await redis.eval(lockScript, 1, lockKey, lockValue, lockTTL.toString())) as [number, string];

      if (lockResult[0] !== 1) {
        logger.debug(`🔄 Event already being processed by another instance (${lockResult[1]}), skipping: ${dedupeId}`);
        logger.warn(`Distributed lock acquisition failed for event: ${dedupeId}`);
        // 減少全局計數器
        try {
          await redis.decr(globalCounterKey);
        } catch (decrError) {
          console.error('Failed to decrement global counter:', decrError);
        }
        return;
      }

      logger.debug(`🔄 Successfully acquired distributed lock for event ${dedupeId} by instance #${this.instanceId}`);
    } catch (lockError) {
      console.error('Failed to acquire distributed lock:', lockError);
      logger.error('Redis lock acquisition error:', lockError);
      // 減少全局計數器
      try {
        await redis.decr(globalCounterKey);
      } catch (decrError) {
        console.error('Failed to decrement global counter:', decrError);
      }
      return;
    }

    // 標記事件為本地處理中（第二道防線）
    this.processingEvents.add(dedupeId);
    logger.debug(`🔄 Processing event ${dedupeId} by instance #${this.instanceId}`);

    try {
      logger.debug('=== AI_RESPONSE_NEEDED Handler Started ===');
      logger.debug(`Chat ID: ${event.chatId}`);
      logger.debug(`User ID: ${event.userId}`);
      logger.debug(`Message Content: ${event.data?.messageContent}`);
      logger.debug(`Event Timestamp: ${event.timestamp}`);
      logger.debug(`Dedupe ID: ${dedupeId}`);

      logger.info('Processing AI response for chat:', event.chatId);

      // 獲取聊天上下文
      logger.debug('Step 1: Getting chat context...');
      const chat = await this.getChatContext(event.chatId);
      if (!chat) {
        console.error('ERROR: Chat not found for ID:', event.chatId);
        logger.error('Chat not found:', event.chatId);
        return;
      }
      logger.debug(`Step 1 SUCCESS: Chat found with ${chat.msgs?.length || 0} messages`);

      // 生成 AI 回應
      logger.debug('Step 2: Generating AI response...');
      const aiResponse = await this.generateAIResponse(chat, event.data?.messageContent, event.userId);
      logger.debug(`Step 2 SUCCESS: AI response generated, length: ${aiResponse?.length || 0}`);

      // 儲存 AI 訊息
      const aiMessage = await db.msg.create({
        data: {
          chatId: event.chatId,
          role: 'AI',
          content: aiResponse,
        },
      });

      // 發布 AI 回應完成事件，包含完整訊息資料
      await EventPublisher.publishAIResponseGenerated(event.chatId, aiMessage.id, {
        id: aiMessage.id,
        role: aiMessage.role,
        content: aiMessage.content,
        time: aiMessage.time,
      });

      logger.info('AI response generated successfully:', aiMessage.id);
      // 標記此訊息已處理，避免後續重複處理
      await redis.set(`ai_processed:${dedupeId}`, '1', 'EX', 24 * 60 * 60);
    } catch (error) {
      // 立即輸出錯誤到 console，確保能看到
      console.error('=== CRITICAL ERROR in AI_RESPONSE_NEEDED Handler ===');
      console.error('Raw error object:', error);
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);

      const originalError = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : 'Unknown';

      console.error('Chat ID:', event.chatId);
      console.error('User ID:', event.userId);
      console.error('Message:', event.data?.messageContent?.substring(0, 200));
      console.error('Processed Error Name:', errorName);
      console.error('Processed Error Message:', originalError);

      if (error instanceof Error && error.stack) {
        console.error('Stack Trace:', error.stack);
      }

      // 檢查是否為 null 或 undefined 錯誤
      if (error === null) {
        console.error('ERROR IS NULL!');
      } else if (error === undefined) {
        console.error('ERROR IS UNDEFINED!');
      }

      console.error('=== End CRITICAL ERROR Details ===');

      // 也輸出到 logger
      logger.error('Failed to generate AI response:', {
        error: originalError,
        errorName: errorName,
        chatId: event.chatId,
        messageContent: event.data?.messageContent?.substring(0, 100) + '...',
        stack: error instanceof Error ? error.stack?.substring(0, 1000) : undefined,
        rawError: String(error),
      });

      let errorMessage = '抱歉，AI 服務暫時不可用，請稍後再試。';

      // 根據錯誤類型提供不同的錯誤訊息
      if (error instanceof AIServiceUnavailableError) {
        errorMessage = error.message;
      }

      // 發送錯誤訊息
      try {
        const aiErrorMessage = await db.msg.create({
          data: {
            chatId: event.chatId,
            role: 'AI',
            content: errorMessage,
          },
        });

        await EventPublisher.publishAIResponseGenerated(event.chatId, aiErrorMessage.id, {
          id: aiErrorMessage.id,
          role: aiErrorMessage.role,
          content: aiErrorMessage.content,
          time: aiErrorMessage.time,
        });
      } catch (errorSaveError) {
        logger.error('Failed to save error message:', errorSaveError);
      }
    } finally {
      // 清除本地處理標記
      this.processingEvents.delete(dedupeId);

      // 減少全局計數器
      try {
        await redis.decr(globalCounterKey);
        logger.debug(`🔄 Decremented global counter for ${dedupeId}`);
      } catch (decrError) {
        console.error('Failed to decrement global counter in finally:', decrError);
      }

      // 安全地釋放 Redis 分佈式鎖（只有持有鎖的實例才能釋放）
      try {
        // 使用 Lua 腳本確保只有持有鎖的實例才能釋放鎖
        const releaseScript = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `;
        const result = await redis.eval(releaseScript, 1, lockKey, lockValue);
        if (result === 1) {
          logger.debug(`🔄 Successfully released distributed lock for ${dedupeId} by instance #${this.instanceId}`);
        } else {
          logger.debug(`🔄 Lock was already released or expired for ${dedupeId}`);
        }
      } catch (error) {
        console.error('Failed to release distributed lock:', error);
        logger.error('Redis lock release error:', error);
      }

      logger.debug(`🔄 Event processing completed for ${dedupeId} by instance #${this.instanceId}`);
    }
  }

  /**
   * 獲取聊天上下文
   */
  private async getChatContext(chatId: string) {
    return await db.chat.findFirst({
      where: { id: chatId },
      include: {
        msgs: {
          orderBy: { time: 'desc' },
          take: 20,
        },
      },
    });
  }

  /**
   * 生成 AI 回應 (使用受保護的 AI 服務)
   */
  private async generateAIResponse(chat: any, userMessage: string, userId?: string): Promise<string> {
    // 優化對話歷史處理：確保 AI 能獲得完整的上下文
    const conversationHistory = chat.msgs
      .slice(0, 15) // 增加到最近15條訊息，提供更豐富的上下文
      .reverse() // 按時間順序排列（最舊的在前面）
      .map((msg: any) => ({
        role: msg.role.toLowerCase() === 'user' ? 'user' : 'assistant',
        content: msg.content,
        timestamp: msg.time, // 保留時間戳，幫助 AI 理解對話流程
      }));

    // 注意：為了確保對話的連續性和個人化，我們不使用快取機制
    // 每次都會根據完整的對話歷史生成新的回應
    logger.debug('Generating fresh AI response for chat context', {
      chatId: chat.id,
      messageLength: userMessage.length,
      historyCount: conversationHistory.length,
      contextType: chat.context?.type,
    });

    // 主要 AI 服務調用（Gemini）
    const primaryOperation = withTimeout(
      async () => {
        const { generateChatResponse } = await import('./ai-chat.server.js');

        logger.debug('Calling primary AI service (Gemini)', {
          messageLength: userMessage.length,
          historyCount: conversationHistory.length,
        });

        return await generateChatResponse({
          message: userMessage,
          conversationHistory,
          context: chat.context,
        });
      },
      15000,
      'gemini-chat'
    );

    // 備援 AI 服務調用（OpenAI）
    const fallbackOperation = withTimeout(
      async () => {
        const { generateChatResponse } = await import('./ai-chat.server.js');

        logger.debug('Calling fallback AI service (OpenAI)', {
          messageLength: userMessage.length,
          historyCount: conversationHistory.length,
        });

        // 這裡 fallback 會在 ai-chat.server.ts 中處理
        return await generateChatResponse({
          message: userMessage,
          conversationHistory,
          context: chat.context,
        });
      },
      20000,
      'openai-chat'
    );

    try {
      const aiResponse = await ProtectedAIService.callAIWithFallback(
        primaryOperation,
        fallbackOperation,
        'chat-ai-response'
      );

      // 注意：我們不快取對話回應，因為每次都應該根據上下文生成新內容
      logger.debug('AI response generated successfully', {
        responseLength: aiResponse?.length || 0,
        chatId: chat.id,
      });

      return aiResponse;
    } catch (error) {
      logger.error('All AI services failed for chat response', {
        chatId: chat.id,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      // 返回友好的錯誤訊息，並添加重試提示
      if (error instanceof AIServiceUnavailableError) {
        throw error; // 傳遞專用錯誤類型
      }

      throw new Error('AI 服務發生異常，請稍後重試');
    }
  }
}

// 使用 globalThis 確保在 HMR 重載時保持真正的 singleton
declare global {
  var __aiHandlerServiceInstance: AIHandlerService | undefined;
  var __aiHandlerCreationLock: boolean | undefined;
  var __aiHandlerGlobalIsRunning: boolean | undefined;
}

// 初始化全域變數
if (typeof globalThis.__aiHandlerServiceInstance === 'undefined') {
  globalThis.__aiHandlerServiceInstance = undefined;
}
if (typeof globalThis.__aiHandlerCreationLock === 'undefined') {
  globalThis.__aiHandlerCreationLock = false;
}
if (typeof globalThis.__aiHandlerGlobalIsRunning === 'undefined') {
  globalThis.__aiHandlerGlobalIsRunning = false;
}

export function getAIHandlerService(): AIHandlerService {
  if (globalThis.__aiHandlerCreationLock) {
    logger.debug('AI Handler Service creation in progress, waiting...');
    // 如果正在創建中，等待現有實例（簡單的忙等待）
    let attempts = 0;
    while (globalThis.__aiHandlerCreationLock && attempts < 50) {
      require('child_process').execSync('sleep 0.1', { stdio: 'ignore' });
      attempts++;
    }
  }

  if (!globalThis.__aiHandlerServiceInstance) {
    globalThis.__aiHandlerCreationLock = true;
    logger.info('Creating new AI Handler Service instance...');
    globalThis.__aiHandlerServiceInstance = new AIHandlerService();
    globalThis.__aiHandlerCreationLock = false;
  } else {
    logger.debug('Reusing existing AI Handler Service instance...');
  }
  return globalThis.__aiHandlerServiceInstance;
}

// 檢查全域運行狀態
export function isAIHandlerServiceRunning(): boolean {
  return globalThis.__aiHandlerGlobalIsRunning || false;
}

// 設置全域運行狀態
export function setAIHandlerServiceRunning(isRunning: boolean): void {
  globalThis.__aiHandlerGlobalIsRunning = isRunning;
  logger.info(`Global AI Handler Service running status: ${isRunning}`);
}

// 向後兼容
export const aiHandlerService = getAIHandlerService();

// 強制重置服務（用於調試）
export function resetAIHandlerService(): void {
  logger.warn('🔄 Force resetting AI Handler Service...');
  if (globalThis.__aiHandlerServiceInstance) {
    globalThis.__aiHandlerServiceInstance.stop();
  }
  globalThis.__aiHandlerServiceInstance = undefined;
  globalThis.__aiHandlerGlobalIsRunning = false;
  globalThis.__aiHandlerCreationLock = false;
  AIHandlerService.instanceCount = 0;
}
