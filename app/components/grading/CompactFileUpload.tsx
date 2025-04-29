import React, { useCallback, useState, useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Upload, X, File, Paperclip, AlertCircle, FileUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { UploadedFileInfo, FileWithStatus } from "@/types/files";

// Custom hook for EventSource
const useEventSource = (url: string, options?: { event?: string, enabled?: boolean }) => {
  const [data, setData] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!url || options?.enabled === false) {
      return;
    }

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    const eventName = options?.event || 'message';
    
    const handler = (event: MessageEvent) => {
      setData(event.data);
    };

    eventSource.addEventListener(eventName, handler);

    return () => {
      eventSource.removeEventListener(eventName, handler);
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [url, options?.event, options?.enabled]);

  return data;
};

interface FileUploadProps {
  maxFiles?: number;
  maxFileSize?: number;
  acceptedFileTypes?: string[];
  onFilesChange?: (files: File[]) => void;
  onUploadComplete?: (uploadedFiles: UploadedFileInfo[]) => void;
  onError?: (error: string) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

export const CompactFileUpload: React.FC<FileUploadProps> = ({
  maxFiles = 5,
  maxFileSize = 100 * 1024 * 1024,
  acceptedFileTypes = [".pdf", ".doc", ".docx", ".txt"],
  onFilesChange,
  onUploadComplete,
  onError,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<FileWithStatus[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [_completionCalled, setCompletionCalled] = useState(false);
  const completionRef = useRef(false);

  const idFetcher = useFetcher<{ success: boolean; uploadId: string }>();

  const uploadFetcher = useFetcher<{
    success: boolean;
    uploadId: string;
    files: UploadedFileInfo[];
    error?: string;
  }>();

  const uploadFilesToServer = useCallback((files: File[], id: string) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    uploadFetcher.submit(formData, {
      method: "POST",
      action: `/api/upload/${id}`,
    });
  }, [uploadFetcher]);

  const progressData = useEventSource(
    uploadId ? `/api/upload/progress/${uploadId}` : "",
    { event: "upload-progress", enabled: !!uploadId }
  );

  useEffect(() => {
    if (idFetcher.data?.success && idFetcher.data.uploadId) {
      const newUploadId = idFetcher.data.uploadId;
      console.log("get new uploadId:", newUploadId);
      setUploadId(newUploadId);

      if (pendingFiles.length > 0) {
        uploadFilesToServer(pendingFiles, newUploadId);
        setPendingFiles([]);
      }
    } else if (idFetcher.data && !idFetcher.data.success) {
      const errorMsg = "獲取上傳 ID 失敗";
      setError(errorMsg);
      onError?.(errorMsg);
      setIsUploading(false);
    }
  }, [idFetcher.data, pendingFiles, uploadFilesToServer, onError]);

  useEffect(() => {
    if (uploadFetcher.data?.success && uploadFetcher.data.files) {
      console.log("上傳完成:", uploadFetcher.data.files);

      setUploadedFiles((prev) =>
        prev.map((fileItem) => {
          const fileData = uploadFetcher.data?.files.find(
            (f) => f.name === fileItem.file.name
          );

          if (fileData && fileData.key) {
            return {
              ...fileItem,
              status: "success",
              progress: 100,
              key: fileData?.key,
            };
          }
          return fileItem;
        })
      );

      setIsUploading(false);

      

      if (!completionRef.current) {
        console.log("Calling onUploadComplete from fetcher effect");
        completionRef.current = true;
        setCompletionCalled(true);
        onUploadComplete?.(uploadFetcher.data.files);
      }
      
      const timer = setTimeout(() => {
        setUploadId(null);
      }, 3000);

      return () => clearTimeout(timer);
    }

    if (uploadFetcher.data && !uploadFetcher.data.success) {
      const errorMsg = uploadFetcher.data.error || "上傳失敗";
      setError(errorMsg);
      onError?.(errorMsg);
      setIsUploading(false);
    }
  }, [uploadFetcher.data, onUploadComplete, onError]);

  useEffect(() => {
    if (isUploading) {
      setCompletionCalled(false);
    }
  }, [isUploading]);

  useEffect(() => {
    if (!progressData) return;

    try {
      const progress = JSON.parse(progressData);

      setUploadedFiles((prev) => {
        return prev.map((fileItem) => {
          const fileProgress = progress[fileItem.file.name];
          if (fileProgress) {
            return {
              ...fileItem,
              progress: fileProgress.progress,
              status: fileProgress.status,
              error: fileProgress.error,
            };
          }
          return fileItem;
        });
      });

      const allCompleted = Object.values(progress).every(
        (item: any) => item.status === "success" || item.status === "error"
      );

      if (allCompleted && isUploading) {
        setIsUploading(false);
      }
    } catch (error) {
      console.error("解析進度資料失敗", error);
    }
  }, [progressData, isUploading]);

  useEffect(() => {
    const allCompleted = uploadedFiles.every(
      file => file.status === "success" || file.status === "error"
    );
    
    if (allCompleted && uploadId) {
      setUploadId(null);
    }
  }, [uploadedFiles, uploadId]);

  const validateFile = (
    file: File,
    existingFiles: FileWithStatus[]
  ): string | null => {
    if (file.size > maxFileSize) {
      return `檔案 ${file.name} 超過大小限制 ${formatFileSize(maxFileSize)}`;
    }

    const fileExt = "." + file.name.split(".").pop()?.toLowerCase();
    if (!acceptedFileTypes.includes(fileExt)) {
      return `不支援的檔案類型: ${fileExt}`;
    }

    const isDuplicate = existingFiles.some(
      (existingFile) =>
        existingFile.file.name === file.name &&
        existingFile.file.size === file.size
    );

    if (isDuplicate) {
      return `檔案 ${file.name} 已經存在`;
    }

    return null;
  };

  const handleFiles = useCallback(
    async (newFiles: File[]) => {
      setError(null);

      if (uploadedFiles.length + newFiles.length > maxFiles) {
        const errorMsg = `最多只能上傳 ${maxFiles} 個檔案`;
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      const validFiles: FileWithStatus[] = [];

      for (const file of newFiles) {
        const validationError = validateFile(file, uploadedFiles);

        if (validationError) {
          setError(validationError);
          onError?.(validationError);
          return;
        }

        validFiles.push({
          file,
          status: "uploading",
          progress: 0,
        });
      }

      setUploadedFiles((prev) => [...prev, ...validFiles]);
      setIsUploading(true);
      onFilesChange?.(validFiles.map((f) => f.file));

      const filesToUpload = validFiles.map((f) => f.file);

      if (uploadId) {
        uploadFilesToServer(filesToUpload, uploadId);
      } else {
        setPendingFiles(filesToUpload);
        idFetcher.submit(
          {},
          {
            method: "post",
            action: "/api/upload/create-id",
          }
        );
      }
    },
    [uploadedFiles, maxFiles, onFilesChange, onError, uploadId]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

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

  const removeFile = useCallback(
    (index: number) => {
      const fileToRemove = uploadedFiles[index];

      if (uploadId && fileToRemove) {
        fetch(
          `/api/upload/clear-progress/${uploadId}/${encodeURIComponent(
            fileToRemove.file.name
          )}`,
          {
            method: "DELETE",
          }
        ).catch((err) => console.error("Failed to clear file progress:", err));
      }

      console.log("fileToRemove.key", fileToRemove.key)

      if (fileToRemove.key) {
        fetch(`/api/upload/delete-file`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: fileToRemove.key }),
        }).catch((err) =>
          console.error("Failed to delete file from storage:", err)
        );
      }

      setUploadedFiles((prev) => {
        const newFiles = prev.filter((_, i) => i !== index);
        onFilesChange?.(newFiles.map((f) => f.file));
        return newFiles;
      });
    },
    [onFilesChange, uploadId, uploadedFiles]
  );

  return (
    <div className="border-b border-border">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="upload" className="border-0">
          <AccordionTrigger className="hover:no-underline py-2 px-4 text-sm">
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              <span className="font-medium">
                請上傳您閱讀的文本{" "}
                {uploadedFiles.length > 0 && `(${uploadedFiles.length})`}
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
                  ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary"
                  }
                `}
              >
                <div
                  className={cn(
                    "p-3 rounded-full transition-colors duration-200",
                    "bg-secondary group-hover:bg-primary/5"
                  )}
                >
                  <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                </div>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    拖放檔案到這裡，或
                  </p>
                  <label
                    htmlFor="file-input"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/90 cursor-pointer mt-1 bg-primary/5 px-3 py-1.5 rounded-full transition-all duration-200 hover:bg-primary/10"
                  >
                    <FileUp className="h-4 w-4" />
                    選擇檔案
                  </label>
                </div>

                <p className="text-xs text-muted-foreground">
                  支援的檔案格式：PDF、DOC、DOCX
                </p>

                <input
                  id="file-input"
                  type="file"
                  multiple
                  className="hidden"
                  accept={acceptedFileTypes.join(",")}
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    await handleFiles(files);
                    e.target.value = "";
                  }}
                />
              </div>

              {uploadedFiles.length > 0 && (
                <ScrollArea className="h-[120px] w-full rounded-md border border-border">
                  <div className="p-2 space-y-2">
                    {uploadedFiles.map((fileData, index) => (
                      <div
                        key={fileData.file.name + index}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-md",
                          fileData.status === "error"
                            ? "bg-destructive/10"
                            : "hover:bg-accent"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <File
                            className={cn(
                              "w-4 h-4 flex-shrink-0",
                              fileData.status === "success" && "text-green-500",
                              fileData.status === "error" && "text-destructive",
                              fileData.status === "uploading" && "text-primary"
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-foreground truncate">
                                {fileData.file.name}
                              </p>
                              {fileData.status === "success" && (
                                <span className="text-xs bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                                  上傳完成
                                </span>
                              )}
                              {fileData.status === "error" && (
                                <div className="flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 text-destructive" />
                                  <span className="text-xs text-destructive font-medium">
                                    {fileData.error || "上傳失敗"}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Progress
                                value={fileData.progress}
                                className={cn(
                                  "h-1 flex-1",
                                  fileData.status === "success" &&
                                    "bg-green-500/20",
                                  fileData.status === "error" &&
                                    "bg-destructive/20"
                                )}
                                style={{
                                  ["--progress-foreground" as any]:
                                    fileData.status === "success"
                                      ? "var(--green-500)"
                                      : fileData.status === "error"
                                      ? "var(--red-500)"
                                      : "var(--blue-500)",
                                }}
                              />
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                {formatFileSize(fileData.file.size)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant={
                            fileData.status === "error"
                              ? "destructive"
                              : "ghost"
                          }
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="ml-2 h-8 w-8 p-0"
                          disabled={fileData.status === "uploading"}
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
