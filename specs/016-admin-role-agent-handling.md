# Spec 016: Admin Role Agent Handling

## 現況問題 (Current Issue)

### 問題描述

當 `ADMIN` 角色的使用者進入 **Agent Playground** (`/agent-playground`) 並與 AI Agent 互動時，系統會將其誤當作 `STUDENT` 角色處理，導致以下問題：

1. **權限限制錯誤**：ADMIN 只能查詢自己作為「學生」的課程資料（通常為空）
2. **無法使用完整權限**：無法發揮 ADMIN 應有的系統管理能力
3. **使用者體驗不佳**：沒有明確的錯誤提示或引導

### 技術根因

#### 程式碼位置與問題

**檔案：`app/api/agent-chat.ts`**
```typescript
// Line 27-33: 角色查詢
const user = await db.user.findUnique({
  where: { id: userId },
  select: { role: true },
});
userRole = user?.role as 'STUDENT' | 'TEACHER' | undefined;
// ⚠️ 強制型別轉換隱藏了 ADMIN 角色的存在

// Line 76: 預設處理
const finalUserRole = userRole || 'STUDENT';
// 'ADMIN' 是 truthy，所以會被傳遞下去
```

**檔案：`app/lib/platform-assistant.server.ts`**
```typescript
// Line 1180-1185: Agent 建立邏輯
function createGradingAgent(userRole: 'TEACHER' | 'STUDENT', userId: string | undefined) {
  if (userRole === 'TEACHER') {
    return createTeacherAgent(userId);
  }
  // ⚠️ 所有非 TEACHER 角色（包括 ADMIN）都會走到這裡
  return createStudentAgent(userId);
}
```

### 實際執行流程

```
ADMIN 使用者登入
    ↓
進入 /agent-playground
    ↓
詢問「我的課程是什麼」
    ↓
API 讀取 user.role = 'ADMIN'
    ↓
型別強制轉換為 'STUDENT' | 'TEACHER' | undefined
    ↓
createGradingAgent('ADMIN', userId)
    ↓
因為 'ADMIN' !== 'TEACHER'，執行 createStudentAgent()
    ↓
Student Agent 查詢 student_courses (studentId = adminUserId)
    ↓
查無資料 → AI 回應「您目前沒有註冊任何課程」
```

---

## 解決方案 (Proposed Solutions)

### 方案 1：明確拒絕 ADMIN 使用（短期快速修正）⭐ **推薦短期方案**

#### 概述
在 API 層面明確檢查並拒絕 ADMIN 角色的請求，提供清楚的錯誤訊息。

#### 實作位置
- **檔案**：`app/api/agent-chat.ts`
- **修改範圍**：新增 ADMIN 檢查邏輯

#### 程式碼變更

```typescript
// app/api/agent-chat.ts (Line 35 之後新增)

if (userId) {
  const { db } = await import('@/lib/db.server');
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  
  // 新增：ADMIN 角色檢查
  if (user?.role === 'ADMIN') {
    return new Response(
      JSON.stringify({ 
        error: 'Admin users cannot use the agent interface directly.',
        message: 'Please use the admin panel to manage system resources. The agent playground is designed for teachers and students only.',
        redirectUrl: '/admin/users'
      }),
      { 
        status: 403, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
  
  userRole = user?.role as 'STUDENT' | 'TEACHER' | undefined;
}
```

#### UI 改進建議

前端應該處理 403 錯誤並顯示友善訊息：

```typescript
// AgentChatBoxWithSteps.tsx
onError: (error) => {
  if (error.message.includes('Admin users cannot')) {
    // 顯示特殊的 Admin 專用提示
    toast.error('此功能僅供教師和學生使用', {
      description: '請前往管理後台操作',
      action: {
        label: '前往管理後台',
        onClick: () => router.push('/admin/users')
      }
    });
  }
}
```

#### 優點
- ✅ 實作簡單快速（~10 分鐘）
- ✅ 立即解決問題
- ✅ 明確的使用者回饋
- ✅ 不影響現有功能

#### 缺點
- ❌ ADMIN 完全無法使用 Agent
- ❌ 未來可能需要 Admin Agent 功能時需要重構

---

### 方案 2：建立 Admin 專用 Agent（長期完整方案）⭐ **推薦長期方案**

#### 概述
建立一個專為 ADMIN 角色設計的 Agent，提供系統管理相關的查詢和操作能力。

#### 實作範圍

**1. 型別定義更新**
```typescript
// app/lib/platform-assistant.server.ts

// 擴充 UserRole 型別
type UserRole = 'TEACHER' | 'STUDENT' | 'ADMIN';

// 新增 Admin 查詢類型
const adminQueryTypeEnum = z.enum([
  'all_users',           // 查詢所有使用者
  'all_courses',         // 查詢所有課程
  'all_assignments',     // 查詢所有作業
  'system_statistics',   // 系統統計資料
  'recent_activities',   // 最近活動記錄
  'user_detail',         // 特定使用者詳情
  'course_analytics',    // 課程分析
]);

type AdminQueryType = z.infer<typeof adminQueryTypeEnum>;
```

