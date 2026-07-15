# 020 — 平行多模型 Agent 評分（Gemini + GPT + Claude）

## 1. 目標與背景

### 1.1 一句話目標
讓學生按下評分後，**三家模型（Gemini / GPT / Claude）同時跑各自的 Agent 流程**，在 UI 上以分頁形式展示三家的思考過程、評分依據與最終分數。

### 1.2 為什麼做
口試現場立仁老師、佳慶老師、吳老師都點到「跨模型評審」的方向（佳慶：「用 ChatGPT、Gemini 兩個去評」；吳老師：「也不一定是模型的」連兩次）。同時要回應吳老師「每一個 AI 問的問題，用另外一隻 AI 去看夠不夠 critical」的設計理念。

### 1.3 學術定位
- 對應教育測量學的 **Inter-Rater Reliability**（評分者間信度）
- 學理依據：Verga et al. 2024（LLM Jury）、Chiang & Lee 2023（ACL/EMNLP，李宏毅老師團隊兩篇）
- 補充：Wang 2022 Self-Consistency 只能處理同模型隨機誤差，無法處理廠商偏誤

### 1.4 範圍邊界
- ✅ **In scope**：評分流程的三家平行 Agent、即時串流、UI 分頁、三家結果聚合儲存
- ❌ **Out of scope**：
  - 對練系統（dialectical-feedback）維持單模型
  - 教師批註評分（comment-grading）維持單模型
  - 多模型結果的 SQL 查詢介面（先存進 JSON，未來再 promote 成欄位）
  - 三家結果的人工專家對照（寫進第六章未來研究）

---

## 2. 現況分析

### 2.1 現有的 Gemini Agent 流程
```
學生按評分
  ↓
BullMQ worker pickup
  ↓
grading-engine.gradeSubmission()
  ↓
executeGradingAgent({ ... })                  ← app/services/agent-executor.server.ts
  ├─ createGeminiModel(apiKey)                ← 寫死 Gemini，line 25–28
  ├─ streamText({ model, tools, system })     ← Vercel AI SDK
  │    ├─ tool: think_aloud                   ← Hattie & Timperley 框架
  │    ├─ tool: calculate_confidence
  │    └─ tool: generate_feedback             ← 含 sparringQuestions
  └─ 每個 text-delta + tool-call
       → redis.publish(`session:${sessionId}`, JSON.stringify(event))
  ↓
api.grading.bridge.ts (SSE)
  ↓
前端 useGradingStream() 接收事件 → 顯示思考流
  ↓
存 DB：GradingResult.result / agentSteps / toolCalls / confidenceScore
```

### 2.2 現況限制
- `createGeminiModel(apiKey)` 寫死回傳 `gemini-3.1-flash-lite`
- `streamText({ model: ... })` 只接一個 model 實例
- Redis channel 命名 `session:${sessionId}`，沒有 provider 區分
- 前端只預期單一思考流
- DB 的 `agentSteps`、`toolCalls`、`confidenceScore` 沒有 provider 維度

---

## 3. 目標架構（To-Be）

### 3.1 高階流程
```
學生按評分
  ↓
grading-engine.gradeSubmission()
  ↓
runParallelAgents({ providers: ['gemini', 'openai', 'anthropic'], ... })
  ├─ Promise.all 平行啟動：
  │   ├─ executeGradingAgent({ provider: 'gemini',    sessionId })
  │   ├─ executeGradingAgent({ provider: 'openai',    sessionId })
  │   └─ executeGradingAgent({ provider: 'anthropic', sessionId })
  │
  ├─ 每家各自串流（事件帶 provider 標籤）：
  │   redis.publish(`session:${sessionId}`, {
  │     provider: 'gemini',
  │     type: 'text-delta',
  │     content: '...'
  │   })
  │
  └─ 三家都完成 → aggregateResults()
       ├─ scores: 每個 criterion 取三家中位數
       ├─ overallFeedback: USC 整合（呼叫一次 Claude Haiku 4.5）
       └─ sparringQuestions: 取 Gemini 那組（S2 之前的暫定做法）
  ↓
存 DB：GradingResult.result.judgeMetadata（含三家原始 agentResult）
```

