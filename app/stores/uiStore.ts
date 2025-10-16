import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { useEffect, useState } from 'react';
import i18n from '@/localization/i18n';

/**
 * Theme options for the application
 * @typedef {'light'|'dark'|'system'} Theme
 */
type Theme = 'light' | 'dark' | 'system';

/**
 * Language options for the application
 * @typedef {'en'|'zh'} Language
 */
type Language = 'en' | 'zh';

/**
 * Grading workflow step enumeration
 * @typedef {'upload'|'select-rubric'|'grading'|'result'} GradingStep
 */
export type GradingStep = 'upload' | 'select-rubric' | 'grading' | 'result';

/**
 * Interface for UI store state management
 * @interface UiState
 */
interface UiState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;

  lastVisitedPage: string | null;
  setLastVisitedPage: (page: string) => void;

  currentStep: GradingStep;
  canProceed: boolean;

  setStep: (step: GradingStep) => void;
  setCanProceed: (canProceed: boolean) => void;
  resetUI: () => void;
}

/**
 * Applies the selected theme to the document root element
 * @param {Theme} theme - The theme to apply ('light', 'dark', or 'system')
 */
function applyTheme(theme: Theme) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const effectiveTheme = theme === 'system' ? systemTheme : theme;

  root.classList.remove('light', 'dark');
  root.classList.add(effectiveTheme);
}

/**
 * Applies the selected language to i18n and stores preference in cookie
 * @param {Language} language - The language to apply ('en' or 'zh')
 */
function applyLanguage(language: Language) {
  if (typeof window === 'undefined') return;

  // Update i18n language
  i18n.changeLanguage(language);

  // Set language preference in cookie for server-side detection
  document.cookie = `language=${language}; path=/; max-age=31536000; SameSite=Lax`;
}

/**
 * Zustand store for managing UI state with persistence
 * Handles sidebar, theme, navigation, and grading workflow state
 */
const store = create<UiState>()(
  persist(
    immer((set, get) => ({
      sidebarCollapsed: true as boolean,
      toggleSidebar: () =>
        set((state) => {
          state.sidebarCollapsed = !state.sidebarCollapsed;
        }),
      setSidebarCollapsed: (collapsed) =>
        set((state) => {
          state.sidebarCollapsed = collapsed;
        }),

      theme: 'light',
      setTheme: (theme) =>
        set((state) => {
          state.theme = theme;
          applyTheme(theme);
        }),
      toggleTheme: () =>
        set((state) => {
          const currentTheme = state.theme;
          let newTheme: Theme = 'light';

          if (currentTheme === 'system') newTheme = 'light';
          else if (currentTheme === 'light') newTheme = 'dark';
          else newTheme = 'system';

          state.theme = newTheme;
          applyTheme(newTheme);
        }),

      language: 'zh',
      setLanguage: (language) =>
        set((state) => {
          state.language = language;
          applyLanguage(language);
        }),
      toggleLanguage: () =>
        set((state) => {
          const newLanguage = state.language === 'zh' ? 'en' : 'zh';
          state.language = newLanguage;
          applyLanguage(newLanguage);
        }),

      lastVisitedPage: null,
      setLastVisitedPage: (page) =>
        set((state) => {
          state.lastVisitedPage = page;
        }),

      currentStep: 'upload',
      canProceed: false,

      setStep: (step) =>
        set((state) => {
          state.currentStep = step;
        }),

      setCanProceed: (canProceed) =>
        set((state) => {
          state.canProceed = canProceed;
        }),

      resetUI: () =>
        set((state) => {
          state.currentStep = 'upload';
          state.canProceed = false;
        }),
    })),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => localStorage),

      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.theme) {
            applyTheme(state.theme);
          }
          if (state.language) {
            applyLanguage(state.language);
          }
        }
      },
    }
  )
);

/**
 * Safe hook that waits for hydration before accessing store
 */
export const useUiStore = () => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const state = store();

  if (!hydrated) {
    return {
      sidebarCollapsed: true,
      theme: 'light' as Theme,
      language: 'zh' as Language,
      currentStep: 'upload' as GradingStep,
      canProceed: false,
      lastVisitedPage: null,
      toggleSidebar: () => {},
      setSidebarCollapsed: () => {},
      setTheme: () => {},
      toggleTheme: () => {},
      setLanguage: () => {},
      toggleLanguage: () => {},
      setLastVisitedPage: () => {},
      setStep: () => {},
      setCanProceed: () => {},
      resetUI: () => {},
    };
  }

  return state;
};
