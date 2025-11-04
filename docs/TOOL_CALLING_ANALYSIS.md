# Tool Calling 分析和使用建議

## 什麼是 Tool Calling？

Tool Calling 是 AI SDK 的一個進階功能，讓 AI 可以**主動呼叫函數**來完成任務。

### 基本概念
```
User: "幫我建立一門 Python 課程並自動加入 3 個班級"
  ↓
AI: "我需要先查詢現有課程代碼，避免重複"
  ↓ [AI 決定呼叫 tool]
AI calls: checkExistingCourseCode("CS101")
  ↓ [工具執行並回傳結果]
Tool returns: { exists: false }
  ↓ [AI 根據結果繼續]
AI calls: createCourseDraft({ name: "Python 入門", code: "CS101" })
  ↓
AI calls: addClassesToCourse({ courseId: "...", count: 3 })
  ↓
AI: "課程已建立，包含 3 個班級"
```

---

## Tool Calling 的實作方式

### 後端定義工具
```typescript
import { generateText, tool } from 'ai';
import { z } from 'zod';

// 定義可用的工具
const tools = {
  // 工具 1：檢查課程代碼是否已存在
  checkCourseCode: tool({
    description: '檢查課程代碼是否已被使用',
    parameters: z.object({
      code: z.string().describe('課程代碼，例如 CS101'),
    }),
    execute: async ({ code }) => {
      const exists = await prisma.course.findFirst({
        where: { code },
      });
      return { exists: !!exists, code };
    },
  }),

  // 工具 2：建立課程草稿
  createCourseDraft: tool({
    description: '建立課程的基本資訊',
    parameters: z.object({
      name: z.string(),
      code: z.string(),
      description: z.string().optional(),
    }),
    execute: async ({ name, code, description }) => {
      // 這裡不真的建立，只是返回草稿
      return {
        success: true,
        draft: { name, code, description },
      };
    },
  }),

  // 工具 3：建議班級時間
  suggestClassSchedules: tool({
    description: '根據課程類型建議上課時間',
    parameters: z.object({
      courseType: z.enum(['theory', 'lab', 'seminar']),
      classCount: z.number(),
    }),
    execute: async ({ courseType, classCount }) => {
      const schedules = {
        theory: ['週一 3-4節', '週三 1-2節'],
        lab: ['週二 6-9節', '週四 6-9節'],
        seminar: ['週五 3-5節'],
      };
      return schedules[courseType].slice(0, classCount);
    },
  }),
};

// 使用工具
export async function action({ request }) {
  const { messages } = await request.json();

  const result = await generateText({
    model: googleProvider('gemini-2.0-flash-exp'),
    messages,
    tools,
    maxSteps: 5,  // 👈 允許 AI 最多呼叫 5 次工具
  });

  // 取得最終結果
  const finalResponse = result.text;
  const toolCalls = result.toolCalls;  // AI 呼叫了哪些工具
  const toolResults = result.toolResults;  // 工具的回傳值

  return Response.json({
    response: finalResponse,
    toolsUsed: toolCalls.map(tc => tc.toolName),
  });
}
```

### 前端使用
```typescript
// 方式 1：使用 useChat with tools
const { messages, append } = useChat({
  api: '/api/ai/course-chat',
});

// 方式 2：顯示工具呼叫過程
messages.forEach(msg => {
  if (msg.toolInvocations) {
    msg.toolInvocations.forEach(tool => {
      console.log(`AI called: ${tool.toolName}`);
      console.log(`Result:`, tool.result);
    });
  }
});
```

---

## 當前課程建立功能需要 Tool Calling 嗎？

### ❌ **不需要**，原因如下：

#### 1. 任務簡單直接
```
User: "建立 Python 課程"
  ↓
AI: 直接生成課程 JSON
  ↓
Done ✅
```

**不需要多步驟：**
- ✅ 不需要查詢資料庫
- ✅ 不需要執行外部 API
- ✅ 不需要複雜計算
- ✅ 一次生成就能完成

#### 2. 資料驗證在應用層
```typescript
// 我們在應用層處理驗證，不需要 AI 呼叫工具
const course = await createCourse(userId, courseData);  // Prisma 會檢查重複
```

#### 3. 增加複雜度但沒有明顯好處
- 需要維護多個工具定義
- 需要處理工具執行錯誤
- 需要顯示工具呼叫過程
- 但用戶體驗沒有明顯提升

---

## 什麼情況下**應該**用 Tool Calling？

### ✅ 適合場景

