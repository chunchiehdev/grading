import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type Theme = 'light' | 'dark' | 'system';

export type GradingStep = 'upload' | 'select-rubric' | 'grading' | 'result';

interface UiState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  lastVisitedPage: string | null;
  setLastVisitedPage: (page: string) => void;

  currentStep: GradingStep;
  canProceed: boolean;
  
  setStep: (step: GradingStep) => void;
  setCanProceed: (canProceed: boolean) => void;
  resetUI: () => void;
}

function applyTheme(theme: Theme) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const effectiveTheme = theme === 'system' ? systemTheme : theme;

  root.classList.remove('light', 'dark');
  root.classList.add(effectiveTheme);
}

export const useUiStore = create<UiState>()(
  persist(
    immer((set, get) => ({
      sidebarCollapsed: true as boolean,
      toggleSidebar: () => set((state) => {
        state.sidebarCollapsed = !state.sidebarCollapsed;
      }),
      setSidebarCollapsed: (collapsed) => set((state) => {
        state.sidebarCollapsed = collapsed;
      }),

      theme: 'system',
      setTheme: (theme) => set((state) => {
        state.theme = theme;
        applyTheme(theme);
      }),
      toggleTheme: () => set((state) => {
        const currentTheme = state.theme;
        let newTheme: Theme = 'light';

        if (currentTheme === 'system') newTheme = 'light';
        else if (currentTheme === 'light') newTheme = 'dark';
        else newTheme = 'system';

        state.theme = newTheme;
        applyTheme(newTheme);
      }),

      lastVisitedPage: null,
      setLastVisitedPage: (page) => set((state) => {
        state.lastVisitedPage = page;
      }),

      currentStep: 'upload',
      canProceed: false,

      setStep: (step) => set((state) => {
        state.currentStep = step;
      }),

      setCanProceed: (canProceed) => set((state) => {
        state.canProceed = canProceed;
      }),

      resetUI: () => set((state) => {
        state.currentStep = 'upload';
        state.canProceed = false;
      })
    })),
    {
      name: 'ui-storage', 
      storage: createJSONStorage(() => localStorage),
      
      
      onRehydrateStorage: () => (state) => {
        if (state && state.theme) {
          applyTheme(state.theme);
        }
      },
    }
  )
);
