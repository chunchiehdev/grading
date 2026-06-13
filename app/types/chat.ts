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
interface Chat {
  id: string;
  title?: string;
  context?: ChatContext; // Context info for AI responses
  createdAt: Date;
  msgs: ChatMsg[];
}

/**
 * Chat list item for displaying in UI
 */
interface ChatList {
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
interface ChatContext {
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