### 3.2 前端 UI 形態（建議草圖）
```
┌────────────────────────────────────────────────────┐
│  AI 評分進行中 (3/3 模型運作中)                     │
├────────────────────────────────────────────────────┤
│ [Gemini ✓ 95%] [GPT ⟳ 60%]  [Claude ⟳ 40%]         │  ← Tabs，含進度
├────────────────────────────────────────────────────┤
│ ## Feed Up（學習目標）                              │
│ 本作業要求學生對 X 文獻做批判性反思...               │
│                                                    │
│ ## Feed Back（目前表現）                            │
│ 學生在「論點清晰度」上做到 ...                       │
│   ↑ Gemini 的 think_aloud 即時串流                  │
└────────────────────────────────────────────────────┘
       ↓ 切換到 GPT tab
┌────────────────────────────────────────────────────┐
│  GPT 思考中...                                      │
│  Initial impression: the student's reflection      │
│  on X article shows...                             │
└────────────────────────────────────────────────────┘
```

完成後：
```
┌────────────────────────────────────────────────────┐
│  📊 三家共識結果                                     │
│  總分: 82 / 100  (Gemini:84, GPT:82, Claude:80)    │
│  落差: 4 分（max-min=4） ⚠️ 觸發仲裁機制             │
├────────────────────────────────────────────────────┤
│  整合回饋:                                           │
│  你的反思在論點清晰度上有不錯表現...                  │
│                                                    │
│  📁 各模型原始結果（可展開）                         │
│  ▶ Gemini 完整思考過程                              │
│  ▶ GPT 完整思考過程                                 │
│  ▶ Claude 完整思考過程                              │
└────────────────────────────────────────────────────┘
```

---

## 4. 串流協定（Streaming Protocol）

### 4.1 事件格式
所有經 Redis publish 的 event 加入 `provider` 欄位：

```typescript
interface ProviderTaggedEvent {
  provider: 'gemini' | 'openai' | 'anthropic';
  type: 'text-delta' | 'tool-call' | 'tool-result' | 'error' | 'finish';
  // ... 原本的欄位
  content?: string;        // for text-delta
  toolCallId?: string;     // for tool-call / tool-result
  toolName?: string;
  args?: unknown;
  result?: unknown;
  error?: string;
}
```

### 4.2 Channel 設計
**選擇 A：單一 channel + provider 標籤（推薦）**
- `session:${sessionId}` 維持單一
- Bridge subscribe 一次就好
- 前端依 `event.provider` 分發到對應 tab 的 state

**選擇 B：多 channel（不推薦）**
- `session:${sessionId}:gemini` / `session:${sessionId}:openai` / `session:${sessionId}:anthropic`
- Bridge 需要 subscribe 三次，code 變複雜

✅ 選 A。後端 publish 時加上 provider 標籤；bridge 不解析，直接 forward；前端負責 demultiplex。

### 4.3 Bridge 改動
`app/routes/api.grading.bridge.ts` 第 80 行附近：
```typescript
// 既有：直接 forward 不帶 provider
writer.write({ type: 'text-delta', id: textId, delta: event.content || '' });

// 新版：帶上 provider，前端區分
writer.write({
  type: 'text-delta',
  id: `${event.provider}-${textId}`,   // 每家獨立 textId
  delta: event.content || '',
  // ponytail: pass provider via id prefix; cleaner: use messageMetadata once we control bridge schema
});
```

### 4.4 完成事件
每家完成各自 publish 一次 `finish`：
```typescript
{ provider: 'gemini',    type: 'finish', success: true,  durationMs: 12345 }
{ provider: 'openai',    type: 'finish', success: true,  durationMs: 14222 }
{ provider: 'anthropic', type: 'finish', success: false, error: '...' }
```

三家都 finish 後，後端再 publish 一個總結事件：
```typescript
{ type: 'aggregate-complete', medianTotal: 82, anyDiverged: true }
```

---

## 5. 後端改動