**2. Admin Agent 建立**
```typescript
// app/lib/platform-assistant.server.ts

function createAdminAgent(userId: string | undefined) {
  const adminTools = {
    database_query: tool({
      description: `Query the grading system database with administrative privileges.

**ADMIN-SPECIFIC QUERIES (READ-ONLY):**

System Overview:
- "all_users": List all users (students, teachers, admins)
  Parameters: limit, offset, role (optional filter)
  
- "all_courses": List all courses in the system
  Parameters: limit, offset, teacherId (optional filter)
  
- "all_assignments": List all assignments across all courses
  Parameters: limit, offset, courseId (optional filter)

Statistics & Analytics:
- "system_statistics": Get overall system statistics
  Result: total users, courses, submissions, active users, etc.
  
- "course_analytics": Get detailed analytics for courses
  Parameters: courseId (optional, if empty returns all courses)
  Result: enrollment counts, submission rates, grade distributions
  
- "recent_activities": Get recent system activities
  Parameters: limit, activityType (optional)
  Result: recent submissions, user logins, grade updates

User Management:
- "user_detail": Get detailed information about a user
  Parameters: userId (required)
  Result: Full user profile, courses, submissions, activities

**IMPORTANT:**
- All queries are READ-ONLY for safety
- Be cautious with data volume (use pagination)
- Respect user privacy in responses`,
      inputSchema: z.object({
        queryType: adminQueryTypeEnum,
        params: z.record(z.any()).optional(),
      }),
      execute: async (input) => {
        // 實作 Admin 查詢邏輯
        return await executeAdminQuery(input.queryType, {
          adminId: userId,
          ...input.params
        });
      },
    }),
  };

  return new ToolLoopAgent({
    model: gemini('gemini-2.0-flash-exp'),
    instructions: buildAdminSystemPrompt(userId),
    tools: adminTools,
    stopWhen: stepCountIs(15),
  });
}

function buildAdminSystemPrompt(userId: string | undefined): string {
  return `You are an AI assistant for the grading platform helping ADMINISTRATORS manage the system.

**Your Identity: Administrator**
- Admin ID: ${userId || 'unknown'}
- You have read-only access to all system data
- Help admins understand system status and user activities

**THINKING OUT LOUD - CRITICAL!**
Before calling ANY tool, explain your thinking in Chinese:

我現在想: [what you're thinking]
所以我要做: [what action you'll take]
我預期會得到: [what outcome you expect]

**What You Can Query:**
1. System-wide statistics and analytics
2. All users, courses, and assignments
3. Recent system activities
4. Detailed user information

**Privacy & Ethics:**
- Always respect user privacy
- Don't share sensitive information unnecessarily
- Provide aggregated data when possible
- Warn if a query might expose private data

**Available Tools:**
- database_query: Query system data with admin privileges`;
}
```

**3. Agent 路由更新**
```typescript
// app/lib/platform-assistant.server.ts

function createGradingAgent(userRole: 'TEACHER' | 'STUDENT' | 'ADMIN', userId: string | undefined) {
  if (userRole === 'ADMIN') {
    return createAdminAgent(userId);
  }
  if (userRole === 'TEACHER') {
    return createTeacherAgent(userId);
  }
  return createStudentAgent(userId);
}
```

**4. 資料庫查詢實作**
```typescript
// app/services/database-query.server.ts

// 新增 Admin 查詢函數
export async function executeAdminQuery(
  queryType: AdminQueryType, 
  params: { adminId?: string; [key: string]: any }
): Promise<QueryResult> {
  // 驗證 admin 權限
  if (params.adminId) {
    const admin = await db.user.findUnique({
      where: { id: params.adminId },
      select: { role: true },
    });
    
    if (admin?.role !== 'ADMIN') {
      return {
        success: false,
        error: 'Unauthorized: Admin privileges required',
      };
    }
  }

  switch (queryType) {
    case 'all_users':
      return await getAllUsers(params);
    case 'all_courses':
      return await getAllCourses(params);
    case 'system_statistics':
      return await getSystemStatistics();
    // ... 其他查詢類型
    default:
      return {
        success: false,
        error: `Unknown admin query type: ${queryType}`,
      };
  }
}
```

#### 優點
- ✅ 完整的 ADMIN 功能支援
- ✅ 符合系統架構設計
- ✅ 可擴展性強
- ✅ 提供有價值的管理工具

#### 缺點
- ❌ 實作工作量大（2-3 天）
- ❌ 需要完整測試
- ❌ 需要設計安全機制

---

### 方案 3：身份選擇器（彈性方案）

#### 概述
在 UI 層面讓 ADMIN 選擇要以什麼身份使用 Agent。

#### 實作位置
- **檔案**：`app/components/agent/AgentChatBoxWithSteps.tsx`
- **修改範圍**：新增角色選擇器 UI

#### UI 實作

```typescript
// app/components/agent/AgentChatBoxWithSteps.tsx

export function AgentChatBoxWithSteps() {
  const { user } = useLoaderData();
  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'TEACHER' | 'STUDENT'>(
    user?.role || 'STUDENT'
  );

  // ADMIN 使用者顯示角色選擇器
  const showRoleSelector = user?.role === 'ADMIN';

  return (
    <div className="relative h-full w-full flex flex-col">
      {/* 角色選擇器（僅 ADMIN 可見） */}
      {showRoleSelector && (
        <div className="border-b bg-muted/30 px-4 py-3">
          <label className="text-sm font-medium mb-2 block">選擇身份視角：</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as any)}
            className="w-full max-w-xs rounded-lg border px-3 py-2"
          >
            <option value="ADMIN">🔑 管理員視角（查看全系統資料）</option>
            <option value="TEACHER">👨‍🏫 教師視角（模擬教師使用）</option>
            <option value="STUDENT">🎓 學生視角（模擬學生使用）</option>
          </select>
        </div>
      )}

      {/* 原有的聊天介面 */}
      {/* ... */}
    </div>
  );
}
```

#### API 修改

```typescript
// app/api/agent-chat.ts

// 接收前端傳來的角色選擇
const body = await request.json();
const { messages, roleOverride } = body;

// ADMIN 可以覆寫角色
if (userRole === 'ADMIN' && roleOverride) {
  userRole = roleOverride as 'STUDENT' | 'TEACHER' | 'ADMIN';
}
```

#### 優點
- ✅ 彈性高，ADMIN 可測試不同視角
- ✅ 實作相對簡單
- ✅ 不需要大幅修改後端

#### 缺點
- ❌ 仍需實作 Admin Agent（如果選擇 ADMIN 視角）
- ❌ UI 複雜度增加
- ❌ 可能造成使用者困惑

---

## 實作建議 (Recommendation)

### 階段式實作策略

#### 第一階段（立即執行）：方案 1
- **時程**：1 小時
- **目標**：修正當前問題，避免 ADMIN 誤用
- **優先級**：🔴 高

#### 第二階段（中期規劃）：方案 2
- **時程**：2-3 天
- **目標**：提供完整 Admin Agent 功能
- **優先級**：🟡 中

#### 第三階段（可選）：方案 3
- **時程**：1 天
- **目標**：提供角色切換能力
- **優先級**：🟢 低（可選）

---

## 驗證計畫 (Verification Plan)

### 方案 1 驗證

#### 自動化測試
```typescript
// tests/api/agent-chat.test.ts

describe('Agent Chat API - ADMIN Role', () => {
  it('should reject ADMIN users with 403', async () => {
    const adminUser = await createTestUser({ role: 'ADMIN' });
    const response = await request(app)
      .post('/api/agent-chat')
      .set('Cookie', await getAuthCookie(adminUser))
      .send({ messages: [{ role: 'user', content: 'Hello' }] });
    
    expect(response.status).toBe(403);
    expect(response.body.error).toContain('Admin users cannot use');
  });
});
```

#### 手動測試
1. 以 ADMIN 身份登入系統
2. 前往 `/agent-playground`
3. 輸入任何訊息（例如：「我的課程是什麼」）
4. **預期結果**：收到 403 錯誤，顯示「此功能僅供教師和學生使用」訊息

### 方案 2 驗證

#### 功能測試清單
- [ ] ADMIN 能成功查詢所有使用者
- [ ] ADMIN 能查看系統統計資料
- [ ] ADMIN 能查詢特定使用者詳情
- [ ] 非 ADMIN 使用者無法存取 Admin 查詢
- [ ] 分頁功能正常運作
- [ ] 資料隱私保護機制有效

#### 手動測試流程
1. 以 ADMIN 身份登入
2. 前往 `/agent-playground`
3. 測試以下查詢：
   - 「系統中有多少使用者？」
   - 「最近一週有哪些活動？」
   - 「資料結構課程的註冊人數是多少？」
4. **預期結果**：Agent 能正確回應所有查詢

---

## 相關資源 (References)

- **當前實作**：
  - `app/api/agent-chat.ts`
  - `app/lib/platform-assistant.server.ts`
  - `app/services/database-query.server.ts`

- **相關 Spec**：
  - 無直接相關 spec

- **討論紀錄**：
  - 本 spec 為初次提出

---

## 變更歷史 (Change Log)

| 日期 | 版本 | 變更內容 | 作者 |
|------|------|---------|------|
| 2025-12-26 | 1.0 | 初版建立 | AI Assistant |
