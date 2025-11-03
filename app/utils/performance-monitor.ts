/**
 * Performance Monitoring Utility
 * 用於追蹤和記錄應用程式各個操作的性能指標
 */

type PerformanceMetric = {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
};

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private enabled: boolean = true;

  constructor() {
    // 只在開發環境啟用
    this.enabled = process.env.NODE_ENV === 'development';
  }

  /**
   * 開始計時
   */
  start(name: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;

    const startTime = performance.now();
    this.metrics.set(name, {
      name,
      startTime,
      metadata,
    });

    console.log(
      `%c[PERF START] ${name}`,
      'color: #3b82f6; font-weight: bold',
      metadata ? `| Metadata:` : '',
      metadata || ''
    );
  }

  /**
   * 結束計時並記錄結果
   */
  end(name: string, additionalMetadata?: Record<string, any>): number | null {
    if (!this.enabled) return null;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`[PERF WARN] No start time found for: ${name}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;
    if (additionalMetadata) {
      metric.metadata = { ...metric.metadata, ...additionalMetadata };
    }

    // 根據耗時使用不同顏色
    const color = duration < 100 ? '#10b981' : duration < 500 ? '#f59e0b' : '#ef4444';
    const emoji = duration < 100 ? '✅' : duration < 500 ? '⚠️' : '❌';

    console.log(
      `%c[PERF END] ${emoji} ${name}`,
      `color: ${color}; font-weight: bold`,
      `| Duration: ${duration.toFixed(2)}ms`,
      metric.metadata ? `| Metadata:` : '',
      metric.metadata || ''
    );

    return duration;
  }

  /**
   * 測量異步函數的執行時間
   */
  async measure<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    if (!this.enabled) return fn();

    this.start(name, metadata);
    try {
      const result = await fn();
      this.end(name, { status: 'success' });
      return result;
    } catch (error) {
      this.end(name, { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * 測量同步函數的執行時間
   */
  measureSync<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    if (!this.enabled) return fn();

    this.start(name, metadata);
    try {
      const result = fn();
      this.end(name, { status: 'success' });
      return result;
    } catch (error) {
      this.end(name, { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * 記錄單次事件（不需要start/end配對）
   */
  mark(name: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;

    console.log(
      `%c[PERF MARK] 📍 ${name}`,
      'color: #8b5cf6; font-weight: bold',
      metadata ? `| Metadata:` : '',
      metadata || ''
    );
  }

  /**
   * 獲取所有已完成的指標
   */
  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values()).filter((m) => m.duration !== undefined);
  }

  /**
   * 獲取指定指標的統計資訊
   */
  getStats(namePattern?: string): void {
    if (!this.enabled) return;

    const metrics = this.getMetrics().filter((m) => !namePattern || m.name.includes(namePattern));

    if (metrics.length === 0) {
      console.log('[PERF STATS] No metrics found');
      return;
    }

    const durations = metrics.map((m) => m.duration!);
    const total = durations.reduce((sum, d) => sum + d, 0);
    const avg = total / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);

    console.group(`%c[PERF STATS] ${namePattern || 'All Metrics'}`, 'color: #8b5cf6; font-weight: bold');
    console.table({
      Count: metrics.length,
      'Total (ms)': total.toFixed(2),
      'Average (ms)': avg.toFixed(2),
      'Min (ms)': min.toFixed(2),
      'Max (ms)': max.toFixed(2),
    });
    console.groupEnd();
  }

  /**
   * 清除所有指標
   */
  clear(): void {
    this.metrics.clear();
    console.log('[PERF] Metrics cleared');
  }

  /**
   * 啟用/停用監控
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`[PERF] Performance monitoring ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// 單例模式
export const perfMonitor = new PerformanceMonitor();

// 導出到 window 以便在瀏覽器 console 中使用
if (typeof window !== 'undefined') {
  (window as any).perfMonitor = perfMonitor;
}
