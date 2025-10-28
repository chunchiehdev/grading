/**
 * Event system types and interfaces
 * Covers chat events and their payloads
 */

/**
 * Chat event with metadata
 */
export interface ChatEvent {
  type: 'MESSAGE_CREATED' | 'AI_RESPONSE_NEEDED' | 'AI_RESPONSE_GENERATED';
  chatId: string;
  userId: string;
  messageId?: string;
  data?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Message data payload
 */
export interface MessageData {
  messageContent?: string;
  [key: string]: unknown;
}
