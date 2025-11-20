# AI SDK 實作方式對比

## 當前實作：streamText() + 手動解析

### 資料流程
```
User Input → AI generates text with JSON → Parse JSON from markdown → Validate with Zod → Use data
```

### 後端實作 (當前)
```typescript
// app/routes/api.ai.course-chat.ts
import { streamText, convertToModelMessages } from 'ai';

const result = streamText({
  model: googleProvider('gemini-2.0-flash-exp'),
  system: COURSE_CREATION_SYSTEM_PROMPT,  // 提示詞要求輸出 JSON
  messages: coreMessages,
  temperature: 0.7,
});

return result.toUIMessageStreamResponse();
```

**系統提示詞範例：**
```
你必須在回應中包含 JSON 代碼塊：
```json
{
  "name": "課程名稱",
  "code": "CS101",
  "description": "..."
}
```
```

### 前端實作 (當前)
```typescript
// app/components/courses/AICourseAssistant.tsx
import { useChat } from '@ai-sdk/react';

const { messages, sendMessage } = useChat({
  transport: new DefaultChatTransport({ api: '/api/ai/course-chat' }),
});

// 手動解析
const parsedMessages = useMemo(() => {
  return messages.map((msg) => {
    if (msg.role === 'assistant') {
      const content = getMessageContent(msg);
      return {
        ...msg,
        parsed: parseCourseFromMessage(content),  // 👈 手動解析
      };
    }
    return msg;
  });
}, [messages]);
```

### 解析函數
```typescript
// app/utils/course-parser.ts
export function parseCourseFromMessage(content: string): CourseCreationData | null {
  try {
    // 1. 提取 JSON from markdown
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonMatch && jsonMatch[1]) {
      const jsonStr = jsonMatch[1].trim();
      const parsed = JSON.parse(jsonStr);  // 👈 手動 JSON.parse

      // 2. 驗證
      const result = CourseCreationSchema.safeParse(parsed);  // 👈 手動驗證

      if (result.success) {
        return result.data;
      }
    }

    return null;
  } catch (error) {
    logger.debug('Failed to parse course');
    return null;
  }
}
```

---

## 替代方案：streamObject() + 自動解析

### 資料流程
```
User Input → AI generates structured object → Auto-validated → Direct use (no parsing!)
```

### 後端實作 (替代方案)
```typescript
// 如果使用 streamObject()
import { streamObject } from 'ai';
import { CourseCreationSchema } from '@/schemas/course-creation';

const result = streamObject({
  model: googleProvider('gemini-2.0-flash-exp'),
  schema: CourseCreationSchema,  // 👈 直接傳 Zod schema
  prompt: userInput,
  temperature: 0.7,
});

return result.toTextStreamResponse();
```

**關鍵差異：**
- ❌ **不需要**系統提示詞要求 JSON 格式
- ❌ **不需要**在 JSON 外包裹 markdown 代碼塊
-   AI SDK 自動告訴 AI 要輸出什麼結構
-   AI SDK 自動驗證輸出

### 前端實作 (替代方案)
```typescript
// 如果使用 experimental_useObject
import { experimental_useObject as useObject } from 'ai/react';

const { object, submit, isLoading } = useObject({
  api: '/api/ai/course-create',
  schema: CourseCreationSchema,  // 👈 直接傳 schema
});

//   直接使用，無需解析！
console.log(object?.name);       // 即時更新
console.log(object?.description); // 即時更新
console.log(object?.classes);     // 即時更新

// ❌ 不需要 parseCourseFromMessage()
// ❌ 不需要 getMessageContent()
// ❌ 不需要正則表達式
```

---

## 詳細對比表

| 特性 | streamText() + 手動解析 | streamObject() + 自動解析 |
|------|------------------------|--------------------------|
| **後端 API** | `streamText()` | `streamObject()` |
| **前端 Hook** | `useChat()` | `experimental_useObject()` |
| **Schema 傳遞** | 在系統提示詞中描述 | 直接傳 `schema` 參數 |
| **輸出格式** | Markdown + JSON 代碼塊 | 純 JSON 結構 |
| **解析方式** | 手動正則 + JSON.parse | AI SDK 自動處理 |
| **驗證方式** | 手動 `safeParse()` | AI SDK 自動驗證 |
| **錯誤處理** | 自己寫 try-catch | AI SDK 內建 |
| **即時更新** | 整個訊息完成後 | 欄位逐個串流更新 |
| **類型安全** | 部分（解析後） | 完全（從頭到尾） |
| **程式碼複雜度** | 高（需要 parser） | 低（無需 parser） |
| **穩定性** | 高（標準 API） | 中（experimental） |
| **訊息歷史** |   支援多輪對話 | ❌ 單次生成 |
| **AI 說明文字** |   可在 JSON 外說明 | ❌ 只有結構化資料 |

