/**
 * WebSocket React Hooks
 * 提供簡潔的 React 介面來使用 WebSocket 功能
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { type ChatMessage, type WebSocketClientOptions, type WebSocketEvents } from './types';
import { websocketClient } from './index';

/**
 * 基礎 WebSocket Hook
 * 處理連接生命週期和基本事件
 */
export function useWebSocket(userId?: string, options?: WebSocketClientOptions) {
  const userIdRef = useRef<string | null>(null);
  const optionsRef = useRef(options);

  // 使用 state 來追蹤 WebSocket 狀態，確保 UI 能響應變化
  const [connectionState, setConnectionState] = useState(websocketClient.connectionState);
  const [isConnected, setIsConnected] = useState(websocketClient.isConnected);
  const [isHealthy, setIsHealthy] = useState(websocketClient.isHealthy);
  const [metrics, setMetrics] = useState(websocketClient.connectionMetrics);

  // 更新選項參考
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // 監聽 WebSocket 狀態變化
  useEffect(() => {
    const updateState = () => {
      setConnectionState(websocketClient.connectionState);
      setIsConnected(websocketClient.isConnected);
      setIsHealthy(websocketClient.isHealthy);
      setMetrics({ ...websocketClient.connectionMetrics });
    };

    // 監聽所有連接狀態變化事件
    const unsubscribeConnect = websocketClient.on('connect', updateState);
    const unsubscribeDisconnect = websocketClient.on('disconnect', updateState);
    const unsubscribeError = websocketClient.on('error', updateState);

    // 定期更新狀態以確保同步
    const interval = setInterval(updateState, 1000);

    // 初始狀態更新
    updateState();

    return () => {
      unsubscribeConnect();
      unsubscribeDisconnect();
      unsubscribeError();
      clearInterval(interval);
    };
  }, []);

  // 自動連接/斷開邏輯
  useEffect(() => {
    if (!userId) return;

    // 防止重複連接相同用戶
    if (userIdRef.current === userId && websocketClient.isConnected) {
      return;
    }

    userIdRef.current = userId;

    // 連接到 WebSocket
    websocketClient.connect(userId).catch((error) => {
      console.error('[useWebSocket] Connection failed:', error);
    });

    // 組件卸載時延遲斷開連接（防止路由切換時誤斷開）
    return () => {
      // 延遲 500ms 斷開，如果在這期間重新掛載就不斷開
      const timeoutId = setTimeout(() => {
        // 檢查是否真的需要斷開（可能已經重新連接了）
        if (userIdRef.current === userId) {
          websocketClient.disconnect();
          userIdRef.current = null;
          console.log('[useWebSocket] Disconnected after cleanup delay');
        }
      }, 500);

      // 如果組件立即重新掛載，清除延遲斷開
      return () => clearTimeout(timeoutId);
    };
  }, [userId]);

  // 返回 WebSocket 狀態和方法
  const onEventListener = useCallback(
    <T extends keyof WebSocketEvents>(event: T, handler: WebSocketEvents[T]) => {
      return websocketClient.on(event, handler);
    },
    []
  );

  return {
    connectionState,
    isConnected,
    isHealthy,
    metrics,

    // 方法
    reconnect: useCallback(() => websocketClient.reconnect(), []),
    disconnect: useCallback(() => websocketClient.disconnect(), []),
    joinChat: useCallback((chatId: string) => websocketClient.joinChat(chatId), []),
    ping: useCallback(() => websocketClient.ping(), []),

    // 事件監聽
    on: onEventListener,
  };
}

/**
 * 聊天專用 Hook
 * 簡化聊天功能的使用
 */
export function useChatWebSocket(userId?: string, chatId?: string) {
  const currentChatRef = useRef<string | null>(null);

  const { connectionState, isConnected, isHealthy, joinChat, on, ...rest } = useWebSocket(userId);

  // 自動加入聊天室
  useEffect(() => {
    if (!chatId || !isConnected) return;

    // 避免重複加入相同聊天室
    if (currentChatRef.current === chatId) return;

    currentChatRef.current = chatId;
    joinChat(chatId);

    // 清理時重置
    return () => {
      currentChatRef.current = null;
    };
  }, [chatId, isConnected, joinChat]);

  // 訊息監聽 Hook
  const useMessageListener = useCallback(
    (handler: (message: ChatMessage) => void) => {
      useEffect(() => {
        const unsubscribe = on('new-msg', handler);
        return unsubscribe;
      }, [handler]);
    },
    [on]
  );

  // 聊天同步監聽 Hook
  const useChatSyncListener = useCallback(
    (handler: (data: any) => void) => {
      useEffect(() => {
        const unsubscribe = on('chat-sync', handler);
        return unsubscribe;
      }, [handler]);
    },
    [on]
  );

  return {
    connectionState,
    isConnected,
    isHealthy,
    currentChatId: currentChatRef.current,

    // 專用的監聽器
    useMessageListener,
    useChatSyncListener,

    // 基礎方法
    ...rest,
  };
}

