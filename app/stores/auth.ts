/**
 * 關於認證狀態管理的最佳實踐說明
 *
 * 根據我們的最佳實踐指南（when_to_use.md），以下是管理認證狀態的正確方式：
 *
 * 1. React Router
 *    - 負責路由保護和重定向邏輯
 *    - 處理會話檢查（通過 cookie/session）
 *    - 在路由層面決定是否允許訪問特定頁面
 *
 * 2. React Query
 *    - 負責從 API 獲取用戶數據
 *    - 處理數據緩存和重新驗證
 *    - 提供數據載入狀態和錯誤處理
 *
 * 3. Zustand
 *    - 不應用於存儲認證狀態（這是伺服器狀態）
 *    - 應僅用於管理 UI 相關狀態（如側邊欄折疊/展開）
 *
 * Zustand auth store 已被移除，請改用：
 * - 使用者認證狀態：useUser() from '@/hooks/api/auth'
 * - UI 狀態：useUiStore() from '@/stores/ui'
 */

// 此文件保留用於向後兼容，新代碼應遵循上述最佳實踐
export {};
