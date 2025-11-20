import type { Server } from 'socket.io';
import Redis from 'ioredis';
import logger from './logger.js';
import { REDIS_CONFIG } from './redis-config.js';

export interface ChatEvent {
  type: 'MESSAGE_CREATED' | 'AI_RESPONSE_NEEDED' | 'AI_RESPONSE_GENERATED';
  chatId: string;
  userId: string;
  messageId?: string;
  data?: any;
  timestamp: string;
}

export interface AssignmentNotificationEvent {
  type: 'ASSIGNMENT_CREATED';
  courseId: string;
  assignmentId: string;
  assignmentName: string;
  dueDate: Date | null;
  studentIds: string[];
  teacherName: string;
}

export interface SubmissionNotificationEvent {
  type: 'SUBMISSION_CREATED' | 'SUBMISSION_GRADED';
  notificationId: string | null;
  submissionId: string;
  assignmentId: string;
  assignmentName: string;
  courseId: string;
  courseName: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  submittedAt: string;
}

/**
 * WebSocket 事件處理器
 * 只負責監聽 Redis 事件並廣播，不處理業務邏輯
 */
export class WebSocketEventHandler {
  private subscriber: Redis;
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    this.subscriber = new Redis(REDIS_CONFIG);
  }

  /**
   * 啟動事件監聽
   */
  async start(): Promise<void> {
    // 訂閱事件
    await this.subscriber.subscribe('chat:events', 'notifications:assignment', 'notifications:submission');

    this.subscriber.on('message', async (channel, message) => {
      try {
        if (channel === 'chat:events') {
          const event: ChatEvent = JSON.parse(message);
          await this.handleChatEvent(event);
        } else if (channel === 'notifications:assignment') {
          const event: AssignmentNotificationEvent = JSON.parse(message);
          await this.handleAssignmentNotification(event);
        } else if (channel === 'notifications:submission') {
          const event: SubmissionNotificationEvent = JSON.parse(message);
          await this.handleSubmissionNotification(event);
        }
      } catch (error) {
        logger.error(`Failed to handle ${channel} event: ${error}`);
      }
    });

    logger.info('WebSocket event handler started');
  }

  /**
   * 處理聊天事件
   */
  private async handleChatEvent(event: ChatEvent): Promise<void> {
    switch (event.type) {
      case 'MESSAGE_CREATED':
        await this.handleMessageCreated(event);
        break;
      case 'AI_RESPONSE_GENERATED':
        await this.handleAIResponseGenerated(event);
        break;
      case 'AI_RESPONSE_NEEDED':
        // This event is handled by AI Handler Service, not WebSocket service
        logger.debug('AI_RESPONSE_NEEDED event received - handled by AI Handler Service');
        break;
      default:
        logger.warn(`Unknown event type received: ${event.type}`);
    }
  }

  /**
   * 處理訊息創建事件 - 廣播給聊天室
   */
  private async handleMessageCreated(event: ChatEvent): Promise<void> {
    try {
      // 優先使用事件中的資料，如果沒有則從資料庫獲取
      let messageData = event.data;

      if (!messageData && event.messageId) {
        messageData = await this.getMessageData(event.messageId);
      }

      if (messageData) {
        // 廣播給聊天室中的所有用戶
        this.io.to(`chat:${event.chatId}`).emit('new-msg', messageData);
        logger.debug(`Message broadcasted: ${event.messageId}`);
      } else {
        logger.warn(`No message data available for: ${event.messageId}`);
      }
    } catch (error) {
      logger.error(`Failed to handle message created event: ${error}`);
    }
  }

  /**
   * 處理 AI 回應生成事件
   */
  private async handleAIResponseGenerated(event: ChatEvent): Promise<void> {
    try {
      // 優先使用事件中的資料，如果沒有則從資料庫獲取
      let messageData = event.data;

      if (!messageData && event.messageId) {
        messageData = await this.getMessageData(event.messageId);
      }

      if (messageData) {
        // 廣播 AI 回應
        this.io.to(`chat:${event.chatId}`).emit('new-msg', messageData);
        logger.debug(`AI response broadcasted: ${event.messageId}`);
      } else {
        logger.warn(`No AI response data available for: ${event.messageId}`);
      }
    } catch (error) {
      logger.error(`Failed to handle AI response generated event: ${error}`);
    }
  }

  /**
   * 獲取訊息資料
   * 在實際實作中，這應該從資料庫獲取或從事件中提取
   */
  private async getMessageData(messageId: string): Promise<any> {
    // 這裡應該呼叫 API 獲取訊息資料
    // 或者在事件中直接包含完整的訊息資料
    try {
      const response = await fetch(`${process.env.MAIN_APP_URL}/api/messages/${messageId}`, {
        headers: {
          'x-api-key': process.env.INTERNAL_API_KEY || '',
        },
      });

      if (response.ok) {
        const result = await response.json();
        return result.success ? result.data : null;
      }
    } catch (error) {
      logger.error(`Failed to fetch message data: ${error}`);
    }

    return null;
  }

  /**
   * 處理作業通知事件
   */
  private async handleAssignmentNotification(event: AssignmentNotificationEvent): Promise<void> {
    try {
      const notificationData = {
        type: event.type,
        assignmentId: event.assignmentId,
        assignmentName: event.assignmentName,
        courseId: event.courseId,
        dueDate: event.dueDate,
        teacherName: event.teacherName,
        timestamp: new Date().toISOString(),
      };

      // 向所有課程學生發送通知
      for (const studentId of event.studentIds) {
        const roomName = `user:${studentId}`;
        logger.debug(`📤 Sending assignment notification to room: ${roomName}`);
        logger.debug(`📋 Notification data: ${JSON.stringify(notificationData)}`);
        this.io.to(roomName).emit('assignment-notification', notificationData);

        // 檢查房間中的連接數
        const sockets = await this.io.in(roomName).fetchSockets();
        logger.debug(`🔗 Room ${roomName} has ${sockets.length} connected sockets`);
      }

      logger.info(`Assignment notification sent to ${event.studentIds.length} students for course ${event.courseId}`);
    } catch (error) {
      logger.error(`Failed to handle assignment notification: ${error}`);
    }
  }

  /**
   * 處理作業提交通知事件
   */
  private async handleSubmissionNotification(event: SubmissionNotificationEvent): Promise<void> {
    try {
      logger.info({
        notificationId: event.notificationId,
        submissionId: event.submissionId,
        teacherId: event.teacherId,
        studentName: event.studentName,
        assignmentName: event.assignmentName
      }, `[WS EventHandler] 📨 Handling submission notification`);

      const notificationData = {
        type: event.type,
        notificationId: event.notificationId, // Include notification ID
        submissionId: event.submissionId,
        assignmentId: event.assignmentId,
        assignmentName: event.assignmentName,
        courseId: event.courseId,
        courseName: event.courseName,
        studentId: event.studentId,
        studentName: event.studentName,
        submittedAt: event.submittedAt,
        timestamp: new Date().toISOString(),
      };

      // 向教師發送通知
      const roomName = `user:${event.teacherId}`;
      logger.info(`[WS EventHandler] 📤 Emitting to room: ${roomName}`);
      logger.debug(`[WS EventHandler] 📄 Full notification data: ${JSON.stringify(notificationData)}`);

      this.io.to(roomName).emit('submission-notification', notificationData);

      // 檢查房間中的連接數
      const sockets = await this.io.in(roomName).fetchSockets();
      logger.info(`[WS EventHandler] 🔗 Room ${roomName} has ${sockets.length} connected socket(s)`);

      if (sockets.length === 0) {
        logger.warn(`[WS EventHandler] ⚠️ No sockets connected to room ${roomName}, notification may not be received`);
      } else {
        logger.info(`[WS EventHandler]   Notification emitted to ${sockets.length} socket(s) in room ${roomName}`);
      }
    } catch (error) {
      logger.error(`[WS EventHandler] ❌ Failed to handle submission notification: ${error}`);
    }
  }

  /**
   * 停止事件處理
   */
  async stop(): Promise<void> {
    await this.subscriber.unsubscribe();
    this.subscriber.disconnect();
    logger.info('WebSocket event handler stopped');
  }
}
