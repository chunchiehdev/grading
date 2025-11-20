# 🎨 Agent Steps 視覺化說明

## 📊 完整資料流程圖

```
                    前端發送訊息
                         │
                         ▼
                  ┌──────────────┐
                  │ API Route    │
                  │ /api/agent-  │
                  │ chat         │
                  └──────┬───────┘
                         │
                         │ convertToModelMessages()
                         ▼
               ┌─────────────────────┐
               │ createLearningAgent │
               │ Stream()            │
               └──────────┬──────────┘
                         │
                         │ streamText({ stopWhen: stepCountIs(10) })
                         ▼
        ╔════════════════════════════════════════╗
        ║      Agent 循環 (最多 10 步)            ║
        ╚════════════════════════════════════════╝
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
    ┌─────────┐    ┌─────────┐   ┌─────────┐
    │ Step 1  │    │ Step 2  │   │ Step N  │
    └─────────┘    └─────────┘   └─────────┘
          │              │              │
          │              │              │
          │         發送到前端           │
          ▼                             ▼
    ┌──────────────────────────────────────┐
    │  UIMessage.parts[]                   │
    │  ├─ { type: "step-start" }          │← Step 1 開始
    │  ├─ { type: "text", text: "..." }   │
    │  ├─ { type: "tool-web_search",      │
    │  │    state: "input-available" }    │
    │  ├─ { type: "tool-web_search",      │
    │  │    state: "output-available" }   │
    │  ├─ { type: "step-start" }          │← Step 2 開始
    │  ├─ { type: "text", text: "..." }   │
    │  └─ ...                              │
    └──────────────────────────────────────┘
                         │
                         │ groupPartsBySteps()
                         ▼
              ┌──────────────────────┐
              │ [                    │
              │   {                  │
              │     stepNumber: 0,   │
              │     textParts: [...],│
              │     toolInvocations: │
              │       [...]          │
              │   },                 │
              │   {                  │
              │     stepNumber: 1,   │
              │     ...              │
              │   }                  │
              │ ]                    │
              └──────────────────────┘
                         │
                         │ 渲染
                         ▼
              ┌──────────────────────┐
              │  UI 顯示：           │
              │                      │
              │  ┌─Step 1──────────┐ │
              │  │ 🔧 web_search   │ │
              │  │   Completed    │ │
              │  │ Input: ...      │ │
              │  │ Output: ...     │ │
              │  └─────────────────┘ │
              │                      │
              │  ┌─Step 2──────────┐ │
              │  │ 📝 Summary      │ │
              │  │   Done         │ │
              │  └─────────────────┘ │
              └──────────────────────┘
```

---

## 🔄 Agent 循環詳細流程

```
Step 0 開始
│
├─ 1️⃣ 發送 { type: "step-start" }
│
├─ 2️⃣ 呼叫 Gemini API
│     Prompt: "搜尋 AI 新聞並總結"
│
├─ 3️⃣ Gemini 回應: "我需要先搜尋"
│     發送 { type: "text", text: "我需要先搜尋" }
│
├─ 4️⃣ Gemini 決定: 使用 web_search 工具
│     發送 { type: "tool-web_search", state: "input-available", input: {...} }
│
├─ 5️⃣ AI SDK 執行工具
│     const result = await webSearchTool.execute({ query: "AI news" })
│
├─ 6️⃣ 工具執行完成
│     發送 { type: "tool-web_search", state: "output-available", output: {...} }
│
├─ 7️⃣ 判斷：有工具調用，繼續下一步！
│
└─ 進入 Step 1
   │
   ├─ 1️⃣ 發送 { type: "step-start" }
   │
   ├─ 2️⃣ 再次呼叫 Gemini API
   │     Prompt: [之前的訊息] + [工具結果]
   │
   ├─ 3️⃣ Gemini 回應: "根據搜尋結果，AI 新聞包括..."
   │     發送 { type: "text", text: "根據搜尋結果..." }
   │
   ├─ 4️⃣ Gemini 沒有調用工具（純文字回應）
   │
   └─ 5️⃣ 判斷：沒有工具調用，結束！
      發送 { type: "finish" }
```

