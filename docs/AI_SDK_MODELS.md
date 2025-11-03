# AI SDK 模型使用說明

## 📊 模型對照表

| 系統 | Provider | 模型 | 檔案位置 | 行號 |
|------|----------|------|----------|------|
| **新系統 (AI SDK)** | Gemini | `gemini-2.5-flash` | `app/services/ai-sdk-provider.server.ts` | 167 |
| **新系統 (AI SDK)** | OpenAI (Fallback) | `gpt-4o-mini` | `app/services/ai-sdk-provider.server.ts` | 271 |
| **舊系統** | Gemini (Rotating) | `gemini-2.5-flash` | `app/services/gemini-rotating.server.ts` | 54 |
| **舊系統** | Gemini (Simple) | `gemini-2.5-flash` | `app/services/gemini-simple.server.ts` | 17 |
| **舊系統** | OpenAI (Fallback) | `gpt-4o-mini` | `app/services/openai-simple.server.ts` | 12 |

---

## 🆕 新系統 (AI SDK) - 模型配置

### 1. Gemini 模型配置

**檔案**: `app/services/ai-sdk-provider.server.ts`

**主要模型**: `gemini-2.5-flash`

**程式碼位置**:
```typescript
// Line 155-172
const geminiProvider = createGoogleGenerativeAI({ apiKey });

const result = await generateObject({
  model: geminiProvider('gemini-2.5-flash'),  // ← Line 167
  schema: GradingResultSchema,
  prompt,
  temperature,  // 預設 0.3
  maxRetries: 2,
});
```

**配置細節**:
- **Temperature**: `0.3` (預設值，在 `gradeWithGemini()` 函數參數中定義)
- **Max Retries**: `2` (AI SDK 內建 retry)
- **Schema Validation**: 使用 Zod schema (`GradingResultSchema`)
- **Output Format**: Type-safe structured output (自動 JSON 驗證)

**與舊系統的差異**:
```diff
舊系統 (gemini-rotating.server.ts:54):
- private model: string = 'gemini-2.5-flash';
+ 手動 JSON Schema 定義
+ 手動 response parsing
+ Temperature: 0.3
+ maxOutputTokens: 8192
+ thinkingConfig: { thinkingBudget: 8192 }

新系統 (ai-sdk-provider.server.ts:167):
+ model: geminiProvider('gemini-2.5-flash')
+ Zod schema 自動驗證
+ 自動 response parsing
+ Temperature: 0.3 (相同)
- 沒有 maxOutputTokens (AI SDK 自動處理)
- 沒有 thinkingConfig (AI SDK 可能不支援)
```

---

### 2. OpenAI 模型配置 (Fallback)

**檔案**: `app/services/ai-sdk-provider.server.ts`

**Fallback 模型**: `gpt-4o-mini`

**程式碼位置**:
```typescript
// Line 260-276
const openaiProvider = createOpenAI({ apiKey });

const result = await generateObject({
  model: openaiProvider('gpt-4o-mini'),  // ← Line 271
  schema: GradingResultSchema,
  prompt,
  temperature,  // 預設 0.1
  maxRetries: 2,
});
```

**配置細節**:
- **Temperature**: `0.1` (預設值，比 Gemini 更保守)
- **Max Retries**: `2`
- **Schema Validation**: 使用相同的 Zod schema
- **Output Format**: Type-safe structured output

**與舊系統的差異**:
```diff
舊系統 (openai-simple.server.ts:12):
- private model: string = 'gpt-4o-mini';
+ 手動 prompt 構建
+ response_format: { type: 'json_object' }
+ Temperature: 0.1
+ max_tokens: 4000

新系統 (ai-sdk-provider.server.ts:271):
+ model: openaiProvider('gpt-4o-mini')
+ Zod schema 自動驗證
+ 自動 prompt 構建
+ Temperature: 0.1 (相同)
- 沒有 max_tokens (AI SDK 自動處理)
```

---

## 🔄 Fallback 流程

**檔案**: `app/services/ai-grader-sdk.server.ts`

