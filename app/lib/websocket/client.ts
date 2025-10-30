/**
 * WebSocket 客戶端封裝
 * 單一職責：管理 WebSocket 連接和基本事件處理
 * 使用狀態機模式，消除複雜的條件分支
 */

import { io, Socket } from 'socket.io-client';
import {
  ConnectionState,
  type ConnectionConfig,
  type ConnectionMetrics,
  type WebSocketEvents,
  type WebSocketEmitEvents,
  type WebSocketClientOptions,
} from './types';
import logger from '@/utils/logger';

export class WebSocketClient {
  private socket: Socket<WebSocketEvents, WebSocketEmitEvents> | null = null;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private userId: string | null = null;
  private config: Required<ConnectionConfig>;
  private metrics: ConnectionMetrics;
  private eventHandlers: Map<string, Function[]> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(options?: WebSocketClientOptions) {
    this.config = {
      wsUrl: this.getWebSocketUrl(),
      transports: ['websocket', 'polling'],
      timeout: 15000,
      forceNew: false, // 改為 false 提高穩定性
      maxReconnectAttempts: 10, // 增加重連次數
      reconnectDelay: 1000, // 減少重連延遲
      ...options?.config,
    };

    this.metrics = {
      connectionAttempts: 0,
      lastConnectTime: null,
      lastDisconnectTime: null,
      totalReconnects: 0,
      isHealthy: false,
    };

    // 綁定選項中的回調
    if (options?.onConnect) this.on('connect', options.onConnect);
    if (options?.onDisconnect) this.on('disconnect', options.onDisconnect);
    if (options?.onError) this.on('error', (error: { message: string }) => options.onError!(new Error(error.message)));
    if (options?.onMessage) this.on('new-msg', options.onMessage);

    // 在瀏覽器使用 console,在 Node.js 使用 logger
    if (typeof window !== 'undefined') {
      console.log('[WebSocket] Client initialized with config:', this.config);
    } else {
      logger.debug('[WebSocket] Client initialized with config:', this.config);
    }
  }

  /**
   * 獲取 WebSocket URL (環境自適應)
   */
  private getWebSocketUrl(): string {
    if (typeof window === 'undefined') {
      return 'http://localhost:3001';
    }

    // 在生產環境中使用 Ingress 路由，開發環境直連 WebSocket 服務
    return process.env.NODE_ENV === 'production'
      ? `${window.location.protocol}//${window.location.host}`
      : 'http://localhost:3001';
  }

  /**
   * 連接到 WebSocket (主要入口點)
   */
  async connect(userId: string): Promise<void> {
    // 防止重複連接到相同用戶
    if (this.state === ConnectionState.CONNECTED && this.userId === userId) {
      logger.debug('[WebSocket] Already connected to user:', userId);
      return;
    }

    // 清理現有連接
    if (this.socket) {
      this.cleanup();
    }

    this.setState(ConnectionState.CONNECTING);
    this.userId = userId;
    this.metrics.connectionAttempts++;

    try {
      await this.createConnection();
    } catch (error) {
      this.setState(ConnectionState.ERROR);
      logger.error('[WebSocket] Connection failed:', error);
      throw error;
    }
  }

  /**
   * 創建 Socket.IO 連接
   */
  private async createConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.debug('[WebSocket] Creating connection to:', this.config.wsUrl);

      this.socket = io(this.config.wsUrl, {
        transports: (this.config.transports || ['websocket', 'polling']) as ['websocket', 'polling'],
        timeout: this.config.timeout,
        forceNew: this.config.forceNew,
      });

      // 連接成功
      this.socket.on('connect', () => {
        this.setState(ConnectionState.CONNECTED);
        this.metrics.lastConnectTime = new Date();
        this.metrics.isHealthy = true;

        if (this.userId) {
          this.socket!.emit('join-user', this.userId);
          logger.debug('[WebSocket] Joined user room:', this.userId);
        }

        this.emit('connect');
        resolve();
      });

      // 連接失敗
      this.socket.on('connect_error', (error) => {
        this.setState(ConnectionState.ERROR);
        this.metrics.isHealthy = false;
        logger.error('[WebSocket] Connection error:', error);
        this.emit('error', error);

        // 如果是初始連接失敗，拒絕 Promise
        if (this.metrics.connectionAttempts === 1) {
          reject(error);
        } else {
          // 重連邏輯
          this.scheduleReconnect();
        }
      });

      // 斷線處理
      this.socket.on('disconnect', (reason) => {
        this.setState(ConnectionState.DISCONNECTED);
        this.metrics.lastDisconnectTime = new Date();
        this.metrics.isHealthy = false;

        logger.debug('[WebSocket] Disconnected:', reason);
        this.emit('disconnect', reason);

        // 自動重連 (除非是手動斷線)
        if (reason !== 'io client disconnect') {
          this.scheduleReconnect();
        }
      });

