export interface SendMsgData {
  chatId: string;
  content: string;
  userId: string;
}

export interface RubricGenerationRequest {
  message: string;
  conversationHistory: Array<{
    role: string;
    content: string;
  }>;
  context?: any;
}