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
