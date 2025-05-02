/**
 * 主題管理已遷移至 stores/ui.ts
 * 
 * 根據最佳實踐，UI相關狀態（如主題）應集中於 UI Store 中
 * 請使用 useUiStore 替代
 */

import { useUiStore } from './ui';

// 為了兼容性保留舊的 API
export const useThemeStore = () => {
  const { theme, setTheme } = useUiStore();
  
  return {
    theme,
    setTheme: (theme: 'light' | 'dark') => setTheme(theme),
    toggleTheme: () => {
      const currentTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(currentTheme);
    }
  };
};