/**
 * WebSocket 型別定義
 * 集中管理所有 WebSocket 相關的型別
 */

import type { ChatMsg, Chat, ChatSyncData } from '@/types/chat';

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

// Re-export chat types for convenience
export type ChatMessage = ChatMsg;
export type ChatRoom = Chat;

export interface ConnectionConfig {
  wsUrl?: string;
  transports?: string[];
  timeout?: number;
  forceNew?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

export interface WebSocketEvents {
  // 連接事件
  connect: () => void;
  disconnect: (reason: string) => void;
  connect_error: (error: Error) => void;

  // 聊天事件
  'new-msg': (msg: ChatMessage) => void;
  'chat-sync': (data: ChatSyncData) => void;

  // 通知事件
  'assignment-notification': (notification: AssignmentNotification) => void;
  'submission-notification': (notification: SubmissionNotification) => void;

  // 系統事件
  'api-redirect': (data: { message: string; endpoint: string; method: string }) => void;
  error: (error: { message: string }) => void;
}

export interface AssignmentNotification {
  type: 'ASSIGNMENT_CREATED';
  assignmentId: string;
  assignmentName: string;
  courseId: string;
  dueDate: Date | null;
  teacherName: string;
  timestamp: string;
}

export interface SubmissionNotification {
  type: 'SUBMISSION_CREATED' | 'SUBMISSION_GRADED';
  notificationId: string | null; // ID of the notification record in database
  submissionId: string;
  assignmentId: string;
  assignmentName: string;
  courseId: string;
  courseName: string;
  studentId: string;
  studentName: string;
  submittedAt: string;
  timestamp: string;
}

export interface WebSocketEmitEvents {
  // 房間管理
  'join-user': (userId: string) => void;
  'join-chat': (chatId: string) => void;

  // 心跳檢測
  ping: (callback?: (response: string) => void) => void;
}

export interface WebSocketClientOptions {
  config?: ConnectionConfig;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
  onMessage?: (msg: ChatMessage) => void;
}

export interface ConnectionMetrics {
  connectionAttempts: number;
  lastConnectTime: Date | null;
  lastDisconnectTime: Date | null;
  totalReconnects: number;
  isHealthy: boolean;
}
