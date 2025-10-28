import { useEffect, useState } from 'react';
import type { Route } from './+types/queues';

/**
 * Admin Queue Monitoring Dashboard
 *
 * Real-time monitoring of BullMQ grading queue
 * Shows job statistics, rate limiting status, and queue health
 *
 * TODO: Add admin authentication in production
 */

export async function loader({ request }: Route.LoaderArgs) {
  // TODO: Add admin authentication check
  // if (!isAdmin(request)) {
  //   throw new Response('Unauthorized', { status: 401 });
  // }

  return null;
}

interface QueueStatus {
  queue: string;
  status: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  };
  rateLimiting: {
    isRateLimited: boolean;
    remainingTtl: number;
    config: {
      max: number;
      duration: number;
    };
  };
  mode: string;
  isProcessing: boolean;
  timestamp: string;
}

export default function QueuesPage() {
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval] = useState(2000);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/admin/queue-status');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.data) {
          setStatus(data.data);
          setError(null);
        } else if (data.success === false) {
          setError(data.message || 'Failed to fetch queue status');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch queue status');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6 sm:p-8 lg:p-10">
        <div className="w-[95%] sm:w-[90%] lg:w-[85%] xl:w-[80%] mx-auto max-w-4xl">
          <div className="bg-card border border-destructive/20 rounded-2xl shadow-sm p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-destructive mb-3">⚠️ Error</h2>
            <p className="text-foreground/80 mb-2">{error}</p>
            <p className="text-sm text-muted-foreground">
              Check server logs for more details. The application may still be initializing.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 sm:p-8 lg:p-10 flex items-center justify-center">
        <div className="bg-card border border-border rounded-2xl shadow-sm p-8">
          <p className="text-lg text-muted-foreground">Loading queue status...</p>
        </div>
      </div>
    );
  }

  if (!status) return null;

  const isLimited = status.rateLimiting.isRateLimited;
  const totalJobs = status.status.waiting + status.status.active + status.status.completed + status.status.failed;

  return (
    <div className="min-h-screen bg-background p-6 sm:p-8">
      <div className="w-full max-w-6xl mx-auto">
        {/* Compact Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Queue Status</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Updated {new Date(status.timestamp).toLocaleTimeString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Jobs</p>
            <p className="text-3xl font-bold text-foreground">{totalJobs}</p>
          </div>
        </div>

        {/* Core Metrics - Simplified Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {/* Waiting */}
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-1">WAITING</p>
            <p className="text-3xl font-bold text-blue-600">{status.status.waiting}</p>
          </div>

          {/* Active - Highlighted in Emphasis Orange */}
          <div className="bg-[hsl(var(--accent-emphasis))] border-2 border-[hsl(var(--accent-emphasis))] rounded-lg p-4 shadow-lg">
            <p className="text-xs font-semibold text-[hsl(var(--accent-emphasis-foreground))] mb-1">PROCESSING</p>
            <p className="text-3xl font-bold text-[hsl(var(--accent-emphasis-foreground))]">{status.status.active}</p>
          </div>

          {/* Completed */}
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-1">COMPLETED</p>
            <p className="text-3xl font-bold text-green-600">{status.status.completed}</p>
          </div>

          {/* Failed */}
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-1">FAILED</p>
            <p className="text-3xl font-bold text-destructive">{status.status.failed}</p>
          </div>
        </div>

        {/* Rate Limiting - Critical Info Only */}
        <div className={`rounded-lg p-5 mb-6 border-2 transition-colors ${
          isLimited
            ? 'bg-destructive/5 border-destructive/30'
            : 'bg-[hsl(var(--accent-emphasis))]/5 border-[hsl(var(--accent-emphasis))]/30'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-foreground">Rate Limiting</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {status.rateLimiting.config.max} requests / {status.rateLimiting.config.duration / 1000}s
              </p>
            </div>
            <div className="text-right">
              {isLimited ? (
                <div>
                  <p className="text-xs font-semibold text-destructive flex items-center gap-1 justify-end mb-1">
                    <span className="w-2 h-2 bg-destructive rounded-full animate-pulse"></span>
                    Limited
                  </p>
                  <p className="text-sm font-bold text-destructive">
                    {Math.ceil(status.rateLimiting.remainingTtl / 1000)}s remaining
                  </p>
                </div>
              ) : (
                <p className="text-xs font-semibold text-green-600 flex items-center gap-1 justify-end">
                  <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                  Active
                </p>
              )}
            </div>
          </div>

          {/* Usage Bar - Emphasis Orange */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Usage</span>
              <span className="font-semibold text-foreground">
                {status.status.active} / {status.rateLimiting.config.max}
                ({Math.round((status.status.active / status.rateLimiting.config.max) * 100)}%)
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min((status.status.active / status.rateLimiting.config.max) * 100, 100)}%`,
                  backgroundColor: isLimited ? 'hsl(var(--destructive))' : 'hsl(var(--accent-emphasis))',
                }}
              />
            </div>
          </div>
        </div>

        {/* System Status Footer */}
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div className="text-muted-foreground">
            <p className="text-xs font-semibold mb-1">MODE</p>
            <p className="font-mono font-bold text-foreground">BullMQ</p>
          </div>
          <div className="text-muted-foreground">
            <p className="text-xs font-semibold mb-1">STATE</p>
            <p className="text-lg">{status.status.active > 0 ? '⚙️ Active' : '💤 Idle'}</p>
          </div>
          <div className="text-muted-foreground">
            <p className="text-xs font-semibold mb-1">REFRESH</p>
            <p className="font-mono font-bold text-foreground">{refreshInterval / 1000}s</p>
          </div>
        </div>
      </div>
    </div>
  );
}
