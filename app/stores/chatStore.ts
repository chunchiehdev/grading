import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { io, Socket } from 'socket.io-client';
import logger from '@/utils/logger';
import { crossTabSync, type CrossTabMessage } from '@/utils/broadcastChannel';

interface ChatMsg {
  id: string;
  role: 'USER' | 'AI';
  content: string;
  data?: any;
  time: Date;
}

interface Chat {
  id: string;
  title?: string;
  context?: any;
  createdAt: Date;
  msgs: ChatMsg[];
}

interface ChatList {
  id: string;
  title: string;
  lastMsg: string;
  lastTime: Date;
  msgCount: number;
}

interface ChatState {
  // State
  socket: Socket | null;
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  lastDisconnectTime: Date | null;
  chats: ChatList[];
  currentChat: Chat | null;
  isLoading: boolean;
  error: string | null;
  userId: string | null;
  crossTabUnsubscribers: (() => void)[];

  // Actions
  connect: (userId: string) => void;
  disconnect: () => void;
  reconnect: () => void;
  compensateMessages: () => Promise<void>;
  loadChats: () => Promise<void>;
  createChat: (title?: string, context?: any) => Promise<string | null>;
  openChat: (chatId: string) => Promise<void>;
  sendMsg: (content: string) => void;
  clearError: () => void;
  setupCrossTabSync: () => void;
  cleanupCrossTabSync: () => void;
  clearAllData: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      socket: null,
      isConnected: false,
      isReconnecting: false,
      reconnectAttempts: 0,
      lastDisconnectTime: null,
      chats: [],
      currentChat: null,
      isLoading: false,
      error: null,
      userId: null,
      crossTabUnsubscribers: [],

