# 🎯 Agent Steps UI 實作指南

## 📚 概述

本指南解釋如何在 UI 中顯示 AI Agent 的多步驟執行過程，讓使用者能清楚看到：
- 當前執行到第幾步
- 每一步做了什麼
- 使用了哪些工具
- 工具的輸入和輸出是什麼

---

## 🔍 AI SDK 如何提供步驟資訊

### 1. **UIMessage 結構**

AI SDK 的 `toUIMessageStreamResponse()` 會自動將步驟資訊編碼在 `UIMessage.parts` 中：

```typescript
interface UIMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  parts: Array<UIMessagePart>;  // ← 關鍵！
}

type UIMessagePart =
  | TextUIPart           // 文字內容
  | ToolUIPart           // 工具調用
  | StepStartUIPart      // 步驟開始標記 ✨
  | ReasoningUIPart      // 推理過程
  | FileUIPart           // 檔案
  | ...
```

### 2. **Step Start 標記**

當 Agent 開始新的步驟時，會發送 `step-start` part：

```typescript
type StepStartUIPart = {
  type: 'step-start';  // ← 這就是步驟邊界！
}
```

### 3. **Tool Invocation 狀態**

工具調用包含詳細的執行狀態：

```typescript
type UIToolInvocation = {
  toolCallId: string;
  toolName: string;

  // 狀態可以是：
  state:
    | 'input-streaming'      // ⏳ 輸入正在串流
    | 'input-available'      // ✅ 輸入完成
    | 'output-available'     // ✅ 輸出可用
    | 'error';               // ❌ 執行錯誤

  input: any;     // 工具的輸入參數
  output?: any;   // 工具的輸出結果
  errorText?: string;  // 錯誤訊息
}
```

---

## 📊 訊息流程示例

### 範例：使用者問 "搜尋 AI 新聞並總結"

#### **Step 1 訊息結構**：

```typescript
{
  id: "msg_123",
  role: "assistant",
  parts: [
    // 第一步開始
    { type: "step-start" },

    // AI 的思考文字
    {
      type: "text",
      text: "我需要先搜尋 AI 相關的新聞。",
      state: "done"
    },

    // 工具調用
    {
      type: "tool-web_search",  // 或 "dynamic-tool"
      toolName: "web_search",
      toolCallId: "call_abc",
      state: "input-available",
      input: { query: "AI news", maxResults: 5 }
    },

    // 工具結果
    {
      type: "tool-web_search",
      toolName: "web_search",
      toolCallId: "call_abc",
      state: "output-available",
      input: { query: "AI news", maxResults: 5 },
      output: {
        query: "AI news",
        results: [
          { title: "OpenAI releases GPT-5", url: "...", snippet: "..." },
          { title: "Google announces Gemini 2.0", url: "...", snippet: "..." }
        ],
        source: "google_custom_search"
      }
    }
  ]
}
```

#### **Step 2 訊息結構**：

```typescript
{
  id: "msg_123",  // 同一個訊息！
  role: "assistant",
  parts: [
    // 第一步（之前的內容）
    { type: "step-start" },
    { type: "text", text: "我需要先搜尋 AI 相關的新聞。" },
    { type: "tool-web_search", ... },  // 工具調用和結果

    // 第二步開始 ✨
    { type: "step-start" },

    // AI 整理結果
    {
      type: "text",
      text: "根據搜尋結果，最新的 AI 新聞包括：\n\n1. OpenAI 發布 GPT-5...\n2. Google 宣布 Gemini 2.0...",
      state: "done"
    }
  ]
}
```

---

## 🎨 UI 實作策略

### 策略 1：按步驟分組顯示（已實作）

```typescript
// 核心函數：groupPartsBySteps()
function groupPartsBySteps(parts: any[]): Step[] {
  const steps: Step[] = [];
  let currentStep: Step = {
    stepNumber: 0,
    textParts: [],
    toolInvocations: []
  };

  for (const part of parts) {
    if (part.type === 'step-start') {
      // 儲存前一步
      if (currentStep.textParts.length > 0 || currentStep.toolInvocations.length > 0) {
        steps.push(currentStep);
      }

      // 開始新的步驟
      currentStep = {
        stepNumber: steps.length,
        textParts: [],
        toolInvocations: []
      };
    } else if (part.type === 'text') {
      currentStep.textParts.push(part);
    } else if (part.type?.includes('tool')) {
      currentStep.toolInvocations.push(part);
    }
  }

  // 加入最後一步
  if (currentStep.textParts.length > 0 || currentStep.toolInvocations.length > 0) {
    steps.push(currentStep);
  }

  return steps;
}
```