/**
 * WebSocket 狀態監控 Hook
 * 用於 Debug 和監控
 */
export function useWebSocketMonitor() {
  const metricsRef = useRef(websocketClient.connectionMetrics);

  useEffect(() => {
    const interval = setInterval(() => {
      metricsRef.current = websocketClient.connectionMetrics;
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    metrics: metricsRef.current,
    connectionState: websocketClient.connectionState,
    isHealthy: websocketClient.isHealthy,

    // 診斷方法
    ping: useCallback(async () => {
      try {
        const response = await websocketClient.ping();
        return { success: true, response, latency: Date.now() };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }, []),

    getDebugInfo: useCallback(
      () => ({
        state: websocketClient.connectionState,
        userId: websocketClient.currentUserId,
        metrics: websocketClient.connectionMetrics,
        isHealthy: websocketClient.isHealthy,
        timestamp: new Date().toISOString(),
      }),
      []
    ),
  };
}

/**
 * 一次性事件監聽 Hook
 * 用於處理特定事件的監聽
 */
export function useWebSocketEvent<K extends keyof WebSocketEvents>(
  event: K,
  handler: WebSocketEvents[K],
  deps: React.DependencyList = []
) {
  const handlerRef = useRef(handler);

  // 更新處理器參考 - 每次 handler 改變時更新 ref
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  // 訂閱事件 - 只在 event 名稱改變時重新訂閱
  // 使用 wrapper 函數來確保總是調用最新的 handler
  useEffect(() => {
    const wrappedHandler = ((...args: any[]) => {
      handlerRef.current(...args);
    }) as WebSocketEvents[K];

    const unsubscribe = websocketClient.on(event, wrappedHandler);
    console.log('[useWebSocketEvent] ✅ Subscribed to event:', event);

    return () => {
      console.log('[useWebSocketEvent] 🔌 Unsubscribing from event:', event);
      unsubscribe();
    };
  }, [event]); // 只依賴 event 名稱，不依賴 handler 或 deps
}

/**
 * WebSocket 重連 Hook
 * 提供重連邏輯和狀態
 */
export function useWebSocketReconnect() {
  const isReconnecting = websocketClient.connectionState === 'reconnecting';
  const canReconnect =
    websocketClient.connectionState === 'disconnected' || websocketClient.connectionState === 'error';

  const reconnect = useCallback(async () => {
    if (!canReconnect) {
      throw new Error('Cannot reconnect in current state');
    }

    return websocketClient.reconnect();
  }, [canReconnect]);

  return {
    isReconnecting,
    canReconnect,
    reconnect,
    connectionState: websocketClient.connectionState,
  };
}

/**
 * 只讀 WebSocket 狀態 Hook
 * 不管理連接，只讀取當前狀態
 */
export function useWebSocketStatus() {
  // 使用 state 來追蹤 WebSocket 狀態，確保 UI 能響應變化
  const [connectionState, setConnectionState] = useState(websocketClient.connectionState);
  const [isConnected, setIsConnected] = useState(websocketClient.isConnected);
  const [isHealthy, setIsHealthy] = useState(websocketClient.isHealthy);
  const [metrics, setMetrics] = useState(websocketClient.connectionMetrics);

  // 監聽 WebSocket 狀態變化 (但不管理連接)
  useEffect(() => {
    const updateState = () => {
      setConnectionState(websocketClient.connectionState);
      setIsConnected(websocketClient.isConnected);
      setIsHealthy(websocketClient.isHealthy);
      setMetrics({ ...websocketClient.connectionMetrics });
    };

    // 監聽所有連接狀態變化事件
    const unsubscribeConnect = websocketClient.on('connect', updateState);
    const unsubscribeDisconnect = websocketClient.on('disconnect', updateState);
    const unsubscribeError = websocketClient.on('error', updateState);

    // 定期更新狀態以確保同步
    const interval = setInterval(updateState, 1000);

    // 初始狀態更新
    updateState();

    return () => {
      unsubscribeConnect();
      unsubscribeDisconnect();
      unsubscribeError();
      clearInterval(interval);
    };
  }, []);

  // 返回只讀狀態和安全的方法
  const onEventListener = useCallback(
    <K extends keyof WebSocketEvents>(event: K, handler: WebSocketEvents[K]) => {
      return websocketClient.on(event, handler);
    },
    []
  );

  return {
    connectionState,
    isConnected,
    isHealthy,
    metrics,

    // 方法 (不會觸發斷開連接)
    reconnect: useCallback(() => websocketClient.reconnect(), []),
    ping: useCallback(() => websocketClient.ping(), []),

    // 事件監聽
    on: onEventListener,
  };
}
