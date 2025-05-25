import { mcpConfig, validateMCPConfig } from '@/config/mcp';
import { createMCPGradingClient } from '@/services/mcp.server';
import logger from '@/utils/logger';

/**
 * MCP Health Status
 */
export interface MCPHealthStatus {
  isHealthy: boolean;
  lastChecked: Date;
  gradingServer: {
    url: string;
    status: 'healthy' | 'unhealthy' | 'unknown';
    responseTime?: number;
    error?: string;
  };
  documentServer: {
    url: string;
    status: 'healthy' | 'unhealthy' | 'unknown';
    responseTime?: number;
    error?: string;
  };
}

/**
 * Global MCP health status
 */
let mcpHealthStatus: MCPHealthStatus = {
  isHealthy: false,
  lastChecked: new Date(),
  gradingServer: {
    url: mcpConfig.gradingServer.url,
    status: 'unknown',
  },
  documentServer: {
    url: mcpConfig.documentServer.url,
    status: 'unknown',
  },
};

/**
 * Health check interval reference
 */
let healthCheckInterval: NodeJS.Timeout | null = null;

/**
 * Performs health check on MCP servers
 */
async function performHealthCheck(): Promise<MCPHealthStatus> {
  const startTime = Date.now();
  
  try {
    const mcpClient = createMCPGradingClient();
    
    // Check grading server
    const gradingStartTime = Date.now();
    const gradingHealthy = await mcpClient.healthCheck();
    const gradingResponseTime = Date.now() - gradingStartTime;
    
    mcpHealthStatus = {
      isHealthy: gradingHealthy,
      lastChecked: new Date(),
      gradingServer: {
        url: mcpConfig.gradingServer.url,
        status: gradingHealthy ? 'healthy' : 'unhealthy',
        responseTime: gradingResponseTime,
      },
      documentServer: {
        url: mcpConfig.documentServer.url,
        status: gradingHealthy ? 'healthy' : 'unhealthy', // Assuming same server for now
        responseTime: gradingResponseTime,
      },
    };

    if (mcpConfig.features.logging) {
      logger.info(`MCP Health Check completed in ${Date.now() - startTime}ms`, {
        gradingServer: mcpHealthStatus.gradingServer.status,
        responseTime: gradingResponseTime,
      });
    }
  } catch (error) {
    mcpHealthStatus = {
      isHealthy: false,
      lastChecked: new Date(),
      gradingServer: {
        url: mcpConfig.gradingServer.url,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      documentServer: {
        url: mcpConfig.documentServer.url,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };

    logger.error('MCP Health Check failed:', error);
  }

  return mcpHealthStatus;
}

/**
 * Starts periodic health checks for MCP servers
 */
export function startMCPHealthChecks(): void {
  if (!mcpConfig.features.enabled || !mcpConfig.features.healthChecks) {
    logger.info('MCP health checks disabled');
    return;
  }

  // Validate configuration first
  const validation = validateMCPConfig();
  if (!validation.isValid) {
    logger.error('MCP configuration is invalid, health checks disabled:', validation.errors);
    return;
  }

  logger.info('Starting MCP health checks...');
  
  // Perform initial health check
  performHealthCheck();

  // Start periodic checks
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }

  healthCheckInterval = setInterval(
    performHealthCheck,
    mcpConfig.gradingServer.healthCheckInterval
  );

  logger.info(`MCP health checks started with ${mcpConfig.gradingServer.healthCheckInterval}ms interval`);
}

/**
 * Stops MCP health checks
 */
export function stopMCPHealthChecks(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
    logger.info('MCP health checks stopped');
  }
}

/**
 * Gets current MCP health status
 */
export function getMCPHealthStatus(): MCPHealthStatus {
  return { ...mcpHealthStatus };
}

/**
 * Middleware to check MCP availability before processing
 */
export async function requireMCPHealth(): Promise<boolean> {
  if (!mcpConfig.features.enabled) {
    return true; // MCP not enabled, no health check needed
  }

  const status = getMCPHealthStatus();
  const timeSinceLastCheck = Date.now() - status.lastChecked.getTime();

  // If last check was more than 2x the health check interval, perform immediate check
  if (timeSinceLastCheck > mcpConfig.gradingServer.healthCheckInterval * 2) {
    await performHealthCheck();
  }

  return mcpHealthStatus.isHealthy;
}

/**
 * MCP error handling middleware
 */
export class MCPError extends Error {
  constructor(
    message: string,
    public code: 'UNAVAILABLE' | 'TIMEOUT' | 'AUTH_FAILED' | 'SERVER_ERROR' | 'VALIDATION_FAILED',
    public details?: any
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

/**
 * Wraps MCP operations with error handling and retries
 */
export async function withMCPErrorHandling<T>(
  operation: () => Promise<T>,
  retries: number = mcpConfig.gradingServer.retries
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Check health before operation
      if (attempt === 1) {
        const isHealthy = await requireMCPHealth();
        if (!isHealthy && !mcpConfig.features.fallbackToApi) {
          throw new MCPError('MCP服務不可用', 'UNAVAILABLE');
        }
      }

      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (mcpConfig.features.logging) {
        logger.warn(`MCP operation failed (attempt ${attempt}/${retries}):`, {
          error: lastError.message,
          willRetry: attempt < retries,
        });
      }

      // Don't retry on certain errors
      if (error instanceof MCPError && error.code === 'AUTH_FAILED') {
        break;
      }

      // Wait before retry (exponential backoff)
      if (attempt < retries) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError || new MCPError('MCP操作失敗', 'SERVER_ERROR');
}

/**
 * Initialize MCP middleware
 */
export function initializeMCP(): void {
  if (mcpConfig.features.enabled) {
    const validation = validateMCPConfig();
    
    if (validation.isValid) {
      startMCPHealthChecks();
      logger.info('MCP middleware initialized successfully');
    } else {
      logger.error('Failed to initialize MCP middleware:', validation.errors);
    }
  } else {
    logger.info('MCP is disabled, skipping initialization');
  }
}

/**
 * Cleanup MCP resources
 */
export function cleanupMCP(): void {
  stopMCPHealthChecks();
  logger.info('MCP middleware cleaned up');
} 