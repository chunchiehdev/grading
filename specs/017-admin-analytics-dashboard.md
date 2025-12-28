# Spec 017: Admin Analytics Dashboard

## 概述 (Overview)

建立一個綜合性的 Admin Analytics Dashboard，讓管理員查看：
1. **Agent Chat 使用記錄**（Agent Playground 對話）
2. **AI Grading 評分記錄**（所有評分活動）
3. **Token 使用統計**（成本追蹤）
4. **系統效能指標**（執行時間、成功率）

---

## 資料來源分析 (Data Sources)

### 現有資料庫模型

#### 1. Chat 對話記錄
```prisma
model Chat {
  id        String   @id
  userId    String
  title     String?
  context   Json?    // {courseId, assignmentId, type}
  createdAt DateTime
  updatedAt DateTime
  msgs      Msg[]
}

model Msg {
  id      String
  chatId  String
  role    Role     // USER | AI
  content String
  data    Json?
  time    DateTime
}
```

**限制**：
- ❌ 沒有 token 使用量記錄
- ❌ 沒有執行時間記錄
- ❌ 沒有工具調用追蹤

#### 2. GradingResult (AI 評分記錄)
```prisma
model GradingResult {
  id                String
  gradingSessionId  String
  rubricId          String
  assignmentAreaId  String?
  
  // Token & Performance
  gradingTokens     Int?     // ✅ 已有欄位
  gradingDuration   Int?     // ✅ 已有欄位（毫秒）
  
  // Agent 相關
  agentSteps        Json?    // ✅ 步驟記錄
  toolCalls         Json?    // ✅ 工具調用
  confidenceScore   Float?   // ✅ 信心度
  requiresReview    Boolean  // ✅ 是否需審核
  
  createdAt         DateTime
  completedAt       DateTime?
}
```

**優點**：
- ✅ 已有完整的 token 和效能追蹤欄位
- ✅ 已有 Agent 執行細節

#### 3. AgentExecutionLog (Agent 步驟細節)
```prisma
model AgentExecutionLog {
  id              String
  gradingResultId String
  stepNumber      Int
  toolName        String?
  toolInput       Json?
  toolOutput      Json?
  reasoning       String?
  durationMs      Int?
  timestamp       DateTime
}
```

**優點**：
- ✅ 詳細的步驟級別追蹤

---

## 需要新增的資料模型

### AgentChatSession (新增)

用於追蹤 Agent Playground 的對話 session：

```prisma
model AgentChatSession {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  
  // Session metadata
  title           String?  @db.VarChar(255)
  userRole        String   @db.VarChar(20)  // TEACHER | STUDENT | ADMIN
  
  // Performance tracking
  totalTokens     Int      @default(0)
  totalSteps      Int      @default(0)
  totalDuration   Int      @default(0)  // milliseconds
  
  // Status
  status          String   @default("ACTIVE")  // ACTIVE | COMPLETED | ERROR
  lastActivity    DateTime @default(now())
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Relations
  messages        AgentChatMessage[]
  stepLogs        AgentChatStepLog[]
  
  @@index([userId, createdAt])
  @@index([status])
  @@map("agent_chat_sessions")
}

model AgentChatMessage {
  id              String   @id @default(uuid())
  sessionId       String
  session         AgentChatSession @relation(fields: [sessionId], references: [id])
  
  role            String   @db.VarChar(20)  // user | assistant | system
  content         String   @db.Text
  
  // Token tracking (per message)
  promptTokens    Int?
  completionTokens Int?
  totalTokens     Int?
  
  timestamp       DateTime @default(now())
  
  @@index([sessionId, timestamp])
  @@map("agent_chat_messages")
}

model AgentChatStepLog {
  id              String   @id @default(uuid())
  sessionId       String
  session         AgentChatSession @relation(fields: [sessionId], references: [id])
  
  stepNumber      Int
  toolName        String?  @db.VarChar(100)
  toolInput       Json?
  toolOutput      Json?
  reasoning       String?  @db.Text
  
  durationMs      Int?
  timestamp       DateTime @default(now())
  
  @@index([sessionId, stepNumber])
  @@map("agent_chat_step_logs")
}
```

---

## 頁面設計 (Page Design)

### 路由
- **URL**: `/admin/analytics`
- **權限**: 僅 ADMIN 角色可存取

### 頁面結構

