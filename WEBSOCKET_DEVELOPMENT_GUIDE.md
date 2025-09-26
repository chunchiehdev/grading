# 🚀 WebSocket 前後端開發完整指南

## 📋 概述

這份指南教您如何從零開始建立一個生產級的 WebSocket 系統，包含前端客戶端和後端服務器，支援 Kubernetes 部署。

## 🏗 系統架構

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  前端組件        │    │  WebSocket 服務器  │    │  Redis 集群      │
│  (React Hook)   │◄──►│  (Socket.IO)      │◄──►│  (事件佇列)      │
│                 │    │                  │    │                 │
│ app/lib/        │    │ websocket-server/ │    │ + Session Store │
│ websocket/      │    │                  │    │ + Message Queue │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                ▲
                                │
                       ┌──────────────────┐
                       │  主應用 API       │
                       │  (資料庫操作)     │
                       │                  │
                       │ app/api/         │
                       └──────────────────┘
```

## 🎯 Step 1: 後端 WebSocket 服務器

### **1.1 建立獨立的 WebSocket 微服務**

```bash
# 創建獨立目錄
mkdir websocket-server
cd websocket-server

# 初始化 package.json
npm init -y

# 安裝依賴
npm install socket.io @socket.io/redis-adapter ioredis pino cors
npm install -D @types/node @types/cors typescript tsx
```

### **1.2 服務器主程式 (server.ts)**

```typescript
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import logger from './logger.js';
import { setupSocketHandlers } from './handlers.js';
import { WebSocketEventHandler } from './event-handler.js';

const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') ||
  ["http://localhost:3000"];

// 創建 HTTP 服務器
const httpServer = createServer();

// 創建 Socket.IO 服務器
const io = new SocketServer(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true,
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

// 設置 Redis Adapter (支援 K8s 多 Pod)
async function setupRedisAdapter() {
  if (!process.env.REDIS_HOST) {
    logger.warn('Redis not configured - single instance mode');
    return;
  }

  try {
    const redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });

    await redis.ping();
    logger.info('Redis connection established');

    const subClient = redis.duplicate();
    io.adapter(createAdapter(redis, subClient));

    logger.info('Socket.IO Redis adapter configured');
  } catch (error) {
    logger.error(`Failed to setup Redis adapter: ${error}`);
  }
}

// 初始化事件處理器
const eventHandler = new WebSocketEventHandler(io);

// 設置 Socket.IO 事件處理器
io.on('connection', (socket) => {
  setupSocketHandlers(io, socket);
});

// 健康檢查端點
httpServer.on('request', (req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'websocket-server',
      connections: io.engine.clientsCount
    }));
    return;
  }
  res.writeHead(404);
  res.end('Not Found');
});

// 啟動服務器
async function startServer() {
  await setupRedisAdapter();
  await eventHandler.start();

  httpServer.listen(PORT, () => {
    logger.info(`WebSocket server started on port ${PORT}`);
  });
}

startServer().catch(console.error);
```

### **1.3 Socket 事件處理器 (handlers.ts)**

```typescript
import type { Socket, Server } from 'socket.io';
import logger from './logger.js';

export function setupSocketHandlers(io: Server, socket: Socket) {
  logger.debug(`Socket connected: ${socket.id}`);

  // 加入用戶房間
  socket.on('join-user', (userId: string) => {
    socket.join(`user:${userId}`);
    logger.debug(`Socket ${socket.id} joined user:${userId}`);
  });

  // 加入聊天房間
  socket.on('join-chat', (chatId: string) => {
    socket.join(`chat:${chatId}`);
    logger.debug(`Socket ${socket.id} joined chat:${chatId}`);
  });

  // 心跳檢測
  socket.on('ping', (callback) => {
    if (callback) callback('pong');
  });

  // 斷線處理
  socket.on('disconnect', () => {
    logger.debug(`Socket disconnected: ${socket.id}`);
  });
}
```

### **1.4 Redis 事件監聽器 (event-handler.ts)**

```typescript
import type { Server } from 'socket.io';
import Redis from 'ioredis';
import logger from './logger.js';

export interface ChatEvent {
  type: 'MESSAGE_CREATED' | 'AI_RESPONSE_GENERATED';
  chatId: string;
  userId: string;
  messageId: string;
  data: any;
}

export class WebSocketEventHandler {
  private subscriber: Redis;
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    this.subscriber = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });
  }

  async start(): Promise<void> {
    await this.subscriber.subscribe('chat:events');

    this.subscriber.on('message', async (channel, message) => {
      if (channel === 'chat:events') {
        try {
          const event: ChatEvent = JSON.parse(message);
          await this.handleChatEvent(event);
        } catch (error) {
          logger.error('Failed to handle chat event:', error);
        }
      }
    });

    logger.info('WebSocket event handler started');
  }

  private async handleChatEvent(event: ChatEvent): Promise<void> {
    switch (event.type) {
      case 'MESSAGE_CREATED':
      case 'AI_RESPONSE_GENERATED':
        // 廣播訊息到聊天室
        this.io.to(`chat:${event.chatId}`).emit('new-msg', event.data);
        logger.debug(`Message broadcasted to chat:${event.chatId}`);
        break;
    }
  }

  async stop(): Promise<void> {
    await this.subscriber.unsubscribe();
    this.subscriber.disconnect();
  }
}
```

### **1.5 Docker 配置**

```dockerfile
# websocket-server/Dockerfile.dev
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3001

