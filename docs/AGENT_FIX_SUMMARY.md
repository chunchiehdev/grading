# Agent 評分修復總結

## 🐛 問題根因

Agent 評分系統無法正常工作的**兩個根本原因**：

### 問題 1：工具定義使用了錯誤的屬性名稱

**錯誤的實作（之前）：**

```typescript
export const analyzeRubricTool = tool({
  description: '...',
  parameters: AnalyzeRubricInputSchema,  // ❌ 錯誤！應該是 inputSchema
  execute: async ({ rubricName, criteria }) => { ... }
});
```

**正確的實作（現在）：**

```typescript
export const analyzeRubricTool = tool({
  description: '...',
  inputSchema: AnalyzeRubricInputSchema,  //   正確！
  execute: async ({ rubricName, criteria }) => { ... }
});
```

### 問題 2：多步驟調用使用了錯誤的參數

**錯誤的實作（之前）：**

```typescript
const result = await generateText({
  model,
  tools: agentTools,
  maxSteps: 15,  // ❌ 錯誤！AI SDK 6 Beta 不支援 maxSteps
  // ...
});
```

**AI SDK 6 Beta 預設行為：** `stopWhen: stepCountIs(1)` - 只執行 1 步就停止！

**正確的實作（現在）：**

```typescript
import { generateText, stepCountIs } from 'ai';

const result = await generateText({
  model,
  tools: agentTools,
  stopWhen: stepCountIs(15),  //   正確！允許最多 15 步工具調用
  // ...
});
```

## 📚 AI SDK 6 Beta 文檔驗證

根據官方文檔 ([v6.ai-sdk.dev/docs/reference/ai-sdk-core/tool](https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/tool))：

> The `tool()` function requires:
> - **`inputSchema`**: The schema of the input that the tool expects
> - **`execute`**: An async function that receives the validated input
> - **`description`**: Information about the tool's purpose

我們之前使用的是 `parameters`，但 AI SDK 6 Beta 要求使用 `inputSchema`。

## 🔧 修復內容

修復了 `app/services/agent-tools.server.ts` 中的所有 6 個工具：

1.   `analyze_rubric` - 分析評分標準
2.   `parse_content` - 解析作業內容
3.   `search_reference` - 搜尋參考資料
4.   `check_similarity` - 檢查相似度
5.   `calculate_confidence` - 計算信心度
6.   `generate_feedback` - 生成最終反饋

所有工具都已從 `parameters` 改為 `inputSchema`，並移除了不必要的 `@ts-expect-error` 註解。

## 🧪 如何測試

### 1. 確認服務已重啟

```bash
# 檢查容器狀態
docker compose -f docker-compose.dev.yaml ps

# 應該看到 app 容器正在運行
# 如果沒有，執行：
docker compose -f docker-compose.dev.yaml restart app
```

### 2. 檢查環境變數

```bash
# 確認 Agent 評分已啟用
cat .env | grep USE_AGENT_GRADING
# 應該顯示: USE_AGENT_GRADING=true
```

### 3. 提交測試作業並評分

1. **訪問系統**
   - 開啟 `http://localhost:3000`
   - 以老師身份登入

2. **準備作業**
   - 選擇一個課程
   - 進入作業區域
   - 確認有設定 Rubric（評分標準）

3. **提交作業**（學生視角）
   - 切換到學生帳號
   - 上傳一份作業
   - 點擊「提交」

4. **啟動評分**（老師視角）
   - 切回老師帳號
   - 進入作業管理
   - 點擊「開始評分」

5. **觀察日誌**
   ```bash
   docker compose -f docker-compose.dev.yaml logs app -f
   ```

### 4. 預期的成功日誌

如果 Agent 正常工作，你應該看到：

```
🤖 Using Agent grading system
[Agent Executor] Starting Agent grading
[Agent Step] stepNumber: 1, toolName: analyze_rubric        工具調用！
[Agent Step] stepNumber: 2, toolName: parse_content         工具調用！
[Agent Step] stepNumber: 3, toolName: search_reference      可選
[Agent Step] stepNumber: 4, toolName: check_similarity      可選
[Agent Step] stepNumber: 5, toolName: calculate_confidence   工具調用！
[Agent Step] stepNumber: 6, toolName: generate_feedback     最終工具！
  Agent grading succeeded
```

**關鍵指標：**
-   總步驟數應該 > 5
-   應該看到多個 `[Agent Step]` 日誌
-   至少要有 `analyze_rubric`, `parse_content`, `calculate_confidence`, `generate_feedback` 這 4 個工具被調用
-   最後應該顯示 `Agent grading succeeded`