#### 場景 1：需要查詢動態資料
```typescript
// 例如：AI 需要知道當前有哪些課程
tools: {
  listExistingCourses: tool({
    description: '查詢教師目前開設的所有課程',
    execute: async () => {
      const courses = await prisma.course.findMany({
        where: { teacherId: userId },
      });
      return courses.map(c => ({ name: c.name, code: c.code }));
    },
  }),
}

// User: "幫我建立一門新課程，代碼不要跟現有的重複"
// AI 會先呼叫 listExistingCourses 來查詢
```

#### 場景 2：多步驟工作流程
```typescript
tools: {
  // 步驟 1
  analyzeCourseRequirements: tool({...}),
  // 步驟 2
  checkPrerequisites: tool({...}),
  // 步驟 3
  generateDetailedSyllabus: tool({...}),
  // 步驟 4
  estimateCourseLoad: tool({...}),
}

// User: "幫我規劃一門完整的機器學習課程"
// AI 會依序呼叫多個工具來完成複雜規劃
```

#### 場景 3：需要外部 API
```typescript
tools: {
  searchAcademicPapers: tool({
    description: '搜尋學術論文作為課程參考資料',
    parameters: z.object({ topic: z.string() }),
    execute: async ({ topic }) => {
      const papers = await fetch(`https://api.semanticscholar.org/...`);
      return papers;
    },
  }),
}

// User: "建立深度學習課程，包含最新論文"
// AI 會呼叫工具搜尋論文
```

#### 場景 4：動態計算
```typescript
tools: {
  calculateOptimalSchedule: tool({
    description: '根據教室使用率計算最佳上課時間',
    parameters: z.object({
      classCount: z.number(),
      roomType: z.string(),
    }),
    execute: async ({ classCount, roomType }) => {
      // 複雜的時間衝突檢查邏輯
      const availability = await checkRoomAvailability(roomType);
      return optimizeSchedule(availability, classCount);
    },
  }),
}
```

---

## 實際範例：如果使用 Tool Calling

### 當前方式（無 tools）
```typescript
// API
const result = streamText({
  model: googleProvider('gemini-2.0-flash-exp'),
  system: '生成課程 JSON...',
  messages,
});

// 流程
User → AI → JSON → Done
```

### 使用 Tool Calling
```typescript
// API
const tools = {
  validateCourseCode: tool({
    description: '驗證課程代碼格式並檢查是否重複',
    parameters: z.object({ code: z.string() }),
    execute: async ({ code }) => {
      // 檢查格式
      if (!/^[A-Z]{2,4}\d{3}$/.test(code)) {
        return { valid: false, reason: '格式錯誤' };
      }
      // 檢查重複
      const exists = await prisma.course.findFirst({ where: { code } });
      return { valid: !exists, reason: exists ? '代碼已存在' : null };
    },
  }),

  suggestCourseCode: tool({
    description: '根據課程名稱建議代碼',
    parameters: z.object({ name: z.string() }),
    execute: async ({ name }) => {
      // 簡單邏輯：根據名稱產生代碼
      const prefix = name.includes('程式') ? 'CS' :
                     name.includes('數學') ? 'MATH' : 'GEN';
      const number = Math.floor(Math.random() * 900) + 100;
      return `${prefix}${number}`;
    },
  }),

  createCourseDraft: tool({
    description: '建立課程草稿',
    parameters: CourseCreationSchema,
    execute: async (courseData) => {
      // 不真的存資料庫，只返回草稿
      return { success: true, draft: courseData };
    },
  }),
};

const result = await generateText({
  model: googleProvider('gemini-2.0-flash-exp'),
  messages,
  tools,
  maxSteps: 5,
});

