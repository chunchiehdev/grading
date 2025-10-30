import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KeyHealthTracker, type KeyHealth, type ErrorType } from '@/services/gemini-key-health.server';
import { bullmqRedis as redis } from '@/lib/redis';

/**
 * Unit Tests for Gemini Key Health Tracking
 *
 * Tests the Redis-based health tracking and coordination system for
 * multiple Gemini API keys across distributed workers.
 */

describe('KeyHealthTracker', () => {
  let tracker: KeyHealthTracker;
  const testKeyIds = ['1', '2', '3'];

  beforeEach(async () => {
    tracker = new KeyHealthTracker();

    // Clean up Redis keys before each test
    for (const keyId of testKeyIds) {
      await redis.del(`gemini:key:${keyId}:health`);
    }
    await redis.del('gemini:key:selection:lock');
  });

  afterEach(async () => {
    // Clean up after tests
    for (const keyId of testKeyIds) {
      await redis.del(`gemini:key:${keyId}:health`);
    }
    await redis.del('gemini:key:selection:lock');
  });

  describe('Initialization', () => {
    it('should initialize key health data if not exists', async () => {
      await tracker.initializeKey('1');

      const health = await tracker.getKeyHealth('1');

      expect(health.keyId).toBe('1');
      expect(health.successCount).toBe(0);
      expect(health.failureCount).toBe(0);
      expect(health.lastUsedAt).toBe(0);
      expect(health.throttledUntil).toBe(0);
      expect(health.totalResponseTime).toBe(0);
      expect(health.requestCount).toBe(0);
    });

    it('should not reinitialize existing key', async () => {
      await tracker.initializeKey('1');
      await tracker.recordSuccess('1', 100);

      // Try to initialize again
      await tracker.initializeKey('1');

      const health = await tracker.getKeyHealth('1');
      expect(health.successCount).toBe(1); // Should retain previous data
    });

    it('should initialize all keys', async () => {
      for (const keyId of testKeyIds) {
        await tracker.initializeKey(keyId);
      }

      const allHealth = await tracker.getAllKeyHealth(testKeyIds);
      expect(allHealth).toHaveLength(3);
      expect(allHealth.every((h) => h.successCount === 0)).toBe(true);
    });
  });

  describe('Success Recording', () => {
    beforeEach(async () => {
      await tracker.initializeKey('1');
    });

    it('should record successful API call', async () => {
      await tracker.recordSuccess('1', 250);

      const health = await tracker.getKeyHealth('1');
      expect(health.successCount).toBe(1);
      expect(health.failureCount).toBe(0);
      expect(health.requestCount).toBe(1);
      expect(health.totalResponseTime).toBe(250);
      expect(health.lastUsedAt).toBeGreaterThan(0);
    });

    it('should accumulate multiple successes', async () => {
      await tracker.recordSuccess('1', 100);
      await tracker.recordSuccess('1', 200);
      await tracker.recordSuccess('1', 300);

      const health = await tracker.getKeyHealth('1');
      expect(health.successCount).toBe(3);
      expect(health.totalResponseTime).toBe(600);
      expect(health.requestCount).toBe(3);
    });

    it('should update lastUsedAt timestamp', async () => {
      const before = Date.now();
      await tracker.recordSuccess('1', 100);
      const after = Date.now();

      const health = await tracker.getKeyHealth('1');
      expect(health.lastUsedAt).toBeGreaterThanOrEqual(before);
      expect(health.lastUsedAt).toBeLessThanOrEqual(after);
    });
  });

  describe('Failure Recording', () => {
    beforeEach(async () => {
      await tracker.initializeKey('1');
    });

    it('should record failure without throttling for generic errors', async () => {
      await tracker.recordFailure('1', 'other', 'Generic error');

      const health = await tracker.getKeyHealth('1');
      expect(health.failureCount).toBe(1);
      expect(health.throttledUntil).toBe(0); // Not throttled
    });

    it('should throttle key on rate limit error', async () => {
      const before = Date.now();
      await tracker.recordFailure('1', 'rate_limit');

      const health = await tracker.getKeyHealth('1');
      expect(health.failureCount).toBe(1);
      expect(health.throttledUntil).toBeGreaterThan(before);
      expect(health.throttledUntil).toBeLessThanOrEqual(before + 65000); // 60s + buffer
    });

    it('should throttle key on overloaded error', async () => {
      await tracker.recordFailure('1', 'overloaded');

      const health = await tracker.getKeyHealth('1');
      expect(health.throttledUntil).toBeGreaterThan(Date.now());
    });

    it('should throttle key on unavailable error', async () => {
      await tracker.recordFailure('1', 'unavailable');

      const health = await tracker.getKeyHealth('1');
      expect(health.throttledUntil).toBeGreaterThan(Date.now());
    });

    it('should accumulate multiple failures', async () => {
      await tracker.recordFailure('1', 'other');
      await tracker.recordFailure('1', 'other');
      await tracker.recordFailure('1', 'other');

      const health = await tracker.getKeyHealth('1');
      expect(health.failureCount).toBe(3);
    });
  });

  describe('Throttle Management', () => {
    beforeEach(async () => {
      await tracker.initializeKey('1');
    });

    it('should manually mark key as throttled', async () => {
      await tracker.markThrottled('1', 5000); // 5 seconds

      const health = await tracker.getKeyHealth('1');
      expect(health.throttledUntil).toBeGreaterThan(Date.now());
      expect(health.throttledUntil).toBeLessThanOrEqual(Date.now() + 6000);
    });

    it('should clear throttle status', async () => {
      await tracker.markThrottled('1', 60000);
      await tracker.clearThrottle('1');

      const health = await tracker.getKeyHealth('1');
      expect(health.throttledUntil).toBe(0);
    });

    it('should detect throttled key in metrics', async () => {
      await tracker.markThrottled('1', 60000);

      const metrics = await tracker.getAllMetrics(['1']);
      expect(metrics[0].isThrottled).toBe(true);
    });

    it('should detect non-throttled key in metrics', async () => {
      const metrics = await tracker.getAllMetrics(['1']);
      expect(metrics[0].isThrottled).toBe(false);
    });
  });

  describe('Health Metrics Calculation', () => {
    beforeEach(async () => {
      await tracker.initializeKey('1');
    });

    it('should calculate 100% success rate with only successes', async () => {
      await tracker.recordSuccess('1', 100);
      await tracker.recordSuccess('1', 200);
      await tracker.recordSuccess('1', 300);

      const metrics = await tracker.getAllMetrics(['1']);
      expect(metrics[0].successRate).toBe(1.0);
    });

    it('should calculate 50% success rate', async () => {
      await tracker.recordSuccess('1', 100);
      await tracker.recordFailure('1', 'other');

      const metrics = await tracker.getAllMetrics(['1']);
      expect(metrics[0].successRate).toBe(0.5);
    });

    it('should calculate average response time', async () => {
      await tracker.recordSuccess('1', 100);
      await tracker.recordSuccess('1', 200);
      await tracker.recordSuccess('1', 300);

      const metrics = await tracker.getAllMetrics(['1']);
      expect(metrics[0].avgResponseTime).toBe(200); // (100+200+300)/3
    });

    it('should calculate health score for healthy key', async () => {
      // Perfect key: 100% success, not throttled, recently used
      await tracker.recordSuccess('1', 100);

      const metrics = await tracker.getAllMetrics(['1']);
      // Score = (1.0 × 0.6) + (1.0 × 0.3) + (high recency × 0.1)
      expect(metrics[0].healthScore).toBeGreaterThan(0.9);
    });

    it('should calculate lower health score for throttled key', async () => {
      await tracker.recordSuccess('1', 100);
      await tracker.markThrottled('1', 60000);

      const metrics = await tracker.getAllMetrics(['1']);
      // Score = (1.0 × 0.6) + (0.0 × 0.3) + (recency × 0.1)
      expect(metrics[0].healthScore).toBeLessThan(0.8);
    });

    it('should calculate lower health score with failures', async () => {
      await tracker.recordSuccess('1', 100);
      await tracker.recordFailure('1', 'other');
      await tracker.recordFailure('1', 'other');
      await tracker.recordFailure('1', 'other');

      const metrics = await tracker.getAllMetrics(['1']);
      // Success rate = 1/4 = 0.25
      expect(metrics[0].successRate).toBe(0.25);
      expect(metrics[0].healthScore).toBeLessThan(0.5);
    });
  });

  describe('Key Selection', () => {
    beforeEach(async () => {
      for (const keyId of testKeyIds) {
        await tracker.initializeKey(keyId);
      }
    });

    it('should select a key when all are available', async () => {
      const selected = await tracker.selectBestKey(testKeyIds);
      expect(selected).toBeTruthy();
      expect(testKeyIds).toContain(selected);
    });

    it('should select healthiest key based on success rate', async () => {
      // Key 1: 100% success rate
      await tracker.recordSuccess('1', 100);

      // Key 2: 50% success rate
      await tracker.recordSuccess('2', 100);
      await tracker.recordFailure('2', 'other');

      // Key 3: 0% success rate (only failures)
      await tracker.recordFailure('3', 'other');

      const selected = await tracker.selectBestKey(testKeyIds);
      expect(selected).toBe('1'); // Should select key with 100% success
    });

    it('should not select throttled keys', async () => {
      // Throttle keys 1 and 2
      await tracker.markThrottled('1', 60000);
      await tracker.markThrottled('2', 60000);

      const selected = await tracker.selectBestKey(testKeyIds);
      expect(selected).toBe('3'); // Only key 3 is available
    });

    it('should return null when all keys are throttled', async () => {
      // Throttle all keys
      for (const keyId of testKeyIds) {
        await tracker.markThrottled(keyId, 60000);
      }

      const selected = await tracker.selectBestKey(testKeyIds);
      expect(selected).toBeNull();
    });

    it('should prefer recently used keys (recency bonus)', async () => {
      // Both keys have same success rate, but key 1 used more recently
      await tracker.recordSuccess('1', 100);
      await new Promise((r) => setTimeout(r, 100));
      await tracker.recordSuccess('2', 100);

      const selected = await tracker.selectBestKey(['1', '2']);
      expect(selected).toBe('2'); // More recent
    });

    it('should handle single key selection', async () => {
      const selected = await tracker.selectBestKey(['1']);
      expect(selected).toBe('1');
    });
  });

  describe('Distributed Locking', () => {
    it('should acquire lock successfully', async () => {
      // Indirectly test by calling selectBestKey which uses locking
      await tracker.initializeKey('1');
      const selected = await tracker.selectBestKey(['1']);
      expect(selected).toBe('1');

      // Lock should be released, can be acquired again
      const selected2 = await tracker.selectBestKey(['1']);
      expect(selected2).toBe('1');
    });

    it('should handle concurrent key selections', async () => {
      for (const keyId of testKeyIds) {
        await tracker.initializeKey(keyId);
      }

      // Simulate concurrent selections
      const selections = await Promise.all([
        tracker.selectBestKey(testKeyIds),
        tracker.selectBestKey(testKeyIds),
        tracker.selectBestKey(testKeyIds),
      ]);

      // All should succeed
      expect(selections.every((s) => testKeyIds.includes(s!))).toBe(true);
    });
  });

  describe('Summary Statistics', () => {
    beforeEach(async () => {
      for (const keyId of testKeyIds) {
        await tracker.initializeKey(keyId);
      }
    });

    it('should calculate summary stats across all keys', async () => {
      // Key 1: 2 successes
      await tracker.recordSuccess('1', 100);
      await tracker.recordSuccess('1', 200);

      // Key 2: 1 success, 1 failure
      await tracker.recordSuccess('2', 150);
      await tracker.recordFailure('2', 'other');

      // Key 3: 1 failure, throttled
      await tracker.recordFailure('3', 'rate_limit');

      const stats = await tracker.getSummaryStats(testKeyIds);

      expect(stats.totalSuccesses).toBe(3);
      expect(stats.totalFailures).toBe(2);
      expect(stats.totalCalls).toBe(5);
      expect(stats.avgSuccessRate).toBe(0.6); // 3/5
      expect(stats.throttledCount).toBe(1); // Key 3
      expect(stats.availableCount).toBe(2); // Keys 1 and 2
    });

    it('should handle all keys throttled', async () => {
      for (const keyId of testKeyIds) {
        await tracker.markThrottled(keyId, 60000);
      }

      const stats = await tracker.getSummaryStats(testKeyIds);
      expect(stats.throttledCount).toBe(3);
      expect(stats.availableCount).toBe(0);
    });

    it('should return correct stats for fresh keys', async () => {
      const stats = await tracker.getSummaryStats(testKeyIds);

      expect(stats.totalCalls).toBe(0);
      expect(stats.avgSuccessRate).toBe(1.0); // Default when no calls
      expect(stats.throttledCount).toBe(0);
      expect(stats.availableCount).toBe(3);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset key health data', async () => {
      await tracker.initializeKey('1');
      await tracker.recordSuccess('1', 100);
      await tracker.recordFailure('1', 'rate_limit');

      // Reset the key
      await tracker.resetKey('1');

      const health = await tracker.getKeyHealth('1');
      expect(health.successCount).toBe(0);
      expect(health.failureCount).toBe(0);
      expect(health.throttledUntil).toBe(0);
      expect(health.lastUsedAt).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent key gracefully', async () => {
      // Get health for key that was never initialized
      const health = await tracker.getKeyHealth('999');

      // Should auto-initialize
      expect(health.keyId).toBe('999');
      expect(health.successCount).toBe(0);
    });

    it('should handle empty key list', async () => {
      const selected = await tracker.selectBestKey([]);
      expect(selected).toBeNull();
    });

    it('should handle very large response times', async () => {
      await tracker.initializeKey('1');
      await tracker.recordSuccess('1', 999999);

      const metrics = await tracker.getAllMetrics(['1']);
      expect(metrics[0].avgResponseTime).toBe(999999);
    });

    it('should handle rapid successive calls', async () => {
      await tracker.initializeKey('1');

      // Record 100 successes rapidly
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(tracker.recordSuccess('1', 100));
      }
      await Promise.all(promises);

      const health = await tracker.getKeyHealth('1');
      expect(health.successCount).toBe(100);
    });
  });
});