```
┌─────────────────────────────────────────────────┐
│  Admin Analytics Dashboard                      │
├─────────────────────────────────────────────────┤
│                                                  │
│  [Overview Cards - 4 metrics in a row]          │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │
│  │ Total  │ │ Total  │ │ Total  │ │ Avg    │  │
│  │ Chats  │ │Gradings│ │ Tokens │ │Duration│  │
│  └────────┘ └────────┘ └────────┘ └────────┘  │
│                                                  │
│  [Tab Navigation]                                │
│  ┌─────────┬─────────┬─────────┐               │
│  │ Chats   │ Gradings│ Insights│               │
│  └─────────┴─────────┴─────────┘               │
│                                                  │
│  [Tab Content Area]                              │
│  ┌───────────────────────────────────────────┐  │
│  │                                            │  │
│  │  (Content based on selected tab)          │  │
│  │                                            │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Tab 1: Chat Sessions

**列表顯示**：
- Session ID (可點擊查看詳情)
- 使用者名稱 + 角色 badge
- 開始時間
- 訊息數量
- Token 使用量
- 執行時間
- 狀態 (Active/Completed/Error)

**過濾和排序**：
- 日期範圍選擇器
- 角色過濾 (Teacher/Student/Admin)
- 狀態過濾
- 按 token / 時間 / 日期排序

**詳情彈窗**：
點擊 Session ID 顯示：
- 完整對話歷史
- 每個步驟的工具調用
- Token breakdown (per message)
- 視覺化的步驟流程

### Tab 2: Grading Sessions

**列表顯示**：
- Result ID (可點擊)
- 學生名稱
- 作業區域名稱
- Rubric 名稱
- 評分時間
- Token 使用量
- 執行時間
- 信心度分數
- 是否需審核

**過濾和排序**：
- 日期範圍
- 作業區域過濾
- 需審核過濾
- 信心度範圍篩選
- 按 token / 時間 / 分數排序

**詳情彈窗**：
點擊 Result ID 顯示：
- 完整評分結果 (breakdown)
- Agent 執行步驟 (AgentExecutionLog)
- 工具調用詳情
- Thinking process
- Grading rationale

### Tab 3: Insights (圖表和統計)

**圖表區域**：
1. **Token Usage Over Time** (折線圖)
   - X軸：日期
   - Y軸：Token 數量
   - 分為 Chat / Grading 兩條線

2. **Average Duration Comparison** (條形圖)
   - Chat sessions avg duration
   - Grading sessions avg duration

3. **Confidence Score Distribution** (分布圖)
   - 顯示評分信心度的分布
   - High (>0.8) / Medium (0.6-0.8) / Low (<0.6)

4. **Top Tool Usage** (橫向條形圖)
   - 最常用的工具排名
   - think_aloud, calculate_confidence, generate_feedback等

---

## UI 設計風格指南 (Architectural Sketch Style)

### 核心元素

#### 1. 色彩
- **Background**: `#FAF9F6` (Off-white paper texture)
- **Lines**: `#2B2B2B` (Dark charcoal)
- **Accent**: `#D2691E` (Terracotta)
- **Text**: `#3A3A3A` (Near-black)

#### 2. 線條風格
```css
/* Hand-drawn border */
.sketch-border {
  border: 1.5px solid #2B2B2B;
  border-radius: 3px;
  position: relative;
}

/* Slightly imperfect curves */
.sketch-border::after {
  content: '';
  position: absolute;
  inset: -2px;
  border: 1.5px solid rgba(43, 43, 43, 0.3);
  border-radius: 4px;
  transform: rotate(0.5deg);
}
```

#### 3. 卡片組件
- 使用 hand-drawn 風格邊框
- 內部留白充足 (padding: 1.5rem)
- 陰影效果模擬鉛筆陰影（subtle）

#### 4. 數據表格
- 無實線外框
- 使用 sketchy 分隔線
- Hover 效果：淡 terracotta 背景

#### 5. 圖表
- 使用有機曲線（非完美直線）
- Terracotta 作為主要數據線顏色
- 手繪風格的座標軸

---

## 資料流程 (Data Flow)

### API Endpoints

#### 1. GET `/api/admin/analytics/overview`
返回總覽統計：
```typescript
{
  totalChatSessions: number;
  totalGradingSessions: number;
  totalTokensUsed: number;
  averageDuration: number;
  periodStart: string;
  periodEnd: string;
}
```

#### 2. GET `/api/admin/analytics/chat-sessions`
Query 參數：
- `page`, `limit` (分頁)
- `dateFrom`, `dateTo` (日期範圍)
- `role` (TEACHER | STUDENT | ADMIN)
- `status` (ACTIVE | COMPLETED | ERROR)
- `sortBy`, `sortOrder`

返回：
```typescript
{
  sessions: AgentChatSession[];
  total: number;
  page: number;
  hasMore: boolean;
}
```

