import React from "react";
import { useCallback, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Progress } from "~/components/ui/progress";
import { Button } from "~/components/ui/button";
import { Upload, X, File, Paperclip, AlertCircle } from "lucide-react";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { cn } from "~/lib/utils";
interface FileWithStatus {
  file: File;
  status: "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

interface FileUploadProps {
  maxFiles?: number;
  maxFileSize?: number;
  acceptedFileTypes?: string[];
  onFilesChange?: (files: File[]) => void;
  onUploadComplete?: () => void;
  onError?: (error: string) => void;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

export const CompactFileUpload: React.FC<FileUploadProps> = ({
  maxFiles = 5,
  maxFileSize = 10 * 1024 * 1024,
  acceptedFileTypes = [".pdf", ".doc", ".docx", ".txt"],
  onFilesChange,
  onUploadComplete,
  onError,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<FileWithStatus[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const uploadFile = async (fileWithStatus: FileWithStatus): Promise<void> => {
    const uploadDuration = 3000;
    const steps = 30;
    const stepDuration = uploadDuration / steps;

    try {
      for (let i = 1; i <= steps; i++) {
        const progress = Math.floor((i / steps) * 100);

        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.file.name === fileWithStatus.file.name &&
            f.file.size === fileWithStatus.file.size
              ? {
                  ...f,
                  progress,
                  status: progress === 100 ? "success" : "uploading",
                }
              : f
          )
        );

        await delay(stepDuration);
      }
    } catch (error) {
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.file.name === fileWithStatus.file.name &&
          f.file.size === fileWithStatus.file.size
            ? { ...f, status: "error", error: "上傳失敗" }
            : f
        )
      );

      throw new Error("檔案上傳失敗");
    }
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
      onFilesChange?.(validFiles.map((f) => f.file));

      try {
        await Promise.all(validFiles.map((file) => uploadFile(file)));
        onUploadComplete?.();
      } catch (error) {
        const errorMsg = "部分檔案上傳失敗";
        setError(errorMsg);
        onError?.(errorMsg);
      }
    },
    [uploadedFiles, maxFiles, onFilesChange, onError, onUploadComplete]
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
      setUploadedFiles((prev) => {
        const newFiles = prev.filter((_, i) => i !== index);
        onFilesChange?.(newFiles.map((f) => f.file));
        return newFiles;
      });
    },
    [onFilesChange]
  );

  return (
    <div className="border-b">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="upload" className="border-0">
          <AccordionTrigger className="hover:no-underline py-2 px-4 text-sm">
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              <span className="font-medium">
                請上傳閱讀文本{" "}
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
                  border-2 border-dashed rounded-lg p-4
                  flex flex-col items-center justify-center
                  transition-colors duration-200 gap-2
                  ${
                    isDragging
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }
                `}
              >
                <Upload className="w-6 h-6 text-gray-400" />
                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    拖放檔案到這裡，或
                    <label
                      htmlFor="file-input"
                      className="text-blue-500 hover:text-blue-600 cursor-pointer mx-1"
                    >
                      瀏覽
                    </label>
                    檔案
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    支援的格式: {acceptedFileTypes.join(", ")} · 最大{" "}
                    {formatFileSize(maxFileSize)}
                  </p>
                </div>
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
                <ScrollArea className="h-[120px] w-full rounded-md border">
                  <div className="p-2 space-y-2">
                    {uploadedFiles.map((fileData, index) => (
                      <div
                        key={fileData.file.name + index}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-md",
                          fileData.status === "error"
                            ? "bg-red-50"
                            : "hover:bg-gray-50"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <File
                            className={cn(
                              "w-4 h-4 flex-shrink-0",
                              fileData.status === "success" && "text-green-500",
                              fileData.status === "error" && "text-red-500",
                              fileData.status === "uploading" && "text-blue-500"
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-gray-700 truncate">
                                {fileData.file.name}
                              </p>
                              {fileData.status === "success" && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                  上傳完成
                                </span>
                              )}
                              {fileData.status === "error" && (
                                <div className="flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 text-red-500" />
                                  <span className="text-xs text-red-700 font-medium">
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
                                    "bg-green-100",
                                  fileData.status === "error" && "bg-red-100"
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
                              <span className="text-xs text-gray-500 flex-shrink-0">
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