import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type Theme = 'light' | 'dark' | 'system';

export type GradingStep = 'upload' | 'select-rubric' | 'grading' | 'result';

/**
 * UI狀態管理Store
 * 專用於管理客戶端的UI狀態，如側邊欄展開/折疊、模態框顯示等
 */
interface UiState {
  // 側邊欄狀態
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // 主題設置
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  // 上次訪問頁面 (用於返回時導航)
  lastVisitedPage: string | null;
  setLastVisitedPage: (page: string) => void;

  currentStep: GradingStep;
  canProceed: boolean;
  
  // Actions
  setStep: (step: GradingStep) => void;
  setCanProceed: (canProceed: boolean) => void;
  resetUI: () => void;
}

// 同步更新 DOM 中的主題類
function applyTheme(theme: Theme) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const effectiveTheme = theme === 'system' ? systemTheme : theme;

  root.classList.remove('light', 'dark');
  root.classList.add(effectiveTheme);
}

// 創建持久化UI Store
export const useUiStore = create<UiState>()(
  persist(
    immer((set, get) => ({
      // 側邊欄默認折疊
      sidebarCollapsed: true as boolean,
      toggleSidebar: () => set((state) => {
        state.sidebarCollapsed = !state.sidebarCollapsed;
      }),
      setSidebarCollapsed: (collapsed) => set((state) => {
        state.sidebarCollapsed = collapsed;
      }),

      // 主題默認跟隨系統
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

      // 上次訪問頁面
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
      name: 'ui-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // 存儲在恢復時應用主題
      onRehydrateStorage: () => (state) => {
        if (state && state.theme) {
          applyTheme(state.theme);
        }
      },
    }
  )
);