CMD ["npm", "run", "dev"]
```

## 🎯 Step 2: 前端 WebSocket 客戶端

### **2.1 建立前端模組結構**

```
app/lib/websocket/
├── index.ts          # 統一入口
├── types.ts          # 型別定義
├── client.ts         # WebSocket 客戶端類別
└── hooks.ts          # React Hooks
```

### **2.2 型別定義 (types.ts)**

```typescript
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting'
}

export interface ChatMessage {
  id: string;
  role: 'USER' | 'AI';
  content: string;
  time: Date;
}

export interface WebSocketEvents {
  'connect': () => void;
  'disconnect': (reason: string) => void;
  'new-msg': (msg: ChatMessage) => void;
  'error': (error: { message: string }) => void;
}

export interface WebSocketEmitEvents {
  'join-user': (userId: string) => void;
  'join-chat': (chatId: string) => void;
  'ping': (callback?: (response: string) => void) => void;
}
```

### **2.3 WebSocket 客戶端類別 (client.ts)**

```typescript
import { io, Socket } from 'socket.io-client';
import { ConnectionState, type WebSocketEvents, type WebSocketEmitEvents } from './types';

export class WebSocketClient {
  private socket: Socket<WebSocketEvents, WebSocketEmitEvents> | null = null;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private userId: string | null = null;
  private eventHandlers: Map<string, Function[]> = new Map();

  private getWebSocketUrl(): string {
    if (typeof window === 'undefined') {
      return 'http://localhost:3001';
    }
    return process.env.NODE_ENV === 'production'
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : 'http://localhost:3001';
  }

  async connect(userId: string): Promise<void> {
    if (this.state === ConnectionState.CONNECTED && this.userId === userId) {
      return; // 已連接到相同用戶
    }

    // 清理現有連接
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    this.setState(ConnectionState.CONNECTING);
    this.userId = userId;

    return new Promise((resolve, reject) => {
      this.socket = io(this.getWebSocketUrl(), {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true
      });

      this.socket.on('connect', () => {
        this.setState(ConnectionState.CONNECTED);
        this.socket!.emit('join-user', userId);
        this.emit('connect');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        this.setState(ConnectionState.DISCONNECTED);
        this.emit('error', error);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        this.setState(ConnectionState.DISCONNECTED);
        this.emit('disconnect', reason);

        // 自動重連
        if (reason !== 'io client disconnect') {
          setTimeout(() => this.reconnect(), 2000);
        }
      });

      // 設置業務事件監聽
      this.socket.on('new-msg', (msg) => this.emit('new-msg', msg));
      this.socket.on('error', (error) => this.emit('error', error));
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.setState(ConnectionState.DISCONNECTED);
    this.userId = null;
  }

  async reconnect(): Promise<void> {
    if (!this.userId) throw new Error('No userId available for reconnection');
    return this.connect(this.userId);
  }

  joinChat(chatId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join-chat', chatId);
    }
  }

  ping(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }
      this.socket.emit('ping', (response) => resolve(response));
    });
  }

  // 事件系統
  on<T extends keyof WebSocketEvents>(event: T, handler: WebSocketEvents[T]): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);

    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index !== -1) handlers.splice(index, 1);
      }
    };
  }

  private emit<T extends keyof WebSocketEvents>(event: T, ...args: Parameters<WebSocketEvents[T]>): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          (handler as any)(...args);
        } catch (error) {
          console.error(`Event handler error for ${event}:`, error);
        }
      });
    }
  }

  private setState(newState: ConnectionState): void {
    this.state = newState;
  }

  get connectionState(): ConnectionState { return this.state; }
  get isConnected(): boolean { return this.state === ConnectionState.CONNECTED; }
  get currentUserId(): string | null { return this.userId; }
}
```

### **2.4 React Hooks (hooks.ts)**

```typescript
import { useEffect, useRef } from 'react';
import { websocketClient } from './index';
import type { ConnectionState, ChatMessage } from './types';

export function useWebSocket(userId?: string) {
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    if (userIdRef.current === userId && websocketClient.isConnected) return;

    userIdRef.current = userId;
    websocketClient.connect(userId).catch(console.error);

    return () => {
      websocketClient.disconnect();
      userIdRef.current = null;
    };
  }, [userId]);

  return {
    connectionState: websocketClient.connectionState,
    isConnected: websocketClient.isConnected,
    reconnect: () => websocketClient.reconnect(),
    joinChat: (chatId: string) => websocketClient.joinChat(chatId),
    ping: () => websocketClient.ping(),
    on: (event: string, handler: Function) => websocketClient.on(event as any, handler as any)
  };
}