### 5.1 新檔：`app/services/parallel-agents.server.ts`
```typescript
// 大綱（不貼完整實作，spec 階段）
export interface ProviderId { ... }   // 'gemini' | 'openai' | 'anthropic'

export interface ParallelAgentResult {
  attempts: Array<{
    provider: ProviderId;
    success: boolean;
    agentResult?: AgentGradingResult;   // 完整 agent 步驟
    error?: string;
    durationMs: number;
  }>;
  aggregated: {
    breakdown: Breakdown[];             // 中位數
    totalScore: number;
    maxScore: number;
    overallFeedback: string;            // USC 整合版
    sparringQuestions: SparringQuestion[];
    perCriterionMaxMinusMin: Record<string, number>;
    anyCriterionDiverged: boolean;
  };
}

export async function runParallelAgents(
  params: AgentGradingParams,
  providers: ProviderId[] = ['gemini', 'openai', 'anthropic']
): Promise<ParallelAgentResult>
```

### 5.2 改檔：`app/services/agent-executor.server.ts`
#### 5.2.1 抽出 model factory
```typescript
// 既有寫死
function createGeminiModel(apiKey: string) {
  const gemini = createGoogleGenerativeAI({ apiKey });
  return gemini('gemini-3.1-flash-lite');
}

// 改成 provider-aware
function createModelForProvider(provider: ProviderId): LanguageModel {
  switch (provider) {
    case 'gemini': {
      const apiKey = process.env.GEMINI_API_KEY;
      return createGoogleGenerativeAI({ apiKey })('gemini-3.1-flash-lite');
    }
    case 'openai': {
      const apiKey = process.env.OPENAI_API_KEY;
      return createOpenAI({ apiKey })('gpt-4o-mini');
    }
    case 'anthropic': {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      return createAnthropic({ apiKey })('claude-haiku-4-5-20251001');
    }
  }
}
```

#### 5.2.2 `executeGradingAgent` 加入 provider 參數
```typescript
export async function executeGradingAgent(
  params: AgentGradingParams & { provider?: ProviderId }
): Promise<AgentGradingResult>
```

預設 `provider = 'gemini'` 保留現有行為。

#### 5.2.3 Redis publish 加 provider
所有 `redis.publish(\`session:${sessionId}\`, ...)` 呼叫，event payload 加上 `provider: ctx.provider`。

牽涉位置（搜尋 `text-delta` / `tool-call`）：
- line 750（directThinking）
- line 789（streaming text）
- line 1113（part.type === 'text-delta'）
- line 1245（reasoning）
- `agent-tools.server.ts` 也有 redis.publish（think_aloud、think tool）

### 5.3 改檔：`app/services/agent-tools.server.ts`
`createAgentTools` 的 `context` 加入 `provider`：
```typescript
export const createAgentTools = (context: {
  referenceDocuments?: ReferenceDocument[];
  currentContent: string;
  assignmentType?: string;
  sessionId?: string;
  userLanguage?: string;
  provider?: ProviderId;   // ← 新增
}) => { ... }
```

所有 `redis.publish` 帶上 `provider`。

### 5.4 改檔：`app/services/grading-engine.server.ts`
把現在的：
```typescript
try {
  const agentResult = await executeGradingAgent({ ... });
  ...
}
```
改成：
```typescript
try {
  const parallel = await runParallelAgents({ ... });
  // 把 parallel.aggregated 包成 gradingResponse
  gradingResponse = { ... };
  // 三家 raw attempts 存進 result.judgeMetadata
}
```

### 5.5 DB 改動（正式 migration）

論文要算 Cohen's Kappa、ICC、Krippendorff's α 需要直接從 SQL 撈每家的分數，所以**現在就做 migration**，不要塞 JSON 推給未來。

#### 5.5.1 新增資料表 `judge_attempts`
```prisma
model JudgeAttempt {
  id              String        @id @default(uuid())

  gradingResultId String
  gradingResult   GradingResult @relation(fields: [gradingResultId], references: [id], onDelete: Cascade)

  // 哪家評審
  provider        String        @db.VarChar(50)   // 'gemini' | 'openai' | 'anthropic'
  modelName       String        @db.VarChar(100)  // 例：'gemini-3.1-flash-lite' / 'gpt-4o-mini' / 'claude-haiku-4-5-20251001'

  // 結果（成功時填）
  success         Boolean
  result          Json?          // GradingResultData 完整原始評分（breakdown 含每 criterion 分數）
  agentSteps      Json?          // 該家完整 ReAct 步驟（thinking、tool calls）
  confidenceScore Float?         // 該家 calculate_confidence 工具回傳

  // 失敗時填
  errorMessage    String?        @db.Text

  // 計量
  durationMs      Int
  inputTokens     Int?
  outputTokens    Int?

  createdAt       DateTime       @default(now())

  @@index([gradingResultId, provider])
  @@index([provider, success])           // 算 IRR 時常用
  @@index([gradingResultId, success])
  @@map("judge_attempts")
}
```

