/**
 * Information about an uploaded file
 */
export interface UploadedFileInfo {
  name: string;
  size: number;
  type: string;
  key: string;
  url: string;
  uploadedAt?: string;
}

/**
 * File with uploading status
 */
export interface FileWithStatus {
  file: File;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  key?: string;
  url?: string;
}

export interface ProcessedDocument {
  fileName: string;
  fileKey: string;
  content: string;
  contentType: string;
  error?: string;
  metadata?: {
    processedBy?: 'MCP' | 'API' | 'PDF_Parser_API';
    mcpResponse?: any;
    apiResponse?: any;
    taskId?: string;
    userId?: string;
    [key: string]: any;
  };
}

export interface DocumentSummary {
  fileName: string;
  fileKey: string;
  content: string;
  hasError: boolean;
  contentLength: number;
  error?: string;
}
