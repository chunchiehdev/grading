import type { UploadedFileInfo } from '@/types/files';

const API_ENDPOINTS = {
  CREATE_ID: '/api/upload/create-id',
  UPLOAD: '/api/upload',
  DELETE: '/api/upload/delete-file',
  PROGRESS: (id: string) => `/api/upload/progress?uploadId=${id}`,
};

const handleResponse = async (response: Response) => {
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Operation failed');
  return data;
};

export const uploadApi = {
  createUploadId: async (): Promise<string> => {
    const data = await handleResponse(
      await fetch(API_ENDPOINTS.CREATE_ID, {
        method: 'POST',
        credentials: 'include',
      })
    );
    return data.data.uploadId;
  },

  uploadFiles: async (files: File[], uploadId: string): Promise<UploadedFileInfo[]> => {
    const formData = new FormData();
    formData.append('uploadId', uploadId);
    files.forEach((file) => formData.append('files', file));

    const data = await handleResponse(
      await fetch(API_ENDPOINTS.UPLOAD, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
    );
    return data.files;
  },

  deleteFile: async (key: string): Promise<void> => {
    await handleResponse(
      await fetch(API_ENDPOINTS.DELETE, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
        credentials: 'include',
      })
    );
  },

  subscribeToProgress: (uploadId: string, onProgress: (data: any) => void): (() => void) => {
    if (!uploadId) {
      return () => {};
    }

    const eventSource = new EventSource(API_ENDPOINTS.PROGRESS(uploadId), {
      withCredentials: true,
    });

    let closed = false;

    const cleanup = () => {
      if (closed) {
        return;
      }
      closed = true;
      eventSource.close();
    };

    eventSource.onerror = (error) => {
      const target = error.target as EventSource;

      if (closed) {
        return;
      }

      // Check connection state
      if (target.readyState === EventSource.CLOSED) {
        cleanup();
        return;
      }

      // Only log actual errors (not reconnect attempts)
      if (target.readyState !== EventSource.CONNECTING) {
        console.error('❌ SSE connection error for:', uploadId, error);
      }
    };

    eventSource.onmessage = (event) => {
      if (closed) {
        return;
      }

      try {
        const response = JSON.parse(event.data);
        const progressData = response.files || {};

        onProgress(progressData);

        // Check if all files are done
        const hasFiles = Object.keys(progressData).length > 0;
        if (hasFiles) {
          const allDone = Object.values(progressData).every(
            (file: any) => file.status === 'success' || file.status === 'error'
          );

          if (allDone) {
            setTimeout(cleanup, 1000); // Give time for any final updates
          }
        }
      } catch (err) {
        console.error('❌ Error parsing progress data for:', uploadId, err);
      }
    };

    // Handle complete event
    eventSource.addEventListener('complete', () => {
      cleanup();
    });

    // Auto cleanup after 15 minutes
    setTimeout(
      () => {
        if (!closed) {
          cleanup();
        }
      },
      15 * 60 * 1000
    );

    return cleanup;
  },
};
