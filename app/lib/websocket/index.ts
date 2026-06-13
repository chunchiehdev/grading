/**
 * Central entry point for WebSocket.
 */

import { WebSocketClient } from './client';

export const websocketClient = new WebSocketClient();

export { useWebSocket, useWebSocketStatus, useWebSocketEvent } from './hooks';
