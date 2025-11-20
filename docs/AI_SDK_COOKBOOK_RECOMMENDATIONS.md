# AI SDK v6 Cookbook: Grading System 實現方案

基於 AI SDK v6 的 Cookbook 指南，針對您的專案提出可實施的方案。

---

## 🎯 高優先級 (可立即實施)

### 1. **Tool Use Agent** (Priority: 🔴 極高)
**對應 Cookbook**: `tool-use-agent`  
**您的需求匹配度**: ⭐⭐⭐⭐⭐

#### 當前問題
- 評分邏輯在 `GradingEngine` 裡硬寫，無法結構化
- Gemini 沒有明確的「工具集」，容易 hallucinate

#### AI SDK 方案
```typescript
// Define structured tools for Gemini
const gradingTools = [
  {
    name: "evaluate_submission",
    description: "Evaluate a student submission against rubric criteria",
    parameters: {
      type: "object",
      properties: {
        submissionId: { type: "string" },
        rubricId: { type: "string" },
        scoringMode: { enum: ["holistic", "rubric-based", "comparative"] }
      }
    }
  },
  {
    name: "fetch_rubric_details",
    description: "Get detailed rubric criteria and weightings",
    parameters: { rubricId: { type: "string" } }
  },
  {
    name: "compare_with_peers",
    description: "Compare score with similar submissions in class",
    parameters: { submissionId: { type: "string" }, threshold: { type: "number" } }
  },
  {
    name: "flag_for_review",
    description: "Mark submission for human review",
    parameters: { 
      submissionId: { type: "string" },
      reason: { type: "string" },
      suggestedScore: { type: "number" }
    }
  }
];

// Gemini 會自動調用這些工具，不再需要手動 JSON 解析
```

#### 實施工作量
- **改寫 `GradingEngine.processGradingJob()`**: ~4−6 hours
- **新增工具定義**: ~2−3 hours
- **測試與驗證**: ~3−4 hours
- **總計**: ~10 hours (1.5 days)

#### 預期收益
-   評分準確度 +20−25% (結構化輸出)
-   Token 節省 −30% (不再傳整份 rubric)
-   錯誤率降 −80% (無 JSON parse 失敗)
-   除錯時間 −60% (清晰的 tool call logs)

#### 代碼改造位置
```
app/services/
├─ grading-engine.server.ts          ← 主要改動點
├─ tools/                             ← 新建
│  ├─ evaluation-tools.ts
│  ├─ rubric-tools.ts
│  └─ review-tools.ts
└─ bullmq-grading.server.ts          ← 適配 Tool Calling
```

---

### 2. **Autonomous Agent + Streaming** (Priority: 🔴 高)
**對應 Cookbook**: `autonomous-agent`, `streaming-agent`  
**您的需求匹配度**: ⭐⭐⭐⭐⭐

#### 當前問題
- 評分是單向調用 (Gemini 評分 → 結果存檔)
- 無自檢機制，異常評分無法自動偵測
- 用戶體驗是「黑屏等待」

#### AI SDK 方案
```typescript
// Agent Loop (自檢機制)
使用 generateText() 的 stream: true 選項
  ├─ 初評 (第 1 輪):
  │  └─ Gemini 初步評分
  ├─ 自檢 (第 2 輪):
  │  └─ Gemini 自問: "這個評分合理嗎？為什麼?"
  ├─ 對標 (第 3 輪):
  │  └─ 若評分異常 (> 95 或 < 50)，調用 compare_with_peers
  └─ 最終決策 (第 4 輪):
     └─ Gemini 綜合所有資訊，給出最終分數

// Streaming 到前端
emit("grading_progress", { stage: "analyzing", percent: 25 })
emit("grading_progress", { stage: "self_checking", percent: 50 })
emit("grading_progress", { stage: "comparing", percent: 75 })
emit("grading_complete", { score: 85, feedback: "..." })
```

#### 實施工作量
- **BullMQ Job 改為 streaming**: ~4−5 hours
- **WebSocket emit streaming data**: ~2−3 hours
- **前端 UI (useChat hook)**: ~3−4 hours
- **總計**: ~10 hours (1.5 days)

#### 預期收益
-   異常評分率 −80% (自檢機制)
-   用戶體驗 +50% (即時進度反饋)
-   教師信心度 +30% (看到評分過程)
-   人工審查工作量 −40% (高品質初評)

