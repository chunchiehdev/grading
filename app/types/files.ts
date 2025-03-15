export interface UploadedFileInfo {
    name: string;
    size: number;
    type: string;
    url: string;
    key: string;
}

export interface FileWithStatus {
    file: File;
    status: "uploading" | "success" | "error";
    progress: number;
    error?: string;
    key?: string;
}

export interface ProcessedDocument {
    fileName: string;
    fileKey: string;
    content: string;
    contentType: string;
    error?: string;
}

export interface DocumentSummary {
  fileName: string;
  fileKey: string;
  content: string;
  hasError: boolean;
  contentLength: number;
  error?: string;
}
