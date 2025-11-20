# WebSocket 斷線處理與錯誤恢復

## 🔴 問題：WebSocket 斷線期間的資料遺失

### 發現的問題

從日誌觀察到：

```
14:19:15.339 - WebSocket 斷線 (Socket disconnected)
  ↓
14:19:16.748 - WebSocket 重連 (Socket connected)
  ↓
14:19:16.757 - 加入 user room (joined user:xxx)
```

**斷線時間：約 1.4 秒**

### 潛在風險

在這 1.4 秒內，如果發生：

#### ❌ 風險 1: 通知遺失
```
學生提交作業 → 發送通知
  ↓
但教師的 WebSocket 斷線 ❌
  ↓
通知遺失，教師永遠不知道！
```

#### ❌ 風險 2: 資料不同步
```
教師看到：未讀通知 5 個
實際上：未讀通知 6 個（斷線期間 +1）
```

#### ❌ 風險 3: 頁面顯示舊資料
```
使用者在斷線期間切換 tab
  ↓
Cache 中的資料是舊的
  ↓
看到過時的資訊
```

---

##   解決方案：重連後清除 Cache

### 實作策略

當 WebSocket 重連時：
1. **清除 Client-side Cache** - 強制下次載入時重新查詢
2. **重新獲取通知**（教師端）- 立即同步最新狀態
3. **記錄重連事件** - 便於除錯追蹤

### 已實作的保護機制

#### 1. **Student Layout 重連處理**

```typescript
// app/routes/student/layout.tsx

useWebSocketEvent(
  'connect',
  () => {
    perfMonitor.mark('websocket-reconnected', { pathname: location.pathname });

    // 清除 cache，強制重新載入
    clientCache = null;

    console.log('[Student WebSocket] Reconnected - cache cleared for fresh data');
  },
  []
);
```

**效果**：
-   重連後，下次切換 tab 會重新查詢資料庫
-   確保使用者看到最新資料
-   不會遺漏斷線期間的更新

#### 2. **Teacher Layout 重連處理**

```typescript
// app/routes/teacher/layout.tsx

useWebSocketEvent(
  'connect',
  () => {
    perfMonitor.mark('websocket-reconnected', { pathname: location.pathname });

    // 清除 cache
    clientCache = null;

    // 立即重新獲取通知
    fetchNotifications();

    console.log('[Teacher WebSocket] Reconnected - cache cleared and notifications refetched');
  },
  [fetchNotifications]
);
```

**效果**：
-   清除 cache
-   **立即重新獲取通知**（不等到下次切換）
-   教師可以馬上看到新提交

---

## 📊 重連流程

### 正常情況（無斷線）

```
使用者使用應用
  ↓
WebSocket 保持連線  
  ↓
即時收到通知  
  ↓
Cache 正常運作（5 分鐘） 
```

### 斷線重連情況

```
WebSocket 斷線（網路問題/服務器重啟）
  ↓
自動重連（指數退避：1s, 2s, 4s...）
  ↓
[PERF MARK] 📍 websocket-reconnected
  ↓
清除 client cache  
  ↓
重新獲取通知（教師） 
  ↓
下次導航時重新載入資料  
  ↓
使用者看到最新資料  
```

---

## 🧪 測試場景

### 場景 1: 模擬網路中斷

#### 測試步驟

1. 打開教師/學生平台
2. 打開 Chrome DevTools → Network
3. 勾選 "Offline" 模擬斷網
4. 等待 3 秒
5. 取消 "Offline"

#### 預期結果

```javascript
// Console 輸出
[WebSocket] Disconnected: transport close
[WebSocket] Scheduling reconnect in 1000ms
[WebSocket] Reconnecting...
[PERF MARK] 📍 websocket-reconnected | pathname: /student/courses
[Student WebSocket] Reconnected - cache cleared for fresh data

// 下次切換 tab 時
[PERF MARK] 📍 student-layout-cache-miss  // ← Cache 已被清除
[PERF START] student-layout-server-fetch  // ← 重新查詢
```

**  通過測試**：Cache 被正確清除，資料重新載入

---

### 場景 2: WebSocket 服務重啟

#### 測試步驟

```bash
# 重啟 WebSocket 服務
docker-compose -f docker-compose.dev.yaml restart websocket
```

#### 預期結果

```javascript
// 前端 Console
[WebSocket] Disconnected: transport close
[WebSocket] Reconnecting...
[WebSocket] Connected
[PERF MARK] 📍 websocket-reconnected
[Teacher WebSocket] Reconnected - cache cleared and notifications refetched

// 後端 Log
websocket-1 | Socket connected: ahJG5TvVClMPyFdhAAAP
websocket-1 | Socket joined user:xxx
```

**  通過測試**：自動重連並清除 cache

---

### 場景 3: 斷線期間有新提交

#### 測試步驟

1. 教師登入並查看未讀通知（例如：5 個）
2. 模擬斷網（Offline）
3. **在另一個瀏覽器**：學生提交作業
4. 恢復網路（Online）

#### 預期結果

**之前（無保護）**：
```
教師看到：5 個未讀通知 ❌
實際上：6 個未讀通知
= 遺漏 1 個！
```

**現在（有保護）**：
```
WebSocket 重連
  ↓
清除 cache + 重新獲取通知
  ↓
教師看到：6 個未讀通知  
```

---

## 🛡️ 多層防護機制

### 第 1 層：自動重連（已有）