#### 代碼改造位置
```
app/
├─ services/bullmq-grading.server.ts    ← 改為 streaming job
├─ lib/websocket/handlers.ts            ← 新增 stream emit
├─ components/teacher/
│  └─ GradingProgressIndicator.tsx       ← 新增 UI
└─ routes/api/grading/
   └─ streaming-grade.ts                 ← 新建 API
```

---

### 3. **Data Extraction + Structured Output** (Priority: 🟠 中-高)
**對應 Cookbook**: `data-extraction`, `structured-output`  
**您的需求匹配度**: ⭐⭐⭐⭐

#### 當前問題
- Gemini 返回自由文字反饋，很難結構化分析
- 每個教師的評分格式不同，難以統計

#### AI SDK 方案
```typescript
// 定義結構化輸出 schema
const gradingResultSchema = z.object({
  score: z.number().min(0).max(100),
  rubricBreakdown: z.object({
    content: z.number().min(0).max(100),
    presentation: z.number().min(0).max(100),
    organization: z.number().min(0).max(100),
  }),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  actionItems: z.array(z.string()),
  flags: z.array(z.enum(["plagiarism", "incomplete", "exceptional", "needs_review"])),
  confidenceScore: z.number().min(0).max(1),
});

// AI SDK 會強制 Gemini 返回符合 schema 的 JSON
const result = await generateObject({
  model: "gemini-1.5-pro",
  schema: gradingResultSchema,
  prompt: `Grade this submission...`
});
```

#### 實施工作量
- **定義 Zod schema**: ~2 hours
- **改寫 Gemini prompt**: ~2 hours
- **儲存 structured data**: ~1 hour
- **分析查詢**: ~3 hours
- **總計**: ~8 hours (1 day)

#### 預期收益
-   數據可用性 +100% (結構化評分)
-   班級分析時間 −70% (可快速查詢)
-   報告生成自動化 +80% (直接 export)
-   異常檢測 +50% (confidence score)

---

### 4. **Image Understanding + 多模態評分** (Priority: 🟠 中)
**對應 Cookbook**: `image-understanding`, `multi-modal-chat`  
**您的需求匹配度**: ⭐⭐⭐⭐

#### 當前問題
- 只能評分文字作業，圖表/圖像/設計類作業無法自動評分

#### AI SDK 方案
```typescript
// Gemini 可直接分析圖像作業
const analysisResult = await generateText({
  model: "gemini-1.5-pro",
  messages: [
    {
      role: "user",
      content: [
        {
          type: "image",
          image: submissionImageBuffer, // 設計作業、手繪圖、截圖
        },
        {
          type: "text",
          text: "根據這份視覺設計作業，按照以下標準評分: 色彩協調性、排版、視覺層級...",
        }
      ]
    }
  ]
});
```

#### 實施工作量
- **改寫評分 prompt 支持多媒體**: ~2 hours
- **圖像上傳/存儲邏輯**: 已有 (S3/MinIO)
- **評分 UI 更新**: ~2 hours
- **總計**: ~4 hours (半天)

#### 預期收益
-   可評分作業類型 +40% (添加設計/圖像類)
-   評分自動化率 +20−30%

---

## 🟠 中優先級 (值得做但非緊急)

### 5. **Retrieval-Augmented Generation (RAG)** (Priority: 🟠 中)
**對應 Cookbook**: `rag-chatbot`, `retrieval-augmented-generation`  
**您的需求匹配度**: ⭐⭐⭐

#### 使用場景
- 教師詢問「過去類似主題的作業平均分是多少？」
- 系統自動搜尋歷史評分，檢索相似案例

#### AI SDK 方案
```typescript
// 使用 Embeddings + 向量搜尋
步驟 1: 評分完成後，embed 作業內容
  └─ const embedding = await embedContent(submission.content)

步驟 2: 存入向量數據庫 (Pinecone/Weaviate/Qdrant)
  └─ vector_db.insert({ id, embedding, metadata: { score, rubric, ... } })

步驟 3: 教師查詢時，用 RAG 檢索相似作業
  query = "計算機網路的 TCP 協議分析"
  similar = await vector_db.search(embedding(query), top_k=5)
  
步驟 4: Gemini 基於檢索結果給出建議
  context = "Similar submissions: \n" + similar.map(s => s.metadata).join("\n")
  answer = await generateText({
    prompt: query,
    system: context + "Use this context to answer..."
  })
```

#### 實施工作量
- **整合向量 DB**: ~6−8 hours
- **embedding pipeline**: ~4 hours
- **UI (查詢 interface)**: ~3 hours
- **總計**: ~13 hours (2 days)