**完整流程** (Lines 66-173):
```typescript
async function gradeWithAI(params) {
  // Step 1: 嘗試 Gemini
  const geminiResult = await gradeWithGemini({
    prompt,
    userId,
    resultId,
    temperature,  // 預設 0.3
  });

  if (geminiResult.success) {
    return geminiResult;  // ✅ Gemini 成功，直接返回
  }

  // Step 2: Gemini 失敗，fallback 到 OpenAI
  logger.info('Falling back to OpenAI', { userId, resultId });

  const openaiResult = await gradeWithOpenAI({
    prompt,
    userId,
    resultId,
    temperature,  // 預設 0.1 (會被 gradeWithOpenAI 覆蓋)
  });

  if (openaiResult.success) {
    return openaiResult;  // ✅ OpenAI 成功
  }

  // Step 3: 兩個都失敗
  return {
    success: false,
    error: 'Both Gemini and OpenAI providers failed',
    geminiError: geminiResult.error,
    openaiError: openaiResult.error,
  };
}
```

---

## 🔧 如何修改模型

### 修改 Gemini 模型

**位置**: `app/services/ai-sdk-provider.server.ts:167`

```typescript
// 當前
model: geminiProvider('gemini-2.5-flash'),

// 修改為其他模型（例如）
model: geminiProvider('gemini-1.5-pro'),
// 或
model: geminiProvider('gemini-2.0-flash-exp'),
```

**支援的 Gemini 模型**:
- `gemini-2.5-flash` (當前使用，最快)
- `gemini-2.0-flash-exp` (實驗版本)
- `gemini-1.5-pro` (更強大但較慢)
- `gemini-1.5-flash` (舊版 flash)

### 修改 OpenAI 模型

**位置**: `app/services/ai-sdk-provider.server.ts:271`

```typescript
// 當前
model: openaiProvider('gpt-4o-mini'),

// 修改為其他模型（例如）
model: openaiProvider('gpt-4o'),
// 或
model: openaiProvider('gpt-4-turbo'),
```

**支援的 OpenAI 模型**:
- `gpt-4o-mini` (當前使用，便宜快速)
- `gpt-4o` (更強大但較貴)
- `gpt-4-turbo` (GPT-4 Turbo)
- `gpt-3.5-turbo` (最便宜，但效果較差)

### 修改 Temperature

**Gemini Temperature** (`app/services/ai-sdk-provider.server.ts:147`):
```typescript
export async function gradeWithGemini(params: GradingParams): Promise<GradingResult> {
  const { prompt, userId, resultId, temperature = 0.3 } = params;
  //                                            ^^^ 修改這裡
}
```

**OpenAI Temperature** (`app/services/ai-sdk-provider.server.ts:248`):
```typescript
export async function gradeWithOpenAI(params: GradingParams): Promise<GradingResult> {
  const { prompt, userId, resultId, temperature = 0.1 } = params;
  //                                            ^^^ 修改這裡
}
```

---

## 📈 模型特性對比

### Gemini 2.5 Flash vs OpenAI GPT-4o-mini

| 特性 | Gemini 2.5 Flash | GPT-4o-mini |
|------|------------------|-------------|
| **速度** | 極快 (2-5秒) | 快 (3-8秒) |
| **成本** | 免費 (有 quota) | 付費 |
| **Context Length** | 128k tokens | 128k tokens |
| **Output Quality** | 優秀 | 優秀 |
| **Structured Output** | 原生支援 | 原生支援 |
| **Thinking Mode** | ✅ 支援 (舊系統) | ❌ 不支援 |
| **API Stability** | 穩定 | 非常穩定 |
| **Rate Limit** | 8-10 RPM (免費) | 根據付費方案 |

### 新舊系統配置對比