#### 3. GET `/api/admin/analytics/grading-sessions`
Query 參數：
- `page`, `limit`
- `dateFrom`, `dateTo`
- `requiresReview` (boolean)
- `minConfidence`, `maxConfidence`
- `assignmentAreaId`
- `sortBy`, `sortOrder`

返回：
```typescript
{
  sessions: GradingResult[];
  total: number;
  page: number;
  hasMore: boolean;
}
```

#### 4. GET `/api/admin/analytics/insights`
返回圖表資料：
```typescript
{
  tokenUsageTimeSeries: Array<{ date: string; chatTokens: number; gradingTokens: number }>;
  averageDurations: { chat: number; grading: number };
  confidenceDistribution: { high: number; medium: number; low: number };
  topTools: Array<{ toolName: string; count: number }>;
}
```

---

## 實作計畫 (Implementation Plan)

### Phase 1: Database Migration
1. 新增 AgentChatSession, AgentChatMessage, AgentChatStepLog models
2. 更新 GradingResult 的 token 追蹤邏輯（確保填入）
3. 執行 migration

### Phase 2: Token Tracking Integration
1. 修改 `agent-executor.server.ts`：
   - 在 stream loop 中攔截 `part.type === 'usage'`
   - 累計 token 數量
   - 儲存到 GradingResult.gradingTokens

2. 修改 `api/agent-chat.ts`：
   - 建立 AgentChatSession
   - 追蹤每個訊息的 token
   - 儲存步驟記錄

### Phase 3: API Development
1. 建立 `/api/admin/analytics/*` 路由
2. 實作資料查詢邏輯（使用 Prisma aggregations）
3. 實作權限檢查（確保只有 ADMIN 可存取）

### Phase 4: Frontend Development
1. 建立 `/admin/analytics` 頁面
2. 實作 Tab 導航
3. 實作 Chat Sessions 列表和詳情彈窗
4. 實作 Grading Sessions 列表和詳情彈窗
5. 實作 Insights 圖表（使用 recharts + custom styling）

### Phase 5: UI Styling
按照 architectural sketch 風格：
1. 實作 sketch-border 組件
2. 實作 hand-drawn 風格的表格
3. 實作有機曲線圖表
4. 調整 terracotta accent color

---

## 驗證計畫 (Verification Plan)

### 自動化測試
```typescript
// tests/api/admin/analytics.test.ts
describe('Admin Analytics API', () => {
  it('should return overview stats for ADMIN', async () => {
    const admin = await createTestUser({ role: 'ADMIN' });
    const response = await request(app)
      .get('/api/admin/analytics/overview')
      .set('Cookie', await getAuthCookie(admin));
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('totalChatSessions');
  });
  
  it('should reject non-ADMIN users', async () => {
    const teacher = await createTestUser({ role: 'TEACHER' });
    const response = await request(app)
      .get('/api/admin/analytics/overview')
      .set('Cookie', await getAuthCookie(teacher));
    
    expect(response.status).toBe(403);
  });
});
```

### 手動測試
1. 以 ADMIN 身份登入
2. 前往 `/admin/analytics`
3. 驗證以下功能：
   - ✅ Overview cards 顯示正確統計
   - ✅ Chat Sessions tab 顯示對話記錄
   - ✅ Grading Sessions tab 顯示評分記錄
   - ✅ 過濾和排序功能正常
   - ✅ 點擊詳情彈窗正確顯示
   - ✅ Insights 圖表正確渲染
   - ✅ UI 風格符合 architectural sketch

---

## 相關檔案 (Related Files)

**新增檔案**：
- `prisma/schema.prisma` (新增 models)
- `app/routes/admin/analytics.tsx` (頁面)
- `app/api/admin/analytics/*.ts` (API routes)
- `app/components/admin/analytics/*` (UI components)

**修改檔案**：
- `app/services/agent-executor.server.ts` (token tracking)
- `app/api/agent-chat.ts` (session tracking)

---

## 時程估計 (Timeline)

| Phase | 預估時間 | 說明 |
|-------|---------|------|
| Phase 1: DB Migration | 1 day | Schema 設計和 migration |
| Phase 2: Token Tracking | 1 day | 整合 token 追蹤到現有流程 |
| Phase 3: API Development | 2 days | 後端 API 實作 |
| Phase 4: Frontend Development | 3 days | 前端頁面和組件 |
| Phase 5: UI Styling | 1 day | Architectural sketch 風格 |
| **Total** | **8 days** | |

---

## 變更歷史 (Change Log)

| 日期 | 版本 | 變更內容 | 作者 |
|------|------|---------|------|
| 2025-12-26 | 1.0 | 初版建立 | AI Assistant |
