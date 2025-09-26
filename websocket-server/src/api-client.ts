import logger from './logger.js';

export interface ApiMessage {
  id: string;
  role: 'USER' | 'AI';
  content: string;
  time: Date;
}

export interface ApiChat {
  id: string;
  userId: string;
  title: string | null;
  context: any;
  createdAt: Date;
  updatedAt: Date;
  msgs: ApiMessage[];
}

export interface CreateMessageRequest {
  chatId: string;
  role: 'USER' | 'AI';
  content: string;
}

export interface CreateMessageResponse {
  success: boolean;
  data?: ApiMessage;
  error?: string;
}

export interface GetChatResponse {
  success: boolean;
  data?: ApiChat;
  error?: string;
}

class ApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    // 主應用的 API 端點
    this.baseUrl = process.env.MAIN_APP_URL || 'http://localhost:3000';
    this.apiKey = process.env.INTERNAL_API_KEY || '';
    
    logger.info(`WebSocket API Client initialized:`);
    logger.info(`- Base URL: ${this.baseUrl}`);
    logger.info(`- Has API Key: ${!!this.apiKey}`);
    logger.info(`- API Key prefix: ${this.apiKey ? this.apiKey.substring(0, 8) + '...' : 'none'}`);
    
    if (!this.apiKey) {
      logger.warn('INTERNAL_API_KEY not configured - API calls may fail');
    }
  }

  async createMessage(request: CreateMessageRequest): Promise<CreateMessageResponse> {
    try {
      logger.debug(`Creating message via API: chatId=${request.chatId}, role=${request.role}`);
      logger.debug(`API URL: ${this.baseUrl}/api/chat/messages`);
      logger.debug(`Using API Key: ${this.apiKey ? this.apiKey.substring(0, 8) + '...' : 'none'}`);

      const response = await fetch(`${this.baseUrl}/api/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(request),
      });

      logger.debug(`API Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const responseText = await response.text();
        logger.error(`API Error Response: ${responseText}`);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const result: CreateMessageResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown API error');
      }

      logger.debug(`Message created successfully: ${result.data?.id}`);
      return result;

    } catch (error) {
      logger.error(`Failed to create message: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getChat(chatId: string): Promise<GetChatResponse> {
    try {
      logger.debug(`Getting chat via API: chatId=${chatId}`);

      const response = await fetch(`${this.baseUrl}/api/chat/${chatId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const result: GetChatResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown API error');
      }

      logger.debug(`Chat retrieved successfully: ${result.data?.id}`);
      return result;

    } catch (error) {
      logger.error(`Failed to get chat: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const apiClient = new ApiClient();