# Google Search Grounding 完整實作指南

> 如何在 AI 聊天機器人中顯示 Google 搜尋來源

## 目錄
1. [什麼是 Google Search Grounding？](#什麼是-google-search-grounding)
2. [為什麼需要顯示來源？](#為什麼需要顯示來源)
3. [完整實作步驟](#完整實作步驟)
4. [常見問題](#常見問題)
5. [最終效果](#最終效果)

---

## 什麼是 Google Search Grounding？

簡單來說：**讓 AI 可以使用 Google 搜尋來回答問題**。

### 傳統 AI 的問題
- AI 只知道訓練時的資料（知識截止日期之前的事情）
- 無法回答「今天的新聞」、「最新消息」等問題
- 可能會「幻覺」（亂講不存在的事情）

### 有了 Google Search Grounding
- ✅ AI 可以即時搜尋網路
- ✅ 回答最新資訊
- ✅ 提供引用來源（讓用戶可以驗證）

---

## 為什麼需要顯示來源？

### 信任問題
用戶問：「台灣 2024 年發生了什麼事？」

**沒有來源**：
```
AI: 台灣在 2024 年舉辦了大選...
用戶：這是真的嗎？你怎麼知道？
```

**有來源**：
```
AI: 台灣在 2024 年舉辦了大選...

📚 參考來源：
[1] 中央社 - 2024 總統大選結果
[2] 聯合新聞網 - 選舉即時開票
[3] Wikipedia - 2024 台灣選舉

用戶：哦！有新聞來源，可以點進去看，我相信了！
```

---

## 完整實作步驟

### 步驟 1：後端 - 啟用 Google Search

#### 1.1 確認套件版本

檢查 `package.json`：
```json
{
  "@ai-sdk/google": "^3.0.0-beta.38",
  "ai": "^3.x.x"
}
```

✅ 我們的版本支援 Google Search Grounding！

#### 1.2 創建 Agent Service

檔案：`app/services/learning-agent-v2.server.ts`

**關鍵代碼**：
```typescript
import { streamText, tool, stepCountIs } from 'ai';
import { createGoogleGenerativeAI, google } from '@ai-sdk/google';

// 建立 Gemini provider
const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY
});

// 使用 gemini-2.5-flash（支援 google_search）
const model = gemini('gemini-2.5-flash');

// 設定 streaming
const result = streamText({
  model,
  system: systemPrompt,
  messages: messages,
  tools: {
    // 關鍵！加入 Google Search tool
    google_search: google.tools.googleSearch({}),
  },
  stopWhen: stepCountIs(10),
  temperature: 0.8,
  onFinish: async ({ sources }) => {
    // 完成時記錄來源（for debugging）
    if (sources && sources.length > 0) {
      logger.info({
        sourcesCount: sources.length,
        sources: sources.map(s => ({
          url: s.url,
          title: s.title
        })),
      }, 'Sources captured');
    }
  },
});

return result;
```

**重點說明**：
- `google.tools.googleSearch({})` - 這是 Gemini 內建的搜尋功能
- `onFinish` - 可以在完成時取得所有 sources
- `sources` - 包含 URL、標題等資訊

#### 1.3 重要限制：不能混用工具

**錯誤做法** ❌：
```typescript
tools: {
  // 自訂工具
  calculator: myCalculatorTool,
  code_explainer: myCodeExplainerTool,

  // Provider-defined tool
  google_search: google.tools.googleSearch({}),
}
```

會出現警告：
```
Cannot mix function tools with provider-defined tools
```

**正確做法** ✅：
```typescript
tools: {
  // 只使用 provider-defined tools
  google_search: google.tools.googleSearch({}),
  code_execution: google.tools.codeExecution({}), // 可選
}
```

或者只使用自訂工具（不用 google_search）。

---

### 步驟 2：後端 - API Route 設定

檔案：`app/routes/api.agent-chat.ts`

**關鍵設定**：
```typescript
// 創建 stream
const result = await createLearningAgentV2Stream({
  messages: modelMessages,
  userId,
});

// 🔥 重點！一定要設定 sendSources: true
return result.toUIMessageStreamResponse({
  sendSources: true,  // ← 沒有這行，前端收不到 sources！
});
```

**為什麼需要 `sendSources: true`？**

預設情況下，`toUIMessageStreamResponse()` 不會傳送 sources 到前端。這是為了：
- 減少傳輸資料量
- 讓開發者自己決定要不要顯示來源

**如果忘記設定**：
- 後端有 sources（在 logs 可以看到）
- 前端收不到（`message.parts` 沒有 `source-url` 類型）
- 用戶看不到來源

---

### 步驟 3：前端 - 檢測 Sources

檔案：`app/components/agent/AgentChatBoxWithSteps.tsx`

#### 3.1 擴展 Step 介面

```typescript
interface Step {
  stepNumber: number;
  textParts: any[];
  toolInvocations: any[];
  sources: any[];  // ← 新增這個
}
```

#### 3.2 解析 Message Parts

AI SDK 會把 sources 轉換成 `source-url` 類型的 parts：

```typescript
function groupPartsBySteps(parts: any[]): Step[] {
  const steps: Step[] = [];
  let currentStep: Step = {
    stepNumber: 0,
    textParts: [],
    toolInvocations: [],
    sources: []  // ← 初始化
  };

  for (const part of parts) {
    if (part.type === 'text') {
      currentStep.textParts.push(part);
    }
    else if (part.type === 'source-url') {
      // 🔍 關鍵！檢測 source-url 類型
      currentStep.sources.push(part);
    }
  }

  return steps;
}
```

**Source Part 的結構**：
```typescript
{
  type: 'source-url',
  sourceId: 'source-1',
  url: 'https://example.com/article',
  title: 'Article Title',
}
```

---

### 步驟 4：前端 - 顯示 Sources

#### 4.1 創建 SourcesList 組件

```typescript
function SourcesList({ sources }: { sources: any[] }) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Link2 className="h-3.5 w-3.5 text-blue-600" />
        <span className="text-xs font-medium">
          參考來源 ({sources.length})
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sources.map((source, idx) => (
          <SourceCard
            key={idx}
            source={source}
            index={idx + 1}
          />
        ))}
      </div>
    </div>
  );
}
```

#### 4.2 創建 SourceCard 組件

**功能**：
- 顯示引用編號（[1], [2], [3]...）
- 顯示網站 favicon
- 顯示標題（自動截斷）
- 顯示域名
- Hover 效果

```typescript
function SourceCard({ source, index }) {
  // 提取域名
  const domain = getDomainFromUrl(source.url);

  // 標題（如果沒有就用域名）
  const title = source.title || domain;

  // 截斷標題（最多 50 字元）
  const displayTitle = truncateText(title, 50);

  // Google Favicon Service
  const faviconUrl =
    `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-2 p-2 rounded-lg border ..."
    >
      {/* [1] 編號 */}
      <div className="w-5 h-5 rounded-full bg-blue-600 text-white">
        {index}
      </div>

      {/* 🌐 Favicon */}
      <img
        src={faviconUrl}
        className="w-4 h-4"
        onError={(e) => e.currentTarget.style.display = 'none'}
      />

      {/* 標題 + 域名 */}
      <div className="flex-1">
        <div className="text-xs font-medium">{displayTitle}</div>
        <div className="text-[10px] text-blue-600/70">{domain}</div>
      </div>

      {/* ↗ 外部連結圖示 */}
      <ExternalLink className="w-3 h-3" />
    </a>
  );
}
```

#### 4.3 輔助函數

**提取域名**：
```typescript
function getDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'Unknown';
  }
}
```

**截斷文字**：
```typescript
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
```

---

### 步驟 5：整合到 UI

#### 在 StepCard 中顯示

```typescript
function StepCard({ step, stepNumber }) {
  const hasSources = step.sources.length > 0;

  return (
    <Card>
      <CardHeader>
        <Badge>Step {stepNumber}</Badge>
        {hasSources && (
          <Badge>📚 {step.sources.length} sources</Badge>
        )}
      </CardHeader>

      <CardContent>
        {/* 文字內容 */}
        <Markdown>{stepText}</Markdown>

        {/* Sources */}
        {hasSources && <SourcesList sources={step.sources} />}

        {/* Tool calls */}
        {/* ... */}
      </CardContent>
    </Card>
  );
}
```

#### 在簡單訊息中顯示

```typescript
function MessageBubble({ message }) {
  const steps = groupPartsBySteps(message.parts);

  return (
    <div className="message-bubble">
      <Markdown>{messageContent}</Markdown>

      {/* 如果有 sources，顯示 */}
      {steps[0]?.sources.length > 0 && (
        <SourcesList sources={steps[0].sources} />
      )}
    </div>
  );
}
```

---

## 完整流程圖

```
用戶輸入問題
    ↓
[前端] useChat 發送請求
    ↓
[後端] api.agent-chat.ts
    ├─ convertToModelMessages()
    └─ createLearningAgentV2Stream()
        ↓
[後端] learning-agent-v2.server.ts
    ├─ streamText({
    │    model: gemini('gemini-2.5-flash'),
    │    tools: {
    │      google_search: google.tools.googleSearch({})
    │    }
    │  })
    │
    └─ Gemini 判斷需要搜尋
        ├─ 生成搜尋查詢
        ├─ 執行 Google Search
        ├─ 分析結果
        └─ 回傳：text + sources
            ↓
[後端] toUIMessageStreamResponse({ sendSources: true })
    ├─ 轉換 sources → source-url parts
    └─ Stream 傳給前端
        ↓
[前端] useChat 接收 stream
    ├─ message.parts 包含：
    │   ├─ type: 'text'
    │   ├─ type: 'tool-call' (google_search)
    │   └─ type: 'source-url' ← 這裡！
    │
    └─ groupPartsBySteps()
        └─ 提取 source-url parts
            ↓
[前端] SourcesList + SourceCard
    └─ 顯示美化的來源卡片
        ↓
用戶看到引用來源！✨
```

---

## 資料結構詳解

### 後端 - StepResult.sources

```typescript
// onFinish callback 中
{
  sources: [
    {
      type: 'source',
      sourceType: 'url',
      id: 'source-1',
      url: 'https://www.cna.com.tw/news/...',
      title: '中央社 - 台灣最新消息',
    },
    {
      type: 'source',
      sourceType: 'url',
      id: 'source-2',
      url: 'https://www.udn.com/news/...',
      title: '聯合新聞網 - 即時報導',
    }
  ]
}
```

### 前端 - UIMessage.parts

```typescript
message.parts = [
  {
    type: 'text',
    text: '台灣在 2024 年舉辦了總統大選...',
  },
  {
    type: 'tool-call',
    toolName: 'google_search',
    // ...
  },
  {
    type: 'source-url',
    sourceId: 'source-1',
    url: 'https://www.cna.com.tw/news/...',
    title: '中央社 - 台灣最新消息',
  },
  {
    type: 'source-url',
    sourceId: 'source-2',
    url: 'https://www.udn.com/news/...',
    title: '聯合新聞網 - 即時報導',
  }
]
```

---

## 常見問題

### Q1: 為什麼後端有 sources 但前端看不到？

**答案**：99% 是因為忘記設定 `sendSources: true`！

```typescript
// ❌ 錯誤
return result.toUIMessageStreamResponse();

// ✅ 正確
return result.toUIMessageStreamResponse({
  sendSources: true,
});
```

### Q2: 可以同時使用自訂工具和 google_search 嗎？

**答案**：不行！會出現警告。

**解決方案**：
- 方案 A：只使用 `google_search`（推薦，最簡單）
- 方案 B：使用自訂的 web search tool（需要 Google Custom Search API）
- 方案 C：根據情況動態選擇（進階）

### Q3: Favicon 載入失敗怎麼辦？

**答案**：已處理！使用 `onError` 自動隱藏。

```typescript
<img
  src={faviconUrl}
  onError={(e) => {
    e.currentTarget.style.display = 'none';
  }}
/>
```

### Q4: 如何知道 AI 是否使用了搜尋？

**答案**：檢查是否有 sources。

```typescript
if (step.sources.length > 0) {
  // AI 使用了 Google Search
}
```

也可以檢查 tool calls：
```typescript
const hasGoogleSearch = message.parts.some(
  part => part.type === 'tool-call' &&
          part.toolName === 'google_search'
);
```

### Q5: Sources 的順序有意義嗎？

**答案**：有！通常越前面的來源越相關。

編號 [1] 通常是最主要的引用來源。

### Q6: 如何測試是否正常運作？

**測試問題**：
- ✅ 「台灣 2024 年最新新聞」
- ✅ 「今天的天氣如何？」
- ✅ 「最新的 AI 發展是什麼？」
- ❌ 「1+1 等於多少？」（不需要搜尋）

**檢查點**：
1. 瀏覽器 Console 沒有錯誤
2. 後端 logs 顯示 "Sources captured"
3. 前端顯示「📚 參考來源 (N)」
4. 點擊來源可以開啟網頁

---

## 最終效果

### 用戶體驗

**問題**：「台灣 2024 年發生了什麼事？」

**AI 回應**：
```
台灣在 2024 年 1 月 13 日舉行了第 16 任總統及副總統選舉。
民進黨候選人賴清德與蕭美琴當選，成為中華民國第 16 任總統
及副總統。本次選舉同時舉行第 11 屆立法委員選舉...

🔗 參考來源 (9)

┌─────────────────────────┐ ┌─────────────────────────┐
│ ① 🌐 Wikipedia          │ │ ② 🌐 ETtoday新聞雲      │
│ 2024年中華民國總統選舉  │ │ 2024總統大選開票結果    │
│ wikipedia.org        ↗  │ │ ettoday.net          ↗  │
└─────────────────────────┘ └─────────────────────────┘

┌─────────────────────────┐ ┌─────────────────────────┐
│ ③ 🌐 聯合新聞網         │ │ ④ 🌐 中央社             │
│ 2024總統大選即時開票    │ │ 賴清德蕭美琴當選...     │
│ udn.com              ↗  │ │ cna.com.tw           ↗  │
└─────────────────────────┘ └─────────────────────────┘

(... 更多來源)
```

### 技術特點

✅ **可信度**：用戶可以點擊查看原始來源
✅ **透明度**：清楚標示資訊來自哪裡
✅ **美觀**：現代化的卡片設計
✅ **響應式**：手機、平板、桌面都適用
✅ **無障礙**：完整的 title 和語意化 HTML
✅ **效能**：Favicon 自動快取、lazy load

---

## 檔案清單

### 後端檔案
- `app/services/learning-agent-v2.server.ts` - Agent 邏輯
- `app/routes/api.agent-chat.ts` - API endpoint

### 前端檔案
- `app/components/agent/AgentChatBoxWithSteps.tsx` - 聊天 UI
  - `groupPartsBySteps()` - 解析 message parts
  - `SourcesList` - 來源列表組件
  - `SourceCard` - 單個來源卡片
  - `getDomainFromUrl()` - 提取域名
  - `truncateText()` - 截斷文字

### 文檔檔案
- `docs/google-search-grounding-implementation.md` - 本文件
- `docs/grounding-metadata-usage.md` - Metadata 詳細說明
- `docs/sources-ui-design.md` - UI 設計說明

---

## 核心概念總結

### 1. Provider-Defined Tools vs Custom Tools

**Provider-Defined Tools**（Gemini 內建）：
- `google.tools.googleSearch({})`
- `google.tools.codeExecution({})`
- `google.tools.urlContext({})`
- ✅ 不需要自己實作
- ✅ Gemini 自動判斷何時使用
- ✅ 回傳標準化的 sources
- ❌ 不能與 custom tools 混用

**Custom Tools**（自己做的）：
- `tool({ description, inputSchema, execute })`
- ✅ 完全控制邏輯
- ✅ 可以混用多個 custom tools
- ❌ 需要自己實作
- ❌ 需要處理錯誤、timeout 等

### 2. Sources 的旅程

```
Gemini API
  ↓ (sources array)
AI SDK - streamText
  ↓ (StepResult.sources)
onFinish callback
  ↓ (for logging)
toUIMessageStreamResponse({ sendSources: true })
  ↓ (轉換成 source-url parts)
Stream to Frontend
  ↓ (UIMessage.parts)
useChat hook
  ↓ (message.parts)
groupPartsBySteps()
  ↓ (Step.sources)
SourcesList + SourceCard
  ↓ (React components)
用戶看到美化的來源卡片！
```

### 3. 關鍵設定

**後端**：
```typescript
// 1. 使用支援 google_search 的模型
model: gemini('gemini-2.5-flash')

// 2. 加入 google_search tool
tools: {
  google_search: google.tools.googleSearch({})
}

// 3. 設定 sendSources
return result.toUIMessageStreamResponse({
  sendSources: true  // 🔥 關鍵！
});
```

**前端**：
```typescript
// 1. 檢測 source-url parts
if (part.type === 'source-url') {
  currentStep.sources.push(part);
}

// 2. 顯示來源
{hasSources && <SourcesList sources={step.sources} />}
```

---

## 結論

通過以下步驟，我們成功實作了 Google Search Grounding 並顯示引用來源：

1. ✅ **後端**：啟用 `google.tools.googleSearch({})`
2. ✅ **後端**：設定 `sendSources: true`
3. ✅ **前端**：檢測 `source-url` parts
4. ✅ **前端**：美化 Sources UI（favicon、卡片、響應式）

**最重要的是**：
- `sendSources: true` - 沒有這個，前端收不到 sources
- 不能混用 provider-defined tools 和 custom tools
- `source-url` part type - 這是 sources 在前端的表現形式

現在你的 AI 聊天機器人可以：
- 🔍 使用 Google 搜尋回答最新問題
- 📚 顯示引用來源給用戶
- 🌐 美化的來源卡片（含 favicon）
- ✨ 提升用戶信任度

完成！🎉
