// src/hooks/useFileUpload.ts
import { useMutation } from '@tanstack/react-query';
import { useUploadStore } from '@/stores/uploadStore';
import { useUiStore } from '@/stores/uiStore';
import { uploadApi } from '@/services/uploadApi';
import { useEffect, useRef } from 'react';
import { useGradingStore } from '@/stores/gradingStore';



/**
 * Custom hook for file upload functionality with progress tracking
 * @param {Object} [options] - Configuration options
 * @param {Function} [options.onUploadComplete] - Callback function called when upload completes
 * @returns {Object} Upload interface with files, states, and upload functions
 */
export function useFileUpload({ onUploadComplete }: { onUploadComplete?: (files: any[]) => void } = {}) {
  const { 
    files, 
    uploadId, 
    setUploadId, 
    addFiles, 
    updateProgress, 
    setFileStatus,
    removeFile 
  } = useUploadStore();

  const { setCanProceed, setStep } = useUiStore();
  const progressSubscriptionRef = useRef<(() => void) | null>(null);
  const { setUploadedFiles } = useGradingStore();
  
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
      const successfulFiles = uploadedFiles.map(fileData => {
        setFileStatus(fileData.name, 'success', { 
          key: fileData.key,
          url: fileData.url,
          progress: 100
        });
        return {
          name: fileData.name,
          key: fileData.key,
          url: fileData.url
        };
      });
      
      // Update UI state
      setCanProceed(true);
      
      // Call onUploadComplete with successful files
      if (successfulFiles.length > 0) {
        onUploadComplete?.(successfulFiles);
      }
    }
  });
  
  const deleteFileMutation = useMutation({
    mutationFn: uploadApi.deleteFile,
    onSuccess: (_, key) => {
      const fileEntry = Object.entries(files).find(([_, file]) => file.key === key);
      if (fileEntry) {
        removeFile(fileEntry[0]);
        // Check if we still have files
        
        const remainingFiles = Object.values(files)
        .filter(f => f.key !== key)
        .map(f => ({
          name: f.file.name,
          key: f.key!,
          url: f.url || "",
          size: f.file.size,
          type: f.file.type
        }));

        
        setUploadedFiles(remainingFiles);


        if (Object.keys(files).length === 0) {
          setCanProceed(false);
        }
      }
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