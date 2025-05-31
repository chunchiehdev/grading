import { useMutation } from '@tanstack/react-query';
import { useUploadStore } from '@/stores/uploadStore';
import { useUiStore } from '@/stores/uiStore';
import { uploadApi } from '@/services/uploadApi';
import { useEffect, useRef } from 'react';

/**
 * Updated file info structure from the new API
 */
interface UploadedFileResult {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  success: boolean;
  error?: string;
}

/**
 * Custom hook for file upload functionality with progress tracking
 * Updated to work with new database-backed file storage system
 * @param {Object} [options] - Configuration options
 * @param {Function} [options.onUploadComplete] - Callback function called when upload completes
 * @returns {Object} Upload interface with files, states, and upload functions
 */
export function useFileUpload({ onUploadComplete }: { onUploadComplete?: (files: UploadedFileResult[]) => void } = {}) {
  const { files, uploadId, setUploadId, addFiles, updateProgress, setFileStatus, removeFile } = useUploadStore();
  
  const { setCanProceed, setStep } = useUiStore();
  const progressSubscriptionRef = useRef<(() => void) | null>(null);

  // Create upload ID mutation
  const createUploadIdMutation = useMutation({
    mutationFn: uploadApi.createUploadId,
  });

  // Updated upload files mutation to work with new API response structure
  const uploadFilesMutation = useMutation({
    mutationFn: async (filesToUpload: File[]) => {
      if (!uploadId) throw new Error('No upload ID available');

      const formData = new FormData();
      formData.append('uploadId', uploadId);
      filesToUpload.forEach((file) => formData.append('files', file));

      const response = await fetch('/api/upload', {
        method: 'POST', 
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      return data;
    },
    onSuccess: (uploadResponse) => {
      const { results } = uploadResponse;
      const successfulFiles: UploadedFileResult[] = [];

      // Process each upload result
      results.forEach((result: UploadedFileResult) => {
        if (result.success) {
          setFileStatus(result.fileName, 'success', {
            fileId: result.fileId,
            progress: 100,
          });
          successfulFiles.push(result);
        } else {
          setFileStatus(result.fileName, 'error', {
            error: result.error,
            progress: 0,
          });
        }
      });

      // Notify completion via callback instead of auto-updating stores
      if (onUploadComplete && successfulFiles.length > 0) {
        onUploadComplete(successfulFiles);
      }

      console.log(`✅ Upload completed: ${successfulFiles.length}/${results.length} files successful`);
    },
  });

  // Updated delete file mutation (would need to be updated when delete API is updated)
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      // This would need to be updated to work with fileId instead of key
      const response = await fetch('/api/upload/delete-file', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Delete failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Delete failed');
      }

      return data;
    },
    onSuccess: (_, fileId) => {
      // Remove from local state
      const fileEntry = Object.entries(files).find(([_, file]) => file.key === fileId);
      if (fileEntry) {
        removeFile(fileEntry[0]);
      }
    },
  });

  // Enhanced upload function with better error handling
  const handleUpload = async (newFiles: File[]) => {
    console.log('🚀 Starting handleUpload for files:', newFiles.map(f => f.name));
    
    // Clean up existing subscription before starting a new one
    const unsubscribe = progressSubscriptionRef.current;
    if (unsubscribe) {
      console.log('🧹 Cleaning up existing SSE subscription');
      unsubscribe();
      progressSubscriptionRef.current = null;
    }

    try {
      // Create new uploadId
      console.log('📝 Creating new uploadId...');
      const newUploadId = await createUploadIdMutation.mutateAsync();
      console.log('✅ Got uploadId:', newUploadId);
      setUploadId(newUploadId);
      addFiles(newFiles);

      // Start SSE subscription for progress tracking
      console.log('📡 Starting SSE subscription for:', newUploadId);
      const newUnsubscribe = uploadApi.subscribeToProgress(newUploadId, (progressData) => {
        Object.entries(progressData).forEach(([filename, data]: [string, any]) => {
          updateProgress(filename, data.progress);
          if (data.status === 'success' || data.status === 'error') {
            setFileStatus(filename, data.status, data);
          }
        });
      });
      progressSubscriptionRef.current = newUnsubscribe;

      // Start file upload
      console.log('📤 Starting file upload...');
      await uploadFilesMutation.mutateAsync(newFiles);
      console.log('✅ File upload completed');
      
    } catch (error) {
      console.error('❌ Upload error:', error);
      
      // Clean up subscription on error
      const unsubscribe = progressSubscriptionRef.current;
      if (unsubscribe) {
        console.log('🧹 Cleaning up SSE on error');
        unsubscribe();
        progressSubscriptionRef.current = null;
      }
      throw error;
    }
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (progressSubscriptionRef.current) {
        progressSubscriptionRef.current();
      }
    };
  }, []);

  return {
    files: Object.values(files),
    isCreatingId: createUploadIdMutation.isPending,
    isUploading: uploadFilesMutation.isPending,
    isDeleting: deleteFileMutation.isPending,
    uploadFiles: handleUpload,
    deleteFile: (fileId: string) => deleteFileMutation.mutate(fileId),
    uploadError: uploadFilesMutation.error instanceof Error ? uploadFilesMutation.error.message : undefined,
    // Additional state for the new architecture
    uploadResults: uploadFilesMutation.data?.results || [],
  };
}