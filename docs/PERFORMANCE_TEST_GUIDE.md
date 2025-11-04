# 性能測試快速指南

## 快速開始

### 1. 啟動開發環境
```bash
# 確保所有服務運行
docker-compose -f docker-compose.dev.yaml up -d

# 啟動應用
npm run dev
```

### 2. 開啟瀏覽器開發者工具
1. 打開 Chrome/Edge
2. 按 F12 開啟開發者工具
3. 切換到 **Console** 分頁
4. 清空 console（右鍵 → Clear console）

## 測試場景

### 場景 1: 學生登入並進入平台 ⏱️

**步驟**：
1. 清空 console
2. 登入學生帳號
3. 進入 `/student` 路徑

**觀察指標**：
```
[PERF START] student-layout-loader
  [PERF START] student-layout-auth
  [PERF END] ✅ student-layout-auth | Duration: XXms

  [PERF START] student-layout-data-fetch
    [PERF START] fetch-student-assignments
    [PERF END] ✅ fetch-student-assignments | Duration: XXms
    [PERF START] fetch-student-submissions
    [PERF END] ✅ fetch-student-submissions | Duration: XXms
    [PERF START] fetch-student-courses
    [PERF END] ✅ fetch-student-courses | Duration: XXms
    [PERF START] fetch-submission-history
    [PERF END] ✅ fetch-submission-history | Duration: XXms
  [PERF END] ✅ student-layout-data-fetch | Duration: XXms

  [PERF START] student-layout-data-transform
  [PERF END] ✅ student-layout-data-transform | Duration: XXms

[PERF END] ✅ student-layout-loader | Duration: XXXms

[PERF MARK] 📍 student-layout-mounted
[PERF START] websocket-connect
[PERF END] ✅ websocket-connect | Duration: XXXXms
```

**預期結果**：
- ✅ `student-layout-loader` < 500ms
- ✅ `websocket-connect` < 2000ms
- ⚠️ 如果 > 1000ms，需要優化

---

### 場景 2: 切換到課程頁面 ⏱️

**步驟**：
1. 在學生平台首頁
2. 清空 console
3. 點擊「課程」Tab

**觀察指標**：
```
[PERF START] student-tab-change-to-courses
[PERF MARK] 📍 student-layout-route-change | pathname: /student/courses
[PERF MARK] 📍 student-layout-cache-hit (或 cache-miss)
[PERF END] ✅ student-layout-client-loader | Duration: XXms
[PERF MARK] 📍 student-courses-page-mounted
[PERF START] student-courses-memo
[PERF END] ✅ student-courses-memo | Duration: XXms
[PERF MARK] 📍 courses-content-rendered
```

**預期結果**：
- ✅ Cache hit: 整個切換 < 100ms
- ⚠️ Cache miss: 可能需要 300-500ms
- ❌ 如果 > 1000ms，有嚴重問題

---

### 場景 3: 切換到作業頁面 ⏱️

**步驟**：
1. 在課程頁面
2. 清空 console
3. 點擊「作業」Tab

**觀察指標**：
```
[PERF START] student-tab-change-to-assignments
[PERF MARK] 📍 student-layout-route-change | pathname: /student/assignments
[PERF MARK] 📍 student-layout-cache-hit
[PERF END] ✅ student-layout-client-loader | Duration: XXms
```

**預期結果**：
- ✅ 應該都是 cache hit（< 50ms）
- ❌ 如果經常 cache miss，檢查快取策略

---

### 場景 4: 切換到儀表板 ⏱️

**步驟**：
1. 在任意頁面
2. 清空 console
3. 點擊「儀表板」Tab

**預期結果**：
- ✅ 類似場景 2/3，應該很快

---

### 場景 5: 點擊「發現課程」按鈕 ⏱️

**步驟**：
1. 在課程頁面
2. 清空 console
3. 點擊右上角「發現課程」按鈕

**觀察指標**：
```
（查看新頁面的 loader 執行時間）
```

**預期結果**：
- ✅ 如果有獨立的 loader，會顯示載入時間
- 注意：這個頁面可能沒有 heavy loader

---

## 使用 Console 命令進行分析

### 查看所有性能指標
```javascript
perfMonitor.getMetrics()
```

### 查看學生相關操作的統計
```javascript
perfMonitor.getStats('student')
```

