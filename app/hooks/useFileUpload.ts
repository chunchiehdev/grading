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
 * Enhanced error information for better user feedback
 */
interface UploadError {
  message: string;
  type: 'network' | 'auth' | 'validation' | 'storage' | 'quota' | 'unknown';
  retryable: boolean;
  originalError?: Error;
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
      console.log('🔍 Upload mutation onSuccess called with:', uploadResponse);
      const { results } = (uploadResponse?.data ?? uploadResponse) || {};
      console.log('📋 Extracted results:', results);
      const successfulFiles: UploadedFileResult[] = [];

      // Process each upload result with safety checks
      if (Array.isArray(results)) {
        results.forEach((result: UploadedFileResult) => {
        console.log('🔄 Processing result:', result);
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
      }

      console.log('✅ Successful files for callback:', successfulFiles);

      // Only notify if all files in this batch succeeded to align with parent expectations
      if (onUploadComplete && Array.isArray(results) && results.length > 0) {
        const allSucceeded = results.every((r: UploadedFileResult) => !!r && r.success === true);
        console.log('🎯 All files succeeded?', allSucceeded);
        if (allSucceeded) {
          console.log('📞 Calling onUploadComplete with:', successfulFiles);
          onUploadComplete(successfulFiles);
        }
      }

      console.log(`✅ Upload completed: ${successfulFiles.length}/${results?.length || 0} files successful`);
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
      // Remove from local state with safety check
      const fileEntries = Object.entries(files || {});
      const fileEntry = fileEntries.find(([_, file]) => file.key === fileId);
      if (fileEntry) {
        removeFile(fileEntry[0]);
      }
    },
  });

  // Enhanced upload function with better error handling
  const handleUpload = async (newFiles: File[]) => {
    // Safety check for input
    if (!Array.isArray(newFiles) || newFiles.length === 0) {
      console.warn('handleUpload called with invalid files array:', newFiles);
      return;
    }
    
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
        // Safety check for progress data
        if (!progressData || typeof progressData !== 'object') {
          console.warn('Invalid progress data received:', progressData);
          return;
        }
        
        Object.entries(progressData).forEach(([filename, data]: [string, any]) => {
          // Safety check for data
          if (!data || typeof data !== 'object') {
            console.warn('Invalid file progress data:', filename, data);
            return;
          }
          
          if (typeof data.progress === 'number') {
            updateProgress(filename, data.progress);
          }
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
      
      // Enhanced error categorization and user feedback
      const uploadError = categorizeUploadError(error);
      
      // Update file statuses with categorized error (with safety check)
      if (Array.isArray(newFiles)) {
        newFiles.forEach(file => {
          setFileStatus(file.name, 'error', {
            error: uploadError.message,
            errorType: uploadError.type,
            retryable: uploadError.retryable,
            progress: 0,
          });
        });
      }
      
      throw uploadError;
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

  // Safety guard for files state
  const safeFiles = files ? Object.values(files) : [];

  return {
    files: safeFiles,
    isCreatingId: createUploadIdMutation.isPending,
    isUploading: uploadFilesMutation.isPending,
    isDeleting: deleteFileMutation.isPending,
    uploadFiles: handleUpload,
    deleteFile: (fileId: string) => deleteFileMutation.mutate(fileId),
    uploadError: uploadFilesMutation.error instanceof Error ? uploadFilesMutation.error.message : undefined,
    // Additional state for the new architecture
    uploadResults: uploadFilesMutation.data?.data?.results || uploadFilesMutation.data?.results || [],
    // Enhanced error information
    lastError: categorizeUploadError(uploadFilesMutation.error),
    canRetry: uploadFilesMutation.error ? categorizeUploadError(uploadFilesMutation.error).retryable : false,
    // Local-only removal in cases where server key/fileId is unavailable
    removeLocalFile: (filename: string) => removeFile(filename),
  };
}

/**
 * Categorizes upload errors and provides user-friendly messages
 */
function categorizeUploadError(error: any): UploadError {
  if (!error) {
    return {
      message: '',
      type: 'unknown',
      retryable: false
    };
  }

  const errorMessage = error.message || error.toString();
  const statusCode = error.status || error.statusCode;

  // Network/connection errors
  if (errorMessage.includes('網絡連接') || 
      errorMessage.includes('network') || 
      errorMessage.includes('timeout') ||
      errorMessage.includes('Failed to fetch') ||
      statusCode >= 500) {
    return {
      message: '網絡連接問題，請檢查網絡後重試',
      type: 'network',
      retryable: true,
      originalError: error
    };
  }

  // Authentication errors
  if (errorMessage.includes('認證失敗') ||
      errorMessage.includes('用戶未認證') ||
      statusCode === 401 || statusCode === 403) {
    return {
      message: '登錄已過期，請重新登錄後重試',
      type: 'auth',
      retryable: false,
      originalError: error
    };
  }

  // File size/quota errors
  if (errorMessage.includes('文件太大') ||
      errorMessage.includes('存儲空間') ||
      errorMessage.includes('100MB') ||
      statusCode === 413) {
    return {
      message: '文件太大或存儲空間不足，請選擇較小的文件',
      type: 'quota',
      retryable: false,
      originalError: error
    };
  }

  // Validation errors
  if (errorMessage.includes('無效') ||
      errorMessage.includes('格式') ||
      errorMessage.includes('validation') ||
      statusCode === 400) {
    return {
      message: '文件格式無效或參數錯誤，請檢查文件後重試',
      type: 'validation',
      retryable: false,
      originalError: error
    };
  }

  // Storage errors (usually retryable)
  if (errorMessage.includes('存儲') ||
      errorMessage.includes('storage') ||
      errorMessage.includes('S3')) {
    return {
      message: '存儲服務暫時不可用，請稍後重試',
      type: 'storage',
      retryable: true,
      originalError: error
    };
  }

  // Default case
  return {
    message: errorMessage || '上傳失敗，請稍後重試',
    type: 'unknown',
    retryable: true,
    originalError: error
  };
}
