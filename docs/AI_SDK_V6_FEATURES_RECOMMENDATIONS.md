# AI SDK 6 Beta - 進階功能建議方案

基於你的教學評分系統（Teacher & Student Grading Platform），以下是可以利用 AI SDK 6 Beta 實現的驚人功能建議。

---

## 🎯 已實現功能分析

### 當前 AI 功能
你的系統目前已使用：
1. **結構化評分生成** (`generateObject`) - [ai-sdk-provider.server.ts](../app/services/ai-sdk-provider.server.ts)
2. **串流式 Rubric 助手** (`streamText`) - [api.ai.rubric-chat.ts](../app/routes/api.ai.rubric-chat.ts)
3. **Gemini 思考模式** (thinkingConfig) - 已啟用 8192 token 推理預算
4. **多 API Key 健康追蹤** - KeyHealthTracker 智能選擇

---

## 🚀 推薦新功能（按影響力排序）

### 1. 🤖 智能評分 Agent（最高優先級）
**功能描述**：讓 AI 自動執行多步驟評分流程，包括文件分析、網路查證、程式碼執行等。

**技術實現**：
- 使用 `Agent` 類別 + `ToolLoopAgent`
- 定義工具：程式碼執行器、抄襲檢測、參考資料查詢、計算器等
- 自動迭代執行直到完成評分

**驚人之處**：
- AI 可以**自動運行學生的程式碼**並測試結果
- AI 可以**查詢網路資料**驗證學生報告的真實性
- AI 可以**調用計算器**精確計算數學題目
- 完全自動化，無需人工介入每個步驟

**應用場景**：
```typescript
// 評分 Agent 範例
const gradingAgent = new ToolLoopAgent({
  model: gemini('gemini-2.5-flash'),
  tools: {
    runCode: tool({
      description: '執行學生提交的程式碼並返回結果',
      parameters: z.object({
        code: z.string(),
        language: z.string(),
        testCases: z.array(z.object({
          input: z.string(),
          expectedOutput: z.string()
        }))
      }),
      execute: async ({ code, language, testCases }) => {
        // 在沙箱中執行程式碼
        return runInSandbox(code, language, testCases);
      }
    }),
    checkPlagiarism: tool({
      description: '檢查作業是否有抄襲嫌疑',
      parameters: z.object({
        submissionId: z.string(),
        content: z.string()
      }),
      execute: async ({ submissionId, content }) => {
        // 與歷史作業和網路資源比對
        return await plagiarismCheck(submissionId, content);
      }
    }),
    searchReference: tool({
      description: '搜尋學術資料或技術文檔',
      parameters: z.object({
        query: z.string()
      }),
      execute: async ({ query }) => {
        // 調用搜尋 API
        return await searchAcademicDB(query);
      }
    })
  },
  stopWhen: (step) => {
    // 當 AI 說「評分完成」時停止
    return step.text.includes('評分完成');
  }
});

// 使用
const result = await gradingAgent.run({
  prompt: `請評分這份程式作業：
    作業要求：${assignment.requirements}
    學生程式碼：${submission.code}
    評分標準：${rubric}

    請執行程式碼測試、檢查抄襲、並給出詳細評分。`
});
```

**資料庫擴展**：
```prisma
model GradingSession {
  // 新增欄位
  agentSteps      Json?          // 記錄 Agent 執行的每個步驟
  toolCalls       Json?          // 記錄所有工具調用
  executionTrace  String?  @db.Text  // 完整執行軌跡
}
```

---

### 2. 📄 多模態文件智能分析
**功能描述**：直接分析 PDF、圖片、Word 文件，無需轉換為純文字。

**技術實現**：
- 使用 Gemini 的多模態能力（已支援 PDF、圖片）
- 在 `streamText` 或 `generateObject` 中直接傳遞檔案

**驚人之處**：
- **直接讀取 PDF** 的圖表、公式、版面配置
- **分析手寫作業**的圖片
- **理解設計作業**的排版和美學
- AI 可以「看到」學生提交的實際內容

