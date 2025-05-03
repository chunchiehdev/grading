// src/hooks/useFileUpload.ts
import { useMutation } from '@tanstack/react-query';
import { useUploadStore } from '@/stores/uploadStore';
import { uploadApi } from '@/services/uploadApi';
import { useEffect, useRef } from 'react';

export function useFileUpload() {
  const { 
    files, 
    uploadId, 
    setUploadId, 
    addFiles, 
    updateProgress, 
    setFileStatus,
    removeFile 
  } = useUploadStore();
  const progressSubscriptionRef = useRef<(() => void) | null>(null);
  
  // Mutations setup with simplified structure
  const createUploadIdMutation = useMutation({
    mutationFn: uploadApi.createUploadId,
    onSuccess: (id) => {
      setUploadId(id);
      
      // Start new SSE subscription
      const unsubscribe = uploadApi.subscribeToProgress(id, (progressData) => {
        Object.entries(progressData).forEach(([filename, data]: [string, any]) => {
          updateProgress(filename, data.progress);
          if (data.status === 'success' || data.status === 'error') {
            setFileStatus(filename, data.status, data);
          }
        });
      });
      progressSubscriptionRef.current = unsubscribe;
    }
  });
  
  const uploadFilesMutation = useMutation({
    mutationFn: async (filesToUpload: File[]) => {
      if (!uploadId) throw new Error('No upload ID available');
      return uploadApi.uploadFiles(filesToUpload, uploadId);
    },
    onSuccess: (uploadedFiles) => {
      uploadedFiles.forEach(fileData => {
        setFileStatus(fileData.name, 'success', { 
          key: fileData.key,
          url: fileData.url,
          progress: 100
        });
      });
    }
  });
  
  const deleteFileMutation = useMutation({
    mutationFn: uploadApi.deleteFile,
    onSuccess: (_, key) => {
      const fileEntry = Object.entries(files).find(([_, file]) => file.key === key);
      if (fileEntry) removeFile(fileEntry[0]);
    }
  });
  
  // Streamlined upload function
  const handleUpload = async (newFiles: File[]) => {
    // Clean up existing subscription before starting a new one
    const unsubscribe = progressSubscriptionRef.current;
    if (unsubscribe) {
      unsubscribe();
      progressSubscriptionRef.current = null;
    }
    
    // Create new uploadId and start upload
    const newUploadId = await createUploadIdMutation.mutateAsync();
    setUploadId(newUploadId);
    addFiles(newFiles);
    
    try {
      await uploadFilesMutation.mutateAsync(newFiles);
    } catch (error) {
      // Clean up subscription on error
      const unsubscribe = progressSubscriptionRef.current;
      if (unsubscribe) {
        unsubscribe();
        progressSubscriptionRef.current = null;
      }
      throw error;
    }
  };
  
  // Cleanup effect
  useEffect(() => () => {
    if (progressSubscriptionRef.current) progressSubscriptionRef.current();
  }, []);
  
  return {
    files: Object.values(files),
    isCreatingId: createUploadIdMutation.isPending,
    isUploading: uploadFilesMutation.isPending,
    isDeleting: deleteFileMutation.isPending,
    uploadFiles: handleUpload,
    deleteFile: (key: string) => deleteFileMutation.mutate(key),
    uploadError: uploadFilesMutation.error instanceof Error 
      ? uploadFilesMutation.error.message 
      : undefined
  };
}