輸出範例：
```
[PERF STATS] student
┌─────────────┬────────────┐
│ Count       │ 15         │
│ Total (ms)  │ 2547.23    │
│ Average (ms)│ 169.82     │
│ Min (ms)    │ 12.45      │
│ Max (ms)    │ 892.11     │
└─────────────┴────────────┘
```

### 查看資料查詢的統計
```javascript
perfMonitor.getStats('fetch')
```

### 查看 WebSocket 相關統計
```javascript
perfMonitor.getStats('websocket')
```

### 清除所有記錄重新測試
```javascript
perfMonitor.clear()
```

---

## 性能基準對照表

| 指標 | 良好 ✅ | 可接受 ⚠️ | 需優化 ❌ |
|------|---------|-----------|-----------|
| **整體載入** |
| student-layout-loader | < 300ms | 300-800ms | > 800ms |
| student-layout-client-loader (cache hit) | < 50ms | 50-100ms | > 100ms |
| **資料查詢** |
| fetch-student-assignments | < 100ms | 100-300ms | > 300ms |
| fetch-student-courses | < 100ms | 100-300ms | > 300ms |
| fetch-student-submissions | < 100ms | 100-300ms | > 300ms |
| **WebSocket** |
| websocket-connect | < 1000ms | 1000-3000ms | > 3000ms |
| **頁面切換** |
| Tab 切換（cache hit） | < 50ms | 50-100ms | > 100ms |
| Tab 切換（cache miss） | < 300ms | 300-800ms | > 800ms |

---

## 常見問題診斷

### ❌ 問題：進入學生平台要等 2-3 秒

**診斷步驟**：
1. 查看 `student-layout-loader` 總時間
2. 查看以下子項目哪個最慢：
   - `student-layout-auth` - 認證慢？
   - `fetch-student-assignments` - 作業太多？
   - `fetch-student-courses` - 課程查詢慢？
   - `fetch-submission-history` - 歷史記錄太多？

**可能原因**：
- 資料庫查詢沒有索引
- 查詢包含太多 JOIN
- 資料量太大（需要分頁）
- 網路延遲（Docker 容器間通訊）

---

### ❌ 問題：每次切換 Tab 都要等 1 秒

**診斷步驟**：
1. 查看是否經常看到 `cache-miss`
2. 如果是，檢查 cache TTL 設定（目前是 30 秒）
3. 如果是 `cache-hit` 但還是慢，檢查組件渲染

**可能原因**：
- Cache TTL 太短（修改 `CACHE_TTL` 常數）
- 組件重新渲染太頻繁（檢查 useMemo/useCallback）
- 狀態更新導致大量重渲染

---

### ❌ 問題：WebSocket 連線要等很久

**診斷步驟**：
1. 查看 `websocket-connect` 時間
2. 如果 > 5000ms，可能是：
   - WebSocket 服務未啟動
   - 網路連線問題
   - 防火牆阻擋

**測試方法**：
```bash
# 檢查 WebSocket 服務
docker-compose -f docker-compose.dev.yaml logs web
```

---

## 收集性能報告

### 完整測試流程

1. **清空所有記錄**
```javascript
perfMonitor.clear()
```

2. **執行完整流程**
   - 登入
   - 切換到課程
   - 切換到作業
   - 切換到繳交記錄
   - 切換回儀表板

3. **生成報告**
```javascript
// 查看整體統計
perfMonitor.getStats()

// 查看詳細記錄
console.table(perfMonitor.getMetrics().map(m => ({
  name: m.name,
  duration: m.duration?.toFixed(2) + 'ms',
  metadata: JSON.stringify(m.metadata)
})))
```

4. **截圖或複製結果**
   - 右鍵 Console 內容 → Save as...
   - 或直接截圖分享

---

## 進階：找出重複查詢

如果懷疑有重複的資料庫查詢，可以：

```javascript
// 找出所有 fetch 操作
const fetches = perfMonitor.getMetrics().filter(m => m.name.startsWith('fetch-'))
console.table(fetches.map(f => ({
  name: f.name,
  duration: f.duration?.toFixed(2) + 'ms',
  time: new Date(f.startTime).toLocaleTimeString()
})))
```

如果看到同一個 fetch 在短時間內執行多次，就是重複查詢。

---

## 測試完成後

1. 關閉性能監控（如果影響使用）：
```javascript
perfMonitor.setEnabled(false)
```

2. 重新啟用：
```javascript
perfMonitor.setEnabled(true)
```

3. 性能監控只在開發環境啟用，不會影響正式環境。