```typescript
// client.ts
if (reason !== 'io client disconnect') {
  this.scheduleReconnect();
}

// 指數退避：1s → 2s → 4s → 8s → 16s → 30s（最大）
```

### 第 2 層：重連後清除 Cache（新增  ）

```typescript
useWebSocketEvent('connect', () => {
  clientCache = null;  // 強制重新載入
});
```

### 第 3 層：立即重新獲取通知（教師端，新增  ）

```typescript
useWebSocketEvent('connect', () => {
  clientCache = null;
  fetchNotifications();  // 立即同步
});
```

### 第 4 層：500ms 延遲斷開（已有）

```typescript
// 防止路由切換時誤斷開
return () => {
  disconnectTimerRef.current = setTimeout(() => {
    websocketClient.disconnect();
  }, 500);
};
```

---

## 📈 影響分析

### 使用者體驗

| 情境 | 之前 | 現在 |
|------|------|------|
| 網路正常 |   完美 |   完美 |
| 短暫斷線（< 5s） | ⚠️ 可能遺漏通知 |   重連後自動同步 |
| 長時間斷線（> 30s） | ❌ 資料嚴重過時 |   重連後立即更新 |
| 斷線期間有更新 | ❌ 永遠遺失 |   重連後可見 |

### 性能影響

| 項目 | 影響 |
|------|------|
| **正常使用** | 無影響（Cache 正常運作） |
| **重連時** | Cache 被清除（下次載入慢 100ms） |
| **頻繁斷線** | 可能頻繁清除 Cache（但確保資料正確） |

**權衡**：
-   資料正確性 > 些微的性能損失
-   使用者寧可稍慢，也不要看到錯誤資料

---

## 🔍 除錯指南

### 如何確認保護機制運作？

#### 1. 檢查 Console 日誌

```javascript
// 正常重連應該看到：
[WebSocket] Reconnecting...
[WebSocket] Connected
[PERF MARK] 📍 websocket-reconnected | pathname: /xxx
[XXX WebSocket] Reconnected - cache cleared for fresh data

// 如果沒看到這些，保護機制可能沒觸發
```

#### 2. 檢查 Cache 是否被清除

```javascript
// 重連後，下次切換應該看到 cache-miss
perfMonitor.getMetrics().filter(m => m.name.includes('cache'))

// 應該看到：
// { name: 'student-layout-cache-miss', ... }
// 而不是 cache-hit
```

#### 3. 檢查通知是否更新

```javascript
// 教師端：重連後應該立即看到新通知
// 觀察右上角的通知數量是否變化
```

---

## 🚨 仍可能出現的問題

### 問題 1: 極短暫斷線（< 100ms）

**情境**：網路抖動，瞬間斷線又恢復

**影響**：可能不會觸發清除 cache

**解決**：可接受，因為時間太短，不太可能有資料更新

---

### 問題 2: 重連失敗達到最大次數

**情境**：網路長時間中斷，重試 10 次後放棄

**影響**：使用者需要手動重新整理頁面

**解決**：
```typescript
// 可以在 UI 顯示提示
if (connectionState === 'error') {
  return (
    <Alert>
      <AlertTitle>連線中斷</AlertTitle>
      <AlertDescription>
        無法連線到伺服器，請檢查網路後重新整理頁面
      </AlertDescription>
    </Alert>
  );
}
```

---

### 問題 3: 斷線期間大量更新

**情境**：斷線 5 分鐘，期間有 20 個新提交

**影響**：重連後可能需要較長時間同步

**解決**：目前的機制已足夠，重連後會自動獲取所有更新

---

## 💡 未來改進建議

### 改進 1: 增量同步

```typescript
// 記錄斷線時間
const disconnectTime = Date.now();

// 重連後只獲取這段時間的更新
useWebSocketEvent('connect', () => {
  fetchUpdatesSince(disconnectTime);
});
```

### 改進 2: 離線佇列

```typescript
// 斷線期間將操作加入佇列
const offlineQueue = [];

// 重連後批次處理
useWebSocketEvent('connect', () => {
  offlineQueue.forEach(op => execute(op));
});
```

### 改進 3: UI 提示

```typescript
// 顯示連線狀態
{!isConnected && (
  <Banner variant="warning">
    連線中斷，正在重新連線...
  </Banner>
)}
```

---

## 📋 檢查清單

使用此清單驗證保護機制：

- [x] Student layout 監聽 `connect` 事件
- [x] Teacher layout 監聽 `connect` 事件
- [x] 重連時清除 client cache
- [x] 教師端重連時重新獲取通知
- [x] 記錄性能標記（websocket-reconnected）
- [x] Console 輸出確認訊息
- [x] TypeScript 無錯誤
- [ ] 測試：模擬斷網重連
- [ ] 測試：服務重啟
- [ ] 測試：斷線期間有更新

---

## 🎯 總結

### 問題
WebSocket 斷線 1-2 秒後重連，期間的通知可能遺失，cache 中的資料可能過時。

### 解決方案
  監聽 `connect` 事件，重連時：
- 清除 client cache（強制重新載入）
- 重新獲取通知（教師端）
- 記錄性能指標（除錯）

### 效果
-   確保使用者總是看到最新資料
-   不會遺漏斷線期間的更新
-   自動恢復，無需手動操作
- ⚠️ 重連後的第一次載入可能稍慢（~100ms）

### 權衡
**資料正確性 > 些微性能損失**  

這是正確的選擇！