### 5. 檢查評分結果

評分完成後，訪問評分詳情頁面，應該能看到：

- 🧠 **「AI Agent 執行過程」卡片**
- 📊 **步驟時間軸**，顯示每個工具的調用過程
- 🎯 **信心度徽章**（極高/高/中/低）
- 🔧 **可展開的工具調用詳情**（輸入/輸出/推理）
- 📈 **統計摘要**（總步驟、工具調用、執行時間）

### 6. 檢查審核佇列

訪問 `/teacher/agent-review` 頁面：

- 📋 應該能看到待審核/已審核/全部分頁
- 📊 統計卡片顯示待審核數量
- 📝 評分列表包含完整 Agent 執行記錄
-   批准/重新評分按鈕可用

## 🔍 故障排除

### 問題 1：仍然只有 1 個步驟

**症狀：**
```
[Agent Step] stepNumber: 1
[Agent Executor] No generate_feedback tool call found
```

**檢查：**
```bash
# 1. 確認文件已更新
grep "inputSchema" app/services/agent-tools.server.ts | wc -l
# 應該顯示 6（6 個工具）

# 2. 確認容器已重啟並載入新代碼
docker compose -f docker-compose.dev.yaml logs app --tail=10 | grep "vite"
# 應該看到類似 "[vite] page reload app/services/agent-tools.server.ts"
```

### 問題 2：工具未被調用

**可能原因：**
1. API key 已達限制（檢查 `All Gemini API keys are throttled` 錯誤）
2. Rubric 格式不正確（缺少 criteria）
3. Prompt 太長導致模型無法處理

**解決：**
```bash
# 等待 1 分鐘讓 API 限制重置
sleep 60

# 或檢查 Rubric 格式
docker compose -f docker-compose.dev.yaml exec postgres psql -U postgres -d grading_db
SELECT rubric_name, criteria FROM rubrics LIMIT 1;
```

### 問題 3：TypeScript 錯誤

**症狀：**
```
Unused '@ts-expect-error' directive
```

**解決：**
這些已經在修復中移除了。如果仍然看到，請確認：
```bash
# 檢查是否還有 @ts-expect-error
grep "@ts-expect-error" app/services/agent-tools.server.ts
# 應該沒有輸出
```

## 📊 效能預期

修復後，Agent 評分應該：

- **執行時間**：15-30 秒（比傳統評分慢 3-6 倍）
- **工具調用**：4-8 次（取決於是否有參考資料和相似度檢查）
- **步驟數**：6-12 步（包含 AI 推理步驟）
- **Token 使用**：5000-15000 tokens（約 $0.003/次）
- **信心度**：通常在 0.5-0.9 之間

## 🎯 驗證清單

在確認 Agent 評分正常工作前，請檢查以下項目：

- [ ] `.env` 中 `USE_AGENT_GRADING=true`
- [ ] Docker 容器已完全重啟（`docker compose restart app`）
- [ ] 日誌中顯示 "Using Agent grading system"
- [ ] 日誌中出現多個 `[Agent Step]` 記錄（> 5 個）
- [ ] 至少看到 4 個核心工具被調用：
  - [ ] `analyze_rubric`
  - [ ] `parse_content`
  - [ ] `calculate_confidence`
  - [ ] `generate_feedback`
- [ ] 最終顯示 `Agent grading succeeded`
- [ ] 評分結果頁面有「AI Agent 執行過程」卡片
- [ ] 審核佇列頁面 `/teacher/agent-review` 可訪問

## 📚 相關文檔

- [AI SDK 6 Beta 官方文檔](https://v6.ai-sdk.dev)
- [Tool API 參考](https://v6.ai-sdk.dev/docs/reference/ai-sdk-core/tool)
- [generateText API 參考](https://v6.ai-sdk.dev/docs/ai-sdk-core/generating-text)
- [Agent 使用指南](./HOW_TO_USE_AGENT_GRADING.md)
- [快速開始](./docs/AGENT_QUICK_START.md)

## 🎉 下一步

如果測試成功，你可以：

1. **調整信心度閾值**（`.env` 中的 `AGENT_CONFIDENCE_THRESHOLD`）
2. **優化 Rubric 描述**，使其更具體明確
3. **添加參考資料**，提升評分準確度
4. **監控審核佇列**，了解需要人工介入的比例
5. **收集反饋**，持續改進 Agent 系統

---

**最後更新：** 2025-11-03

**修復作者：** Claude Code

**問題嚴重性：** Critical（核心功能無法使用）

**修復狀態：**   已修復，等待測試驗證