### 策略 2：顯示步驟卡片

```tsx
{steps.map((step, index) => (
  <StepCard key={index} step={step} stepNumber={index + 1} />
))}
```

每個步驟卡片顯示：
- 步驟編號（Step 1, Step 2, ...）
- 該步驟的文字內容
- 該步驟使用的工具（可展開/收合）
- 每個工具的：
  - 名稱和圖示
  - 執行狀態（Running, Completed, Error）
  - 輸入參數
  - 輸出結果

---

## 🚀 使用方式

### 1. 啟動開發伺服器

```bash
# 確保 Docker 服務在運行
docker-compose -f docker-compose.dev.yaml up -d

# 啟動前端
npm run dev
```

### 2. 訪問 Agent Playground

```
http://localhost:3000/agent-playground
```

### 3. 測試多步驟推理

試試這些範例問題：

**範例 1：需要搜尋和總結**
```
搜尋 React 19 的新功能並總結
```

預期看到：
- **Step 1**: 使用 `web_search` 工具搜尋 "React 19 features"
- **Step 2**: AI 總結搜尋結果

**範例 2：需要讀取網頁內容**
```
讀取 https://ai.google.dev/gemini-api/docs 並用中文總結
```

預期看到：
- **Step 1**: 使用 `web_content_fetcher` 工具讀取網頁
- **Step 2**: AI 分析內容並用中文總結

**範例 3：多個工具調用**
```
搜尋 Claude AI，然後計算它和 GPT-4 的發布日期差了多少天
```

預期看到：
- **Step 1**: 使用 `web_search` 搜尋 Claude AI
- **Step 2**: 可能再次搜尋 GPT-4 發布日期
- **Step 3**: 使用 `calculator` 計算日期差
- **Step 4**: 整理並回答

---

## 🔧 自定義和擴展

### 調整最大步驟數

在 `learning-agent.server.ts` 中：

```typescript
const result = streamText({
  model: gemini('gemini-2.5-flash'),
  messages: modelMessages,
  tools: learningAgentTools,
  stopWhen: stepCountIs(10),  // ← 改這裡！最多 10 步
  onStepFinish: ({ toolCalls }) => {
    logger.info({ toolNames: toolCalls.map(t => t.toolName) });
  }
});
```

### 添加步驟統計資訊

你可以在 UI 中顯示：

```tsx
// 統計總共用了多少工具
const totalTools = steps.reduce((sum, step) =>
  sum + step.toolInvocations.length, 0
);

// 統計哪些工具被使用了
const usedTools = new Set(
  steps.flatMap(step =>
    step.toolInvocations.map(t => t.toolName)
  )
);
```

### 顯示執行時間

如果你想顯示每一步的執行時間，可以在後端添加：

```typescript
// 在 learning-agent.server.ts 中
const result = streamText({
  // ...
  onStepFinish: ({ text, toolCalls, usage, finishReason }) => {
    logger.info('[Step Finished]', {
      stepNumber: recordedSteps.length,
      toolCount: toolCalls.length,
      toolNames: toolCalls.map(t => t.toolName),
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      finishReason,
    });
  }
});
```

然後可以將這些資訊傳遞到前端（需要自定義 metadata）。

---

## 📖 關鍵概念總結

### 1. **AI SDK 自動處理步驟邊界**

你不需要手動標記步驟！AI SDK 會在每次 LLM 調用時自動插入 `step-start` 標記。

流程：
```
Agent 循環執行：
  呼叫 LLM → 發送 step-start → 發送 response chunks →
  如果有工具調用 → 執行工具 → 發送工具結果 →
  再次呼叫 LLM → 發送 step-start → ...
```

### 2. **UIMessage Parts 是累積的**

在串流過程中，`message.parts` 會不斷增加新的 parts，包含所有步驟的資訊。

### 3. **Tool Invocation 有完整的生命週期**

```
input-streaming → input-available → output-available
                                  ↘ error (如果失敗)
```

### 4. **步驟數量由停止條件決定**

```typescript
stopWhen: stepCountIs(10)  // 最多 10 步
```

或者自定義停止條件：

```typescript
stopWhen: ({ steps }) => {
  // 如果沒有工具調用，就停止
  const lastStep = steps[steps.length - 1];
  return lastStep.toolCalls.length === 0;
}
```

---

## 🎯 完整範例：從零開始顯示步驟