---

## 🎯 UIMessage Parts 演化過程

### 時間點 1：Step 0 開始

```typescript
message.parts = [
  { type: "step-start" }
]
```

### 時間點 2：AI 回應文字

```typescript
message.parts = [
  { type: "step-start" },
  { type: "text", text: "我需要先搜尋", state: "streaming" }
]
```

### 時間點 3：文字串流完成

```typescript
message.parts = [
  { type: "step-start" },
  { type: "text", text: "我需要先搜尋 AI 相關的新聞。", state: "done" }
]
```

### 時間點 4：工具調用開始

```typescript
message.parts = [
  { type: "step-start" },
  { type: "text", text: "我需要先搜尋 AI 相關的新聞。", state: "done" },
  {
    type: "tool-web_search",  // 或 "dynamic-tool"
    toolName: "web_search",
    toolCallId: "call_abc123",
    state: "input-available",
    input: { query: "AI news", maxResults: 5 }
  }
]
```

### 時間點 5：工具執行完成

```typescript
message.parts = [
  { type: "step-start" },
  { type: "text", text: "我需要先搜尋 AI 相關的新聞。", state: "done" },
  {
    type: "tool-web_search",
    toolName: "web_search",
    toolCallId: "call_abc123",
    state: "output-available",  // ← 狀態改變！
    input: { query: "AI news", maxResults: 5 },
    output: {  // ← 新增輸出！
      query: "AI news",
      results: [
        { title: "OpenAI releases GPT-5", url: "...", snippet: "..." },
        { title: "Google announces Gemini 2.0", url: "...", snippet: "..." }
      ],
      source: "google_custom_search"
    }
  }
]
```

### 時間點 6：Step 1 開始

```typescript
message.parts = [
  // Step 0
  { type: "step-start" },
  { type: "text", text: "我需要先搜尋 AI 相關的新聞。", state: "done" },
  { type: "tool-web_search", state: "output-available", ... },

  // Step 1 ✨
  { type: "step-start" },
  { type: "text", text: "根據搜尋結果", state: "streaming" }
]
```

### 時間點 7：完成

```typescript
message.parts = [
  // Step 0
  { type: "step-start" },
  { type: "text", text: "我需要先搜尋 AI 相關的新聞。", state: "done" },
  { type: "tool-web_search", state: "output-available", ... },

  // Step 1
  { type: "step-start" },
  {
    type: "text",
    text: "根據搜尋結果，最新的 AI 新聞包括：\n\n1. OpenAI 發布 GPT-5...\n2. Google 宣布 Gemini 2.0...",
    state: "done"
  }
]
```

---

## 🔧 groupPartsBySteps() 函數運作

### 輸入：

```typescript
parts = [
  { type: "step-start" },           // ← 步驟邊界
  { type: "text", text: "步驟 1 文字" },
  { type: "tool-web_search", ... },

  { type: "step-start" },           // ← 步驟邊界
  { type: "text", text: "步驟 2 文字" }
]
```

### 處理流程：

```
初始化：
  steps = []
  currentStep = { stepNumber: 0, textParts: [], toolInvocations: [] }

迴圈 parts[0]: { type: "step-start" }
  → 遇到 step-start
  → currentStep 是空的，不儲存
  → 重置 currentStep = { stepNumber: 0, textParts: [], toolInvocations: [] }

迴圈 parts[1]: { type: "text", text: "步驟 1 文字" }
  → 加入 currentStep.textParts

迴圈 parts[2]: { type: "tool-web_search", ... }
  → 加入 currentStep.toolInvocations

迴圈 parts[3]: { type: "step-start" }
  → 遇到 step-start
  → currentStep 有內容，儲存到 steps[]
  → steps = [{ stepNumber: 0, textParts: [...], toolInvocations: [...] }]
  → 重置 currentStep = { stepNumber: 1, textParts: [], toolInvocations: [] }

迴圈 parts[4]: { type: "text", text: "步驟 2 文字" }
  → 加入 currentStep.textParts

迴圈結束：
  → currentStep 有內容，儲存到 steps[]
  → steps = [
      { stepNumber: 0, textParts: [...], toolInvocations: [...] },
      { stepNumber: 1, textParts: [...], toolInvocations: [] }
    ]
```