      // Connect to Socket.IO
      connect: (userId: string) => {
        const state = get();

        // 如果已經連接到相同用戶，直接返回
        if (state.socket?.connected && state.userId === userId) {
          console.log('[DEBUG] Already connected to user:', userId);
          return;
        }

        // Disconnect existing socket if any
        if (state.socket) {
          console.log('[DEBUG] Disconnecting existing socket');
          state.socket.removeAllListeners(); // 重要：移除所有監聽器
          state.socket.disconnect();
        }

        // Connect to independent WebSocket service
        const wsUrl =
          typeof window !== 'undefined'
            ? process.env.NODE_ENV === 'production'
              ? `${window.location.protocol}//${window.location.hostname}:3001`
              : 'http://localhost:3001'
            : 'http://localhost:3001';

        console.log('[DEBUG] Using wsUrl:', wsUrl);
        logger.debug('[DEBUG] Using wsUrl:', wsUrl);

        const socket = io(wsUrl, {
          transports: ['websocket', 'polling'],
          timeout: 10000,
          forceNew: true,
        });

        socket.on('connect', () => {
          console.log('[DEBUG] Socket connected, joining user:', userId);
          logger.debug('Socket connected');
          socket.emit('join-user', userId);

          set((state) => {
            state.isConnected = true;
            state.isReconnecting = false;
            state.reconnectAttempts = 0;
            state.error = null;

            // Re-join current chat if exists
            if (state.currentChat) {
              console.log('[DEBUG] Re-joining chat:', state.currentChat.id);
              socket.emit('join-chat', state.currentChat.id);
            }
          });

          // 補償斷線期間可能遺失的訊息
          const currentState = get();
          if (currentState.lastDisconnectTime && currentState.currentChat) {
            currentState.compensateMessages();
          }
        });

        socket.on('disconnect', (reason) => {
          console.log('[DEBUG] Socket disconnected, reason:', reason);
          logger.debug('Socket disconnected', { reason });

          set((state) => {
            state.isConnected = false;
            state.lastDisconnectTime = new Date();
          });

          // 自動重連（除非是手動斷線）
          if (reason !== 'io client disconnect') {
            setTimeout(
              () => {
                const currentState = get();
                if (!currentState.isConnected && currentState.userId) {
                  console.log('[DEBUG] Attempting auto-reconnection...');
                  currentState.reconnect();
                }
              },
              2000 + Math.random() * 3000
            ); // 2-5秒隨機延遲
          }
        });

        socket.on('new-msg', (msg: ChatMsg) => {
          console.log('[DEBUG] Received new message:', msg);
          set((state) => {
            if (state.currentChat && msg) {
              console.log('[DEBUG] Adding message to current chat:', state.currentChat.id);

              // Check if message already exists (avoid duplicates)
              const existingMsgIndex = state.currentChat.msgs.findIndex((m) => m.id === msg.id);
              if (existingMsgIndex >= 0) {
                console.log('[DEBUG] Message already exists, updating:', msg.id);
                // Update existing message
                state.currentChat.msgs[existingMsgIndex] = {
                  ...msg,
                  time: new Date(msg.time),
                };
              } else {
                console.log('[DEBUG] Adding new message:', msg.id);
                // Add new message
                state.currentChat.msgs.push({
                  ...msg,
                  time: new Date(msg.time),
                });
              }

              // Update chat list
              const chatIndex = state.chats.findIndex((c) => c.id === state.currentChat?.id);
              if (chatIndex >= 0) {
                state.chats[chatIndex].lastMsg = msg.content;
                state.chats[chatIndex].lastTime = new Date(msg.time);
                state.chats[chatIndex].msgCount = state.currentChat.msgs.length;
              }

              // 廣播到其他標籤頁（如果訊息不是來自當前標籤頁）
              crossTabSync.broadcastNewMessage(state.currentChat.id, {
                id: msg.id,
                role: msg.role,
                content: msg.content,
                time: msg.time,
              });
            } else {
              console.log('[DEBUG] No current chat or invalid message:', { currentChat: state.currentChat?.id, msg });
            }
          });
        });

        socket.on('connect_error', (error) => {
          console.log('[DEBUG] Socket connection error:', error.message);
          logger.error('Socket connection error:', error);

          set((state) => {
            state.reconnectAttempts++;
            state.isReconnecting = false;

            if (state.reconnectAttempts >= 5) {
              state.error = '連線失敗，請檢查網路連線';
            }
          });

          // 指數退避重試
          if (get().reconnectAttempts < 5) {
            const delay = Math.min(1000 * Math.pow(2, get().reconnectAttempts), 30000);
            setTimeout(() => {
              const currentState = get();
              if (!currentState.isConnected && currentState.userId) {
                currentState.reconnect();
              }
            }, delay);
          }
        });

        socket.on('error', (error: { message: string }) => {
          logger.error('Socket error:', error);
          set((state) => {
            state.error = error.message;
          });
        });

        // 監聽多設備同步事件
        socket.on('chat-sync', (syncData: any) => {
          console.log('[DEBUG] Received chat sync:', syncData);
          set((state) => {
            if (syncData.type === 'CHAT_STATE_UPDATE') {
              // 更新聊天狀態，但不覆蓋當前正在使用的聊天
              if (syncData.state.recentChats && !state.currentChat) {
                // 只在沒有當前聊天時才更新
                state.chats = syncData.state.recentChats || state.chats;
              }
            }
          });
        });

        set((state) => {
          state.socket = socket as any; // 暫時解決 immer 類型問題
          state.userId = userId;
        });

        // 設置多標籤頁同步
        get().setupCrossTabSync();
      },

      // Disconnect socket
      disconnect: () => {
        const state = get();
        state.socket?.disconnect();

        // 清理多標籤頁同步
        get().cleanupCrossTabSync();

        set((state) => {
          state.socket = null;
          state.isConnected = false;
          state.isReconnecting = false;
          state.reconnectAttempts = 0;
          state.userId = null;
        });
      },

