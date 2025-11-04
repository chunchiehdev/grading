# Performance Monitoring Guide

本專案已整合性能監控系統，用於追蹤和診斷應用程式的性能瓶頸。

## 監控範圍

### 1. **Student Layout Loader**
追蹤學生平台的資料載入效能：

- `student-layout-loader` - 整體 loader 執行時間（server-side）
- `student-layout-auth` - 使用者認證時間
- `student-layout-data-fetch` - 資料庫查詢時間（並行執行）
  - `fetch-student-assignments` - 作業查詢
  - `fetch-student-submissions` - 繳交記錄查詢
  - `fetch-student-courses` - 課程查詢
  - `fetch-submission-history` - 歷史記錄查詢
- `student-layout-data-transform` - 資料轉換時間
- `student-layout-client-loader` - Client-side loader 執行時間
- `student-layout-cache-hit/miss` - Cache 命中狀態

### 2. **Route Navigation**
追蹤頁面切換效能：

- `student-layout-mounted` - Layout 組件掛載
- `student-layout-route-change` - 路由變化
- `student-tab-change-to-{tab}` - Tab 切換（dashboard/courses/assignments/submissions）
- `student-courses-page-mounted` - 課程頁面掛載

### 3. **WebSocket Connection**
追蹤 WebSocket 連線效能：

- `websocket-connect` - WebSocket 連線建立時間
- `websocket-event-{event-name}` - WebSocket 事件接收標記
  - `assignment-notification`
  - `submission-notification`
  - `new-msg`
  - `chat-sync`

### 4. **Store Initialization**
追蹤狀態管理初始化：

- `student-layout-init-store` - Assignment store 初始化時間

## 如何使用

### 1. **在瀏覽器 Console 查看即時日誌**

開啟瀏覽器開發者工具（F12），在 Console 中可以看到彩色的性能日誌：

- 🔵 **藍色** - 開始計時 `[PERF START]`
- ✅ **綠色** - 快速完成（< 100ms）`[PERF END]`
- ⚠️ **橙色** - 較慢（100-500ms）`[PERF END]`
- ❌ **紅色** - 很慢（> 500ms）`[PERF END]`
- 📍 **紫色** - 單次事件標記 `[PERF MARK]`

### 2. **測試流程範例**

#### 測試 1: 學生進入專案
```
1. 登入後進入 /student 路徑
2. 查看 Console：
   - student-layout-loader (總載入時間)
   - student-layout-auth (認證時間)
   - student-layout-data-fetch (資料查詢時間)
   - fetch-student-* (各項資料查詢)
3. 記錄總時間
```

#### 測試 2: 切換頁面（儀表板 → 課程）
```
1. 點擊「課程」Tab
2. 查看 Console：
   - student-tab-change-to-courses (開始切換)
   - student-layout-route-change (路由變化)
   - student-layout-client-loader (可能觸發 cache hit/miss)
   - student-courses-page-mounted (課程頁面載入)
3. 記錄切換時間
```

#### 測試 3: 按下「發現課程」按鈕
```
1. 在課程頁面點擊「發現課程」按鈕
2. 查看 Console 的頁面載入時間
3. 檢查是否有 loader 被觸發
```

### 3. **使用 Console 命令**

在瀏覽器 Console 中可以直接使用 `perfMonitor` 物件：

```javascript
// 查看所有已完成的指標
perfMonitor.getMetrics()

// 查看特定類型的統計資訊
perfMonitor.getStats('student')        // 所有學生相關的指標
perfMonitor.getStats('websocket')      // 所有 WebSocket 相關的指標
perfMonitor.getStats('fetch')          // 所有資料查詢相關的指標

// 清除所有記錄
perfMonitor.clear()

// 啟用/停用監控
perfMonitor.setEnabled(false)  // 停用
perfMonitor.setEnabled(true)   // 啟用
```

### 4. **統計資訊範例**

執行 `perfMonitor.getStats('student')` 會顯示：

```
[PERF STATS] student
┌─────────┬──────────┐
│ Count   │ 15       │
│ Total   │ 2547.23  │
│ Average │ 169.82   │
│ Min     │ 12.45    │
│ Max     │ 892.11   │
└─────────┴──────────┘
```

