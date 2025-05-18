import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GradingResultData } from '@/types/grading';
import type { UploadedFileInfo } from '@/types/files';

export interface GradingProgressState {
  progress: number;
  phase: 'check' | 'grade' | 'verify' | 'completed' | 'error';
  message: string;
}

interface GradingState {
  isGrading: boolean;
  gradingProgress: GradingProgressState;
  result: GradingResultData | null;
  error: string | null;

  uploadedFiles: UploadedFileInfo[];
  selectedRubricId: string | null;

  // Actions
  startGrading: () => void;
  updateProgress: (progress: Partial<GradingProgressState>) => void;
  setResult: (result: GradingResultData | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  
  setUploadedFiles: (files: UploadedFileInfo[]) => void;
  addUploadedFiles: (files: UploadedFileInfo[]) => void;
  setSelectedRubricId: (id: string | null) => void;

  // Metadata
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

const DEFAULT_GRADING_PROGRESS: GradingProgressState = { progress: 0, phase: 'check', message: '' };

export const useGradingStore = create<GradingState>()(
  persist(
    immer((set, get) => ({
      isGrading: false,
      gradingProgress: { ...DEFAULT_GRADING_PROGRESS },
      result: null,
      error: null,
      uploadedFiles: [],
      selectedRubricId: null,
      _hasHydrated: false,

      setHasHydrated: (state) => {
        set({
          _hasHydrated: state,
        });
      },

      startGrading: () => set((state) => {
        state.isGrading = true;
        state.gradingProgress = { ...DEFAULT_GRADING_PROGRESS };
        state.result = null;
        state.error = null;
      }),

      updateProgress: (progress) => set((state) => {
        state.gradingProgress = { ...state.gradingProgress, ...progress };
      }),

      setResult: (result) => set((state) => {
        console.log('Setting result in store:', result);
        state.result = result;
        state.isGrading = false;
        state.gradingProgress = { ...state.gradingProgress, progress: 100, phase: 'completed', message: '評分完成' };
      }),

      setError: (error) => set((state) => {
        state.error = error;
        state.isGrading = false;
        state.gradingProgress = { ...state.gradingProgress, phase: 'error', message: '評分失敗' };
      }),

      reset: () => set((state) => {
        state.isGrading = false;
        state.gradingProgress = { ...DEFAULT_GRADING_PROGRESS };
        state.result = null;
        state.error = null;
        state.uploadedFiles = [];
        state.selectedRubricId = null;
      }),

      setUploadedFiles: (files) => set((state) => {
        console.log('Setting uploaded files:', files);
        state.uploadedFiles = files;
      }),

      addUploadedFiles: (files) => set((state) => {
        console.log('Adding uploaded files:', files);
        state.uploadedFiles = [...state.uploadedFiles, ...files];
      }),

      setSelectedRubricId: (id) => set((state) => {
        console.log('Setting rubric ID:', id);
        state.selectedRubricId = id;
      })
    })),
    {
      name: 'grading-store',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('Rehydrated state:', state);
          state.setHasHydrated(true);
        }
      },
      version: 1,
    }
  )
); 

// Helper to check if the store has been hydrated
export const useHasHydrated = () => {
  const { _hasHydrated } = useGradingStore();
  return _hasHydrated;
}; 