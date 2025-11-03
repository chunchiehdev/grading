/**
 * WebSocket client wrapper.
 * manage connection, reconnection and event handling.
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
import { perfMonitor } from '@/utils/performance-monitor';

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
      forceNew: false,
      maxReconnectAttempts: 10,
      reconnectDelay: 1000,
      ...options?.config,
    };

    this.metrics = {
      connectionAttempts: 0,
      lastConnectTime: null,
      lastDisconnectTime: null,
      totalReconnects: 0,
      isHealthy: false,
    };

    if (options?.onConnect) this.on('connect', options.onConnect);
    if (options?.onDisconnect) this.on('disconnect', options.onDisconnect);
    if (options?.onError) this.on('error', (error: { message: string }) => options.onError!(new Error(error.message)));
    if (options?.onMessage) this.on('new-msg', options.onMessage);
  }

  /**
   * Get WebSocket url
   */
  private getWebSocketUrl(): string {
    if (typeof window === 'undefined') {
      return 'http://localhost:3001';
    }

    return process.env.NODE_ENV === 'production'
      ? `${window.location.protocol}//${window.location.host}`
      : 'http://localhost:3001';
  }

  /**
   * Connect to WebSocket server
   */
  async connect(userId: string): Promise<void> {
    perfMonitor.start('websocket-connect', { userId, attempt: this.metrics.connectionAttempts + 1 });

    if (this.state === ConnectionState.CONNECTED && this.userId === userId) {
      logger.debug('[WebSocket] Already connected to user:', userId);
      perfMonitor.end('websocket-connect', { status: 'already-connected' });
      return;
    }

    if (this.socket) {
      this.cleanup();
    }

    this.setState(ConnectionState.CONNECTING);
    this.userId = userId;
    this.metrics.connectionAttempts++;

    try {
      await this.createConnection();
      perfMonitor.end('websocket-connect', { status: 'success' });
    } catch (error) {
      this.setState(ConnectionState.ERROR);
      logger.error('[WebSocket] Connection failed:', error);
      perfMonitor.end('websocket-connect', { status: 'error', error: String(error) });
      throw error;
    }
  }

  /**
   * Create Socket.IO connection
   */
  private async createConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.debug('[WebSocket] Creating connection to:', this.config.wsUrl);

      this.socket = io(this.config.wsUrl, {
        transports: (this.config.transports || ['websocket', 'polling']) as ['websocket', 'polling'],
        timeout: this.config.timeout,
        forceNew: this.config.forceNew,
      });

      // Connection successful
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

      // Connection error
      this.socket.on('connect_error', (error) => {
        this.setState(ConnectionState.ERROR);
        this.metrics.isHealthy = false;
        logger.error('[WebSocket] Connection error:', error);
        this.emit('error', error);

        if (this.metrics.connectionAttempts === 1) {
          reject(error);
        } else {
          this.scheduleReconnect();
        }
      });

      this.socket.on('disconnect', (reason) => {
        this.setState(ConnectionState.DISCONNECTED);
        this.metrics.lastDisconnectTime = new Date();
        this.metrics.isHealthy = false;

        logger.debug('[WebSocket] Disconnected:', reason);
        this.emit('disconnect', reason);

        if (reason !== 'io client disconnect') {
          this.scheduleReconnect();
        }
      });

      this.setupBusinessEventHandlers();
    });
  }

  /**
   * Set up business event handlers
   */
  private setupBusinessEventHandlers(): void {
    if (!this.socket) return;

    // New message
    this.socket.on('new-msg', (msg) => {
      perfMonitor.mark('websocket-event-new-msg', { msgId: msg.id });
      logger.debug('[WebSocket] Received new message:', msg.id);
      this.emit('new-msg', msg);
    });

    // Chat sync
    this.socket.on('chat-sync', (data) => {
      perfMonitor.mark('websocket-event-chat-sync');
      logger.debug('[WebSocket] Received chat sync:', data);
      this.emit('chat-sync', data);
    });

    // Assignment notification
    this.socket.on('assignment-notification', (notification) => {
      perfMonitor.mark('websocket-event-assignment-notification', {
        assignmentId: notification.assignmentId,
        type: notification.type,
      });
      logger.debug('[WebSocket] Received assignment notification:', notification);
      this.emit('assignment-notification', notification);
    });

    // Submission notification
    this.socket.on('submission-notification', (notification) => {
      perfMonitor.mark('websocket-event-submission-notification', {
        submissionId: notification.submissionId,
        type: notification.type,
      });
      logger.debug('[WebSocket] Received submission notification:', notification);
      this.emit('submission-notification', notification);
    });

    // API redirect (deprecated feature warning)
    this.socket.on('api-redirect', (data) => {
      logger.warn('[WebSocket] Deprecated API usage:', data);
      this.emit('api-redirect', data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      perfMonitor.mark('websocket-event-error', { error: String(error) });
      logger.error('[WebSocket] Socket error:', error);
      this.emit('error', error);
    });
  }

  /**
   * Schedule reconnection
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

    // Exponential backoff delay
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
   * Manual reconnect
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
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.cleanup();
    this.setState(ConnectionState.DISCONNECTED);
    this.userId = null;
    this.metrics.isHealthy = false;
    logger.debug('[WebSocket] Manually disconnected');
  }

  /**
   * Clean up resources
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
   * Join chat room
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
   * Heartbeat 
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
   * Event listener
   */
  on<T extends keyof WebSocketEvents>(event: T, handler: WebSocketEvents[T]): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }

    this.eventHandlers.get(event)!.push(handler);

    
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
   *  Emit event to handlers
   */
  private emit<T extends keyof WebSocketEvents>(event: T, ...args: Parameters<WebSocketEvents[T]>): void {
    const handlers = this.eventHandlers.get(event);

    if (!handlers || handlers.length === 0) {
      return;
    }

    handlers.forEach((handler) => {
      try {
        const typedHandler = handler as (...args: Parameters<WebSocketEvents[T]>) => void;
        typedHandler(...args);
      } catch (error) {
        logger.error(`[WebSocket] Event handler error for ${event}:`, error);
      }
    });
  }

  /**
   * Set up event handlers
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