#### 預期收益
-   教師決策時間 −50% (快速找到對標)
-   評分一致性 +25−35%
-   課程改進建議 +40% (數據驅動)

#### 優化方向
```
如果要做 RAG，建議配合 Agent:
  Agent 自動調用 RAG 工具
  ├─ Tool: "search_similar_submissions"
  ├─ Tool: "get_class_statistics"
  └─ Tool: "fetch_rubric_precedent"
  
Gemini 會自主決定何時調用這些工具
```

---

### 6. **Autonomous Agent Workflow** (Priority: 🟠 中)
**對應 Cookbook**: `agent-workflow`  
**您的需求匹配度**: ⭐⭐⭐

#### 複雜場景
- 作業提交 → **多步驟評分工作流** → 最終報告
- 教師可自定義工作流 (DAG: Directed Acyclic Graph)

#### AI SDK 方案
```typescript
// 定義工作流 DAG
const gradingWorkflow = {
  start: "parse_submission",
  steps: {
    parse_submission: {
      type: "tool_call",
      tool: "parse_submission_content",
      next: "initial_evaluation"
    },
    initial_evaluation: {
      type: "agent",
      agent: "gemini-initial-grader",
      next: ["anomaly_check", "generate_feedback"]
    },
    anomaly_check: {
      type: "condition",
      condition: score => score < 40 || score > 95,
      ifTrue: "human_review",
      ifFalse: "save_result"
    },
    human_review: {
      type: "queue",
      queue: "teacher_manual_review",
      next: "save_result"
    },
    generate_feedback: {
      type: "tool_call",
      tool: "generate_detailed_feedback",
      next: "save_result"
    },
    save_result: {
      type: "terminal",
      action: "db.grading_result.create(...)"
    }
  }
};

// 執行工作流
await executeWorkflow(gradingWorkflow, submission);
```

#### 實施工作量
- **工作流引擎**: ~10 hours
- **UI 工作流定義器**: ~8 hours
- **執行 + 監控**: ~6 hours
- **總計**: ~24 hours (3 days)

#### 預期收益
-   靈活性 +100% (教師可自訂工作流)
-   人工審查效率 +60% (自動路由)

---

## 🟢 低優先級 (錦上添花)

### 7. **Speech-to-Text + Text-to-Speech** (Priority: 🟢 低)
**對應 Cookbook**: `speech-to-text`, `text-to-speech`  
**您的需求匹配度**: ⭐⭐

#### 使用場景
- 學生可用**語音提交**作業
- 教師可**聽取自動反饋音頻版本**

#### 實施工作量: ~8−10 hours
#### 預期收益: 用戶體驗 +20% (可選功能)

---

### 8. **LangChain / LlamaIndex 整合** (Priority: 🟢 低)
**對應 Cookbook**: `langchain-integration`, `llamaindex-integration`  
**您的需求匹配度**: ⭐⭐

#### 說實話
- AI SDK v6 已內建 agents + tools
- LangChain/LlamaIndex 反而增加複雜度
- **不建議整合，除非已有 LangChain 生態依賴**

---

## 📋 實施優先順序

| Phase | Feature | 工作量 | 收益 | 完成時間 |
|-------|---------|--------|------|---------|
| **Phase 1** | Tool Use Agent | 10h | ⭐⭐⭐⭐⭐ | 1.5 days |
| **Phase 1** | Autonomous Agent + Streaming | 10h | ⭐⭐⭐⭐⭐ | 1.5 days |
| **Phase 1** | Structured Output | 8h | ⭐⭐⭐⭐⭐ | 1 day |
| **Phase 2** | Image Understanding | 4h | ⭐⭐⭐⭐ | 0.5 day |
| **Phase 2** | RAG System | 13h | ⭐⭐⭐⭐ | 2 days |
| **Phase 3** | Workflow DAG | 24h | ⭐⭐⭐⭐ | 3 days |

**Phase 1 總計**: ~28 hours (3.5 days) → **立即實施**  
**Phase 2 總計**: ~17 hours (2.5 days) → **第 1 週實施**  
**Phase 3 總計**: ~24 hours (3 days) → **可選，降級優先級**

---

## 🔧 技術整合點

### 與現有系統的整合

```
現狀:
  Student Upload → MinIO/S3 → BullMQ Job → Gemini (直接) → DB → WebSocket通知

改造後:
  Student Upload → MinIO/S3 → BullMQ Job → Gemini (Tool Calling) 
    ├─ Tool 1: fetch_rubric (DB query)
    ├─ Tool 2: compare_with_peers (DB query + Embeddings)
    ├─ Tool 3: flag_for_review (DB insert)
    └─ Streaming 進度 → WebSocket → React useChat() → 即時 UI
    
最終: Result (Structured JSON) → DB → Report Generation
```