// 流程
User → AI → Tool: validateCourseCode → Tool: suggestCourseCode → Tool: createCourseDraft → Done
```

**這樣做的好處：**
- ✅ AI 可以主動驗證代碼
- ✅ AI 可以建議更好的代碼
- ✅ 流程更智慧

**但是：**
- ⚠️ 複雜度大增
- ⚠️ 難以除錯
- ⚠️ 對於簡單的課程建立來說是 overkill

---

## 評估標準：我需要 Tool Calling 嗎？

問自己這些問題：

### 1. AI 需要查詢動態資料嗎？
- ❌ 不需要 → 不用 tools
- ✅ 需要 → 考慮 tools

**課程建立：** ❌ 不需要查詢資料庫

### 2. 任務需要多個步驟嗎？
- ❌ 一次生成就完成 → 不用 tools
- ✅ 需要多步驟協作 → 考慮 tools

**課程建立：** ❌ 一次生成 JSON 即可

### 3. 需要呼叫外部 API 嗎？
- ❌ 不需要 → 不用 tools
- ✅ 需要 → 考慮 tools

**課程建立：** ❌ 不需要外部 API

### 4. 有複雜的業務邏輯嗎？
- ❌ 簡單規則 → 不用 tools
- ✅ 複雜計算/決策 → 考慮 tools

**課程建立：** ❌ 簡單的資料填寫

### 5. 用戶體驗會明顯提升嗎？
- ❌ 差不多 → 不用 tools
- ✅ 明顯更好 → 考慮 tools

**課程建立：** ❌ 差別不大

---

## 什麼時候應該為課程系統加入 Tool Calling？

### 未來可能的場景

#### 1. 智慧課程規劃助手
```typescript
tools: {
  analyzeTeachingLoad: tool({
    description: '分析教師教學負擔',
    execute: async () => {
      const courses = await prisma.course.count({ where: { teacherId } });
      const hours = await calculateTeachingHours(teacherId);
      return { courseCount: courses, weeklyHours: hours };
    },
  }),

  findOptimalClassTime: tool({
    description: '找出最適合的上課時間',
    execute: async ({ preferences }) => {
      const availability = await getRoomAvailability();
      const studentSchedules = await getStudentSchedules();
      return optimizeSchedule(availability, studentSchedules, preferences);
    },
  }),

  suggestPrerequisites: tool({
    description: '建議先修課程',
    execute: async ({ courseLevel, subject }) => {
      const similar = await prisma.course.findMany({
        where: { code: { startsWith: subject } },
      });
      return analyzeDependencies(similar, courseLevel);
    },
  }),
};

// User: "幫我規劃下學期的課程，考慮我的教學時數和學生需求"
// AI 會呼叫多個工具進行智慧分析
```

#### 2. 課程改進建議
```typescript
tools: {
  analyzeStudentFeedback: tool({
    description: '分析學生回饋',
    execute: async ({ courseId }) => {
      const feedback = await getCourseFeedback(courseId);
      return analyzeSentiment(feedback);
    },
  }),

  suggestImprovements: tool({
    description: '建議課程改進方向',
    execute: async ({ analysisResult }) => {
      // 根據分析結果提供建議
      return generateImprovementPlan(analysisResult);
    },
  }),
};

// User: "幫我改善上學期的 Python 課程"
// AI 會分析回饋並提供具體建議
```

---

## 總結對比表

| 特性 | 當前實作 | 加入 Tool Calling |
|------|---------|------------------|
| **複雜度** | 低 ✅ | 高 ⚠️ |
| **維護成本** | 低 ✅ | 高 ⚠️ |
| **功能彈性** | 中 | 高 ✅ |
| **除錯難度** | 低 ✅ | 高 ⚠️ |
| **資料查詢** | 無 | 可動態查詢 ✅ |
| **多步驟流程** | 不支援 | 支援 ✅ |
| **適用場景** | 簡單生成 ✅ | 複雜規劃 ✅ |
| **開發時間** | 短 ✅ | 長 ⚠️ |

---

## 我的建議

### 🎯 當前階段：**不需要** Tool Calling

**理由：**
1. ✅ 課程建立是簡單任務
2. ✅ 不需要查詢動態資料
3. ✅ 一次生成就能完成
4. ✅ 降低複雜度和維護成本

### 🚀 未來考慮 Tool Calling 的時機：

#### 情境 1：智慧排課系統
```
"幫我排下學期的課表，避免時間衝突，最大化教室利用率"
→ 需要查詢教室、檢查衝突、優化排程
→ ✅ 適合 Tool Calling
```

#### 情境 2：課程品質分析
```
"分析我所有課程的學生表現，找出需要改進的地方"
→ 需要查詢成績、分析趨勢、生成報告
→ ✅ 適合 Tool Calling
```

#### 情境 3：個性化學習路徑
```
"根據學生程度推薦合適的課程順序"
→ 需要查詢學生記錄、分析能力、規劃路徑
→ ✅ 適合 Tool Calling
```

---

## 快速參考

### 不需要 Tools 的信號 ✅
- [ ] 一次性資料生成
- [ ] 不需要查詢資料庫
- [ ] 簡單的輸入→輸出轉換
- [ ] 靜態知識即可回答
- [ ] 當前課程建立 ← **你在這裡**

### 需要 Tools 的信號 🚀
- [ ] 多步驟工作流程
- [ ] 需要即時資料查詢
- [ ] 需要外部 API 整合
- [ ] 複雜決策和計算
- [ ] 動態環境互動

---

## 範例程式碼（如果未來要用）

完整的 Tool Calling 範例在文件末尾，當您需要時可以參考：

```typescript
// docs/examples/tool-calling-example.ts
// 完整的可運行範例
```

---

**結論：** 當前課程建立功能**不需要** Tool Calling。保持簡單就好！🎯