### 1. 後端不需要改動！

你的 `api.agent-chat.ts` 已經完美了：

```typescript
const result = await createLearningAgentStream({
  messages: modelMessages,
  userId,
});

// toUIMessageStreamResponse() 會自動包含步驟資訊
return result.toUIMessageStreamResponse();
```

### 2. 前端提取步驟資訊

```tsx
// 在你的 component 中
const { messages } = useChat({
  transport: new DefaultChatTransport({ api: '/api/agent-chat' }),
});

// 對於每個 assistant 訊息
messages
  .filter(msg => msg.role === 'assistant')
  .forEach(msg => {
    // 提取步驟
    const steps = groupPartsBySteps(msg.parts);

    // 顯示
    console.log(`這個回應有 ${steps.length} 個步驟`);

    steps.forEach((step, i) => {
      console.log(`Step ${i + 1}:`);
      console.log(`  文字: ${step.textParts.map(p => p.text).join('')}`);
      console.log(`  工具: ${step.toolInvocations.map(t => t.toolName).join(', ')}`);
    });
  });
```

---

## 🐛 常見問題

### Q1: 為什麼我看不到 `step-start` parts？

**可能原因**：
1. Agent 只執行了一步（沒有工具調用）
2. 你在用 `toTextStreamResponse()` 而不是 `toUIMessageStreamResponse()`

**解決方法**：
- 確保使用 `toUIMessageStreamResponse()`
- 試著問需要多步驟的問題（例如：搜尋+總結）

### Q2: 工具輸出沒有顯示？

**可能原因**：
- 工具還在執行中（state 是 `input-available`，還沒到 `output-available`）
- 工具執行失敗（檢查 `errorText`）

**調試方法**：
```tsx
// 列印所有 parts 看看
console.log('All parts:', message.parts);

// 過濾工具相關的 parts
const toolParts = message.parts.filter(p =>
  p.type?.includes('tool')
);
console.log('Tool parts:', toolParts);
```

### Q3: 如何知道 Agent 當前在哪一步？

在串流過程中，最新的 `step-start` 之後的內容就是當前步驟：

```tsx
// 找到所有 step-start 的位置
const stepStartIndices = message.parts
  .map((part, index) => part.type === 'step-start' ? index : -1)
  .filter(index => index !== -1);

// 當前步驟是最後一個 step-start 之後的內容
const currentStepNumber = stepStartIndices.length;
```

---

## 🎨 UI/UX 建議

### 1. **視覺層次**

```
訊息氣泡
  └─ 步驟指示器 "Multi-step reasoning (3 steps)"
      └─ Step 1 卡片
          ├─ 步驟文字
          └─ 工具調用（可展開）
              ├─ 工具 1
              └─ 工具 2
      └─ Step 2 卡片
          └─ ...
      └─ Step 3 卡片
          └─ ...
```

### 2. **狀態指示**

使用不同顏色和圖示：
- ⏳ 黃色：執行中 (`input-streaming`, `input-available`)
- ✅ 綠色：完成 (`output-available`)
- ❌ 紅色：錯誤 (`error`)

### 3. **漸進式顯示**

- 預設展開所有步驟
- 允許使用者收合不重要的步驟
- 工具輸出預設收合（避免太長）

### 4. **性能優化**

```tsx
// 使用 useMemo 避免重複計算
const steps = useMemo(() => {
  return groupPartsBySteps(message.parts);
}, [message.parts]);
```

---

## 🚀 下一步

### 增強功能建議：

1. **添加時間軸視圖**
   - 顯示每一步的執行時間
   - 視覺化工具調用流程

2. **添加 Debug 模式**
   - 顯示完整的工具 input/output JSON
   - 顯示 token 使用量

3. **添加步驟重播**
   - 允許使用者重新執行某一步
   - 修改工具參數重新執行

4. **添加導出功能**
   - 導出整個對話的步驟報告
   - 生成 Markdown 格式的執行記錄

---

## 📚 相關文件

- [AI SDK 6 Beta 文檔](https://v6.ai-sdk.dev)
- [UIMessage 型別定義](node_modules/ai/dist/index.d.ts:1564)
- [Agent 源碼解析](AGENT_PLAYGROUND_GUIDE.md)
- [Google Search API 設定](GOOGLE_SEARCH_API_SETUP.md)

---

**祝你探索愉快！**🎉

如果有任何問題，可以查看：
- 控制台的 log 輸出
- Chrome DevTools Network tab（查看 API 回應）
- `message.parts` 的完整內容
