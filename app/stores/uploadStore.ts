import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer'
import type { FileWithStatus } from '@/types/files';

/**
 * Interface for upload store state management
 * @interface UploadState
 */
interface UploadState {
  files: Record<string, FileWithStatus>; 
  uploadId: string | null;
  
  // Actions
  setUploadId: (id: string) => void;
  addFiles: (files: File[]) => void; 
  updateProgress: (filename: string, progress: number) => void;
  setFileStatus: (filename: string, status: 'uploading' | 'success' | 'error', data?: any) => void;
  removeFile: (filename: string) => void;
  clearFiles: () => void;
}

/**
 * Zustand store for managing file upload state with Immer for immutable updates
 * Handles file upload progress, status tracking, and upload session management
 */
export const useUploadStore = create<UploadState>()(
  immer((set) => ({
    files: {},
    uploadId: null,
    setUploadId: (id) => set(state => { state.uploadId = id }),
    addFiles: (files) => set(state => {
      files.forEach(file => {
        state.files[file.name] = { file, status: 'uploading', progress: 0 };
      });
    }),
    updateProgress: (filename, progress) => set(state => {
      state.files[filename].progress = progress;
    }),
    setFileStatus: (filename, status, data = {}) => set(state => {
      Object.assign(state.files[filename], { status, ...data });
    }),
    removeFile: (filename) => set(state => {
      delete state.files[filename];
    }),
    clearFiles: () => set(state => { state.files = {} })
  }))
);