---

## 實際範例對比

### 當前方式的 AI 回應（streamText）
```markdown
好的，我為您設計了一門 Python 入門課程：

```json
{
  "name": "Python 程式設計入門",
  "code": "CS101",
  "description": "本課程專為程式設計初學者設計...",
  "syllabus": "第1週：Python 基礎語法\n第2週：資料型別...",
  "classes": [
    {
      "name": "週一班",
      "schedule": { "weekday": "星期一", "periodCode": "3-4節" },
      "capacity": 40
    }
  ]
}
```

這門課程適合大學新生，建議配合實作練習。
```

**前端處理：**
1. 收到完整訊息
2. 用正則提取 JSON 部分
3. `JSON.parse()` 解析
4. `CourseCreationSchema.safeParse()` 驗證
5. 顯示預覽卡片

---

### 使用 streamObject 的回應
```json
{
  "name": "Python 程式設計入門",
  "code": "CS101",
  "description": "本課程專為程式設計初學者設計...",
  "syllabus": "第1週：Python 基礎語法\n第2週：資料型別...",
  "classes": [
    {
      "name": "週一班",
      "schedule": { "weekday": "星期一", "periodCode": "3-4節" },
      "capacity": 40
    }
  ]
}
```

**前端處理：**
1.   直接收到驗證過的物件
2.   欄位逐個更新（可以看到 name → code → description 依序出現）
3.   無需任何解析
4.   顯示預覽卡片

**但是：**
- ❌ 沒有 AI 的說明文字（「這門課程適合大學新生...」）
- ❌ 無法多輪對話修改

---

## 為什麼我選擇 streamText() + 手動解析？

###   優點
1. **穩定性**：`useChat` 是穩定 API，`experimental_useObject` 可能變更
2. **一致性**：與現有 Rubric 助手相同模式
3. **彈性**：AI 可以在 JSON 外提供說明和建議
4. **對話式**：支援多輪對話修改課程
5. **除錯容易**：可以看到完整的 AI 回應文字

### ⚠️ 缺點
1. 需要寫解析函數
2. 需要處理解析錯誤
3. 無法即時看到欄位逐個更新
4. 稍微多一些程式碼

---

## 什麼情況下應該用 streamObject()？

###   適合場景
1. **單次生成**：不需要對話，一次就生成完整資料
2. **純資料輸出**：不需要 AI 的解釋和說明文字
3. **即時回饋**：想看到欄位逐個填入的效果
4. **簡單場景**：資料結構簡單，不需要複雜互動

### ❌ 不適合場景
1. **對話式互動**：需要多輪對話修改內容
2. **需要說明**：希望 AI 解釋為什麼這樣設計
3. **複雜流程**：需要根據用戶回饋調整
4. **生產環境**：不想使用 experimental API

---

## 如何升級到 streamObject()？

如果未來想要使用 `streamObject()`，只需要修改三個檔案：

### 1. 後端 API
```typescript
// app/routes/api.ai.course-create.ts (新檔案)
import { streamObject } from 'ai';

export async function action({ request }: Route.ActionArgs) {
  const userId = await getUserId(request);
  const { prompt } = await request.json();

  const result = streamObject({
    model: googleProvider('gemini-2.0-flash-exp'),
    schema: CourseCreationSchema,
    prompt: prompt,
  });

  return result.toTextStreamResponse();
}
```

### 2. 前端元件
```typescript
// app/components/courses/AICourseAssistant.tsx
import { experimental_useObject as useObject } from 'ai/react';

const { object, submit, isLoading } = useObject({
  api: '/api/ai/course-create',
  schema: CourseCreationSchema,
});

// 直接使用 object，無需解析！
{object && <CoursePreviewCard course={object} />}
```

### 3. 刪除解析器
```bash
# 不再需要
rm app/utils/course-parser.ts
```

---

## 總結

| 方案 | 適用情境 | 程式碼量 | 穩定性 |
|------|---------|---------|--------|
| **streamText() + 手動解析**（當前） | 對話式、需要說明、生產環境 | 中 | 高   |
| **streamObject() + 自動解析** | 單次生成、純資料、快速原型 | 低 | 中 ⚠️ |

**建議：**
- 👍 **當前保持 streamText()**：穩定、彈性、與現有程式碼一致
- 🚀 **未來可考慮 streamObject()**：當 API 穩定後，可用於簡單場景

兩種方式都是有效的，選擇取決於您的需求！
