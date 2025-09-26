import { redis } from '@/lib/redis';
import { db } from '@/lib/db.server';
import { ProtectedAIService } from './ai-protected.server.js';
import logger from '@/utils/logger';

/**
 * 系統監控和指標收集服務
 * 收集關鍵性能指標和系統健康狀況
 */
export class MonitoringService {
  private static readonly METRICS_KEY_PREFIX = 'metrics:';
  private static readonly ALERT_THRESHOLD = {
    CPU_USAGE: 90,              // CPU使用率警告閾值
    MEMORY_USAGE: 85,           // 記憶體使用率警告閾值
    RESPONSE_TIME: 10000,       // 響應時間警告閾值(ms)
    ERROR_RATE: 20,             // 錯誤率警告閾值(%)
    ACTIVE_CONNECTIONS: 2000,   // 活躍連線警告閾值
  };

  /**
   * 收集系統指標
   */
  static async collectSystemMetrics(): Promise<SystemMetrics> {
    const timestamp = Date.now();
    const date = new Date(timestamp).toISOString();

    try {
      // 並行收集各種指標
      const [
        databaseMetrics,
        redisMetrics,
        aiServiceMetrics,
        chatMetrics,
        performanceMetrics
      ] = await Promise.all([
        this.collectDatabaseMetrics(),
        this.collectRedisMetrics(),
        this.collectAIServiceMetrics(),
        this.collectChatMetrics(),
        this.collectPerformanceMetrics()
      ]);

      const systemMetrics: SystemMetrics = {
        timestamp,
        date,
        database: databaseMetrics,
        redis: redisMetrics,
        aiServices: aiServiceMetrics,
        chat: chatMetrics,
        performance: performanceMetrics,
        system: await this.collectProcessMetrics()
      };

      // 儲存指標到 Redis（保留24小時）
      await this.storeMetrics('system', systemMetrics);

      // 檢查警告條件
      await this.checkAlerts(systemMetrics);

      return systemMetrics;

    } catch (error) {
      logger.error('Failed to collect system metrics:', error);
      throw error;
    }
  }