## 常見問題診斷

### 問題 1: 進入學生平台很慢
**檢查指標**：
- `student-layout-loader` - 如果超過 1000ms，檢查以下子項：
  - `student-layout-auth` - 認證慢？
  - `fetch-student-assignments` - 作業查詢慢？可能作業數量太多
  - `fetch-student-courses` - 課程查詢慢？
  - `fetch-submission-history` - 歷史記錄太多？

**解決方向**：
- 如果某個 fetch 特別慢，需要優化該查詢（加索引、減少關聯）
- 如果全部都慢，可能是資料庫連線問題

### 問題 2: 切換 Tab 很慢
**檢查指標**：
- `student-tab-change-to-{tab}` 開始
- `student-layout-client-loader` - 是否 cache miss？
- 相關頁面的 `*-mounted` 事件

**解決方向**：
- 如果經常 cache miss，調整 CACHE_TTL
- 如果 mounted 慢，檢查該組件的渲染邏輯

### 問題 3: WebSocket 連線慢
**檢查指標**：
- `websocket-connect` - 連線建立時間
- 如果超過 5000ms，可能是網路問題或 WebSocket 服務器問題

**解決方向**：
- 檢查 WebSocket 服務器狀態
- 檢查網路延遲
- 考慮是否需要 WebSocket（可以用 polling 替代）

### 問題 4: 資料轉換慢
**檢查指標**：
- `student-layout-data-transform` - 資料格式化時間

**解決方向**：
- 如果超過 50ms，考慮在 server-side 就完成轉換
- 或使用 memoization 快取轉換結果

## 性能基準

### 良好的性能指標

| 操作 | 目標時間 | 警告時間 | 危險時間 |
|------|---------|---------|---------|
| 整體 Loader | < 300ms | 300-800ms | > 800ms |
| 認證 | < 50ms | 50-150ms | > 150ms |
| 單一資料查詢 | < 100ms | 100-300ms | > 300ms |
| 資料轉換 | < 20ms | 20-50ms | > 50ms |
| Tab 切換 | < 100ms | 100-300ms | > 300ms |
| WebSocket 連線 | < 1000ms | 1000-3000ms | > 3000ms |

## 進階使用

### 自訂監控點

在任何需要監控的地方加入：

```typescript
import { perfMonitor } from '@/utils/performance-monitor';

// 方式 1: 手動 start/end
perfMonitor.start('my-operation', { foo: 'bar' });
// ... 執行操作
perfMonitor.end('my-operation', { result: 'success' });

// 方式 2: 自動測量異步函數
const result = await perfMonitor.measure('my-async-op', async () => {
  return await fetchData();
}, { userId: '123' });

// 方式 3: 自動測量同步函數
const result = perfMonitor.measureSync('my-sync-op', () => {
  return processData();
});

// 方式 4: 單次事件標記
perfMonitor.mark('button-clicked', { buttonId: 'submit' });
```

## 注意事項

1. **只在開發環境啟用**：性能監控只在 `NODE_ENV=development` 時啟用
2. **不影響正式環境**：在正式環境中，所有監控函數都會立即返回，不產生任何開銷
3. **Console 可見**：所有日誌都會輸出到瀏覽器 Console，便於即時診斷
4. **自動顏色編碼**：根據耗時自動使用不同顏色，快速識別問題

## 下一步優化建議

根據監控結果，可能需要：

1. **資料庫查詢優化**：
   - 加入適當的索引
   - 減少不必要的關聯查詢
   - 使用分頁或虛擬滾動

2. **快取策略**：
   - 調整 client-side cache TTL
   - 實作更細緻的快取失效策略
   - 考慮使用 React Query 等函式庫

3. **程式碼分割**：
   - 使用 React.lazy() 動態載入組件
   - 減少初始 bundle 大小

4. **WebSocket 優化**：
   - 評估是否真的需要即時更新
   - 考慮使用 polling 或 server-sent events
   - 實作 connection pooling

5. **渲染優化**：
   - 使用 React.memo() 避免不必要的重新渲染
   - 優化大列表渲染（虛擬化）
   - 減少狀態更新頻率
