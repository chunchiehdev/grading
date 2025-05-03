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
    const data = await handleResponse(await fetch(API_ENDPOINTS.CREATE_ID, { method: 'POST' }));
    return data.data.uploadId;
  },

  uploadFiles: async (files: File[], uploadId: string): Promise<UploadedFileInfo[]> => {
    const formData = new FormData();
    formData.append('uploadId', uploadId);
    files.forEach((file) => formData.append('files', file));

    const data = await handleResponse(await fetch(API_ENDPOINTS.UPLOAD, { method: 'POST', body: formData }));
    return data.files;
  },

  deleteFile: async (key: string): Promise<void> => {
    await handleResponse(
      await fetch(API_ENDPOINTS.DELETE, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })
    );
  },

  subscribeToProgress: (uploadId: string, onProgress: (data: any) => void): (() => void) => {
    if (!uploadId) {
      console.error('No upload ID provided for SSE subscription');
      return () => {};
    }

    console.log('Subscribing to SSE:', API_ENDPOINTS.PROGRESS(uploadId));
    
    const eventSource = new EventSource(API_ENDPOINTS.PROGRESS(uploadId), {
      withCredentials: true
    });

    eventSource.onopen = () => {
      console.log('SSE connection opened');
    };

    eventSource.onerror = (error) => {
      const target = error.target as EventSource;
      
      // Check if the connection was closed by the client or server
      if (target.readyState === EventSource.CLOSED) {
        console.log('SSE connection closed');
        return;
      }
      
      // Check if this is a connection error after successful upload
      if (target.readyState === EventSource.CLOSED) {
        console.log('SSE connection closed after successful upload');
        return;
      }
      
      // Only log actual errors
      if (target.readyState !== EventSource.CONNECTING) {
        console.error('SSE connection error:', error);
        eventSource.close();
      }
    };

    eventSource.addEventListener('upload-progress', (event) => {
      try {
        const data = JSON.parse(event.data);
        onProgress(data);
        
        // Check if all files are done
        const allDone = Object.values(data).every(
          (file: any) => file.status === 'success' || file.status === 'error'
        );
        
        if (allDone) {
          // Close connection after a short delay to ensure final message is received
          setTimeout(() => {
            console.log('Closing SSE connection after successful upload');
            eventSource.close();
          }, 1000);
        }
      } catch (err) {
        console.error('Error parsing progress data:', err);
      }
    });

    return () => {
      console.log('Closing SSE connection');
      eventSource.close();
    };
  },
};