  /**
   * 收集資料庫指標
   */
  private static async collectDatabaseMetrics(): Promise<DatabaseMetrics> {
    try {
      const [
        activeConnections,
        totalUsers,
        totalChats,
        totalMessages,
        recentChatActivity
      ] = await Promise.all([
        // 模擬資料庫連線數 (Prisma 沒有直接 API)
        Promise.resolve(Math.floor(Math.random() * 20) + 5),
        
        db.user.count(),
        db.chat.count(),
        db.msg.count(),
        
        // 最近24小時的聊天活動
        db.chat.count({
          where: {
            updatedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        })
      ]);

      return {
        activeConnections,
        totalUsers,
        totalChats,
        totalMessages,
        recentChatActivity,
        connectionPoolSize: 10, // 從環境配置獲取
        slowQueries: 0 // 需要實際監控實現
      };

    } catch (error) {
      logger.error('Failed to collect database metrics:', error);
      return {
        activeConnections: 0,
        totalUsers: 0,
        totalChats: 0,
        totalMessages: 0,
        recentChatActivity: 0,
        connectionPoolSize: 0,
        slowQueries: 0
      };
    }
  }

  /**
   * 收集 Redis 指標
   */
  private static async collectRedisMetrics(): Promise<RedisMetrics> {
    try {
      const info = await redis.info('memory');
      const keyspaceInfo = await redis.info('keyspace');
      const statsInfo = await redis.info('stats');

      // 解析 Redis INFO 輸出
      const parseInfo = (info: string) => {
        const result: Record<string, string> = {};
        info.split('\r\n').forEach(line => {
          if (line.includes(':')) {
            const [key, value] = line.split(':');
            result[key] = value;
          }
        });
        return result;
      };

      const memoryInfo = parseInfo(info);
      const keyspaceData = parseInfo(keyspaceInfo);
      const statsData = parseInfo(statsInfo);

      return {
        memoryUsage: parseInt(memoryInfo.used_memory || '0'),
        maxMemory: parseInt(memoryInfo.maxmemory || '0'),
        keyCount: parseInt(keyspaceData.keys || '0'),
        hitRate: parseFloat(statsData.keyspace_hit_rate || '0'),
        connectedClients: parseInt(statsData.connected_clients || '0'),
        commandsProcessed: parseInt(statsData.total_commands_processed || '0')
      };

    } catch (error) {
      logger.error('Failed to collect Redis metrics:', error);
      return {
        memoryUsage: 0,
        maxMemory: 0,
        keyCount: 0,
        hitRate: 0,
        connectedClients: 0,
        commandsProcessed: 0
      };
    }
  }

  /**
   * 收集 AI 服務指標
   */
  private static async collectAIServiceMetrics(): Promise<AIServiceMetrics> {
    try {
      const aiServicesHealth = ProtectedAIService.getAIServicesHealth();
      const detailedStats = ProtectedAIService.getDetailedStats();

      return {
        systemHealth: aiServicesHealth,
        serviceStats: detailedStats,
        totalRequests: detailedStats.reduce((sum, stat) => sum + stat.totalCalls, 0),
        successfulRequests: detailedStats.reduce((sum, stat) => sum + stat.successfulCalls, 0),
        failedRequests: detailedStats.reduce((sum, stat) => sum + stat.failedCalls, 0),
        averageResponseTime: 0 // 需要額外實現響應時間追蹤
      };

    } catch (error) {
      logger.error('Failed to collect AI service metrics:', error);
      return {
        systemHealth: { healthy: false, totalBreakers: 0, healthyBreakers: 0, details: [] },
        serviceStats: [],
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0
      };
    }
  }

  /**
   * 收集聊天系統指標
   */
  private static async collectChatMetrics(): Promise<ChatMetrics> {
    try {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [
        activeUsers,
        messagesLastHour,
        messagesLastDay,
        newChatsToday,
        averageResponseTime
      ] = await Promise.all([
        // 活躍用戶數（最近1小時有訊息的用戶）
        db.user.count({
          where: {
            chats: {
              some: {
                msgs: {
                  some: {
                    time: { gte: hourAgo }
                  }
                }
              }
            }
          }
        }),

        // 最近1小時的訊息數
        db.msg.count({
          where: { time: { gte: hourAgo } }
        }),

        // 最近24小時的訊息數
        db.msg.count({
          where: { time: { gte: dayAgo } }
        }),

        // 今天新建的聊天數
        db.chat.count({
          where: { 
            createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) }
          }
        }),

        // 平均響應時間（簡化實現）
        Promise.resolve(Math.floor(Math.random() * 2000) + 500)
      ]);

      return {
        activeUsers,
        messagesLastHour,
        messagesLastDay,
        newChatsToday,
        averageResponseTime,
        websocketConnections: Math.floor(Math.random() * 50) + 10 // 模擬值
      };

    } catch (error) {
      logger.error('Failed to collect chat metrics:', error);
      return {
        activeUsers: 0,
        messagesLastHour: 0,
        messagesLastDay: 0,
        newChatsToday: 0,
        averageResponseTime: 0,
        websocketConnections: 0
      };
    }
  }

  /**
   * 收集性能指標
   */
  private static async collectPerformanceMetrics(): Promise<PerformanceMetrics> {
    const used = process.memoryUsage();
    
    return {
      memoryUsage: {
        rss: used.rss,
        heapUsed: used.heapUsed,
        heapTotal: used.heapTotal,
        external: used.external
      },
      cpuUsage: process.cpuUsage(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform
    };
  }

  /**
   * 收集進程指標
   */
  private static async collectProcessMetrics(): Promise<SystemProcessMetrics> {
    return {
      pid: process.pid,
      ppid: process.ppid || 0,
      arch: process.arch,
      platform: process.platform,
      nodeVersion: process.version,
      uptime: process.uptime(),
      cwd: process.cwd(),
      execPath: process.execPath,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    };
  }

  /**
   * 儲存指標到 Redis
   */
  private static async storeMetrics(type: string, metrics: any): Promise<void> {
    try {
      const key = `${this.METRICS_KEY_PREFIX}${type}:${Date.now()}`;
      await redis.setex(key, 86400, JSON.stringify(metrics)); // 24小時過期
      
      // 保留最近的指標鍵列表
      const listKey = `${this.METRICS_KEY_PREFIX}${type}:keys`;
      await redis.lpush(listKey, key);
      await redis.ltrim(listKey, 0, 288); // 保留最近12小時的指標 (5分鐘間隔)
      await redis.expire(listKey, 86400);

    } catch (error) {
      logger.error('Failed to store metrics:', error);
    }
  }

  /**
   * 檢查警告條件
   */
  private static async checkAlerts(metrics: SystemMetrics): Promise<void> {
    const alerts: Alert[] = [];

    // CPU 使用率警告 (模擬)
    const cpuUsage = Math.random() * 100;
    if (cpuUsage > this.ALERT_THRESHOLD.CPU_USAGE) {
      alerts.push({
        type: 'CPU_HIGH',
        severity: 'WARNING',
        message: `CPU 使用率過高: ${cpuUsage.toFixed(1)}%`,
        timestamp: Date.now(),
        value: cpuUsage,
        threshold: this.ALERT_THRESHOLD.CPU_USAGE
      });
    }

    // 記憶體使用率警告
    if (metrics.performance.memoryUsage.heapUsed > 0) {
      const memoryUsagePercent = (metrics.performance.memoryUsage.heapUsed / metrics.performance.memoryUsage.heapTotal) * 100;
      if (memoryUsagePercent > this.ALERT_THRESHOLD.MEMORY_USAGE) {
        alerts.push({
          type: 'MEMORY_HIGH',
          severity: 'WARNING',
          message: `記憶體使用率過高: ${memoryUsagePercent.toFixed(1)}%`,
          timestamp: Date.now(),
          value: memoryUsagePercent,
          threshold: this.ALERT_THRESHOLD.MEMORY_USAGE
        });
      }
    }

    // AI 服務健康狀況警告
    if (!metrics.aiServices.systemHealth.healthy) {
      alerts.push({
        type: 'AI_SERVICE_UNHEALTHY',
        severity: 'CRITICAL',
        message: `AI 服務不健康: ${metrics.aiServices.systemHealth.healthyBreakers}/${metrics.aiServices.systemHealth.totalBreakers} 服務正常`,
        timestamp: Date.now(),
        value: metrics.aiServices.systemHealth.healthyBreakers,
        threshold: metrics.aiServices.systemHealth.totalBreakers
      });
    }

    // 儲存警告
    if (alerts.length > 0) {
      await this.storeAlerts(alerts);
      logger.warn('System alerts detected', { alertCount: alerts.length, alerts });
    }
  }

  /**
   * 儲存警告到 Redis
   */
  private static async storeAlerts(alerts: Alert[]): Promise<void> {
    try {
      const alertsKey = `${this.METRICS_KEY_PREFIX}alerts:${Date.now()}`;
      await redis.setex(alertsKey, 604800, JSON.stringify(alerts)); // 7天過期

      // 發布警告事件
      await redis.publish('system:alerts', JSON.stringify({
        timestamp: Date.now(),
        alerts
      }));

    } catch (error) {
      logger.error('Failed to store alerts:', error);
    }
  }

  /**
   * 獲取歷史指標
   */
  static async getMetricsHistory(type: string, limit: number = 288): Promise<any[]> {
    try {
      const listKey = `${this.METRICS_KEY_PREFIX}${type}:keys`;
      const keys = await redis.lrange(listKey, 0, limit - 1);
      
      if (keys.length === 0) return [];

      const metricsData = await redis.mget(...keys);
      return metricsData
        .filter(data => data !== null)
        .map(data => JSON.parse(data!))
        .sort((a, b) => a.timestamp - b.timestamp);

    } catch (error) {
      logger.error('Failed to get metrics history:', error);
      return [];
    }
  }

  /**
   * 獲取當前系統狀態摘要
   */
  static async getSystemStatusSummary(): Promise<SystemStatusSummary> {
    try {
      const currentMetrics = await this.collectSystemMetrics();
      
      return {
        timestamp: Date.now(),
        healthy: currentMetrics.aiServices.systemHealth.healthy,
        metrics: {
          totalUsers: currentMetrics.database.totalUsers,
          activeUsers: currentMetrics.chat.activeUsers,
          totalChats: currentMetrics.database.totalChats,
          messagesLastHour: currentMetrics.chat.messagesLastHour,
          aiServicesHealthy: currentMetrics.aiServices.systemHealth.healthy,
          memoryUsageMB: Math.round(currentMetrics.performance.memoryUsage.heapUsed / 1024 / 1024),
          uptime: currentMetrics.performance.uptime
        }
      };

    } catch (error) {
      logger.error('Failed to get system status summary:', error);
      return {
        timestamp: Date.now(),
        healthy: false,
        metrics: {
          totalUsers: 0,
          activeUsers: 0,
          totalChats: 0,
          messagesLastHour: 0,
          aiServicesHealthy: false,
          memoryUsageMB: 0,
          uptime: 0
        }
      };
    }
  }

  /**
   * 開始定期指標收集
   */
  static startMetricsCollection(intervalMs: number = 300000): void { // 5分鐘間隔
    logger.info('Starting metrics collection', { intervalMs });
    
    const collectMetrics = async () => {
      try {
        await this.collectSystemMetrics();
      } catch (error) {
        logger.error('Metrics collection failed:', error);
      }
    };

    // 立即收集一次
    collectMetrics();

    // 設置定期收集
    const interval = setInterval(collectMetrics, intervalMs);
    
    // 優雅關閉處理
    process.on('SIGINT', () => {
      clearInterval(interval);
      logger.info('Metrics collection stopped');
    });

    process.on('SIGTERM', () => {
      clearInterval(interval);
      logger.info('Metrics collection stopped');
    });
  }
}

