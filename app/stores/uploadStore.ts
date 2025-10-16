import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { FileWithStatus } from '@/types/files';

/**
 * Interface for upload store state management
 * @interface UploadState
 *
 * Refactored to isolate file state by uploadId to prevent cross-session state pollution.
 * Each upload session (identified by uploadId) maintains its own isolated file state.
 */
interface UploadState {
  // NEW: Files organized by uploadId for proper isolation
  filesByUploadId: Record<string, Record<string, FileWithStatus>>;

  // Renamed from uploadId for clarity
  currentUploadId: string | null;

  // Actions - API signatures remain unchanged for backward compatibility
  setUploadId: (id: string) => void;
  addFiles: (files: File[]) => void;
  updateProgress: (filename: string, progress: number) => void;
  setFileStatus: (filename: string, status: 'uploading' | 'success' | 'error', data?: any) => void;
  removeFile: (filename: string) => void;
  clearFiles: () => void;

  // NEW: Garbage collection for old upload sessions
  cleanupOldSessions: (keepRecent?: number) => void;
}

/**
 * Zustand store for managing file upload state with Immer for immutable updates
 * Handles file upload progress, status tracking, and upload session management
 *
 * REFACTORED: Uses uploadId-based isolation to prevent state pollution across different
 * upload sessions. Each assignment/upload gets its own isolated state namespace.
 */
export const useUploadStore = create<UploadState>()(
  immer((set, get) => ({
    filesByUploadId: {},
    currentUploadId: null,

    setUploadId: (id) =>
      set((state) => {
        state.currentUploadId = id;
        // Auto-initialize files object for new uploadId
        if (!state.filesByUploadId[id]) {
          state.filesByUploadId[id] = {};
        }
      }),

    addFiles: (files) =>
      set((state) => {
        const uploadId = state.currentUploadId;
        if (!uploadId) {
          console.warn('addFiles: No currentUploadId set');
          return;
        }

        // Ensure uploadId namespace exists
        if (!state.filesByUploadId[uploadId]) {
          state.filesByUploadId[uploadId] = {};
        }

        files.forEach((file) => {
          state.filesByUploadId[uploadId][file.name] = {
            file,
            status: 'uploading',
            progress: 0,
          };
        });
      }),

    updateProgress: (filename, progress) =>
      set((state) => {
        const uploadId = state.currentUploadId;
        if (!uploadId || !state.filesByUploadId[uploadId]) {
          console.warn(`updateProgress: Invalid uploadId or missing files for ${filename}`);
          return;
        }

        const file = state.filesByUploadId[uploadId][filename];
        if (file) {
          file.progress = progress;
        }
      }),

    setFileStatus: (filename, status, data = {}) =>
      set((state) => {
        const uploadId = state.currentUploadId;
        if (!uploadId || !state.filesByUploadId[uploadId]) {
          console.warn(`setFileStatus: Invalid uploadId or missing files for ${filename}`);
          return;
        }

        const file = state.filesByUploadId[uploadId][filename];
        if (file) {
          Object.assign(file, { status, ...data });
        }
      }),

    removeFile: (filename) =>
      set((state) => {
        const uploadId = state.currentUploadId;
        if (!uploadId || !state.filesByUploadId[uploadId]) {
          console.warn(`removeFile: Invalid uploadId or missing files for ${filename}`);
          return;
        }

        delete state.filesByUploadId[uploadId][filename];
      }),

    clearFiles: () =>
      set((state) => {
        const uploadId = state.currentUploadId;
        if (!uploadId) {
          console.warn('clearFiles: No currentUploadId set');
          return;
        }

        // Clear only the current uploadId's files
        state.filesByUploadId[uploadId] = {};
      }),

    cleanupOldSessions: (keepRecent = 5) =>
      set((state) => {
        const uploadIds = Object.keys(state.filesByUploadId);

        // No cleanup needed if we're under the limit
        if (uploadIds.length <= keepRecent) return;

        const currentId = state.currentUploadId;

        // Sort by key (assuming uploadIds are chronological or timestamp-based)
        const sortedIds = uploadIds.sort();

        // Keep the most recent N sessions
        const recentIds = sortedIds.slice(-keepRecent);

        // Always keep the current uploadId if it exists
        const toKeep = new Set(recentIds);
        if (currentId) toKeep.add(currentId);

        // Delete old sessions
        uploadIds.forEach((id) => {
          if (!toKeep.has(id)) {
            delete state.filesByUploadId[id];
          }
        });
      }),
  }))
);
