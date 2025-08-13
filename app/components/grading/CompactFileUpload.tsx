// src/components/grading/CompactFileUpload.tsx
import { useCallback, useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Upload, X, File, AlertCircle, FileUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useFileUpload } from '@/hooks/useFileUpload';

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

  const { files: uploadedFiles, uploadFiles, deleteFile, isUploading, uploadError, lastError, canRetry } =
    useFileUpload({ onUploadComplete: hookOnComplete });
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (file.size > maxFileSize) {
        return `檔案 ${file.name} 超過大小限制 ${formatFileSize(maxFileSize)}`;
      }

      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!acceptedFileTypes.includes(fileExt)) {
        return `不支援的檔案類型: ${fileExt}`;
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

      if (safeUploadedFiles.length + safeNewFiles.length > maxFiles) {
        setError(`最多只能上傳 ${maxFiles} 個檔案`);
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
        const errorMsg = err?.message || '上傳失敗';
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
      if (fileData.key) {
        deleteFile(fileData.key);
      }
    },
    [deleteFile]
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
                重試上傳 {retryCount > 0 && `(第 ${retryCount + 1} 次嘗試)`}
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
          <p className="text-sm font-medium">拖放檔案至此或點擊上傳</p>
          <p className="text-xs text-muted-foreground mt-1">支援 {acceptedFileTypes.join(', ')}，最大 {formatFileSize(maxFileSize)}</p>
        </div>
        <input
          type="file"
          className="hidden"
          id="file-upload-input"
          onChange={async (e) => {
            const files = e.target.files ? Array.from(e.target.files) : [];
            await handleFiles(files);
          }}
        />
        <Button asChild variant="outline" size="sm" disabled={isUploading}>
          <label htmlFor="file-upload-input" className="cursor-pointer">
            <FileUp className="h-4 w-4 mr-2" /> 選擇檔案
          </label>
        </Button>
      </div>

      {safeUploadedFiles.length > 0 && (
        <ScrollArea className="h-40 border rounded-md">
          <div className="p-3 space-y-2">
            {safeUploadedFiles.map((fileData: any, index: number) => (
              <div
                key={fileData.key || index}
                className={cn(
                  'flex items-center justify-between rounded-md border p-2',
                  fileData.status === 'success' && 'border-green-200 bg-green-50',
                  fileData.status === 'error' && 'border-destructive/30 bg-destructive/10',
                  fileData.status === 'uploading' && 'border-primary/30 bg-primary/5'
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <File
                    className={cn(
                      'w-4 h-4 flex-shrink-0',
                      fileData.status === 'success' && 'text-green-500',
                      fileData.status === 'error' && 'text-destructive',
                      fileData.status === 'uploading' && 'text-primary'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-foreground truncate">{fileData.file.name}</p>
                      {fileData.status === 'success' && (
                        <span className="text-xs bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">上傳完成</span>
                      )}
                      {fileData.status === 'error' && (
                        <div className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-destructive" />
                          <span className="text-xs text-destructive font-medium">{fileData.error || '上傳失敗'}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress
                        value={fileData.progress}
                        className={cn(
                          'h-1 flex-1',
                          fileData.status === 'success' && 'bg-green-500/20',
                          fileData.status === 'error' && 'bg-destructive/20'
                        )}
                        style={{
                          ['--progress-foreground' as any]:
                            fileData.status === 'success'
                              ? 'var(--green-500)'
                              : fileData.status === 'error'
                                ? 'var(--red-500)'
                                : 'var(--blue-500)',
                        }}
                      />
                      <span className="text-xs text-muted-foreground flex-shrink-0">{formatFileSize(fileData.file.size)}</span>
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
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default CompactFileUpload;