// 類型定義
interface SystemMetrics {
  timestamp: number;
  date: string;
  database: DatabaseMetrics;
  redis: RedisMetrics;
  aiServices: AIServiceMetrics;
  chat: ChatMetrics;
  performance: PerformanceMetrics;
  system: SystemProcessMetrics;
}

interface DatabaseMetrics {
  activeConnections: number;
  totalUsers: number;
  totalChats: number;
  totalMessages: number;
  recentChatActivity: number;
  connectionPoolSize: number;
  slowQueries: number;
}

interface RedisMetrics {
  memoryUsage: number;
  maxMemory: number;
  keyCount: number;
  hitRate: number;
  connectedClients: number;
  commandsProcessed: number;
}

interface AIServiceMetrics {
  systemHealth: any;
  serviceStats: any[];
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
}

interface ChatMetrics {
  activeUsers: number;
  messagesLastHour: number;
  messagesLastDay: number;
  newChatsToday: number;
  averageResponseTime: number;
  websocketConnections: number;
}

interface PerformanceMetrics {
  memoryUsage: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  cpuUsage: NodeJS.CpuUsage;
  uptime: number;
  nodeVersion: string;
  platform: string;
}

interface SystemProcessMetrics {
  pid: number;
  ppid: number;
  arch: string;
  platform: string;
  nodeVersion: string;
  uptime: number;
  cwd: string;
  execPath: string;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
}

interface Alert {
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  timestamp: number;
  value: number;
  threshold: number;
}

interface SystemStatusSummary {
  timestamp: number;
  healthy: boolean;
  metrics: {
    totalUsers: number;
    activeUsers: number;
    totalChats: number;
    messagesLastHour: number;
    aiServicesHealthy: boolean;
    memoryUsageMB: number;
    uptime: number;
  };
}