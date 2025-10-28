/**
 * Broadcast channel types for cross-tab communication
 * Defines message types and their associated data structures
 */

import type { ChatMsg, ChatContext } from '@/types/chat';

/**
 * Cross-tab message types
 */
export type CrossTabMessageType = 'CHAT_UPDATE' | 'USER_STATUS' | 'NEW_MESSAGE' | 'SYNC_REQUEST' | 'SYNC_RESPONSE';

/**
 * Message data for NEW_MESSAGE type
 */
export interface NewMessageData {
  chatId: string;
  message: ChatMsg;
}

/**
 * Message data for CHAT_UPDATE type
 */
export interface ChatUpdateData {
  chatId: string;
  updateType: 'title' | 'status' | 'participants';
  data: Record<string, unknown>;
}

/**
 * Message data for USER_STATUS type
 */
export interface UserStatusData {
  status: 'online' | 'offline' | 'busy';
  tabId: string;
}

/**
 * Message data for SYNC_REQUEST type
 */
export interface SyncRequestData {
  requestId: string;
  requestedBy: string;
}

/**
 * Message data for SYNC_RESPONSE type
 */
export interface SyncResponseData {
  currentChat?: {
    id: string;
    title?: string;
    context?: ChatContext;
    msgs: ChatMsg[];
  } | null;
  recentChats?: Array<{
    id: string;
    title: string;
    lastMsg: string;
    lastTime: Date;
    msgCount: number;
  }>;
  userId?: string | null;
  timestamp: number;
}

/**
 * Union type for all cross-tab message data
 */
export type CrossTabMessageData =
  | NewMessageData
  | ChatUpdateData
  | UserStatusData
  | SyncRequestData
  | SyncResponseData
  | Record<string, unknown>;

/**
 * Cross-tab message envelope
 */
export interface CrossTabMessage {
  type: CrossTabMessageType;
  data: CrossTabMessageData;
  timestamp: number;
  tabId: string;
}

/**
 * Message listener function type
 */
export type MessageListener = (data: CrossTabMessageData) => void;
