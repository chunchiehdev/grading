/**
 * useFileUploadProgress Hook
 * Feature 004: AI Grading with Knowledge Base Context
 *
 * Polls parseStatus from UploadedFile records
 */

import { useState, useEffect, useCallback } from 'react';
import type { FileParseStatus } from '~/generated/prisma/client';

interface FileUploadStatus {
  fileId: string;
  fileName: string;
  parseStatus: FileParseStatus;
  parseError?: string | null;
}

interface UseFileUploadProgressOptions {
  fileIds: string[];
  pollingInterval?: number;
  enabled?: boolean;
}

/**
 * Hook to track file upload and parsing progress
 * Polls the server every N seconds to check parse status
 */
export function useFileUploadProgress({
  fileIds,
  pollingInterval = 3000,
  enabled = true,
}: UseFileUploadProgressOptions) {
  const [statuses, setStatuses] = useState<Map<string, FileUploadStatus>>(new Map());
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatuses = useCallback(async () => {
    if (fileIds.length === 0) {
      setStatuses(new Map());
      return;
    }

    setIsPolling(true);
    setError(null);

    try {
      const response = await fetch('/api/files/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch file statuses');
      }

      const data = await response.json();
      const statusMap = new Map<string, FileUploadStatus>();

      for (const file of data.files || []) {
        statusMap.set(file.fileId, {
          fileId: file.fileId,
          fileName: file.fileName,
          parseStatus: file.parseStatus,
          parseError: file.parseError,
        });
      }

      setStatuses(statusMap);
    } catch (err) {
      console.error('Error fetching file statuses:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsPolling(false);
    }
  }, [fileIds]);

  // Initial fetch
  useEffect(() => {
    if (enabled && fileIds.length > 0) {
      fetchStatuses();
    }
  }, [enabled, fileIds, fetchStatuses]);

  // Polling for files that are still processing
  useEffect(() => {
    if (!enabled || fileIds.length === 0) {
      return;
    }

    // Check if any files are still processing
    const hasProcessingFiles = Array.from(statuses.values()).some(
      (status) => status.parseStatus === 'PENDING' || status.parseStatus === 'PROCESSING'
    );

    if (!hasProcessingFiles) {
      return;
    }

    const intervalId = setInterval(() => {
      fetchStatuses();
    }, pollingInterval);

    return () => clearInterval(intervalId);
  }, [enabled, fileIds, statuses, pollingInterval, fetchStatuses]);

  // Get status for a specific file
  const getFileStatus = useCallback(
    (fileId: string): FileUploadStatus | undefined => {
      return statuses.get(fileId);
    },
    [statuses]
  );

  // Check if all files are completed
  const allCompleted = Array.from(statuses.values()).every(
    (status) => status.parseStatus === 'COMPLETED'
  );

  // Check if any files have failed
  const hasFailed = Array.from(statuses.values()).some((status) => status.parseStatus === 'FAILED');

  // Count files by status
  const statusCounts = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  };

  for (const status of statuses.values()) {
    switch (status.parseStatus) {
      case 'PENDING':
        statusCounts.pending++;
        break;
      case 'PROCESSING':
        statusCounts.processing++;
        break;
      case 'COMPLETED':
        statusCounts.completed++;
        break;
      case 'FAILED':
        statusCounts.failed++;
        break;
    }
  }

  return {
    statuses: Array.from(statuses.values()),
    getFileStatus,
    isPolling,
    error,
    allCompleted,
    hasFailed,
    statusCounts,
    refetch: fetchStatuses,
  };
}