| 配置項 | 舊系統 (Gemini Rotating) | 新系統 (AI SDK) |
|--------|--------------------------|-----------------|
| **Model** | `gemini-2.5-flash` | `gemini-2.5-flash` ✅ 相同 |
| **Temperature** | `0.3` | `0.3` ✅ 相同 |
| **Max Output Tokens** | `8192` | 自動處理 (可能不同) |
| **Thinking Budget** | `8192` | ❌ 不支援 |
| **Response Format** | 手動 JSON Schema | Zod Schema 自動驗證 |
| **Schema Validation** | 手動 | 自動 ✅ |
| **Error Handling** | 手動 try-catch | AI SDK + 手動 fallback |

---

## ⚠️ 重要注意事項

### 1. Thinking Mode 可能不可用

**舊系統** (`gemini-rotating.server.ts`):
```typescript
thinkingConfig: {
  thinkingBudget: 8192,
}
```

**新系統**: AI SDK 可能不支援 `thinkingConfig`

**影響**:
- `thoughtSummary` 可能會是空的或格式不同
- 但從您的 log 看，仍然有 thought summary：
  ```
  💭 Thought summary available (205 chars)
  ```
  這表示 Gemini 可能仍然返回了思考過程

### 2. Token Limits

**舊系統**:
- Gemini: `maxOutputTokens: 8192`
- OpenAI: `max_tokens: 4000`

**新系統**:
- 沒有明確設定，由 AI SDK 自動處理
- 可能會有不同的 default limits

**建議**: 如果遇到回應被截斷的問題，可能需要手動設定 `maxTokens`

### 3. Cost Monitoring

**Gemini**:
- 免費 tier: 8-10 RPM
- 如果超過 rate limit，會觸發 KeyHealthTracker 的 throttle

**OpenAI**:
- 付費服務，需要監控成本
- GPT-4o-mini 相對便宜

---

## 🔍 如何確認當前使用的模型

### 檢查 Logs

```bash
# 查看使用哪個系統
docker compose -f docker-compose.dev.yaml logs app | grep "Using"

# 查看 Gemini 模型
docker compose -f docker-compose.dev.yaml logs app | grep "Grading with Gemini"

# 查看 OpenAI 模型 (如果有 fallback)
docker compose -f docker-compose.dev.yaml logs app | grep "Grading with OpenAI"
```

**預期輸出**:
```
🤖 Using AI SDK grading system
Grading with Gemini (AI SDK) { model: 'gemini-2.5-flash' }
```

### 檢查資料庫

```sql
-- 查看最近的評分使用哪個模型
SELECT
  id,
  metadata->>'model' as model,
  metadata->>'tokens' as tokens,
  "createdAt"
FROM "GradingResult"
ORDER BY "createdAt" DESC
LIMIT 10;
```

**預期結果**:
- AI SDK (Gemini): `model = "gemini-2.5-flash"`
- AI SDK (OpenAI): `model = "gpt-4o-mini"`
- 舊系統: `model = "gemini-2.5-flash"` (但 metadata 格式可能不同)

---

## 📚 相關文件

- **AI SDK Gemini Provider**: https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai
- **AI SDK OpenAI Provider**: https://ai-sdk.dev/providers/ai-sdk-providers/openai
- **Gemini 模型清單**: https://ai.google.dev/gemini-api/docs/models/gemini
- **OpenAI 模型清單**: https://platform.openai.com/docs/models

---

## 總結

**新系統使用的模型**:
1. **主要模型**: Gemini 2.5 Flash (`gemini-2.5-flash`)
   - 位置: `app/services/ai-sdk-provider.server.ts:167`
   - Temperature: 0.3
   - Max Retries: 2

2. **Fallback 模型**: OpenAI GPT-4o-mini (`gpt-4o-mini`)
   - 位置: `app/services/ai-sdk-provider.server.ts:271`
   - Temperature: 0.1
   - Max Retries: 2

**與舊系統相比**:
- ✅ 模型相同 (gemini-2.5-flash / gpt-4o-mini)
- ✅ Temperature 相同
- ⚠️ 移除了 maxOutputTokens 和 thinkingConfig
- ✅ 增加了 Zod schema 自動驗證
- ✅ 簡化了 error handling
