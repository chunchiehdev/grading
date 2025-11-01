/**
 * Central entry point for WebSocket.
 */

import { WebSocketClient } from './client';
import type { WebSocketEvents } from './types';

export const websocketClient = new WebSocketClient();

export type {
  ConnectionConfig,
  ConnectionMetrics,
  WebSocketEvents,
  WebSocketEmitEvents,
  WebSocketClientOptions,
  ChatMessage,
  ChatRoom,
} from './types';

export { ConnectionState } from './types';

export { WebSocketClient } from './client';

export {
  useWebSocket,
  useWebSocketStatus,
  useChatWebSocket,
  useWebSocketMonitor,
  useWebSocketEvent,
  useWebSocketReconnect,
} from './hooks';

export const websocket = {
  /**
   * Connect to WebSocket server
   */
  connect: (userId: string) => websocketClient.connect(userId),

  /**
   * Disconnect from WebSocket server
    */
  disconnect: () => websocketClient.disconnect(),

  /**
   * Reconnect to WebSocket server
   */
  reconnect: () => websocketClient.reconnect(),

  /**
   * Join chat room
   */
  joinChat: (chatId: string) => websocketClient.joinChat(chatId),

  /**
   * Heartbeat
   */
  ping: () => websocketClient.ping(),

  /**
   * Event listener
   */
  on: <T extends keyof WebSocketEvents>(event: T, handler: WebSocketEvents[T]) => websocketClient.on(event, handler),

  /**
   * Get connection state
   */
  get connectionState() {
    return websocketClient.connectionState;
  },
  get isConnected() {
    return websocketClient.isConnected;
  },
  get isHealthy() {
    return websocketClient.isHealthy;
  },
  get userId() {
    return websocketClient.currentUserId;
  },
  get metrics() {
    return websocketClient.connectionMetrics;
  },
} as const;
