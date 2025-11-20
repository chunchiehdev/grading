# Grounding Metadata 使用指南

## 概述

當使用 Gemini 的 `google_search` tool 時，API 會回傳 `groundingMetadata`，包含搜尋查詢、引用來源和文字片段映射。

## 可用參數

### 1. webSearchQueries (string[])
**說明**：AI 實際執行的搜尋查詢列表

**用途**：
- 顯示「正在搜尋：xxx」給用戶
- Debug：了解 AI 如何理解用戶問題
- 分析：追蹤常見搜尋模式

**範例**：
```json
["UEFA Euro 2024 winner", "who won euro 2024"]
```

**前端展示**：
```tsx
{metadata.groundingMetadata?.webSearchQueries && (
  <div className="mb-2">
    <Badge variant="secondary">
      🔍 Searched: {metadata.groundingMetadata.webSearchQueries.join(', ')}
    </Badge>
  </div>
)}
```

---

### 2. searchEntryPoint
**說明**：Google 提供的搜尋建議 widget HTML/CSS

**屬性**：
- `renderedContent`: string（HTML + CSS 代碼）

**用途**：
- 渲染 Google 官方的搜尋建議 widget
- 提供用戶點擊查看更多搜尋結果

**注意事項**：
- 必須遵守 [Terms of Service](https://ai.google.dev/gemini-api/terms#grounding-with-google-search)
- 需要顯示 Google 品牌元素
- 建議使用 `dangerouslySetInnerHTML`（確保 sanitize）

**範例**：
```tsx
{metadata.groundingMetadata?.searchEntryPoint && (
  <div
    className="my-4"
    dangerouslySetInnerHTML={{
      __html: metadata.groundingMetadata.searchEntryPoint.renderedContent
    }}
  />
)}
```

---

### 3. groundingChunks (object[])
**說明**：網頁來源列表，每個來源包含 URL 和標題

**結構**：
```typescript
{
  web: {
    uri: string,      // 來源 URL
    title: string     // 網站標題或域名
  }
}[]
```

**用途**：
- 顯示「參考來源」列表
- 建立可點擊的引用連結
- 讓用戶驗證資訊來源

**範例數據**：
```json
[
  {"web": {"uri": "https://www.aljazeera.com/...", "title": "aljazeera.com"}},
  {"web": {"uri": "https://www.uefa.com/...", "title": "uefa.com"}}
]
```

**前端展示 - 來源列表**：
```tsx
{metadata.groundingMetadata?.groundingChunks && (
  <div className="mt-4 p-3 border rounded-lg bg-muted/50">
    <p className="text-xs font-medium mb-2">📚 參考來源：</p>
    <div className="space-y-1">
      {metadata.groundingMetadata.groundingChunks.map((chunk, idx) => (
        <a
          key={idx}
          href={chunk.web?.uri}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-xs text-blue-600 hover:underline"
        >
          [{idx + 1}] {chunk.web?.title || chunk.web?.uri}
        </a>
      ))}
    </div>
  </div>
)}
```

---

### 4. groundingSupports (object[]) - 最重要！
**說明**：連接回應文字與來源的映射關係，用於建立 inline citations

**結構**：
```typescript
{
  segment: {
    startIndex: number,        // 文字片段起始位置
    endIndex: number,          // 文字片段結束位置
    text: string               // 文字內容
  },
  groundingChunkIndices: number[],  // 對應的 groundingChunks 索引
  confidenceScores?: number[]       // AI SDK 額外提供：信心分數 (0-1)
}[]
```

**用途**：
- 建立 inline citations（內嵌引用）
- 在文字特定位置顯示來源標記
- 讓用戶點擊文字片段查看該段的來源

**範例數據**：
```json
[
  {
    "segment": {
      "startIndex": 0,
      "endIndex": 85,
      "text": "Spain won Euro 2024, defeating England 2-1 in the final."
    },
    "groundingChunkIndices": [0],
    "confidenceScores": [0.95]
  },
  {
    "segment": {
      "startIndex": 86,
      "endIndex": 210,
      "text": "This victory marks Spain's record fourth European Championship title."
    },
    "groundingChunkIndices": [0, 1],
    "confidenceScores": [0.92, 0.88]
  }
]
```

**前端實作 - Inline Citations**：

#### 方法 1：在文字後面加上上標引用
```tsx
function addInlineCitations(text: string, supports: GroundingSupport[], chunks: GroundingChunk[]) {
  // Sort by endIndex descending to avoid index shifting
  const sorted = [...supports].sort((a, b) =>
    (b.segment?.endIndex ?? 0) - (a.segment?.endIndex ?? 0)
  );

  let result = text;

  for (const support of sorted) {
    const endIndex = support.segment?.endIndex;
    if (!endIndex || !support.groundingChunkIndices?.length) continue;

    // Create citation links like [1,2]
    const citations = support.groundingChunkIndices
      .map(i => {
        const uri = chunks[i]?.web?.uri;
        return uri ? `[${i + 1}](${uri})` : null;
      })
      .filter(Boolean)
      .join(',');

    if (citations) {
      result = result.slice(0, endIndex) + `^[${citations}]` + result.slice(endIndex);
    }
  }

  return result;
}
```

#### 方法 2：高亮顯示有來源支持的文字片段
```tsx
function CitedText({ text, supports, chunks }: Props) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Sort by startIndex ascending
  const sorted = [...supports].sort((a, b) =>
    (a.segment?.startIndex ?? 0) - (b.segment?.startIndex ?? 0)
  );

  for (const support of sorted) {
    const { startIndex, endIndex, text: segmentText } = support.segment;

    if (startIndex == null || endIndex == null) continue;

    // Add uncited text before this segment
    if (lastIndex < startIndex) {
      parts.push(text.slice(lastIndex, startIndex));
    }

    // Add cited segment with tooltip
    const sourceIndices = support.groundingChunkIndices || [];
    const sources = sourceIndices
      .map(i => chunks[i]?.web)
      .filter(Boolean);

    parts.push(
      <Tooltip key={startIndex}>
        <TooltipTrigger asChild>
          <mark className="bg-blue-100 dark:bg-blue-900 cursor-help">
            {segmentText || text.slice(startIndex, endIndex)}
            <sup className="text-blue-600 font-bold ml-0.5">
              [{sourceIndices.map(i => i + 1).join(',')}]
            </sup>
          </mark>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            {sources.map((source, idx) => (
              <a
                key={idx}
                href={source.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs hover:underline"
              >
                {source.title}
              </a>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    );

    lastIndex = endIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}
```

---

## 在 AI SDK 中如何獲取

### 1. 從 StreamTextResult 獲取（伺服器端）

```typescript
import { createLearningAgentV2Stream } from '@/services/learning-agent-v2.server';
import type { GoogleGenerativeAIProviderMetadata } from '@ai-sdk/google';

const result = await createLearningAgentV2Stream({ messages, userId });

// 等待 stream 完成
const response = await result.response;

// 獲取 metadata
const metadata = response.providerMetadata as GoogleGenerativeAIProviderMetadata;

if (metadata?.groundingMetadata) {
  console.log('Search queries:', metadata.groundingMetadata.webSearchQueries);
  console.log('Sources:', metadata.groundingMetadata.groundingChunks);
  console.log('Supports:', metadata.groundingMetadata.groundingSupports);
}
```

### 2. 從 useChat hook 獲取（前端）

```tsx
import { useChat } from '@ai-sdk/react';

function ChatComponent() {
  const { messages } = useChat({
    transport: new DefaultChatTransport({ api: '/api/agent-chat' }),
  });

  return (
    <div>
      {messages.map(message => {
        // Check if this message has grounding metadata
        // Note: This depends on how the backend streams the metadata
        // You might need to check message.annotations or custom data

        return (
          <MessageWithCitations
            key={message.id}
            message={message}
          />
        );
      })}
    </div>
  );
}
```

**注意**：目前 `useChat` hook 可能不會自動包含 `providerMetadata`。你可能需要：

#### 選項 A：在後端將 metadata 加入回應
```typescript
// app/routes/api.agent-chat.ts
export async function action({ request }: ActionFunctionArgs) {
  const result = await createLearningAgentV2Stream({ messages, userId });

  // Get metadata after stream completes
  const response = await result.response;
  const metadata = response.providerMetadata;

  // 方法 1: 使用 experimental_data 傳遞 metadata
  return result.toUIMessageStreamResponse({
    experimental_data: {
      groundingMetadata: metadata,
    },
  });

  // 或者方法 2: 將 metadata 加入最後一個 message 的 annotations
}
```

#### 選項 B：創建獨立的 API endpoint 獲取 metadata
```typescript
// app/routes/api.agent-metadata.$messageId.ts
export async function loader({ params }: LoaderFunctionArgs) {
  const { messageId } = params;
  // 從 database 或 cache 獲取該訊息的 metadata
  return json({ metadata });
}
```

---

## 完整使用範例

### 情境：顯示搜尋結果和引用來源的聊天訊息

```tsx
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { GoogleGenerativeAIProviderMetadata } from '@ai-sdk/google';

interface MessageWithGroundingProps {
  text: string;
  metadata?: GoogleGenerativeAIProviderMetadata;
}

export function MessageWithGrounding({ text, metadata }: MessageWithGroundingProps) {
  const grounding = metadata?.groundingMetadata;

  if (!grounding) {
    // No grounding data, show normal message
    return <Markdown>{text}</Markdown>;
  }

  return (
    <div className="space-y-3">
      {/* Show search queries if available */}
      {grounding.webSearchQueries && grounding.webSearchQueries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {grounding.webSearchQueries.map((query, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              🔍 {query}
            </Badge>
          ))}
        </div>
      )}

      {/* Message text with citations */}
      <div className="prose prose-sm">
        {grounding.groundingSupports && grounding.groundingChunks ? (
          <CitedText
            text={text}
            supports={grounding.groundingSupports}
            chunks={grounding.groundingChunks}
          />
        ) : (
          <Markdown>{text}</Markdown>
        )}
      </div>

      {/* Sources list */}
      {grounding.groundingChunks && grounding.groundingChunks.length > 0 && (
        <div className="mt-4 p-3 border rounded-lg bg-muted/50">
          <p className="text-xs font-medium mb-2">📚 參考來源：</p>
          <div className="space-y-1">
            {grounding.groundingChunks.map((chunk, idx) => (
              <a
                key={idx}
                href={chunk.web?.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-blue-600 hover:underline"
              >
                [{idx + 1}] {chunk.web?.title || new URL(chunk.web?.uri || '').hostname}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Google Search Entry Point (optional) */}
      {grounding.searchEntryPoint?.renderedContent && (
        <div
          className="my-4 [&_*]:max-w-full"
          dangerouslySetInnerHTML={{
            __html: grounding.searchEntryPoint.renderedContent
          }}
        />
      )}
    </div>
  );
}
```

---

## 型別定義

```typescript
import type { GoogleGenerativeAIProviderMetadata } from '@ai-sdk/google';

// 完整的 grounding metadata 型別
type GroundingMetadata = NonNullable<GoogleGenerativeAIProviderMetadata['groundingMetadata']>;

type WebSearchQuery = string;

type GroundingChunk = {
  web?: {
    uri: string;
    title?: string | null;
  } | null;
};

type GroundingSupport = {
  segment: {
    startIndex?: number | null;
    endIndex?: number | null;
    text?: string | null;
  };
  groundingChunkIndices?: number[] | null;
  confidenceScores?: number[] | null; // AI SDK 額外提供
};

type SearchEntryPoint = {
  renderedContent: string;
};
```

---

## 最佳實踐

### 1. 顯示來源建立信任
-   永遠顯示 `groundingChunks` 作為參考來源列表
-   讓用戶可以點擊查看原始網頁
-   使用 `[1]`, `[2]` 等標記連接文字和來源

### 2. 高亮引用文字
-   使用 `groundingSupports` 高亮有來源支持的文字
-   用顏色或底線區分有引用和無引用的文字
-   提供 tooltip 顯示該片段的來源

### 3. 透明度
-   顯示 `webSearchQueries` 讓用戶知道 AI 搜尋了什麼
-   如果有 `confidenceScores`，可以顯示信心程度
-   明確標示哪些內容來自搜尋，哪些來自模型知識

### 4. 效能考量
- ⚠️ `searchEntryPoint.renderedContent` 是 HTML，使用時要 sanitize
- ⚠️ 大量的 `groundingSupports` 可能影響渲染效能
- ⚠️ 考慮懶加載來源列表（如果很多）

---

## 常見問題

### Q: 為什麼我的訊息沒有 groundingMetadata？
A: 可能原因：
1. 模型判斷不需要搜尋（內建知識已足夠）
2. 用戶問題不需要最新資訊
3. 後端沒有正確傳遞 metadata 到前端

### Q: 如何判斷 AI 是否使用了搜尋？
A: 檢查 `groundingMetadata` 是否存在：
```typescript
const usedSearch = !!metadata?.groundingMetadata?.webSearchQueries?.length;
```

### Q: confidenceScores 代表什麼？
A: 表示該文字片段與來源的相關程度（0-1）：
- `> 0.8`: 高信心，強相關
- `0.5-0.8`: 中等信心
- `< 0.5`: 低信心，可能需要額外驗證

### Q: 如何在前端從 useChat 獲取 metadata？
A: 目前需要在後端手動傳遞，有兩種方式：
1. 使用 `experimental_data` 在 stream 回應中傳遞
2. 創建獨立 API endpoint 獲取特定訊息的 metadata

---

## 結論

Grounding metadata 提供了強大的功能來建立可信賴的 AI 應用：
- 📚 **來源透明**：用戶可以驗證資訊來源
- 🎯 **精確引用**：內嵌引用連接文字和來源
- 🔍 **搜尋可見**：展示 AI 的搜尋過程
- 💡 **建立信任**：提高用戶對 AI 回應的信心
