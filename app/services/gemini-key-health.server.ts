/**
 * Gemini API Key Health Tracking with Redis Coordination
 *
 * This service manages health metrics and coordination for multiple Gemini API keys
 * across distributed workers. It provides:
 * - Per-key health scoring and ranking
 * - Distributed locking for atomic key selection
 * - Throttle cooldown management
 * - Success/failure tracking
 * - Cross-pod coordination via Redis
 *
 * Redis Key Schema:
 * - gemini:key:{1,2,3}:health      → Hash with health metrics
 * - gemini:key:selection:lock      → Lock for atomic operations
 * - gemini:key:metrics             → Sorted set for rankings
 */

import { bullmqRedis as redis } from '@/lib/redis';
import logger from '@/utils/logger';

export interface KeyHealth {
  keyId: string;
  successCount: number;
  failureCount: number;
  lastUsedAt: number; 
  throttledUntil: number; 
  totalResponseTime: number; 
  requestCount: number;
}

export interface KeyHealthMetrics extends KeyHealth {
  successRate: number;
  avgResponseTime: number;
  isThrottled: boolean;
  healthScore: number;
}

export type ErrorType = 'rate_limit' | 'overloaded' | 'unavailable' | 'other';

/**
 * Advanced health tracking for Gemini API keys with Redis coordination
 */
export class KeyHealthTracker {
  private readonly LOCK_KEY = 'gemini:key:selection:lock';
  private readonly LOCK_TIMEOUT_MS = 1000; // 1 second
  private readonly KEY_TTL_SECONDS = 86400; // 24 hours
  private readonly BASE_COOLDOWN_MS = 10000; // 10 seconds base cooldown
  private readonly MAX_COOLDOWN_MS = 3600000; // 1 hour max cooldown (increased for daily quotas)
  private readonly DEFAULT_COOLDOWN_MS = 30000; // 30 seconds default cooldown

  /**
   * Get Redis key for a specific key's health data
   */
  private getHealthKey(keyId: string): string {
    return `gemini:key:${keyId}:health`;
  }

  /**
   * Initialize health data for a key if it doesn't exist
   */
  async initializeKey(keyId: string): Promise<void> {
    const key = this.getHealthKey(keyId);
    const exists = await redis.exists(key);

    if (!exists) {
      const initialData: Record<string, string | number> = {
        successCount: 0,
        failureCount: 0,
        lastUsedAt: 0,
        throttledUntil: 0,
        totalResponseTime: 0,
        requestCount: 0,
      };

      await redis.hset(key, initialData);
      await redis.expire(key, this.KEY_TTL_SECONDS);

      logger.info('Initialized Gemini key health', { keyId });
    }
  }

  /**
   * Acquire distributed lock for atomic operations
   */
  private async acquireLock(): Promise<boolean> {
    const lockValue = `${Date.now()}-${Math.random()}`;
    const acquired = await redis.set(
      this.LOCK_KEY,
      lockValue,
      'PX',
      this.LOCK_TIMEOUT_MS,
      'NX'
    );

    return acquired === 'OK';
  }

  /**
   * Release distributed lock
   */
  private async releaseLock(): Promise<void> {
    await redis.del(this.LOCK_KEY);
  }

  /**
   * Get health data for a specific key
   */
  async getKeyHealth(keyId: string): Promise<KeyHealth> {
    const key = this.getHealthKey(keyId);
    const data = await redis.hgetall(key);

    if (!data || Object.keys(data).length === 0) {
      // Initialize if not exists
      await this.initializeKey(keyId);
      return this.getKeyHealth(keyId);
    }

    return {
      keyId,
      successCount: parseInt(data.successCount || '0', 10),
      failureCount: parseInt(data.failureCount || '0', 10),
      lastUsedAt: parseInt(data.lastUsedAt || '0', 10),
      throttledUntil: parseInt(data.throttledUntil || '0', 10),
      totalResponseTime: parseInt(data.totalResponseTime || '0', 10),
      requestCount: parseInt(data.requestCount || '0', 10),
    };
  }

  /**
   * Get health data for all keys
   */
  async getAllKeyHealth(keyIds: string[]): Promise<KeyHealth[]> {
    return Promise.all(keyIds.map((keyId) => this.getKeyHealth(keyId)));
  }

