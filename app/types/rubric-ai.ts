/**
 * Rubric generation types for AI services
 * Covers AI rubric generation requests and responses
 */

/**
 * Conversation history item
 */
export interface ConversationItem {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Rubric generation context
 */
export interface RubricContext {
  [key: string]: unknown;
}

/**
 * Rubric generation request
 */
export interface RubricGenerationRequest {
  message: string;
  conversationHistory: ConversationItem[];
  context?: RubricContext;
}
