# Gemini API Rate Limit 壓力測試指南

## 概述

這份文檔說明如何使用壓力測試腳本來測試 Gemini API 的 rate limit 行為，以及了解 AI SDK 如何處理錯誤和重試機制。

## 測試目標

1. **RPM (Requests Per Minute) 測試** - 測試每分鐘請求數限制
2. **TPM (Tokens Per Minute) 測試** - 測試每分鐘 token 數限制
3. **並發請求測試** - 測試並發請求的處理能力
4. **錯誤恢復測試** - 測試 AI SDK 的重試機制

## Gemini API Rate Limits (Free Tier)

根據 [官方文檔](https://ai.google.dev/gemini-api/docs/rate-limits)，gemini-2.5-flash 的免費層級限制：

| 指標 | 限制 | 說明 |
|------|------|------|
| RPM | 10 | 每分鐘最多 10 個請求 |
| TPM | 250,000 | 每分鐘最多 250,000 tokens |
| RPD | 250 | 每天最多 250 個請求 |

### 付費層級對比

| 層級 | 資格 | RPM | TPM |
|------|------|-----|-----|
| Free | 符合資格的國家 | 10 | 250K |
| Tier 1 | 綁定計費帳戶 | 1,000 | 1M |
| Tier 2 | 累計花費 > $250 | 2,000 | 3M |
| Tier 3 | 累計花費 > $1,000 | 10,000 | 8M |

## 快速開始

### 前置準備

1. 確保已設定環境變數：
```bash
GEMINI_API_KEY=your_key_1
GEMINI_API_KEY2=your_key_2  # 可選
GEMINI_API_KEY3=your_key_3  # 可選
```

2. 安裝依賴：
```bash
npm install
```

### 執行測試

```bash
npm run test:rate-limits
```

## 測試項目詳解

### Test 1: RPM Limit Test (請求速率測試)

**目的：** 測試每分鐘請求數限制

**方法：**
- 快速發送 15 個請求（無延遲）
- 觀察何時觸發 rate limit 錯誤

**預期結果：**
- Free Tier: 約 10 個請求成功，之後開始失敗
- 失敗請求會收到 `429` 或 `rate_limit` 錯誤

**範例輸出：**
```
🔑 Testing Key 1:
  ✓ Success: 10/15
  ✗ Failed: 5/15
  ⏱️  Total time: 2345ms
  🚫 Rate limit errors: 5
  ⚠️  Rate limit hit after ~10 requests
```

### Test 2: Concurrent Request Test (並發請求測試)

**目的：** 測試並發處理能力和 rate limit 在並發場景的行為

**方法：**
- 設定並發數（例如 5）
- 分批發送總共 20 個請求
- 批次之間有 1 秒延遲

**預期結果：**
- 每分鐘實際成功的請求不會超過 RPM 限制
- 可以觀察到 throughput（吞吐量）

**範例輸出：**
```
🔑 Testing Key 1:
  Progress: 20/20 requests completed

  ✓ Success: 18/20
  ✗ Failed: 2/20
  ⏱️  Total time: 25.34s
  📈 Throughput: 42.65 requests/min
```

### Test 3: Token Limit Test (Token 配額測試)

**目的：** 測試每分鐘 token 數限制

**方法：**
- 發送包含大量文字的請求（~1000 tokens/request）
- 追蹤累計 token 使用量

**預期結果：**
- Free Tier: 累計使用量不應超過 250,000 tokens/min
- 超過時會收到配額錯誤

**範例輸出：**
```
🔑 Testing Key 1:
  Request 1/5...
    ✓ Tokens: 1245 (in: 987, out: 258)
  Request 2/5...
    ✓ Tokens: 1198 (in: 954, out: 244)
  ...

  ✓ Success: 5/5
  📊 Total tokens used: 6,234
  ⏱️  Total time: 15.23s
  📈 Token throughput: 24,534 tokens/min
```

### Test 4: Error Recovery Test (錯誤恢復測試)

**目的：** 測試 AI SDK 的內建重試機制

**方法：**
1. 先快速發送 15 個請求觸發 rate limit
2. 立即發送一個啟用 `maxRetries=2` 的請求
3. 觀察 AI SDK 是否會自動重試

**AI SDK 重試行為：**
- AI SDK 使用**指數退避（exponential backoff）**
- 預設重試策略：2ms, 4ms, 8ms, 16ms...
- 會自動處理暫時性錯誤（429, 503）

**範例輸出：**
```
Step 2: Testing retry behavior immediately after rate limit...

  ✗ Request failed even with retries
  ⏱️  Duration: 1234ms
  🚫 Error type: rate_limit
  💡 Retries exhausted, rate limit still active
```

## AI SDK 錯誤處理機制

### 錯誤分類

我們的系統將錯誤分為 4 類：

```typescript
type ErrorType = 'rate_limit' | 'overloaded' | 'unavailable' | 'other';
```

| 錯誤類型 | HTTP 狀態碼 | 說明 | 處理策略 |
|---------|------------|------|---------|
| `rate_limit` | 429 | 超過 API 配額限制 | 等待後重試，切換 API key |
| `overloaded` | 503 | 服務過載 | 指數退避重試，切換 provider |
| `unavailable` | 502/504 | 服務暫時不可用 | 短暫重試，啟用 fallback |
| `other` | 4xx/5xx | 其他錯誤 | 記錄並通知 |

### AI SDK 內建功能

AI SDK 提供以下錯誤處理功能：

1. **自動重試（maxRetries）**
```typescript
await generateObject({
  model: geminiProvider('gemini-2.5-flash'),
  schema: GradingResultSchema,
  prompt,
  maxRetries: 2, // 失敗後最多重試 2 次
});
```

2. **指數退避（Exponential Backoff）**
- 自動增加重試間隔時間
- 避免重試風暴（retry storm）

3. **錯誤物件（NoObjectGeneratedError）**
```typescript
if (NoObjectGeneratedError.isInstance(error)) {
  console.log('Raw output:', error.text);
  console.log('Validation error:', error.cause);
}
```

## 測試報告解讀

### 整體統計

```
📊 Overall Statistics:
  Total Requests: 52
  ✓ Successful: 43 (82.69%)
  ✗ Failed: 9 (17.31%)
```

### Per-Key 統計

每個 API key 的詳細表現：

```
Key 1:
  Total: 52
  Success: 43 (82.69%)
  Failed: 9
  Avg Duration: 1234ms
  Total Tokens: 45,678
  Error Breakdown:
    rate_limit: 7
    overloaded: 2
```

### 錯誤分析

```
🚫 Error Analysis:
  rate_limit: 7 (77.78% of failures)
  overloaded: 2 (22.22% of failures)
```

### 建議

根據測試結果，系統會自動生成建議：

```
💡 Recommendations:
  ⚠️  Rate limit errors detected:
     - Consider implementing request queuing
     - Use KeyHealthTracker for distributed key rotation
     - Add exponential backoff between retries
     - Monitor RPM/TPM usage closely
```

## 實際應用建議

### 1. 使用 KeyHealthTracker

我們的系統已實作 `KeyHealthTracker` 來管理多個 API keys：

```typescript
// app/services/ai-sdk-provider.server.ts
const healthTracker = getKeyHealthTracker();
const selectedKeyId = await healthTracker.selectBestKey(['1', '2', '3']);

// 記錄成功
await healthTracker.recordSuccess(keyId, responseTimeMs);

// 記錄失敗
await healthTracker.recordFailure(keyId, errorType, errorMessage);
```

**優點：**
- 自動切換到健康的 key
- 分散請求負載
- 避免持續使用已達限制的 key

### 2. 實作請求佇列

使用 BullMQ 來控制請求速率：

```typescript
// 設定 rate limiter
const queue = new Queue('grading', {
  limiter: {
    max: 10,      // 最多 10 個請求
    duration: 60000, // 每 60 秒
  },
});
```

### 3. Circuit Breaker Pattern

當檢測到持續失敗時，暫時停止請求：

```typescript
if (consecutiveFailures > 5) {
  // 切換到 OpenAI fallback
  return await gradeWithOpenAI(params);
}
```

### 4. 監控和告警

定期監控 API 使用狀況：

```typescript
logger.info('API usage', {
  keyId,
  successRate: successCount / totalCount,
  avgResponseTime,
  rateLimitHits,
});
```

## 常見問題

### Q: 為什麼有些請求在 rate limit 內還是失敗？

A: 除了 RPM/TPM 限制外，還有其他因素：
- 服務端暫時過載（503 errors）
- 網路延遲或 timeout
- API key 可能有其他限制（RPD）

### Q: AI SDK 的 maxRetries 設多少比較好？

A: 建議設定：
- **生產環境：** `maxRetries: 2`
- **開發/測試：** `maxRetries: 0`（更快看到錯誤）
- **背景工作：** `maxRetries: 3`（可容忍較長等待）

### Q: 如何避免觸發 rate limit？

A: 最佳實踐：
1. 使用多個 API keys 並輪流使用
2. 實作 request queuing
3. 監控實際使用量
4. 考慮升級到付費層級

### Q: Free Tier 夠用嗎？

A: 取決於使用場景：
- **小型專案：** 10 RPM 通常足夠
- **中型應用：** 需要多個 keys 或 Tier 1
- **生產環境：** 建議至少 Tier 2

## 進階測試

### 測試 RPD (每日請求數) 限制

Free Tier 有 250 requests/day 的限制。若要測試：

```bash
# 修改腳本中的 totalRequests 參數
npm run test:rate-limits
```

注意：這會消耗大量配額，謹慎使用！

### 測試多 Worker 場景

模擬多個 BullMQ workers 同時使用：

```typescript
// 啟動多個測試實例
for (let i = 0; i < 3; i++) {
  spawn('npm', ['run', 'test:rate-limits']);
}
```

### 壓力測試建議

逐步增加負載：

1. **低負載：** 5 requests/min（測試基本功能）
2. **中負載：** 10 requests/min（接近 Free Tier 限制）
3. **高負載：** 20 requests/min（測試錯誤處理）

## 參考資料

- [Gemini API Rate Limits 官方文檔](https://ai.google.dev/gemini-api/docs/rate-limits)
- [AI SDK 文檔](https://sdk.vercel.ai/docs)
- [指數退避最佳實踐](https://cloud.google.com/iot/docs/how-tos/exponential-backoff)

## 總結

透過這個壓力測試腳本，你可以：

1. ✅ 了解 Gemini API 的實際 rate limit 行為
2. ✅ 驗證 AI SDK 的錯誤處理和重試機制
3. ✅ 評估當前配置是否能滿足生產需求
4. ✅ 獲得具體的優化建議

建議定期執行測試，特別是在以下情況：
- 部署新功能前
- 預期流量增加時
- 升級 API tier 後
- 修改錯誤處理邏輯後
