// src/components/CompactFileUpload.tsx
import React, { useCallback, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Upload, X, File, Paperclip, AlertCircle, FileUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { UploadedFileInfo } from '@/types/files';
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
  onUploadComplete?: (uploadedFiles: UploadedFileInfo[]) => void;
  onError?: (error: string) => void;
}

export const CompactFileUpload: React.FC<FileUploadProps> = ({
  maxFiles,
  maxFileSize = 100 * 1024 * 1024,
  acceptedFileTypes = ['.pdf', '.doc', '.docx', '.txt'],
  onFilesChange,
  onUploadComplete,
  onError,
}) => {
  const { 
    files: uploadedFiles, 
    uploadFiles, 
    deleteFile, 
    isUploading,
    uploadError 
  } = useFileUpload({ onUploadComplete });
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate file function
  const validateFile = useCallback((file: File): string | null => {
    if (file.size > maxFileSize) {
      return `檔案 ${file.name} 超過大小限制 ${formatFileSize(maxFileSize)}`;
    }

    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFileTypes.includes(fileExt)) {
      return `不支援的檔案類型: ${fileExt}`;
    }

    return null;
  }, [maxFileSize, acceptedFileTypes]);

  const handleFiles = useCallback(async (newFiles: File[]) => {
    setError(null);
    
    if (uploadedFiles.length + newFiles.length > maxFiles) {
      setError(`最多只能上傳 ${maxFiles} 個檔案`);
      return;
    }
    
    for (const file of newFiles) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    
    try {
      await uploadFiles(newFiles);
      onFilesChange?.(newFiles);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMsg);
      onError?.(errorMsg);
    }
  }, [validateFile, uploadFiles, onFilesChange, onError, uploadedFiles.length, maxFiles]);

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Handle drop event
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    await handleFiles(droppedFiles);
  }, [handleFiles]);

  // Handle file deletion
  const handleRemoveFile = useCallback((fileData: any) => {
    if (fileData.key) {
      deleteFile(fileData.key);
    }
  }, [deleteFile]);

  // Set error from uploadError
  React.useEffect(() => {
    if (uploadError) {
      setError(uploadError);
      onError?.(uploadError);
    }
  }, [uploadError, onError]);

  return (
    <div className="border-b border-border">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="upload" className="border-0">
          <AccordionTrigger className="hover:no-underline py-2 px-4 text-sm">
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              <span className="font-medium">
                請上傳您的作業 {uploadedFiles.length > 0 && `(${uploadedFiles.length})`}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="px-4 pb-3 space-y-3">
              {error && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div
                onDragEnter={() => setIsDragging(true)}
                onDragOver={handleDrag}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-lg p-8
                  flex flex-col items-center justify-center gap-3
                  transition-colors duration-200
                  ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary'}
                `}
              >
                <div
                  className={cn(
                    'p-3 rounded-full transition-colors duration-200',
                    'bg-secondary group-hover:bg-primary/5'
                  )}
                >
                  <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                </div>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">拖放檔案到這裡，或</p>
                  <label
                    htmlFor="file-input"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/90 cursor-pointer mt-1 bg-primary/5 px-3 py-1.5 rounded-full transition-all duration-200 hover:bg-primary/10"
                  >
                    <FileUp className="h-4 w-4" />
                    選擇檔案
                  </label>
                </div>

                <p className="text-xs text-muted-foreground">支援的檔案格式：PDF、DOC、DOCX</p>

                <input
                  id="file-input"
                  type="file"
                  multiple
                  className="hidden"
                  accept={acceptedFileTypes.join(',')}
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    await handleFiles(files);
                    e.target.value = '';
                  }}
                  disabled={isUploading}
                />
              </div>

              {uploadedFiles.length > 0 && (
                <ScrollArea className="h-[120px] w-full rounded-md border border-border">
                  <div className="p-2 space-y-2">
                    {uploadedFiles.map((fileData) => (
                      <div
                        key={fileData.file.name}
                        className={cn(
                          'flex items-center justify-between p-2 rounded-md',
                          fileData.status === 'error' ? 'bg-destructive/10' : 'hover:bg-accent'
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
                                <span className="text-xs bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                                  上傳完成
                                </span>
                              )}
                              {fileData.status === 'error' && (
                                <div className="flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 text-destructive" />
                                  <span className="text-xs text-destructive font-medium">
                                    {fileData.error || '上傳失敗'}
                                  </span>
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
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                {formatFileSize(fileData.file.size)}
                              </span>
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default CompactFileUpload;