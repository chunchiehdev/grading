// src/components/grading/CompactFileUpload.tsx
import { useCallback, useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Upload, X, File, AlertCircle, FileUp, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

interface FileUploadProps {
  maxFiles: number;
  maxFileSize?: number;
  acceptedFileTypes?: string[];
  onFilesChange?: (files: File[]) => void;
  onError?: (error: string) => void;
  onUploadComplete?: (results: Array<{ fileId: string; fileName: string; fileSize: number; mimeType: string }>) => void;
}

export const CompactFileUpload = ({
  maxFiles,
  maxFileSize = 100 * 1024 * 1024,
  acceptedFileTypes = ['.pdf', '.doc', '.docx', '.txt'],
  onFilesChange,
  onError,
  onUploadComplete,
}: FileUploadProps) => {
  const { t } = useTranslation('grading');
  // Track notification to avoid duplicate callbacks per upload
  const [notified, setNotified] = useState<boolean>(false);

  // Wrap the hook callback to dedupe and normalize payload shape
  const hookOnComplete = useCallback(
    (files: Array<{ fileId: string; fileName: string; fileSize: number; mimeType: string }>) => {
      if (!onUploadComplete || notified) return;
      const simplified = (Array.isArray(files) ? files : []).map((f: any) => ({
        fileId: f.fileId,
        fileName: f.fileName,
        fileSize: f.fileSize,
        mimeType: f.mimeType,
      }));
      setNotified(true);
      onUploadComplete(simplified);
    },
    [onUploadComplete, notified]
  );

  const { files: uploadedFiles, uploadFiles, deleteFile, isUploading, uploadError, lastError, canRetry, removeLocalFile } =
    useFileUpload({ onUploadComplete: hookOnComplete });
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (file.size > maxFileSize) {
        return t('fileUpload.errors.fileSizeExceeded', { fileName: file.name, maxSize: formatFileSize(maxFileSize) });
      }

      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!acceptedFileTypes.includes(fileExt)) {
        return t('fileUpload.errors.unsupportedFileType', { fileExt });
      }

      return null;
    },
    [maxFileSize, acceptedFileTypes]
  );

  const handleFiles = useCallback(
    async (newFiles: File[]) => {
      setError(null);
      setRetryCount(0);

      const safeUploadedFiles = Array.isArray(uploadedFiles) ? uploadedFiles : [];
      const safeNewFiles = Array.isArray(newFiles) ? newFiles : [];

      // Only count active (non-error) files against the max to allow retrying after failure
      const activeCount = safeUploadedFiles.filter((f: any) => f?.status !== 'error').length;
      if (activeCount + safeNewFiles.length > maxFiles) {
        setError(t('fileUpload.errors.tooManyFiles', { maxFiles }));
        return;
      }

      for (const file of safeNewFiles) {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          return;
        }
      }

      try {
        await uploadFiles(safeNewFiles);
        onFilesChange?.(safeNewFiles);
      } catch (err: any) {
        const errorMsg = err?.message || t('fileUpload.errors.uploadFailed');
        setError(errorMsg);
        onError?.(errorMsg);
      }
    },
    [validateFile, uploadFiles, onFilesChange, onError, uploadedFiles, maxFiles]
  );

  const handleRetry = useCallback(async () => {
    if (!canRetry) return;
    setRetryCount((prev) => prev + 1);
    setError(null);
  }, [canRetry]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      await handleFiles(droppedFiles);
    },
    [handleFiles]
  );

  const handleRemoveFile = useCallback(
    (fileData: any) => {
      // Prefer server-side delete when we have an id/key, otherwise clean up locally by filename
      if (fileData?.key) {
        deleteFile(fileData.key);
      } else if (fileData?.file?.name) {
        removeLocalFile(fileData.file.name);
      }
    },
    [deleteFile, removeLocalFile]
  );

  useEffect(() => {
    if (isUploading) setNotified(false);
  }, [isUploading]);

  useEffect(() => {
    if (uploadError) onError?.(uploadError);
  }, [uploadError, onError]);

  const renderError = () => {
    if (!error && !lastError?.message) return null;

    const displayError = error || lastError?.message || '';
    const errorType = lastError?.type || 'unknown';
    const isRetryable = lastError?.retryable || false;

    const getErrorColor = () => {
      switch (errorType) {
        case 'network':
          return 'border-orange-200 bg-orange-50 text-orange-800';
        case 'auth':
          return 'border-red-200 bg-red-50 text-red-800';
        case 'quota':
          return 'border-yellow-200 bg-yellow-50 text-yellow-800';
        case 'validation':
          return 'border-blue-200 bg-blue-50 text-blue-800';
        case 'storage':
          return 'border-purple-200 bg-purple-50 text-purple-800';
        default:
          return 'border-red-200 bg-red-50 text-red-800';
      }
    };

    return (
      <div className={`rounded-md border p-3 ${getErrorColor()}`}>
        <div className="flex items-start">
          <span className="text-lg mr-2" role="img" aria-label="error-icon">
            ❌
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium">{displayError}</p>
            {isRetryable && retryCount < 3 && (
              <button onClick={handleRetry} className="mt-2 text-xs underline hover:no-underline" disabled={isUploading}>
                {t('fileUpload.retryUpload')} {retryCount > 0 && t('fileUpload.retryAttempt', { count: retryCount + 1 })}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const safeUploadedFiles = Array.isArray(uploadedFiles) ? uploadedFiles : [];

  return (
    <div className="space-y-3">
      {renderError()}

      <div
        onDragEnter={() => setIsDragging(true)}
        onDragOver={handleDrag}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3 transition-colors duration-200',
          isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary'
        )}
      >
        <div className={cn('p-3 rounded-full transition-colors duration-200', isDragging ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
          <Upload className="h-6 w-6" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">{t('fileUpload.dropAreaText')}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('fileUpload.supportedFormats', { formats: acceptedFileTypes.join(', '), size: formatFileSize(maxFileSize) })}</p>
        </div>
        <input
          type="file"
          className="hidden"
          id="file-upload-input"
          onChange={async (e) => {
            const input = e.currentTarget;
            const files = input.files ? Array.from(input.files) : [];
            await handleFiles(files);
            // Reset input so selecting the same file again will trigger change
            input.value = '';
          }}
        />
        <Button asChild variant="outline" size="sm" disabled={isUploading}>
          <label htmlFor="file-upload-input" className="cursor-pointer">
            <FileUp className="h-4 w-4 mr-2" /> {t('fileUpload.selectFiles')}
          </label>
        </Button>
      </div>

      {safeUploadedFiles.length > 0 && (
        <ScrollArea className="h-40 border rounded-md">
          <div className="p-3 space-y-2">
            {safeUploadedFiles.map((fileData: any, index: number) => (
              <motion.div
                key={fileData.key || index}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ 
                  opacity: 1, 
                  y: 0, 
                  scale: 1,
                  borderColor: fileData.status === 'success' ? '#bbf7d0' : 
                             fileData.status === 'error' ? '#fecaca' : 
                             fileData.status === 'uploading' ? '#dbeafe' : '#e5e7eb'
                }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ 
                  duration: 0.3,
                  ease: "easeOut",
                  borderColor: { duration: 0.5 }
                }}
                className={cn(
                  'flex items-center justify-between rounded-md border p-2 transition-colors duration-300',
                  fileData.status === 'success' && 'border-green-200 bg-green-50',
                  fileData.status === 'error' && 'border-destructive/30 bg-destructive/10',
                  fileData.status === 'uploading' && 'border-primary/30 bg-primary/5'
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative flex-shrink-0">
                    <File
                      className={cn(
                        'w-4 h-4 transition-colors duration-300',
                        fileData.status === 'success' && 'text-green-500',
                        fileData.status === 'error' && 'text-destructive',
                        fileData.status === 'uploading' && 'text-primary'
                      )}
                    />
                    {fileData.status === 'uploading' && (
                      <motion.div
                        className="absolute -top-0.5 -right-0.5"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Loader2 className="w-3 h-3 text-primary opacity-60" />
                      </motion.div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-foreground truncate">{fileData.file.name}</p>
                      {fileData.status === 'success' && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium">{t('fileUpload.uploadComplete')}</span>
                      )}
                      {fileData.status === 'error' && (
                        <div className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-destructive" />
                          <span className="text-xs text-destructive font-medium">{fileData.error || t('fileUpload.uploadFailed')}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <motion.div 
                        className="flex-1"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Progress
                          value={fileData.progress || 0}
                          className={cn(
                            'h-1.5 transition-all duration-500 ease-out',
                            fileData.status === 'success' && 'bg-green-100',
                            fileData.status === 'error' && 'bg-red-100',
                            fileData.status === 'uploading' && 'bg-blue-50'
                          )}
                        />
                      </motion.div>
                      <motion.span 
                        className="text-xs text-muted-foreground flex-shrink-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        {fileData.status === 'uploading' && fileData.uploadedBytes && fileData.totalBytes ? 
                          `${formatFileSize(fileData.uploadedBytes)} / ${formatFileSize(fileData.totalBytes)}` :
                          formatFileSize(fileData.file.size)
                        }
                      </motion.span>
                    </div>
                  </div>
                </div>
                <Button
                  variant={fileData.status === 'error' ? 'destructive' : 'ghost'}
                  size="sm"
                  onClick={() => handleRemoveFile(fileData)}
                  className="ml-2 h-8 w-8 p-0"
                  disabled={fileData.status === 'uploading'}
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default CompactFileUpload;