  /**
   * Calculate health metrics from raw health data
   */
  private calculateMetrics(health: KeyHealth): KeyHealthMetrics {
    const totalCalls = health.successCount + health.failureCount;
    const successRate = totalCalls > 0 ? health.successCount / totalCalls : 1.0;
    const avgResponseTime =
      health.requestCount > 0 ? health.totalResponseTime / health.requestCount : 0;

    const now = Date.now();
    const isThrottled = health.throttledUntil > now;

    // Health Score Algorithm:
    // Score = (successRate × 0.6) + (availability × 0.3) + (recency × 0.1)
    const availability = isThrottled ? 0 : 1;
    const maxAge = 3600000; // 1 hour in ms
    const timeSinceLastUse = health.lastUsedAt > 0 ? now - health.lastUsedAt : maxAge;
    const recency = Math.max(0, 1 - timeSinceLastUse / maxAge);

    const healthScore = successRate * 0.6 + availability * 0.3 + recency * 0.1;

    return {
      ...health,
      successRate,
      avgResponseTime,
      isThrottled,
      healthScore,
    };
  }

  /**
   * Get metrics for all keys with health scores
   */
  async getAllMetrics(keyIds: string[]): Promise<KeyHealthMetrics[]> {
    const healthData = await this.getAllKeyHealth(keyIds);
    return healthData.map((h) => this.calculateMetrics(h));
  }

  /**
   * Select the best available key based on health scores
   * Uses distributed lock for atomic selection
   */
  async selectBestKey(keyIds: string[]): Promise<string | null> {
    // Try to acquire lock (with retries)
    let lockAcquired = false;
    for (let i = 0; i < 3; i++) {
      lockAcquired = await this.acquireLock();
      if (lockAcquired) break;
      await new Promise((r) => setTimeout(r, 50 * (i + 1))); // Exponential backoff
    }

    if (!lockAcquired) {
      logger.warn('Failed to acquire lock for key selection, using random fallback');
      // Fallback: random selection
      return keyIds[Math.floor(Math.random() * keyIds.length)];
    }

    try {
      // Get metrics for all keys
      const metrics = await this.getAllMetrics(keyIds);

      // Filter out throttled keys
      const availableKeys = metrics.filter((m) => !m.isThrottled);

      if (availableKeys.length === 0) {
        logger.error('All Gemini keys are throttled', {
          keys: metrics.map((m) => ({
            keyId: m.keyId,
            throttledUntil: new Date(m.throttledUntil).toISOString(),
          })),
        });
        return null;
      }

      // Sort by health score (descending)
      availableKeys.sort((a, b) => b.healthScore - a.healthScore);

      const selectedKey = availableKeys[0].keyId;

      logger.info('Selected Gemini API key', {
        keyId: selectedKey,
        healthScore: availableKeys[0].healthScore.toFixed(3),
        successRate: availableKeys[0].successRate.toFixed(3),
        availableCount: availableKeys.length,
      });

      return selectedKey;
    } finally {
      await this.releaseLock();
    }
  }

  /**
   * Record a successful API call and reset throttle/failure count
   */
  async recordSuccess(keyId: string, responseTimeMs: number): Promise<void> {
    const key = this.getHealthKey(keyId);
    const now = Date.now();

    // Use Lua script for atomic update - reset failure count and throttle on success
    const luaScript = `
      redis.call('HINCRBY', KEYS[1], 'successCount', 1)
      redis.call('HSET', KEYS[1], 'lastUsedAt', ARGV[1])
      redis.call('HINCRBY', KEYS[1], 'totalResponseTime', ARGV[2])
      redis.call('HINCRBY', KEYS[1], 'requestCount', 1)
      redis.call('HSET', KEYS[1], 'failureCount', 0)
      redis.call('HSET', KEYS[1], 'throttledUntil', 0)
      redis.call('EXPIRE', KEYS[1], ARGV[3])
      return 1
    `;

    await redis.eval(
      luaScript,
      1,
      key,
      now.toString(),
      responseTimeMs.toString(),
      this.KEY_TTL_SECONDS.toString()
    );

    logger.debug('Recorded Gemini API success', { keyId, responseTimeMs });
  }

  /**
   * Calculate exponential backoff cooldown based on consecutive failures
   */
  private calculateCooldown(failureCount: number): number {
    // Exponential backoff: 10s, 20s, 40s, 80s, capped at 120s
    const cooldown = Math.min(
      this.BASE_COOLDOWN_MS * Math.pow(2, failureCount - 1),
      this.MAX_COOLDOWN_MS
    );
    return cooldown;
  }

