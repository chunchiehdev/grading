/**
 * Search Operation Logger
 * Logs search-related operations for debugging and analytics
 */

export interface SearchLog {
  timestamp: string;
  operation: 'search_start' | 'search_success' | 'search_error' | 'clear_search';
  query?: string;
  queryLength?: number;
  resultCount?: number;
  duration?: number;
  error?: string;
}

/**
 * Log search operation
 * @param operation - Type of search operation
 * @param details - Additional details about the operation
 */
export function logSearchOperation(operation: SearchLog['operation'], details?: Partial<SearchLog>): void {
  const log: SearchLog = {
    timestamp: new Date().toISOString(),
    operation,
    ...details,
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    const style = getLogStyle(operation);
    console.log(`%c[Search] ${operation}`, style, log);
  }

  // In production, could send to analytics service
  // sendToAnalytics(log);
}

/**
 * Log search start
 * @param query - Search query
 */
export function logSearchStart(query: string): void {
  logSearchOperation('search_start', {
    query,
    queryLength: query.length,
  });
}

/**
 * Log search success
 * @param query - Search query
 * @param resultCount - Number of results returned
 * @param duration - Time taken in milliseconds
 */
export function logSearchSuccess(query: string, resultCount: number, duration: number): void {
  logSearchOperation('search_success', {
    query,
    queryLength: query.length,
    resultCount,
    duration,
  });
}

/**
 * Log search error
 * @param error - Error message
 * @param query - Search query that caused error
 */
export function logSearchError(error: string, query?: string): void {
  logSearchOperation('search_error', {
    query,
    error,
  });
}

/**
 * Log clear search
 */
export function logClearSearch(): void {
  logSearchOperation('clear_search');
}

/**
 * Get console style for log level
 */
function getLogStyle(operation: SearchLog['operation']): string {
  const styles: Record<string, string> = {
    search_start: 'color: #3b82f6; font-weight: bold;', // blue
    search_success: 'color: #10b981; font-weight: bold;', // green
    search_error: 'color: #ef4444; font-weight: bold;', // red
    clear_search: 'color: #8b5cf6; font-weight: bold;', // purple
  };

  return styles[operation] || 'color: #6b7280;'; // default gray
}

/**
 * Performance tracking for search operations
 */
export class SearchPerformanceTracker {
  private startTime: number = 0;
  private operation: string = '';

  start(operation: string): void {
    this.operation = operation;
    this.startTime = performance.now();
  }

  end(): number {
    const duration = performance.now() - this.startTime;
    logSearchOperation('search_success', {
      duration: Math.round(duration),
    });
    return duration;
  }

  async track<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    this.start(operation);
    try {
      const result = await fn();
      this.end();
      return result;
    } catch (error) {
      const duration = performance.now() - this.startTime;
      logSearchOperation('search_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Math.round(duration),
      });
      throw error;
    }
  }
}
