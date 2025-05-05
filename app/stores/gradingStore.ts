import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { GradingResultData } from '@/types/grading';

interface GradingState {
  isGrading: boolean;
  progress: number;
  result: GradingResultData | null;
  error: string | null;

  // Actions
  startGrading: () => void;
  updateProgress: (progress: number) => void;
  setResult: (result: GradingResultData | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useGradingStore = create<GradingState>()(
  immer((set) => ({
    isGrading: false,
    progress: 0,
    result: null,
    error: null,

    startGrading: () => set((state) => {
      state.isGrading = true;
      state.progress = 0;
      state.result = null;
      state.error = null;
    }),

    updateProgress: (progress) => set((state) => {
      state.progress = progress;
    }),

    setResult: (result) => set((state) => {
      state.result = result;
      state.isGrading = false;
      state.progress = 100;
    }),

    setError: (error) => set((state) => {
      state.error = error;
      state.isGrading = false;
    }),

    reset: () => set((state) => {
      state.isGrading = false;
      state.progress = 0;
      state.result = null;
      state.error = null;
    })
  }))
); 