### 輸出：

```typescript
[
  {
    stepNumber: 0,
    textParts: [{ type: "text", text: "步驟 1 文字" }],
    toolInvocations: [{ type: "tool-web_search", ... }]
  },
  {
    stepNumber: 1,
    textParts: [{ type: "text", text: "步驟 2 文字" }],
    toolInvocations: []
  }
]
```

---

## 🎨 UI 組件層次結構

```
AgentChatBoxWithSteps
│
├─ ScrollArea (訊息列表)
│  │
│  ├─ MessageBubbleWithSteps (使用者訊息)
│  │  └─ 簡單氣泡
│  │
│  └─ MessageBubbleWithSteps (AI 訊息)
│     │
│     ├─ 步驟指示器 "Multi-step reasoning (3 steps)"
│     │
│     └─ Steps 列表
│        │
│        ├─ StepCard (Step 1)
│        │  │
│        │  ├─ Header
│        │  │  ├─ Badge "Step 1"
│        │  │  └─ Badge "2 tools"
│        │  │
│        │  ├─ 步驟文字內容
│        │  │
│        │  └─ 工具調用列表 (可展開)
│        │     │
│        │     ├─ ToolInvocationCard (web_search)
│        │     │  ├─ 圖示 🔍
│        │     │  ├─ 名稱 "Web Search"
│        │     │  ├─ 狀態   Completed
│        │     │  ├─ Input: { query: "..." }
│        │     │  └─ Output: { results: [...] }
│        │     │
│        │     └─ ToolInvocationCard (calculator)
│        │        └─ ...
│        │
│        ├─ StepCard (Step 2)
│        │  └─ ...
│        │
│        └─ StepCard (Step 3)
│           └─ ...
│
└─ Input Area
```

---

## 📱 實際 UI 預覽

```
┌────────────────────────────────────────────────────────┐
│ 🤖 AI SDK Learning Agent                               │
│ Multi-step reasoning with detailed execution view      │
├────────────────────────────────────────────────────────┤
│                                                         │
│ [User Message]                                    👤   │
│  搜尋 Claude AI 並總結                                  │
│                                                         │
│ 🤖  ⚡ Multi-step reasoning (2 steps)                  │
│    ┌─────────────────────────────────────────────┐    │
│    │ [Step 1]  [1 tool]                     ▼    │    │
│    ├─────────────────────────────────────────────┤    │
│    │ 我需要先搜尋 Claude AI 的相關資訊。           │    │
│    │                                             │    │
│    │ 🔧 Tool Executions:                         │    │
│    │ ┌─────────────────────────────────────────┐ │    │
│    │ │ 🔍 Web Search          Completed       │ │    │
│    │ │ Input: {"query":"Claude AI"}            │ │    │
│    │ │ Output:                                 │ │    │
│    │ │ {                                       │ │    │
│    │ │   "results": [                          │ │    │
│    │ │     {                                   │ │    │
│    │ │       "title": "Claude - Anthropic",   │ │    │
│    │ │       "snippet": "Claude is a..."      │ │    │
│    │ │     }                                   │ │    │
│    │ │   ]                                     │ │    │
│    │ │ }                                       │ │    │
│    │ └─────────────────────────────────────────┘ │    │
│    └─────────────────────────────────────────────┘    │
│                                                         │
│    ┌─────────────────────────────────────────────┐    │
│    │ [Step 2]                               ▼    │    │
│    ├─────────────────────────────────────────────┤    │
│    │ 根據搜尋結果，Claude 是由 Anthropic 開發的     │    │
│    │ 大型語言模型，特點包括：                      │    │
│    │                                             │    │
│    │ 1. 長對話能力 (100K+ tokens)                │    │
│    │ 2. 更注重安全性和誠實性                       │    │
│    │ 3. 支援多種語言                             │    │
│    │ ...                                         │    │
│    └─────────────────────────────────────────────┘    │
│                                                         │
│ ⏳ Agent is thinking...                                │
│                                                         │
├────────────────────────────────────────────────────────┤
│ [Ask me anything...]                           [Send] │
│ This agent uses Gemini 2.5 Flash with up to 10 steps  │
└────────────────────────────────────────────────────────┘
```