### 代碼改動最小化

**不需要改動:**
-   WebSocket 架構 (已完善)
-   BullMQ 隊列 (只改 job handler)
-   數據庫 schema (Structured Output 用額外欄位)
-   React Router v7 (新增 API endpoint)

**需要新增:**
- ⚠️ Tool definitions (JSON schema)
- ⚠️ AI SDK 初始化 (5 行代碼)
- ⚠️ Streaming handler (10−20 行)
- ⚠️ React component hook (useChat)

---

## 💰 成本考量

### Token 消費估算

**Phase 1 (Tool Calling + Agent Loop + Streaming)**
- 單份評分: ~8,000 tokens (vs 當前 2,000)
- 原因: 多輪自檢 + tool calls
- **成本增加**: +300% / 份
- **質量提升**: +40−60% (品質翻倍值得)

**建議成本控制**:
```
1. 設上限: 評分 > 95 或 < 50 時，跳過 tool calling (因為明顯)
2. 快取: 相同作業類型的 rubric 不重複 fetch
3. 批量: 30 份一批評分，共享 context
```

### 預期 Token 節省

**使用 Structured Output 後**:
- Prompt 從 "請返回 JSON 格式: { score: ..., feedback: ... }"
- 改為 "返回以下 JSON schema 的對象"
- **節省**: −20−30% tokens

---

## ⚡ 快速實施指南

### 第一步: 驗證 (2−3 小時)

```bash
# 1. 安裝 AI SDK v6
npm install ai @ai-sdk/google

# 2. 測試 Tool Calling
cat > /tmp/test_tool_calling.ts << 'EOF'
import { generateText, tool } from "ai";
import { z } from "zod";

const result = await generateText({
  model: "gemini-1.5-pro",
  tools: [
    tool({
      name: "evaluate_submission",
      parameters: z.object({ submissionId: z.string() }),
      execute: async ({ submissionId }) => ({
        score: 85,
        feedback: "Good"
      })
    })
  ]
});
EOF

# 3. 跑測試
ts-node /tmp/test_tool_calling.ts
```

### 第二步: 集成 (1.5 days)

```
Day 1:
  ├─ 上午: 改寫 GradingEngine 支持 tool calling
  ├─ 午餐: 定義工具集 (rubric, compare, review)
  └─ 下午: 集成 AI SDK generateText

Day 2:
  ├─ 上午: BullMQ job 支持 streaming
  ├─ 午餐: WebSocket emit 進度
  └─ 下午: React useChat() UI
  
Day 3:
  ├─ 集成測試
  └─ 部署到 staging
```

---

##   檢查清單

- [ ] 安裝 AI SDK v6 (`npm install ai`)
- [ ] 確認 Gemini API key 有 Tool Calling 權限
- [ ] 定義 5−10 個核心工具
- [ ] 改寫 `grading-engine.server.ts`
- [ ] 測試 tool 調用流程
- [ ] 改寫 BullMQ job handler (streaming)
- [ ] 測試 WebSocket 進度推送
- [ ] 新增 React useChat() component
- [ ] E2E 測試 (學生提交 → 評分完成)
- [ ] 性能測試 (token 消費、延遲)
- [ ] 部署到 staging 驗證

---

## 📌 最後建議

### 必做 (Mandatory)
1. **Tool Calling** - 核心質量提升
2. **Streaming** - 用戶體驗翻倍
3. **Structured Output** - 數據可靠性

### 應做 (Should Do)
4. **Image Understanding** - 支持更多作業類型
5. **RAG** - 評分一致性

### 可選 (Nice to Have)
6. **Workflow DAG** - 如果教師需要超高自訂性

**預期投資回報率 (ROI)**:
- 工作量: 28−40 小時 (1 週集中開發)
- 收益: 評分品質 +40−60%，用戶體驗 +50%，人工審查 −40%
- **值得做**  

---

## 🎯 下一步行動

1. **確認優先級**: 從 Tool Calling 開始 (最高 ROI)
2. **建立 PoC**: 先在 `/api/grading/test` 端點試驗
3. **測試成本**: 用 50 份測試評分量化 token 消費
4. **迭代改進**: 根據反饋調整 tool 定義和 prompt
5. **全量部署**: 確認品質後推到生產

