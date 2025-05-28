import type { UploadedFileInfo } from '@/types/files';

const API_ENDPOINTS = {
  CREATE_ID: '/api/upload/create-id',
  UPLOAD: '/api/upload',
  DELETE: '/api/upload/delete-file',
  PROGRESS: (id: string) => `/api/upload/progress/${id}`,
};

const handleResponse = async (response: Response) => {
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Operation failed');
  return data;
};

export const uploadApi = {
  createUploadId: async (): Promise<string> => {
    const data = await handleResponse(await fetch(API_ENDPOINTS.CREATE_ID, { 
      method: 'POST',
      credentials: 'include'
    }));
    return data.data.uploadId;
  },

  uploadFiles: async (files: File[], uploadId: string): Promise<UploadedFileInfo[]> => {
    const formData = new FormData();
    formData.append('uploadId', uploadId);
    files.forEach((file) => formData.append('files', file));

    const data = await handleResponse(await fetch(API_ENDPOINTS.UPLOAD, { 
      method: 'POST', 
      body: formData,
      credentials: 'include'
    }));
    return data.files;
  },

  deleteFile: async (key: string): Promise<void> => {
    await handleResponse(
      await fetch(API_ENDPOINTS.DELETE, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
        credentials: 'include'
      })
    );
  },

  subscribeToProgress: (uploadId: string, onProgress: (data: any) => void): (() => void) => {
    if (!uploadId) {
      console.error('No upload ID provided for SSE subscription');
      return () => {};
    }

    console.log('📡 Subscribing to SSE:', API_ENDPOINTS.PROGRESS(uploadId));
    
    const eventSource = new EventSource(API_ENDPOINTS.PROGRESS(uploadId), {
      withCredentials: true
    });

    let closed = false;

    const cleanup = () => {
      if (closed) {
        console.log('⚠️ SSE cleanup called but already closed');
        return;
      }
      closed = true;
      console.log('🔌 Closing SSE connection for:', uploadId);
      eventSource.close();
    };

    eventSource.onopen = () => {
      console.log('✅ SSE connection opened for:', uploadId);
    };

    eventSource.onerror = (error) => {
      const target = error.target as EventSource;
      
      if (closed) {
        console.log('⚠️ SSE error on already closed connection');
        return;
      }
      
      // Check connection state
      if (target.readyState === EventSource.CLOSED) {
        console.log('🔌 SSE connection closed by server for:', uploadId);
        cleanup();
        return;
      }
      
      // Only log actual errors during connecting phase
      if (target.readyState === EventSource.CONNECTING) {
        console.log('🔄 SSE reconnecting for:', uploadId);
      } else {
        console.error('❌ SSE connection error for:', uploadId, error);
      }
    };

    eventSource.addEventListener('upload-progress', (event) => {
      if (closed) {
        console.log('⚠️ SSE progress event on closed connection');
        return;
      }
      
      try {
        const data = JSON.parse(event.data);
        onProgress(data);
        
        // Check if all files are done
        const hasFiles = Object.keys(data).length > 0;
        if (hasFiles) {
          const allDone = Object.values(data).every(
            (file: any) => file.status === 'success' || file.status === 'error'
          );
          
          if (allDone) {
            console.log('🎉 All uploads completed for:', uploadId, '- closing SSE connection');
            setTimeout(cleanup, 1000); // Give time for any final updates
          }
        }
      } catch (err) {
        console.error('❌ Error parsing progress data for:', uploadId, err);
      }
    });

    // Auto cleanup after 15 minutes
    setTimeout(() => {
      if (!closed) {
        console.log('⏰ SSE connection timeout for:', uploadId);
        cleanup();
      }
    }, 15 * 60 * 1000);

    return cleanup;
  },
};