#### 5.5.2 `GradingResult` 加入兩個欄位
```prisma
model GradingResult {
  ...                                                  // 既有欄位
  judgeAttempts          JudgeAttempt[]                // 反向關聯
  consensusMetrics       Json?                         // { perCriterionMaxMinusMin: { ... }, anyCriterionDiverged: boolean, medianTotal: number }
  isMultiModelJudged     Boolean    @default(false)    // 快速 filter 出有跑多模型的記錄
}
```

#### 5.5.3 Migration 步驟
```bash
# 1. 編輯 prisma/schema.prisma 加入上述兩個改動
# 2. 跑 dev migration
npm run migrate:dev -- --name add_judge_attempts
# 3. Prisma client 自動重生（migrate:dev 包含 generate）
```

Prod 部署用 `npm run migrate:prod`。

#### 5.5.4 寫入時機
`runParallelAgents` 完成後：
```typescript
// 在 grading-engine 既有的 db.gradingResult.update() 之後接著做
await db.judgeAttempt.createMany({
  data: parallel.attempts.map(a => ({
    gradingResultId: resultId,
    provider: a.provider,
    modelName: getModelName(a.provider),
    success: a.success,
    result: a.success ? (a.agentResult?.data as Prisma.InputJsonValue) : undefined,
    agentSteps: a.success ? (a.agentResult?.steps as Prisma.InputJsonValue) : undefined,
    confidenceScore: a.agentResult?.confidenceScore,
    errorMessage: a.error,
    durationMs: a.durationMs,
    inputTokens: a.agentResult?.toolCallStats?.inputTokens,
    outputTokens: a.agentResult?.toolCallStats?.outputTokens,
  })),
});

await db.gradingResult.update({
  where: { id: resultId },
  data: {
    isMultiModelJudged: true,
    consensusMetrics: {
      perCriterionMaxMinusMin: parallel.aggregated.perCriterionMaxMinusMin,
      anyCriterionDiverged: parallel.aggregated.anyCriterionDiverged,
      medianTotal: parallel.aggregated.totalScore,
    },
  },
});
```

#### 5.5.5 後續 IRR 分析 SQL 範例
```sql
-- 每家 provider 的平均分數
SELECT provider, AVG((result->>'totalScore')::int) AS avg_score
FROM judge_attempts
WHERE success = true
GROUP BY provider;

-- 三家在同一份作業上的分數，攤平給統計工具算 Cohen's Kappa
SELECT
  gr.id AS submission_id,
  MAX(CASE WHEN ja.provider = 'gemini'    THEN (ja.result->>'totalScore')::int END) AS gemini_score,
  MAX(CASE WHEN ja.provider = 'openai'    THEN (ja.result->>'totalScore')::int END) AS openai_score,
  MAX(CASE WHEN ja.provider = 'anthropic' THEN (ja.result->>'totalScore')::int END) AS claude_score
FROM grading_results gr
JOIN judge_attempts ja ON ja.gradingResultId = gr.id
WHERE gr.isMultiModelJudged = true AND ja.success = true
GROUP BY gr.id;
```

### 5.6 Sparring questions 處理
- Phase 1（本 spec）：固定取 Gemini 那組（最穩定）
- Phase 2（S2 spec 處理）：用 critical question evaluator 從三組挑最 critical 的

### 5.7 USC feedback 整合
獨立的函式 `mergeFeedbackUSC(threeFeedbacks: string[], lang: 'zh' | 'en'): Promise<string>`。
- 呼叫 Claude Haiku 4.5（最便宜）
- Prompt：「整合三家共同提到的重點，不要新增資訊」
- 失敗 → fallback 用第一家的 feedback

---

## 6. 前端改動

### 6.1 新元件：`app/components/grading/ParallelAgentStreams.tsx`
- 接收 SSE 串流
- 維持三個 state：`geminiStream`、`openaiStream`、`anthropicStream`
- 收到 event 後依 `provider` 分發到對應 state
- 用 Radix Tabs（既裝）切換

