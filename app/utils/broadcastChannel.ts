/**
 * 跨標籤頁通訊服務
 * 使用 BroadcastChannel API 實現多標籤頁狀態同步
 */

import type {
  CrossTabMessage,
  CrossTabMessageType,
  CrossTabMessageData,
  MessageListener,
} from '@/types/broadcast';
import type { ChatMsg } from '@/types/chat';

export class CrossTabSyncService {
  private channel: BroadcastChannel | null = null;
  private tabId: string;
  private listeners: Map<CrossTabMessageType, Set<MessageListener>> = new Map();
  private isInitialized = false;

  constructor(channelName = 'chat-sync') {
    this.tabId = this.generateTabId();

    // 檢查瀏覽器支援
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(channelName);
      this.setupMessageHandler();
      this.isInitialized = true;
    }
  }

  /**
   * 生成唯一的標籤頁 ID
   */
  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 設置訊息處理器
   */
  private setupMessageHandler(): void {
    if (!this.channel) return;

    this.channel.addEventListener('message', (event) => {
      const message: CrossTabMessage = event.data;

      // 忽略自己發送的訊息
      if (message.tabId === this.tabId) return;

      // 執行相應的監聽器
      const typeListeners = this.listeners.get(message.type);
      if (typeListeners) {
        typeListeners.forEach((listener) => {
          try {
            listener(message.data);
          } catch (error) {
            console.error('Error in cross-tab listener:', error);
          }
        });
      }

      // 處理同步請求
      if (message.type === 'SYNC_REQUEST') {
        this.handleSyncRequest(message);
      }
    });
  }

  /**
   * 發送訊息到其他標籤頁
   */
  send(type: CrossTabMessageType, data: CrossTabMessageData): void {
    if (!this.channel || !this.isInitialized) return;

    const message: CrossTabMessage = {
      type,
      data,
      timestamp: Date.now(),
      tabId: this.tabId,
    };

    try {
      this.channel.postMessage(message);
    } catch (error) {
      console.error('Failed to send cross-tab message:', error);
    }
  }

  /**
   * 監聽特定類型的訊息
   */
  subscribe(type: CrossTabMessageType, listener: MessageListener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    this.listeners.get(type)!.add(listener);

    // 返回取消訂閱函數
    return () => {
      const typeListeners = this.listeners.get(type);
      if (typeListeners) {
        typeListeners.delete(listener);
        if (typeListeners.size === 0) {
          this.listeners.delete(type);
        }
      }
    };
  }

  /**
   * 請求其他標籤頁的當前狀態
   */
  requestSync(): void {
    this.send('SYNC_REQUEST', {
      requestId: `sync_${Date.now()}`,
      requestedBy: this.tabId,
    });
  }

  /**
   * 處理同步請求
   */
  private handleSyncRequest(message: CrossTabMessage): void {
    // 這裡應該由具體的實現來決定要同步什麼資料
    // 例如：當前聊天狀態、用戶資訊等

    // 觸發同步響應事件，讓上層應用決定要同步什麼
    const syncListeners = this.listeners.get('SYNC_REQUEST');
    if (syncListeners) {
      syncListeners.forEach((listener) => listener(message.data));
    }
  }

  /**
   * 廣播新訊息
   */
  broadcastNewMessage(chatId: string, message: ChatMsg): void {
    this.send('NEW_MESSAGE', { chatId, message });
  }

  /**
   * 廣播聊天更新
   */
  broadcastChatUpdate(
    chatId: string,
    updateType: 'title' | 'status' | 'participants',
    data: Record<string, unknown>
  ): void {
    this.send('CHAT_UPDATE', { chatId, updateType, data });
  }

  /**
   * 廣播用戶狀態變更
   */
  broadcastUserStatus(status: 'online' | 'offline' | 'busy'): void {
    this.send('USER_STATUS', { status, tabId: this.tabId });
  }

  /**
   * 清理資源
   */
  dispose(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
    this.isInitialized = false;
  }

  /**
   * 檢查是否支援跨標籤頁同步
   */
  isSupported(): boolean {
    return this.isInitialized;
  }

  /**
   * 獲取當前標籤頁 ID
   */
  getTabId(): string {
    return this.tabId;
  }
}

// 創建全域實例
export const crossTabSync = new CrossTabSyncService();

// 頁面卸載時清理資源
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    crossTabSync.dispose();
  });
}