      // 業務事件處理
      this.setupBusinessEventHandlers();
    });
  }

  /**
   * 設置業務事件處理器
   */
  private setupBusinessEventHandlers(): void {
    if (!this.socket) return;

    // 新訊息
    this.socket.on('new-msg', (msg) => {
      logger.debug('[WebSocket] Received new message:', msg.id);
      this.emit('new-msg', msg);
    });

    // 聊天同步
    this.socket.on('chat-sync', (data) => {
      logger.debug('[WebSocket] Received chat sync:', data);
      this.emit('chat-sync', data);
    });

    // 作業通知
    this.socket.on('assignment-notification', (notification) => {
      logger.debug('[WebSocket] Received assignment notification:', notification);
      this.emit('assignment-notification', notification);
    });

    // 提交通知
    this.socket.on('submission-notification', (notification) => {
      logger.debug('[WebSocket] Received submission notification:', notification);
      this.emit('submission-notification', notification);
    });

    // API 重定向 (廢棄功能警告)
    this.socket.on('api-redirect', (data) => {
      logger.warn('[WebSocket] Deprecated API usage:', data);
      this.emit('api-redirect', data);
    });

    // 錯誤處理
    this.socket.on('error', (error) => {
      logger.error('[WebSocket] Socket error:', error);
      this.emit('error', error);
    });
  }

  /**
   * 安排重連
   */
  private scheduleReconnect(): void {
    if (this.metrics.totalReconnects >= this.config.maxReconnectAttempts) {
      logger.error('[WebSocket] Max reconnect attempts reached');
      this.setState(ConnectionState.ERROR);
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    // 指數退避延遲
    const delay = Math.min(this.config.reconnectDelay * Math.pow(2, this.metrics.totalReconnects), 30000);

    logger.debug(`[WebSocket] Scheduling reconnect in ${delay}ms`);

    this.setState(ConnectionState.RECONNECTING);
    this.reconnectTimer = setTimeout(() => {
      if (this.userId) {
        this.metrics.totalReconnects++;
        this.connect(this.userId).catch((error) => {
          logger.error('[WebSocket] Reconnect failed:', error);
        });
      }
    }, delay);
  }

  /**
   * 手動重連
   */
  async reconnect(): Promise<void> {
    if (this.state === ConnectionState.CONNECTING || this.state === ConnectionState.RECONNECTING) {
      logger.debug('[WebSocket] Already attempting to connect');
      return;
    }

    if (!this.userId) {
      throw new Error('No userId available for reconnection');
    }

    logger.debug('[WebSocket] Manual reconnect requested');
    return this.connect(this.userId);
  }

  /**
   * 斷開連接
   */
  disconnect(): void {
    this.cleanup();
    this.setState(ConnectionState.DISCONNECTED);
    this.userId = null;
    this.metrics.isHealthy = false;
    logger.debug('[WebSocket] Manually disconnected');
  }

  /**
   * 清理資源
   */
  private cleanup(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * 加入聊天室
   */
  joinChat(chatId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join-chat', chatId);
      logger.debug('[WebSocket] Joined chat room:', chatId);
    } else {
      logger.warn('[WebSocket] Cannot join chat - not connected');
    }
  }

  /**
   * 心跳檢測
   */
  ping(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('ping', (response) => {
        resolve(response);
      });
    });
  }

  /**
   * 事件監聽器 (替代直接使用 socket.on)
   */
  on<T extends keyof WebSocketEvents>(event: T, handler: WebSocketEvents[T]): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }

    this.eventHandlers.get(event)!.push(handler);

    // 返回取消訂閱函數
    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * 觸發事件
   */
  private emit<T extends keyof WebSocketEvents>(event: T, ...args: Parameters<WebSocketEvents[T]>): void {
    const handlers = this.eventHandlers.get(event);
    const handlerCount = handlers?.length || 0;

    console.log('[WebSocket Client] 📤 Emitting event:', event, 'to', handlerCount, 'handler(s)');

    if (handlerCount === 0) {
      console.warn('[WebSocket Client] ⚠️ No handlers registered for event:', event);
      return;
    }

    if (handlers) {
      handlers.forEach((handler, index) => {
        try {
          console.log(`[WebSocket Client] 🔄 Calling handler ${index + 1}/${handlerCount} for event:`, event);
          // TypeScript can't infer proper typing here due to the Map structure,
          // but the actual call is guaranteed to be correct by type system
          const typedHandler = handler as (...args: Parameters<WebSocketEvents[T]>) => void;
          typedHandler(...args);
          console.log(`[WebSocket Client] ✅ Handler ${index + 1} completed for event:`, event);
        } catch (error) {
          console.error(`[WebSocket Client] ❌ Handler ${index + 1} error for ${event}:`, error);
          logger.error(`[WebSocket] Event handler error for ${event}:`, error);
        }
      });
    }
  }

  /**
   * 設置狀態
   */
  private setState(newState: ConnectionState): void {
    if (this.state !== newState) {
      logger.debug(`[WebSocket] State changed: ${this.state} -> ${newState}`);
      this.state = newState;
    }
  }

  // Getters
  get connectionState(): ConnectionState {
    return this.state;
  }

  get isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED;
  }

  get currentUserId(): string | null {
    return this.userId;
  }

  get connectionMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  get isHealthy(): boolean {
    return this.metrics.isHealthy && this.isConnected;
  }
}
