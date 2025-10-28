/**
 * Chat system types and interfaces
 * Covers chat store, messages, and AI chat interactions
 */

import type { Socket } from 'socket.io-client';

/**
 * Chat message with metadata
 */
export interface ChatMsg {
  id: string;
  role: 'USER' | 'AI';
  content: string;
  data?: Record<string, unknown>; // Generic metadata (e.g., tokens used, model)
  time: Date;
}

/**
 * Chat conversation with context
 */
export interface Chat {
  id: string;
  title?: string;
  context?: ChatContext; // Context info for AI responses
  createdAt: Date;
  msgs: ChatMsg[];
}

/**
 * Chat list item for displaying in UI
 */
export interface ChatList {
  id: string;
  title: string;
  lastMsg: string;
  lastTime: Date;
  msgCount: number;
}

/**
 * Context for AI chat interactions
 * Determines how AI responds (e.g., rubric generation vs general chat)
 */
export interface ChatContext {
  type?: 'rubric_generation' | 'general_chat';
  currentRubric?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Socket.IO sync data for multi-device chat synchronization
 */
export interface ChatSyncData {
  type: 'CHAT_STATE_UPDATE' | 'NEW_MESSAGE' | 'CHAT_CREATED' | 'CHAT_DELETED';
  state?: {
    recentChats?: ChatList[];
    currentChat?: Chat;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * API request for creating a new chat
 */
export interface CreateChatRequest {
  title?: string;
  context?: ChatContext;
}

/**
 * API response for chat operations
 */
export interface ChatAPIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Socket type with proper typing (addresses immer typing issue)
 */
export type ChatSocket = Socket;

/**
 * Conversation history item for AI prompting
 */
export interface ConversationHistoryItem {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

/**
 * Chat AI request for generating responses
 */
export interface ChatAIRequest {
  message: string;
  conversationHistory: ConversationHistoryItem[];
  context?: ChatContext;
}

/**
 * Chat AI response from AI providers
 */
export interface ChatAIResponse {
  success: boolean;
  response?: string;
  error?: string;
  provider?: 'gemini' | 'openai';
}

/**
 * Persisted state for Zustand persistence
 */
export interface PersistedChatState {
  chats: ChatList[];
  currentChat: Chat | null;
  userId: string | null;
  [key: string]: unknown;
}
