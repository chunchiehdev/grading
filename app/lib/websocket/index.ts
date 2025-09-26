/**
 * WebSocket 模組統一入口
 * 提供全域 WebSocket 客戶端和便捷的匯出
 */

import { WebSocketClient } from './client';
import type { WebSocketEvents } from './types';

// 全域 WebSocket 客戶端單例
export const websocketClient = new WebSocketClient();

// 重新匯出所有類型
export type {
  ConnectionConfig,
  ConnectionMetrics,
  WebSocketEvents,
  WebSocketEmitEvents,
  WebSocketClientOptions,
  ChatMessage,
  ChatRoom
} from './types';

export { ConnectionState } from './types';

// 重新匯出客戶端類別
export { WebSocketClient } from './client';

// 重新匯出所有 Hooks
export {
  useWebSocket,
  useWebSocketStatus,
  useChatWebSocket,
  useWebSocketMonitor,
  useWebSocketEvent,
  useWebSocketReconnect
} from './hooks';

export const websocket = {
  /**
   * 連接到 WebSocket
   */
  connect: (userId: string) => websocketClient.connect(userId),

  /**
   * 斷開連接
   */
  disconnect: () => websocketClient.disconnect(),

  /**
   * 重新連接
   */
  reconnect: () => websocketClient.reconnect(),

  /**
   * 加入聊天室
   */
  joinChat: (chatId: string) => websocketClient.joinChat(chatId),

  /**
   * 心跳檢測
   */
  ping: () => websocketClient.ping(),

  /**
   * 事件監聽
   */
  on: <T extends keyof WebSocketEvents>(event: T, handler: WebSocketEvents[T]) =>
    websocketClient.on(event, handler),

  /**
   * 獲取連接狀態
   */
  get connectionState() { return websocketClient.connectionState; },
  get isConnected() { return websocketClient.isConnected; },
  get isHealthy() { return websocketClient.isHealthy; },
  get userId() { return websocketClient.currentUserId; },
  get metrics() { return websocketClient.connectionMetrics; }
} as const;