export function useChatWebSocket(userId?: string, chatId?: string) {
  const { joinChat, ...websocket } = useWebSocket(userId);

  useEffect(() => {
    if (chatId && websocket.isConnected) {
      joinChat(chatId);
    }
  }, [chatId, websocket.isConnected, joinChat]);

  const useMessageListener = (handler: (message: ChatMessage) => void) => {
    useEffect(() => {
      const unsubscribe = websocket.on('new-msg', handler);
      return unsubscribe;
    }, [handler]);
  };

  return {
    ...websocket,
    useMessageListener
  };
}
```

### **2.5 統一入口 (index.ts)**

```typescript
import { WebSocketClient } from './client';

// 全域客戶端單例
export const websocketClient = new WebSocketClient();

// 重新匯出所有內容
export * from './types';
export * from './client';
export * from './hooks';

// 便捷方法
export const websocket = {
  connect: (userId: string) => websocketClient.connect(userId),
  disconnect: () => websocketClient.disconnect(),
  joinChat: (chatId: string) => websocketClient.joinChat(chatId),
  ping: () => websocketClient.ping(),
  on: (event: string, handler: Function) => websocketClient.on(event as any, handler as any),

  get isConnected() { return websocketClient.isConnected; },
  get connectionState() { return websocketClient.connectionState; }
};
```

## 🎯 Step 3: 在 React 組件中使用

### **3.1 基本使用**

```typescript
import { useWebSocket } from '@/lib/websocket';
import { useUser } from '@/hooks/useAuth';

export function MyComponent() {
  const { data: user } = useUser();
  const userId = user?.user?.id;  // 注意正確的數據結構

  const { isConnected, connectionState } = useWebSocket(userId);

  return (
    <div>
      <div>連接狀態: {isConnected ? '🟢 已連接' : '🔴 未連接'}</div>
      <div>詳細狀態: {connectionState}</div>
    </div>
  );
}
```

### **3.2 聊天功能整合**

```typescript
import { useChatWebSocket } from '@/lib/websocket';

export function ChatComponent({ chatId }: { chatId: string }) {
  const { data: user } = useUser();
  const userId = user?.user?.id;

  const { isConnected, useMessageListener } = useChatWebSocket(userId, chatId);

  // 監聽新訊息
  useMessageListener((message) => {
    console.log('收到新訊息:', message);
    // 更新 UI 或狀態
  });

  const sendMessage = async (content: string) => {
    // 直接透過 API 發送訊息
    const response = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, role: 'USER', content })
    });
    // 訊息會透過 WebSocket 自動廣播到所有連接的客戶端
  };

  return (
    <div>
      {/* 聊天界面 */}
    </div>
  );
}
```

## 🎯 Step 4: 部署配置

### **4.1 Docker Compose 配置**

```yaml
# docker-compose.dev.yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - REDIS_HOST=redis
    depends_on:
      - websocket
      - redis

  websocket:
    build:
      context: ./websocket-server
      dockerfile: Dockerfile.dev
    ports:
      - "3001:3001"
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=your_password
      - ALLOWED_ORIGINS=http://localhost:3000
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --requirepass your_password
```

### **4.2 Kubernetes 配置範例**

```yaml
# k8s/websocket-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: websocket-server
spec:
  replicas: 3  # 多 Pod 部署
  selector:
    matchLabels:
      app: websocket-server
  template:
    metadata:
      labels:
        app: websocket-server
    spec:
      containers:
      - name: websocket-server
        image: your-registry/websocket-server:latest
        ports:
        - containerPort: 3001
        env:
        - name: REDIS_HOST
          value: "redis-service"
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: password
---
apiVersion: v1
kind: Service
metadata:
  name: websocket-service
spec:
  selector:
    app: websocket-server
  ports:
    - port: 3001
      targetPort: 3001
  type: LoadBalancer
```

## 🎯 Step 5: 最佳實踐

### **5.1 錯誤處理**

```typescript
// 在 WebSocket 客戶端中
try {
  await websocket.connect(userId);
} catch (error) {
  // 連接失敗處理
  console.error('WebSocket connection failed:', error);
  // 顯示用戶友好的錯誤訊息
}
```

### **5.2 性能優化**

```typescript
// 使用防抖避免頻繁重連
const debouncedConnect = useMemo(
  () => debounce((userId: string) => websocket.connect(userId), 1000),
  []
);
```

### **5.3 監控和日誌**

```typescript
// 在服務器端添加監控
io.on('connection', (socket) => {
  logger.info('New connection', {
    socketId: socket.id,
    userAgent: socket.request.headers['user-agent'],
    ip: socket.request.connection.remoteAddress
  });
});
```

## 🚀 總結

這個架構的核心優勢：

1. **前後端分離**：WebSocket 服務器獨立部署，易於擴展
2. **Kubernetes 友好**：Redis adapter 支援多 Pod 部署
3. **類型安全**：完整的 TypeScript 支援
4. **生產就緒**：包含錯誤處理、重連機制、監控
5. **易於使用**：React Hooks 提供簡潔的 API

按照這個指南，初級工程師可以建立一個穩健、可擴展的 WebSocket 系統，適合生產環境使用。