      // 手動重連
      reconnect: () => {
        const state = get();

        if (state.isReconnecting || state.isConnected) {
          return;
        }

        if (!state.userId) {
          console.log('[DEBUG] No userId available for reconnection');
          return;
        }

        console.log('[DEBUG] Manual reconnection attempt:', state.reconnectAttempts + 1);

        set((state) => {
          state.isReconnecting = true;
        });

        // 使用現有的連接邏輯
        get().connect(state.userId);
      },

      // 補償遺失的訊息
      compensateMessages: async () => {
        const state = get();

        if (!state.currentChat || !state.lastDisconnectTime) {
          return;
        }

        try {
          console.log('[DEBUG] Compensating messages since:', state.lastDisconnectTime);

          const response = await fetch(`/api/chat/${state.currentChat.id}/messages-since`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              since: state.lastDisconnectTime.toISOString(),
            }),
          });

          const result = await response.json();

          if (result.success && result.data.length > 0) {
            console.log('[DEBUG] Found', result.data.length, 'missed messages');

            set((state) => {
              if (state.currentChat) {
                // 合併新訊息，避免重複
                const existingIds = new Set(state.currentChat.msgs.map((m) => m.id));
                const newMessages = result.data
                  .filter((msg: any) => !existingIds.has(msg.id))
                  .map((msg: any) => ({
                    ...msg,
                    time: new Date(msg.time),
                  }));

                if (newMessages.length > 0) {
                  state.currentChat.msgs.push(...newMessages);

                  // 按時間排序
                  state.currentChat.msgs.sort((a, b) => a.time.getTime() - b.time.getTime());

                  // 更新聊天列表
                  const lastMsg = newMessages[newMessages.length - 1];
                  const chatIndex = state.chats.findIndex((c) => c.id === state.currentChat?.id);
                  if (chatIndex >= 0) {
                    state.chats[chatIndex].lastMsg = lastMsg.content;
                    state.chats[chatIndex].lastTime = lastMsg.time;
                    state.chats[chatIndex].msgCount = state.currentChat.msgs.length;
                  }
                }
              }
            });
          }
        } catch (error) {
          console.error('[ERROR] Failed to compensate messages:', error);
        } finally {
          set((state) => {
            state.lastDisconnectTime = null;
          });
        }
      },

      // Load user chats
      loadChats: async () => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const response = await fetch('/api/chat');
          const result = await response.json();

          if (result.success) {
            set((state) => {
              state.chats = result.data.map((chat: any) => ({
                ...chat,
                lastTime: new Date(chat.lastTime),
              }));
            });
          } else {
            throw new Error(result.error);
          }
        } catch (error) {
          logger.error('Failed to load chats:', error);
          set((state) => {
            state.error = '載入聊天清單失敗';
          });
        } finally {
          set((state) => {
            state.isLoading = false;
          });
        }
      },

      // Create new chat
      createChat: async (title?: string, context?: any) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, context }),
          });

          const result = await response.json();

          if (result.success) {
            // Refresh chat list
            await get().loadChats();
            return result.data.chatId;
          } else {
            throw new Error(result.error);
          }
        } catch (error) {
          logger.error('Failed to create chat:', error);
          set((state) => {
            state.error = '建立聊天失敗';
          });
          return null;
        } finally {
          set((state) => {
            state.isLoading = false;
          });
        }
      },

      // Open specific chat
      openChat: async (chatId: string) => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          const response = await fetch(`/api/chat/${chatId}`);
          const result = await response.json();

          if (result.success) {
            const chat = {
              ...result.data,
              createdAt: new Date(result.data.createdAt),
              msgs: result.data.msgs.map((msg: any) => ({
                ...msg,
                time: new Date(msg.time),
              })),
            };

            set((state) => {
              state.currentChat = chat;
            });

            // 廣播聊天切換到其他標籤頁
            crossTabSync.broadcastChatUpdate(chatId, 'status', {
              action: 'opened',
              chatId,
              timestamp: Date.now(),
            });

            // Join chat room
            const state = get();
            if (state.socket?.connected) {
              console.log('[DEBUG] Joining chat room:', chatId);
              state.socket.emit('join-chat', chatId);
            } else {
              console.log('[DEBUG] Socket not connected, cannot join chat:', chatId);
            }
          } else {
            throw new Error(result.error);
          }
        } catch (error) {
          logger.error('Failed to open chat:', error);
          set((state) => {
            state.error = '開啟聊天失敗';
          });
        } finally {
          set((state) => {
            state.isLoading = false;
          });
        }
      },

      // Send message via API (新架構)
      sendMsg: async (content: string) => {
        const state = get();

        if (!state.currentChat) {
          set((state) => {
            state.error = '未選擇聊天';
          });
          return;
        }

        // 防止重複發送（如果正在載入中）
        if (state.isLoading) {
          console.log('[DEBUG] Already sending message, skipping...');
          return;
        }

        console.log('[DEBUG] Sending message via API:', content, 'to chat:', state.currentChat.id);

        // 設置載入狀態
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          // 直接呼叫 API 儲存訊息
          const response = await fetch('/api/chat/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatId: state.currentChat.id,
              role: 'USER',
              content,
            }),
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || '發送訊息失敗');
          }

          console.log('[DEBUG] Message sent successfully via API:', result.data.id);

          // 廣播訊息到其他標籤頁
          if (state.currentChat) {
            crossTabSync.broadcastNewMessage(state.currentChat.id, {
              id: result.data.id,
              role: 'USER',
              content,
              time: result.data.time,
            });
          }

          // 訊息會透過 WebSocket 事件自動更新到 UI，不需要手動更新
        } catch (error) {
          console.error('[ERROR] Failed to send message via API:', error);
          set((state) => {
            state.error = error instanceof Error ? error.message : '發送訊息失敗';
          });
        } finally {
          // 重要：確保載入狀態被重置
          set((state) => {
            state.isLoading = false;
          });
        }
      },

      // Clear error
      clearError: () => {
        set((state) => {
          state.error = null;
        });
      },

      // 設置多標籤頁同步
      setupCrossTabSync: () => {
        const current = get();

        // 清理舊的監聽器（透過 set 來避免凍結狀態的直接修改）
        if (current.crossTabUnsubscribers.length > 0) {
          // 先執行取消訂閱
          current.crossTabUnsubscribers.forEach((unsubscribe) => unsubscribe());
          // 再透過 set 重置陣列
          set((state) => {
            state.crossTabUnsubscribers = [];
          });
        }

        // 監聽新訊息廣播
        const unsubscribeNewMessage = crossTabSync.subscribe('NEW_MESSAGE', (data) => {
          const { chatId, message } = data;
          const currentState = get();

          // 只在當前聊天室時更新 UI
          if (currentState.currentChat?.id === chatId) {
            set((state) => {
              if (state.currentChat && message) {
                const existingMsgIndex = state.currentChat.msgs.findIndex((m) => m.id === message.id);
                if (existingMsgIndex >= 0) {
                  // 更新現有訊息
                  state.currentChat.msgs[existingMsgIndex] = {
                    ...message,
                    time: new Date(message.time),
                  };
                } else {
                  // 新增訊息
                  state.currentChat.msgs.push({
                    ...message,
                    time: new Date(message.time),
                  });
                }

                // 更新聊天列表
                const chatIndex = state.chats.findIndex((c) => c.id === chatId);
                if (chatIndex >= 0) {
                  state.chats[chatIndex].lastMsg = message.content;
                  state.chats[chatIndex].lastTime = new Date(message.time);
                  state.chats[chatIndex].msgCount = state.currentChat.msgs.length;
                }
              }
            });
          }
        });

        // 監聽聊天更新廣播
        const unsubscribeChatUpdate = crossTabSync.subscribe('CHAT_UPDATE', (data) => {
          const { chatId, updateType, data: updateData } = data;

          set((state) => {
            // 更新聊天列表
            const chatIndex = state.chats.findIndex((c) => c.id === chatId);
            if (chatIndex >= 0) {
              switch (updateType) {
                case 'title':
                  state.chats[chatIndex].title = updateData.title;
                  if (state.currentChat?.id === chatId && state.currentChat) {
                    state.currentChat.title = updateData.title;
                  }
                  break;
                case 'status':
                  // 處理狀態更新
                  break;
              }
            }
          });
        });

        // 監聽同步請求（其他標籤頁要求同步當前狀態）
        const unsubscribeSyncRequest = crossTabSync.subscribe('SYNC_REQUEST', () => {
          const currentState = get();

          // 廣播當前狀態給其他標籤頁
          if (currentState.currentChat || currentState.chats.length > 0) {
            crossTabSync.send('SYNC_RESPONSE', {
              currentChat: currentState.currentChat,
              recentChats: currentState.chats.slice(0, 10), // 只同步最近 10 個聊天
              userId: currentState.userId,
              timestamp: Date.now(),
            });
          }
        });

        // 監聽同步回應（收到其他標籤頁的狀態）
        const unsubscribeSyncResponse = crossTabSync.subscribe('SYNC_RESPONSE', (data) => {
          const currentState = get();

          // 如果當前沒有聊天，使用收到的狀態
          if (!currentState.currentChat && data.recentChats) {
            set((state) => {
              // 合併聊天列表，避免重複
              const existingIds = new Set(state.chats.map((c) => c.id));
              const newChats = data.recentChats.filter((chat: any) => !existingIds.has(chat.id));

              state.chats = [...state.chats, ...newChats];
            });
          }
        });

        // 儲存取消訂閱函數
        set((state) => {
          state.crossTabUnsubscribers = [
            unsubscribeNewMessage,
            unsubscribeChatUpdate,
            unsubscribeSyncRequest,
            unsubscribeSyncResponse,
          ];
        });

        // 向其他標籤頁請求同步
        setTimeout(() => {
          crossTabSync.requestSync();
        }, 100);
      },

      // 清理多標籤頁同步
      cleanupCrossTabSync: () => {
        const state = get();

        // 取消所有訂閱
        state.crossTabUnsubscribers.forEach((unsubscribe) => unsubscribe());

        set((state) => {
          state.crossTabUnsubscribers = [];
        });
      },

      // 清除所有聊天相關資料（含持久化）
      clearAllData: () => {
        try {
          const state = get();

          // 先中斷連線與清理監聽
          state.socket?.disconnect();
          get().cleanupCrossTabSync();

          // 重置記憶體中的狀態
          set((s) => {
            s.socket = null;
            s.isConnected = false;
            s.isReconnecting = false;
            s.reconnectAttempts = 0;
            s.lastDisconnectTime = null;
            s.chats = [];
            s.currentChat = null;
            s.isLoading = false;
            s.error = null;
            s.userId = null;
          });

          // 移除持久化存儲（使用預設 localStorage 與名稱）
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('chat-store');
          }

          // 可選：廣播給其他分頁做同步清空
          try {
            crossTabSync.send('SYNC_REQUEST' as any, { type: 'RESET', timestamp: Date.now() });
          } catch {}
        } catch (err) {
          console.error('[ERROR] Failed to clear chat store:', err);
        }
      },
    })),
    {
      name: 'chat-store',
      version: 2,
      // 當資料結構或來源需要重置時，可藉由版本提升觸發遷移清空
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          return {
            ...persistedState,
            chats: [],
            currentChat: null,
          };
        }
        return persistedState;
      },
      partialize: (state) => ({
        chats: state.chats,
        currentChat: state.currentChat,
      }),
    }
  )
);