**實現範例**：
```typescript
// 在現有的 gradeWithGemini 中擴展
const result = await generateObject({
  model: geminiProvider('gemini-2.5-flash'),
  schema: GradingResultSchema,
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        {
          type: 'file',
          data: submission.pdfBuffer,  // PDF 檔案
          mimeType: 'application/pdf'
        },
        {
          type: 'image',
          image: submission.imageUrl  // 或圖片 URL
        }
      ]
    }
  ],
  temperature: 0.3,
});
```

**UI 改進**：
- 在評分結果中顯示「AI 已分析 3 個 PDF 頁面、2 張圖片」
- 顯示 AI 在文件中標記的關鍵區域（如：「第 2 頁的公式有錯誤」）

---

### 3. 🎨 Generative UI - 動態生成評分介面
**功能描述**：AI 根據作業類型**自動生成客製化的評分界面**。

**技術實現**：
- 使用 `streamUI` 或 React Server Components
- AI 返回 React 元件而非純文字

**驚人之處**：
- 程式作業 → 生成**程式碼高亮編輯器** + **執行結果視覺化**
- 數學作業 → 生成**互動式數學公式渲染器**
- 設計作業 → 生成**圖片對比滑塊**
- 完全客製化，每個作業都有最適合的 UI

**實現範例**：
```typescript
// 新增 API route: api.ai.dynamic-grading-ui.ts
const result = streamUI({
  model: gemini('gemini-2.5-flash'),
  prompt: `根據這個作業生成評分界面：${assignment}`,
  text: ({ content }) => <div>{content}</div>,
  tools: {
    showCodeComparison: {
      description: '顯示程式碼對比',
      parameters: z.object({
        studentCode: z.string(),
        referenceCode: z.string(),
        highlights: z.array(z.object({
          line: z.number(),
          message: z.string()
        }))
      }),
      generate: async ({ studentCode, referenceCode, highlights }) => (
        <CodeComparisonPanel
          left={studentCode}
          right={referenceCode}
          annotations={highlights}
        />
      )
    },
    showScoreBreakdown: {
      description: '顯示評分細項',
      parameters: z.object({
        criteria: z.array(z.object({
          name: z.string(),
          score: z.number(),
          maxScore: z.number(),
          feedback: z.string()
        }))
      }),
      generate: async ({ criteria }) => (
        <InteractiveScoreChart data={criteria} />
      )
    }
  }
});
```

---

### 4. 🧠 RAG - 知識庫增強評分
**功能描述**：AI 從課程講義、教科書、過往作業中檢索相關知識來評分。

**技術實現**：
- 建立 Vector Database (可用 PostgreSQL pgvector 擴展)
- 使用 `embed` API 生成 embeddings
- 在評分前先檢索相關資料

**驚人之處**：
- AI **參考老師的課堂講義**來評分
- AI **查閱過往優秀作業**作為標準
- AI **引用教科書段落**解釋評分理由
- 確保評分標準一致性

**實現範例**：
```typescript
// 1. 建立知識庫 embedding
import { embed } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI();

async function indexCourseMaterials(courseId: string) {
  const materials = await prisma.courseMaterial.findMany({
    where: { courseId }
  });

  for (const material of materials) {
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value: material.content
    });

    await prisma.courseMaterialEmbedding.create({
      data: {
        materialId: material.id,
        embedding: embedding  // PostgreSQL vector type
      }
    });
  }
}

// 2. RAG 評分
async function gradeWithRAG(submission: Submission, rubric: Rubric) {
  // 檢索相關資料
  const queryEmbedding = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: submission.content
  });

  const relevantMaterials = await prisma.$queryRaw`
    SELECT content, 1 - (embedding <=> ${queryEmbedding}::vector) as similarity
    FROM course_material_embeddings
    WHERE similarity > 0.7
    ORDER BY similarity DESC
    LIMIT 5
  `;

  // 使用檢索到的資料增強 prompt
  const enhancedPrompt = `
    參考以下課程資料進行評分：
    ${relevantMaterials.map(m => m.content).join('\n\n')}

    學生作業：
    ${submission.content}

    評分標準：
    ${rubric}
  `;

  return await gradeWithGemini({ prompt: enhancedPrompt, ... });
}
```

