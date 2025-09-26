import type { Socket, Server } from 'socket.io';
import logger from './logger.js';
import type { SendMsgData } from './types.js';

/**
 * 瘦版 WebSocket 處理器
 * 只負責連接管理和房間操作，不處理業務邏輯
 * 所有訊息都通過事件系統處理
 */
export function setupSocketHandlers(io: Server, socket: Socket) {
  logger.debug(`Socket connected: ${socket.id}`);

  // 加入用戶房間
  socket.on('join-user', (userId: string) => {
    socket.join(`user:${userId}`);
    logger.debug(`Socket ${socket.id} joined user:${userId}`);
  });

  // 加入聊天房間
  socket.on('join-chat', (chatId: string) => {
    socket.join(`chat:${chatId}`);
    logger.debug(`Socket ${socket.id} joined chat:${chatId}`);
  });

  // 已廢棄的 send-msg 處理 - 引導前端使用 API
  socket.on('send-msg', async (data: SendMsgData) => {
    logger.warn(`Deprecated send-msg received from ${socket.id}. Please use API endpoint.`);
    
    // 通知前端應該使用 API
    socket.emit('api-redirect', {
      message: '請使用 API 端點發送訊息',
      endpoint: '/api/chat/messages',
      method: 'POST',
      deprecationWarning: 'WebSocket send-msg is deprecated'
    });
  });

  // 連接斷開處理
  socket.on('disconnect', () => {
    logger.debug(`Socket disconnected: ${socket.id}`);
  });

  // 心跳檢測
  socket.on('ping', (callback) => {
    if (callback) {
      callback('pong');
    }
  });
}