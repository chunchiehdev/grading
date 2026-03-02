import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import logger from './logger.js';
import { setupSocketHandlers } from './handlers.js';
import { WebSocketEventHandler } from './event-handler.js';
import { REDIS_CONFIG } from './redis-config.js';

const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173'];

// Create HTTP server
const httpServer = createServer();

// Create Socket.IO server with CORS configuration
const io = new SocketServer(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

// Setup Redis adapter for multi-pod support
async function setupRedisAdapter() {
  if (!process.env.REDIS_HOST) {
    logger.warn('Redis not configured - running in single instance mode');
    return;
  }

  try {
    const redis = new Redis(REDIS_CONFIG);

    // Test Redis connection
    await redis.ping();
    logger.info('Redis connection established');

    // Setup Redis adapter
    const subClient = redis.duplicate();
    io.adapter(createAdapter(redis, subClient));

    logger.info('Socket.IO Redis adapter configured for multi-pod support');

    // Handle Redis connection events
    redis.on('error', (error) => {
      logger.error(`Redis connection error: ${error}`);
    });

    redis.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });
  } catch (error) {
    logger.error(`Failed to setup Redis adapter: ${error}`);
    // Continue without Redis - single instance mode
  }
}

// 初始化事件處理器
const eventHandler = new WebSocketEventHandler(io);

// Setup Socket.IO event handlers
io.on('connection', (socket) => {
  setupSocketHandlers(io, socket);
});

// Health check endpoint
httpServer.on('request', (req, res) => {
  const url = req.url ?? '';

  // Let Socket.IO / Engine.IO own its transport endpoint.
  if (url.startsWith('/socket.io')) {
    return;
  }

  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'healthy',
        service: 'websocket-server',
        timestamp: new Date().toISOString(),
        connections: io.engine.clientsCount,
      })
    );
    return;
  }

  if (res.headersSent || res.writableEnded) {
    return;
  }

  // Handle other requests
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

// Start server
async function startServer() {
  try {
    // Setup Redis adapter
    await setupRedisAdapter();

    // Start event handler
    await eventHandler.start();

    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`WebSocket server started on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down WebSocket server...');

      // Stop event handler
      await eventHandler.stop();

      io.close(() => {
        logger.info('Socket.IO server closed');
        httpServer.close(() => {
          logger.info('HTTP server closed');
          process.exit(0);
        });
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error(`Failed to start server: ${error}`);
    process.exit(1);
  }
}

startServer();