**資料庫擴展**：
```prisma
model CourseMaterial {
  id          String   @id @default(uuid())
  courseId    String
  course      Course   @relation(fields: [courseId], references: [id])
  title       String
  content     String   @db.Text
  type        String   // 'lecture', 'textbook', 'reference'
  embeddings  CourseMaterialEmbedding[]
}

model CourseMaterialEmbedding {
  id          String   @id @default(uuid())
  materialId  String
  material    CourseMaterial @relation(fields: [materialId], references: [id])
  embedding   Unsupported("vector(1536)")  // pgvector extension

  @@index([embedding], type: Gin)
}
```

---

### 5. ✅ Human-in-the-Loop - 工具批准系統
**功能描述**：AI 執行敏感操作（如給低分、檢測抄襲）前先請求老師批准。

**技術實現**：
- 使用 Tool 的 `needsApproval` 參數
- 整合 WebSocket 即時通知老師

**驚人之處**：
- **避免誤判**：AI 懷疑抄襲時先通知老師
- **彈性決策**：老師可以覆蓋 AI 決定
- **教育意義**：保留人性化判斷空間

**實現範例**：
```typescript
const gradingWithApproval = streamText({
  model: gemini('gemini-2.5-flash'),
  prompt: `評分這份作業：${submission}`,
  tools: {
    flagPlagiarism: tool({
      description: '標記作業為抄襲',
      parameters: z.object({
        reason: z.string(),
        similarity: z.number(),
        source: z.string()
      }),
      needsApproval: true,  // 需要批准！
      execute: async ({ reason, similarity, source }) => {
        // 標記為抄襲
        await markAsPlagiarism(submission.id, { reason, similarity, source });
        return '已標記為抄襲';
      }
    }),
    giveLowScore: tool({
      description: '給予不及格分數（< 60分）',
      parameters: z.object({
        score: z.number(),
        reason: z.string()
      }),
      needsApproval: true,
      execute: async ({ score, reason }) => {
        await updateScore(submission.id, score, reason);
        return `已給予 ${score} 分`;
      }
    })
  },
  onToolApprovalRequired: async ({ toolCall }) => {
    // 發送 WebSocket 通知給老師
    await notifyTeacher({
      type: 'TOOL_APPROVAL_REQUIRED',
      toolName: toolCall.toolName,
      args: toolCall.args,
      submissionId: submission.id
    });

    // 等待老師回應
    return await waitForTeacherApproval(submission.id, toolCall.id);
  }
});
```

---

### 6. 📊 串流式進度視覺化
**功能描述**：評分過程中即時顯示 AI 的思考過程和進度。

**技術實現**：
- 使用 `streamText` 的 `onStepFinish` 回調
- 透過 Data Stream Protocol 傳送自訂資料

**驚人之處**：
- 學生看到「AI 正在分析程式邏輯...」
- 顯示進度條：「1/5 項目已評分」
- 展示 AI 的**推理過程**（Gemini thinkingConfig）

**實現範例**：
```typescript
// 修改現有的 streamText
const result = streamText({
  model: geminiProvider('gemini-2.5-flash'),
  prompt: gradingPrompt,
  onStepFinish: ({ text, toolCalls, usage, finishReason }) => {
    // 發送進度更新（透過 streamData）
    streamData.append({
      type: 'progress',
      step: currentStep,
      totalSteps: totalSteps,
      message: `正在評分：${criteriaName}`,
      reasoning: text  // AI 的思考過程
    });
  },
  providerOptions: {
    google: {
      thinkingConfig: {
        thinkingBudget: 16384,  // 更多推理預算
        includeThoughts: true
      }
    }
  }
});

// 前端使用 useChat
const { messages, data } = useChat({
  api: '/api/ai/grade-stream'
});

// 顯示進度
{data?.progress && (
  <div className="flex items-center gap-2">
    <Spinner />
    <span>{data.progress.message}</span>
    <Progress value={(data.progress.step / data.progress.totalSteps) * 100} />
  </div>
)}

// 顯示推理過程
{data?.reasoning && (
  <Collapsible>
    <CollapsibleTrigger>查看 AI 思考過程</CollapsibleTrigger>
    <CollapsibleContent>
      <pre className="text-xs">{data.reasoning}</pre>
    </CollapsibleContent>
  </Collapsible>
)}
```

