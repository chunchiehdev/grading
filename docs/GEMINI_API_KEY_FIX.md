# Gemini API Key Configuration Fix

## 問題

AI SDK v5 預設尋找的環境變數是 `GOOGLE_GENERATIVE_AI_API_KEY`，但專案使用的是 `GEMINI_API_KEY`。

錯誤訊息：
```
LoadAPIKeyError [AI_LoadAPIKeyError]: Google Generative AI API key is missing.
Pass it using the 'apiKey' parameter or the GOOGLE_GENERATIVE_AI_API_KEY environment variable.
```

## 解決方案

在 API route 中使用 `createGoogleGenerativeAI()` 明確傳入 API key，而不是依賴預設的環境變數名稱。

### 修改檔案

**File**: `app/routes/api.ai.rubric-chat.ts`

```typescript
// 導入 createGoogleGenerativeAI 而非 google
import { createGoogleGenerativeAI } from '@ai-sdk/google';

// 在 action 函數中
export async function action({ request }: Route.ActionArgs) {
  // ... 驗證、解析 body 等

  // 使用專案現有的環境變數
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.error('GEMINI_API_KEY not configured');
    return Response.json({ error: 'AI service not configured' }, { status: 500 });
  }

  // 明確傳入 API key 創建 provider
  const googleProvider = createGoogleGenerativeAI({
    apiKey: apiKey,
  });

  // 使用 provider 創建 model
  const result = streamText({
    model: googleProvider('gemini-2.0-flash-exp'),
    // ... 其他參數
  });
}
```

## AI SDK v5 Provider 配置

### 選項 1: 使用環境變數（預設）

```typescript
import { google } from '@ai-sdk/google';

// 需要設定環境變數: GOOGLE_GENERATIVE_AI_API_KEY
const result = streamText({
  model: google('gemini-2.0-flash-exp'),
});
```

### 選項 2: 明確傳入 API key（我們使用的方法）

```typescript
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const googleProvider = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY, // 使用自訂環境變數
});

const result = streamText({
  model: googleProvider('gemini-2.0-flash-exp'),
});
```

## 為什麼不改環境變數名稱？

專案中有多個 Gemini API keys：
- `GEMINI_API_KEY`
- `GEMINI_API_KEY2`
- `GEMINI_API_KEY3`

這可能是用於：
1. Key rotation（輪替使用避免 rate limit）
2. Fallback mechanism（失敗時切換 key）
3. 不同用途的分離（例如 grading vs chat）

因此保持現有的環境變數命名方式，在程式碼中明確傳入 API key 是更好的選擇。

## 其他可用的 Provider 設定

```typescript
const googleProvider = createGoogleGenerativeAI({
  apiKey: string,              // API key
  baseURL?: string,            // 自訂 API endpoint（例如 proxy）
  headers?: Record<string, string>, // 自訂 headers
  fetch?: FetchFunction,       // 自訂 fetch 實作
  generateId?: () => string,   // 自訂 ID 生成器
});
```

## 測試

現在 API route 應該能正常工作：

```bash
# 確保容器已重建並安裝了新套件
docker compose -f docker-compose.dev.yaml exec app npm list ai @ai-sdk/google @ai-sdk/react

# 檢查環境變數
docker compose -f docker-compose.dev.yaml exec app printenv | grep GEMINI
```

應該會看到 `GEMINI_API_KEY` 已設定。

## Date
2025-11-02