```tsx
<Tabs defaultValue="gemini">
  <Tabs.List>
    <Tabs.Trigger value="gemini">
      Gemini {geminiDone ? '✓' : `⟳ ${geminiProgress}%`}
    </Tabs.Trigger>
    <Tabs.Trigger value="openai">
      GPT {openaiDone ? '✓' : `⟳ ${openaiProgress}%`}
    </Tabs.Trigger>
    <Tabs.Trigger value="anthropic">
      Claude {anthropicDone ? '✓' : `⟳ ${anthropicProgress}%`}
    </Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="gemini"><AgentStreamView events={geminiStream} /></Tabs.Content>
  <Tabs.Content value="openai"><AgentStreamView events={openaiStream} /></Tabs.Content>
  <Tabs.Content value="anthropic"><AgentStreamView events={anthropicStream} /></Tabs.Content>
</Tabs>
```

### 6.2 完成後的聚合視圖
- 顯示三家分數一覽（總分 + 每 criterion）
- 顯示中位數 + 落差是否觸發仲裁
- 整合後的 feedback
- 三家原始 raw 結果可摺疊展開

### 6.3 進度估算
- text-delta 的 token 數 / 估算總 token 數 → 粗估進度
- 或顯示「思考中...」+ 旋轉指示器（更穩）

### 6.4 失敗呈現
- 某家失敗 → 對應 tab 灰階 + 錯誤訊息
- 不影響其他兩家繼續顯示
- 全部失敗 → 整體錯誤頁

---

## 7. 失敗處理

| 情境 | 行為 |
|---|---|
| 三家都成功 | 中位數 + USC 整合，全套 UI |
| 兩家成功 1 家失敗 | 取兩家分數平均（或保守取 min），UI 該家 tab 灰階顯示 error |
| 一家成功 2 家失敗 | 直接用該家結果，學生 UI 不顯示「共識」字樣 |
| 全部失敗 | fallback 到 `aiGrader.grade()`（既有 simple grader）|
| 某家中途斷線 | 已收到的 text-delta 保留，標 partial |

---

## 8. 成本與延遲

### 8.1 成本（每份作業）
| 項目 | Token 預估 | 單價 | 成本 |
|---|---|---|---|
| Gemini Agent（含 ReAct 多輪 tool call） | ~20K in / 5K out | Flash 計價 | $0.020 |
| GPT Agent | ~20K in / 5K out | 4o-mini | $0.030 |
| Claude Agent | ~20K in / 5K out | Haiku 4.5 | $0.045 |
| USC 整合 | ~3K in / 0.5K out | Haiku 4.5 | $0.005 |
| **總計** | | | **約 $0.10 / 份** |

對比現況單 Gemini Agent 約 $0.020 → 約 **5×** 成本。

100 份論文實驗範圍：$10（約 320 台幣）。

### 8.2 延遲
- 平行跑：延遲 ≈ 最慢那家（通常是 Claude，約 15–25 秒）
- 對比現況單 Gemini Agent 約 10–15 秒 → 約 **1.5–2×** 延遲

### 8.3 控制機制
- Feature flag `USE_PARALLEL_AGENTS=true`（預設 false）
- 論文實驗階段打開，日常上線關閉

---

## 9. Phase 拆分（可獨立 ship）

| Phase | 內容 | 預估工時 |
|---|---|---|
| **Phase 0** | 已完成：Agent 主路線、simple 為 fallback | ✅ |
| **Phase 1** | DB migration（`judge_attempts` 表 + `GradingResult` 新欄位）+ `executeGradingAgent` 支援 provider 參數 | 1.5 天 |
| **Phase 2** | `runParallelAgents` 平行三家、後端 aggregate、Redis event 加 provider 標籤、寫入 `judge_attempts` | 2 天 |
| **Phase 3** | Bridge 改動、前端 3-tab UI、串流到 state 分發 | 2 天 |
| **Phase 4** | 聚合視圖、失敗處理 UX、進度估算 | 1 天 |
| **Phase 5** | USC feedback 整合、Feature flag、IRR 查詢 SQL 範例 | 1 天 |
| **Phase 6** | E2E 測試、成本/延遲 benchmark、論文實驗腳本 | 1 天 |