  /**
   * Record a failed API call with exponential backoff
   */
  async recordFailure(keyId: string, errorType: ErrorType, errorMessage?: string): Promise<void> {
    const key = this.getHealthKey(keyId);
    const now = Date.now();

    // Determine if this error should trigger throttling
    const shouldThrottle = ['rate_limit', 'overloaded', 'unavailable'].includes(errorType);
    
    // Check for hard quota limits (daily limit exceeded)
    const isQuotaExceeded = errorMessage?.toLowerCase().includes('quota exceeded');

    if (shouldThrottle || isQuotaExceeded) {
      // Get current failure count to calculate exponential backoff
      const health = await this.getKeyHealth(keyId);
      const consecutiveFailures = health.failureCount + 1;
      
      // If quota exceeded, force a long cooldown (4 hours), otherwise use exponential backoff
      let cooldownMs = this.calculateCooldown(consecutiveFailures);
      if (isQuotaExceeded) {
        cooldownMs = Math.max(cooldownMs, 14400000); // Minimum 4 hours for quota exceeded
      }

      const throttleUntil = now + cooldownMs;

      // Atomic update with throttle
      const luaScript = `
        redis.call('HINCRBY', KEYS[1], 'failureCount', 1)
        redis.call('HSET', KEYS[1], 'lastUsedAt', ARGV[1])
        redis.call('HSET', KEYS[1], 'throttledUntil', ARGV[2])
        redis.call('EXPIRE', KEYS[1], ARGV[3])
        return 1
      `;

      await redis.eval(
        luaScript,
        1,
        key,
        now.toString(),
        throttleUntil.toString(),
        this.KEY_TTL_SECONDS.toString()
      );

      logger.warn('Gemini API key throttled', {
        keyId,
        errorType,
        errorMessage,
        consecutiveFailures,
        cooldownMs,
        throttledUntil: new Date(throttleUntil).toISOString(),
      });
    } else {
      // Just record failure without throttling
      await redis.hincrby(key, 'failureCount', 1);
      await redis.hset(key, 'lastUsedAt', now);
      await redis.expire(key, this.KEY_TTL_SECONDS);

      logger.debug('Recorded Gemini API failure', { keyId, errorType, errorMessage });
    }
  }

  /**
   * Manually mark a key as throttled
   */
  async markThrottled(keyId: string, durationMs: number = this.DEFAULT_COOLDOWN_MS): Promise<void> {
    const key = this.getHealthKey(keyId);
    const throttledUntil = Date.now() + durationMs;

    await redis.hset(key, 'throttledUntil', throttledUntil);
    await redis.expire(key, this.KEY_TTL_SECONDS);

    logger.info('Manually throttled Gemini key', {
      keyId,
      durationMs,
      throttledUntil: new Date(throttledUntil).toISOString(),
    });
  }

  /**
   * Clear throttle for a key (for manual recovery)
   */
  async clearThrottle(keyId: string): Promise<void> {
    const key = this.getHealthKey(keyId);
    await redis.hset(key, 'throttledUntil', 0);

    logger.info('Cleared throttle for Gemini key', { keyId });
  }

  /**
   * Reset all health data for a key
   */
  async resetKey(keyId: string): Promise<void> {
    const key = this.getHealthKey(keyId);
    await redis.del(key);
    await this.initializeKey(keyId);

    logger.info('Reset Gemini key health', { keyId });
  }

  /**
   * Get summary statistics for monitoring
   */
  async getSummaryStats(keyIds: string[]): Promise<{
    totalCalls: number;
    totalSuccesses: number;
    totalFailures: number;
    avgSuccessRate: number;
    throttledCount: number;
    availableCount: number;
  }> {
    const metrics = await this.getAllMetrics(keyIds);

    const totalSuccesses = metrics.reduce((sum, m) => sum + m.successCount, 0);
    const totalFailures = metrics.reduce((sum, m) => sum + m.failureCount, 0);
    const totalCalls = totalSuccesses + totalFailures;
    const avgSuccessRate = totalCalls > 0 ? totalSuccesses / totalCalls : 1.0;
    const throttledCount = metrics.filter((m) => m.isThrottled).length;
    const availableCount = metrics.filter((m) => !m.isThrottled).length;

    return {
      totalCalls,
      totalSuccesses,
      totalFailures,
      avgSuccessRate,
      throttledCount,
      availableCount,
    };
  }
}

// Singleton instance
let healthTrackerInstance: KeyHealthTracker | null = null;

/**
 * Get singleton instance of KeyHealthTracker
 */
export function getKeyHealthTracker(): KeyHealthTracker {
  if (!healthTrackerInstance) {
    healthTrackerInstance = new KeyHealthTracker();
    logger.info('🏥 KeyHealthTracker initialized');
  }
  return healthTrackerInstance;
}