---

## 🎯 關鍵資料結構對照表

| AI SDK 內部        | UIMessage Part        | UI 顯示            |
|-------------------|-----------------------|--------------------|
| Step boundary     | `{ type: "step-start" }` | "Step 1" badge     |
| AI text response  | `{ type: "text" }`    | 步驟內容文字         |
| Tool call         | `{ type: "tool-*" }`  | 工具卡片           |
| Tool executing    | `state: "input-available"` | ⏳ Running         |
| Tool completed    | `state: "output-available"` |   Completed       |
| Tool error        | `errorText: "..."` | ❌ Error           |

---

## 🔍 除錯技巧

### 在瀏覽器 Console 中檢查：

```javascript
// 取得最後一則 assistant 訊息
const lastAssistantMsg = messages
  .filter(m => m.role === 'assistant')
  .pop();

// 查看所有 parts
console.log('All parts:', lastAssistantMsg.parts);

// 找出所有步驟邊界
const stepStarts = lastAssistantMsg.parts
  .map((p, i) => p.type === 'step-start' ? i : -1)
  .filter(i => i !== -1);
console.log('Step boundaries at indices:', stepStarts);

// 找出所有工具調用
const tools = lastAssistantMsg.parts
  .filter(p => p.type?.includes('tool'));
console.log('Tool invocations:', tools);

// 檢查工具狀態
tools.forEach((t, i) => {
  console.log(`Tool ${i}:`, {
    name: t.toolName,
    state: t.state,
    hasInput: !!t.input,
    hasOutput: !!t.output,
    hasError: !!t.errorText
  });
});
```

---

## 💡 進階應用

### 1. **即時步驟計數器**

```tsx
const [currentStep, setCurrentStep] = useState(0);

useEffect(() => {
  const assistantMsg = messages
    .filter(m => m.role === 'assistant')
    .pop();

  if (assistantMsg) {
    const stepCount = assistantMsg.parts
      .filter(p => p.type === 'step-start')
      .length;
    setCurrentStep(stepCount);
  }
}, [messages]);

// 顯示：
<div>當前正在執行第 {currentStep} 步</div>
```

### 2. **工具執行時間估計**

```tsx
// 記錄工具開始時間
const [toolStartTime, setToolStartTime] = useState<Record<string, number>>({});

useEffect(() => {
  // 檢測新的工具調用
  assistantMsg.parts.forEach(part => {
    if (part.type?.includes('tool') && part.state === 'input-available') {
      setToolStartTime(prev => ({
        ...prev,
        [part.toolCallId]: Date.now()
      }));
    }
  });
}, [messages]);

// 顯示執行時間
const executionTime = toolStartTime[tool.toolCallId]
  ? Date.now() - toolStartTime[tool.toolCallId]
  : 0;
```

### 3. **步驟進度條**

```tsx
const maxSteps = 10;  // stopWhen: stepCountIs(10)
const progress = (steps.length / maxSteps) * 100;

<Progress value={progress} className="w-full" />
```

---

希望這個視覺化指南能幫助你更好地理解整個流程！🎉