**Phase 1+5 可優先 ship**：先讓三家各自能跑，DB 也存得進去，UI 暫時只顯示 Gemini（與現況相容）。這樣可驗證後端正確，再做 UI。

**總計：約 8.5 天工程力**

---

## 10. 開關與 Feature Flag

```bash
# .env
USE_PARALLEL_AGENTS=true              # 主開關
ANTHROPIC_API_KEY=sk-...              # Claude 必要
PARALLEL_AGENT_PROVIDERS=gemini,openai,anthropic   # 預設三家，可只開兩家
PARALLEL_AGENT_USC_MERGE=true         # USC 文字整合，預設開
```

---

## 11. 待決定（需要使用者確認）

| # | 問題 | 我的傾向 |
|---|---|---|
| Q1 | 三家 agent 的 system prompt 完全相同還是各家微調？ | **完全相同**，公平比較才能算 IRR |
| Q2 | 三家 temperature 都 0.7 還是分別調整？ | **都 0.7**，跟現有 Gemini Agent 一致 |
| Q3 | UI 要不要顯示「目前看的是哪家在思考」的 active tab 切換？ | **手動切**，第一家完成自動跳到他的 tab |
| Q4 | 學生 UX：要不要等三家都完成才顯示分數？還是有一家完成就先給？ | **等三家**，學生看一個分數比三個亂跳好 |
| Q5 | 仲裁機制（落差 ≥ 2 觸發 Gemini Pro）這 phase 要做嗎？ | **不做**，等 Phase 7 加 |
| Q6 | OpenAI 跟 Claude 要不要也內建 ReAct 多步驟，還是只做一次 generateObject？ | **完整 ReAct**，否則不算公平比較。但 Phase 2 可以先做 generateObject 版過 demo |
| Q7 | 三家是否要支援 reference documents / similarity check 工具？ | **要**，三家都呼叫 `createAgentTools` 拿到同一組工具 |
| Q8 | 沒設 ANTHROPIC_API_KEY 時的降級行為？ | **跳過該家**，跑兩家 + USC，UI 顯示 "Claude 未設定" |

---

## 12. Out of Scope（明確列出）

- ❌ 對練系統（dialectical-feedback）不改，維持單 Gemini
- ❌ 教師批註評分（comment-grading）不改
- ❌ S2 critical question evaluator（另開 spec 處理）
- ❌ 多模型結果的查詢面板（教師端看到三家分數對比）
- ❌ 人類專家對照實驗（寫進第六章未來研究）

---

## 13. 風險與回滾

| 風險 | 應對 |
|---|---|
| Token 成本失控 | Feature flag 預設關閉；論文實驗外維持單 Gemini |
| 串流訊息打架 | 單 channel + provider tag；前端 demux；測試重點 |
| 某家頻繁失敗影響整體 | 任一家成功即可繼續；UI 灰階該家 tab |
| Phase 太長 | Phase 1+2 後可中止：拿到三家分數但 UI 不分頁；論文勉強可用 |
| 學生 UX 困惑 | 提供「等所有家完成」模式作為預設，「即時看每家思考」是進階模式 |

回滾步驟：把 `USE_PARALLEL_AGENTS` 設 false → 自動回到現有單 Gemini Agent 流程。

---

## 14. 開發前要先做的事

1. **確認三家 API key 都有**：`GEMINI_API_KEY{,2,3}` ✅、`OPENAI_API_KEY` ✅、`ANTHROPIC_API_KEY` ✅
2. **跑一次 Anthropic Vercel SDK 的 streamText + tool calling smoke test**，確認 Claude Haiku 4.5 對 tool calling 的回應穩定（**重要**：不同 provider 的 tool calling 有時行為差很多）
3. **跑一次 OpenAI gpt-4o-mini 的 ReAct smoke test**，同上
4. **決定 Q1–Q8 的答案**

---

## 15. 後續 spec

- `021-critical-question-evaluator.md`（S2：每題挑戰問題用另一隻 AI 評夠不夠 critical）
- `022-jury-validation-experiment.md`（論文 Phase：跑 30 份算 Cohen's Kappa 的離線實驗腳本）