---

### 7. 🔄 重新排序（Reranking）- 智能參考資料排序
**功能描述**：當學生查詢「如何提高分數」時，AI 重新排序課程資料，找出最相關的建議。

**技術實現**：
- 使用 `rerank` API（Cohere 或其他 provider）
- 結合 RAG 系統

**驚人之處**：
- 搜尋「程式優化」→ 自動排序找出最相關的課堂範例
- 比傳統向量搜尋更精準（考慮語意關聯）

**實現範例**：
```typescript
import { rerank } from 'ai';
import { createCohere } from '@ai-sdk/cohere';

const cohere = createCohere();

async function findRelevantFeedback(query: string, courseId: string) {
  // 1. 先用向量搜尋找出候選資料
  const candidates = await prisma.pastFeedback.findMany({
    where: { courseId },
    take: 50
  });

  // 2. 使用 Reranking 重新排序
  const { rerankedResults } = await rerank({
    model: cohere.reranker('rerank-english-v3.0'),
    query: query,
    documents: candidates.map(c => c.content)
  });

  // 3. 返回最相關的前 5 個
  return rerankedResults.slice(0, 5).map(r =>
    candidates[r.index]
  );
}
```

---

### 8. 🎙️ 語音評語（Audio Generation）
**功能描述**：AI 生成**語音版本**的評分反饋。

**技術實現**：
- 使用 OpenAI TTS API
- 將文字評語轉為語音檔案

**驚人之處**：
- 學生可以「聽」評語而非只是「讀」
- 更親切、更有溫度的反饋方式
- 適合視覺障礙學生

---

## 📋 實作優先級建議

### 立即實作（本週）
1. **智能評分 Agent** - 最大亮點，展現 AI SDK 6 核心能力
2. **多模態文件分析** - 立即提升評分準確度

### 短期實作（2-4 週）
3. **串流式進度視覺化** - 提升用戶體驗
4. **Human-in-the-Loop** - 增加系統可信度

### 中期實作（1-2 個月）
5. **RAG 知識庫** - 需要資料準備和 pgvector 設置
6. **Generative UI** - 技術複雜度較高

### 長期實作（選配）
7. **Reranking** - 需要額外的 Cohere API
8. **語音評語** - 錦上添花功能

---

## 💡 技術債務建議

### 需要的基礎設施升級
1. **PostgreSQL pgvector 擴展** - 用於 RAG embeddings
2. **WebSocket 強化** - 用於即時批准通知
3. **沙箱環境** - 用於安全執行學生程式碼
4. **物件儲存擴展** - 儲存語音檔案

### Schema 擴展
```prisma
// 新增模型
model CourseMaterial { ... }           // RAG 知識庫
model CourseMaterialEmbedding { ... }  // Vector embeddings
model AgentExecutionLog { ... }       // Agent 執行記錄
model ToolApproval { ... }             // 工具批准記錄

// 擴展現有模型
model GradingSession {
  agentSteps      Json?
  toolCalls       Json?
  multiModalFiles String[]  // 多模態檔案清單
  audioFeedbackUrl String? // 語音評語連結
}
```

---

## 🎯 核心價值主張

使用這些 AI SDK 6 功能後，你的系統將能夠：

1. **自主決策** - Agent 自動執行複雜評分流程
2. **多模態理解** - 真正「看懂」PDF、圖片、手寫內容
3. **動態適應** - 根據作業類型生成客製化界面
4. **知識增強** - 參考課程資料確保評分一致性
5. **透明可控** - 敏感操作需人工批准
6. **即時反饋** - 串流式顯示評分進度和推理過程

這將是**市場上最先進的 AI 評分系統**，遠超傳統的「AI 給個分數」功能！
