# AI 作業輔助評分暨學習管理系統報告 (Comprehensive System Report)

## 專案概述

**專案定位**：本系統為結合 AI 自動批改功能的學習管理系統 (LMS)，協助教師管理課程與作業，並透過 AI 技術為學生提供即時、高品質的回饋。

**目標使用者**：
- **教師**：建立課程與班級、管理作業區域、設計評分標準 (Rubric)、追蹤學生學習狀況
- **學生**：報名課程、提交作業、接收 AI 回饋、透過對練機制深化學習
- **管理員**：使用者管理、系統監控、AI 使用權限控制、佇列清理

**技術架構**：
- **前端**：React Router (Remix 衍生框架)
- **後端**：Node.js + TypeScript + Prisma ORM
- **資料庫**：PostgreSQL
- **快取/訊息**：Redis (Pub/Sub)
- **即時通訊**：WebSocket (Socket.IO) 獨立服務
- **AI 整合**：Vercel AI SDK 6 + Gemini API
- **佇列系統**：BullMQ
- **儲存**：S3 相容儲存服務

---

## 核心功能（程式碼版本）

### 1. 功能名稱：登入與角色選擇

- **使用情境**：使用者首次登入系統後需選擇身分，決定後續可存取的功能範圍。

- **使用者能做什麼**：
  - 透過 Google OAuth 2.0 進行單一登入 (SSO)
  - 首次登入時選擇角色（學生 STUDENT / 教師 TEACHER）
  - 登出並銷毀 Session

- **背後的業務邏輯**：
  - `app/services/auth.server.ts` 處理完整認證流程
  - 使用 Cookie-based Session（7 天有效期），存儲於 `app/sessions.server.ts`
  - 角色一經選擇會設定 `hasSelectedRole = true`，後續不可自行變更
  - 角色導向路由：教師與管理員皆導向 `/teacher`（共用儀表板）、學生導向 `/student`
  - 存取控制函式：`requireAuth`、`requireTeacher`、`requireStudent`、`requireAdmin`
  - Admin 角色繼承教師所有權限（便於管理層介入）
  - `aiEnabled` 欄位由管理員控制，決定使用者是否能使用 AI 批改功能

---

### 2. 功能名稱：課程與班級管理

- **使用情境**：教師需建立課程架構，將學生分配至不同班級（Section），並管理班級容量與教學助理。

- **使用者能做什麼**：
  - 建立/編輯/刪除課程 (Course)
  - 為課程建立多個班級 (Class)，例如「101 班」、「週五下午班」
  - 設定班級容量上限、上課時段 (schedule JSON)、教學助理 (TA)
  - 查看班級學生名單、移除學生

- **背後的業務邏輯**：
  - `app/services/course.server.ts` 處理課程 CRUD，包含 `createCourse`、`getTeacherCourses`、`updateCourse`、`deleteCourse`、`searchCourses`
  - `app/services/class.server.ts` 處理班級 CRUD，包含 `createClass`、`listClassesByCourse`、`updateClass`、`deleteClass`、`getClassStatistics`
  - Course → Class 為一對多關係（一門課可有多個班級）
  - `Enrollment` 連結學生與班級（非課程），支援容量控制
  - schedule 欄位為彈性 JSON：`{ weekday, periodCode, room? }`
  - 刪除課程會 cascade 刪除所有相關班級、作業、提交

---

### 3. 功能名稱：邀請碼加入 + 課程探索/報名

- **使用情境**：學生透過教師分享的邀請碼或探索頁面加入課程。

- **使用者能做什麼**：
  - 輸入 8 碼英數邀請碼驗證並加入
  - 透過課程探索頁瀏覽公開課程並報名
  - 選擇加入特定班級（若邀請碼指定班級則直接加入該班）

- **背後的業務邏輯**：
  - `app/services/invitation.server.ts` 處理邀請碼邏輯
  - 邀請碼為 **多次使用** 設計（Multi-use），不會標記 `isUsed`，只用 `expiresAt` 控制有效期（預設 7 天）
  - `validateInvitationCode` 檢查：有效期、課程存在、學生是否已註冊
  - `useInvitationCode` 執行註冊並建立 `Enrollment` 記錄
  - 具備 QR Code 生成功能 (`generateInvitationQRCode`)
  - `revokeInvitationCode` 可提前作廢邀請碼
  - `app/services/course-discovery.server.ts` 處理探索頁邏輯，包含 `getDiscoverableCourses`、`createEnrollment`、`getStudentEnrolledCourseIds`
  - **注意**：`usedById/usedAt` 欄位存在但 `useInvitationCode` **不會更新**（審計紀錄缺失，建議改進）

---

### 4. 功能名稱：作業區域管理 (Assignment Area)

- **使用情境**：教師建立作業，指定評分標準、截止日期、目標班級，並可附加參考資料供 AI 評分使用。

- **使用者能做什麼**：
  - 建立/編輯/刪除作業區域
  - 指定 Rubric 作為評分依據
  - 設定截止日期 (dueDate)
  - 限定作業對象為特定班級 (classId) 或全課程 (classId = null)
  - 上傳參考資料檔案 (最多 5 個) 供 AI 評分參考
  - 撰寫自訂評分指引 (customGradingPrompt，最多 5000 字)

- **背後的業務邏輯**：
  - `app/services/assignment-area.server.ts` 處理所有 CRUD
  - 建立作業時自動觸發通知：`publishAssignmentCreatedNotification`
  - `loadReferenceDocuments` 載入參考文件（解析後內容截斷至 8000 字元）
  - `getCustomGradingInstructions` 取得自訂指引
  - `referenceFileIds` 以 JSON 字串儲存 UploadedFile ID 陣列
  - AssignmentArea 與 Rubric 為多對一關係
  - 通知透過 Redis Pub/Sub 發送至所有已註冊學生

---

### 5. 功能名稱：Rubric 管理 + AI Rubric 生成

- **使用情境**：教師建立評分標準 (Rubric)，可手動設計或透過 AI 協助生成。

- **使用者能做什麼**：
  - 建立/編輯/刪除評分標準
  - 設定評分項目 (Criteria)、等級描述 (Levels)、最高分數
  - 標記為可重用模板 (isTemplate)
  - 透過 AI Rubric Chat 功能與 AI 互動生成 Rubric
  - 預覽 Rubric 結構

- **背後的業務邏輯**：
  - `app/services/rubric.server.ts` 處理 CRUD，包含 `createRubric`、`updateRubric`、`deleteRubric` (軟刪除設定 isActive=false)
  - `getRubricVersions` 取得版本歷史
  - criteria 欄位為 JSON 結構：`[{ id, name, description, maxScore, levels: [{ score, description }] }]`
  - `app/services/ai-rubric.server.ts` 提供 AI 輔助生成功能
  - `app/api/ai/rubric-chat.ts` 處理 Rubric Chat 對話流程，使用 `streamObject` 串流生成 Rubric
  - **注意**：Rubric 更新為「原地 version +1」而非建立新記錄，AssignmentArea 只存 rubricId 無 snapshot，**可能導致評分不一致**（建議改進）

---

### 6. 功能名稱：檔案上傳/解析與檔案庫

- **使用情境**：學生或教師上傳 PDF 等文件，系統自動解析文字內容供 AI 評分使用。

- **使用者能做什麼**：
  - 上傳檔案（支援 PDF, DOCX, TXT 等）
  - 查看檔案解析狀態 (PENDING/PROCESSING/COMPLETED/FAILED)
  - 重新觸發解析 (reparse)
  - 下載/刪除檔案
  - 查看解析後的文字內容

- **背後的業務邏輯**：
  - `app/services/uploaded-file.server.ts` 處理 `uploadFile`、`updateFileParseStatus`、`getUserFiles`、`getFile`、`deleteFile`、`restoreFile`
  - 檔案限制：單檔 100MB
  - 支援軟刪除（若檔案已用於批改）與硬刪除
  - `app/services/storage.server.ts` 處理 S3 儲存操作
  - `app/services/pdf-parser.server.ts` 處理 PDF 解析（呼叫外部解析服務）
  - `parsedContent` 儲存解析後的純文字，`parsedContentTokens` 估算 token 數量
  - `cleanupExpiredFiles` 自動清理過期檔案

---

### 7. 功能名稱：作業提交（含草稿/版本/對比/歷史）

- **使用情境**：學生提交作業，可先存為草稿，正式提交後觸發 AI 評分，並可查看歷史版本。

- **使用者能做什麼**：
  - 儲存草稿 (DRAFT)
  - 正式提交作業 (DRAFT → SUBMITTED)
  - 查看提交歷史與各版本
  - 比較不同版本的 metadata 與分數變化
  - 重新提交新版本（建立版本鏈）

- **背後的業務邏輯**：
  - `app/services/submission.server.ts` 處理完整提交邏輯
  - `createSubmission` 建立新提交
  - `createSubmissionAndLinkGradingResult` 處理 AI 評分結果連結與版本追蹤
  - 版本控制：`version` 欄位遞增、`isLatest` 標記、`previousVersionId` 指向前一版本
  - 狀態機：`DRAFT → SUBMITTED → ANALYZED → GRADED`
  - DRAFT → SUBMITTED 不增加版本號（同一筆記錄更新）
  - GRADED 狀態後禁止重新提交
  - `app/services/version-management.server.ts` 處理版本比較（僅比較 metadata 與分數，非檔案內容 diff）
  - **注意**：Submission.sessionId 為 string 欄位，無 Foreign Key 約束，可能導致資料一致性問題（建議改進）

---

### 8. 功能名稱：AI 批改流程

- **使用情境**：學生提交作業後，系統自動觸發 AI 批改，並即時回報進度。

- **使用者能做什麼**：
  - 提交後即時查看批改進度
  - 獲得分項得分、總分、整體回饋
  - 查看 AI 思考過程 (`thinkingProcess`) 與評分理由 (`gradingRationale`)
  - 查看使用了哪些參考資料進行評分 (`usedContext`)

- **背後的業務邏輯**：
  - **主流程**：`app/services/grading-session.server.ts` → `app/services/queue.server.ts` 排程任務
  - `app/workers/grading.server.ts` 使用 `queue.server.ts` 佇列（`attempts: 3`、限流 15/min、`concurrency: 1`）
  - `app/services/bullmq-grading.server.ts` 為獨立實現（`attempts: 999`、無限流），目前主流程未使用
  - `app/services/grading-engine.server.ts` 核心批改引擎，包含 `processGradingResult`、`processGradingSession`、`retryFailedGrading`
  - `app/services/agent-executor.server.ts` 實作 Vercel AI SDK 6 ToolLoopAgent 模式
  - 結果儲存於 `GradingResult` 與 `Submission` 表
  - 進度透過 Redis 發布即時更新，前端透過 SSE/WebSocket 接收
  - AI 工具集定義於 `app/services/agent-tools.server.ts`，包含：
    - `think_aloud`：Hattie & Timperley 框架分析
    - `search_reference`：參考文件搜尋
    - `check_similarity`：抄襲檢查
    - `calculate_confidence`：信心度計算
    - `generate_feedback`：結構化回饋生成（含 sparringQuestions）

---

### 9. 功能名稱：對練式回饋（Sparring / Dialectical Feedback）

- **使用情境**：學生收到 AI 初評後，針對特定評分維度回應 AI 的質疑性問題，獲得更深入的二次回饋（1.5 輪對練機制）。

- **使用者能做什麼**：
  - 查看 AI 針對各評分維度生成的 Sparring Questions
  - 輸入回應解釋或補充論證
  - 獲得辯證式二次回饋

- **背後的業務邏輯**：
  - `app/services/dialectical-feedback.server.ts` 處理對練邏輯
  - 基於 Advait Sarkar 的「Productive Friction」設計理念
  - `generateDialecticalPrompt` 根據學生回應、評分維度、原始內容生成提示
  - `generateDialecticalFeedback` 呼叫 AI 生成二次回饋
  - Sparring Questions 結構：`{ related_rubric_id, target_quote, provocation_strategy, question, ai_hidden_reasoning }`
  - 支援多種 `provocation_strategy`：`warrant_probe`（根據釐清）、`metacognitive`（後設認知）、`conceptual`（概念辨析）
  - Token 使用量記錄於 `GradingResult.sparringTokens`
  - API 端點：`/api/student/assignments/:assignmentId/sparring-response`

---

### 10. 功能名稱：課程社群（貼文/留言/按讚）

- **使用情境**：課程內師生交流，發布公告、討論問題、分享學習資源。

- **使用者能做什麼**：
  - 發布貼文（支援多種類型：ANNOUNCEMENT/ASSIGNMENT/DISCUSSION/MATERIAL）
  - 留言與回覆（支援巢狀留言）
  - 按讚貼文與留言
  - 置頂/封存貼文
  - 附加檔案

- **背後的業務邏輯**：
  - `app/services/coursePost.server.ts` 處理完整社群功能
  - 貼文 CRUD：`createPost`、`getPosts`、`getPostById`、`updatePost`、`deletePost`
  - 留言功能：`createComment`、`getComments`、`updateComment`、`deleteComment` (軟刪除)
  - 按讚邏輯：`togglePostLike`（toggle 設計，再按一次取消）
  - 權限檢查：`canAccessCourse`、`canModifyPost`
  - 貼文可限定班級 (`classId`) 或全課程可見
  - `CoursePost` ↔ `AssignmentArea` 可選關聯（作業公告整合）
  - API 端點：`/api/courses/:courseId/posts`、`/api/posts/:postId/comments`、`/api/posts/:postId/like`

---

### 11. 功能名稱：通知與即時事件

- **使用情境**：作業發布、學生提交、批改完成等事件即時通知相關使用者。

- **使用者能做什麼**：
  - 即時收到 WebSocket 推送通知
  - 查看通知列表（包含已讀/未讀）
  - 標記通知為已讀
  - 批次標記全部已讀

- **背後的業務邏輯**：
  - `app/services/notification.server.ts` 處理通知邏輯
  - 通知類型 (NotificationType)：`ASSIGNMENT_CREATED`、`ASSIGNMENT_DUE_SOON`、`SUBMISSION_GRADED`、`COURSE_ANNOUNCEMENT`
  - 通知持久化至 `Notification` 資料表
  - 即時推送透過 Redis Pub/Sub 發布事件
  - `websocket-server/` 獨立服務處理 WebSocket 連線（Socket.IO）
  - 支援 Redis Adapter 進行多 Pod 水平擴展
  - 前端透過 `app/lib/websocket/client.ts` 連線
  - 通知 API：`/api/notifications/recent`、`/api/notifications/mark-read`

---

### 12. 功能名稱：分析與管理（教師/管理員）

- **使用情境**：教師追蹤教學成效，管理員監控系統狀態與使用者。

- **使用者能做什麼**：
  - **教師**：
    - 查看整體統計（課程數、學生數、提交數、平均分）
    - 查看各課程表現與提交狀態分布
    - 查看 Rubric 使用情況與效果
    - 審核需人工複審的 AI 批改結果 (`requiresReview = true`)
  - **管理員**：
    - 使用者清單與管理
    - 修改使用者角色與 AI 使用權限
    - 查看/清理 BullMQ 佇列
    - 查看 Agent Chat Sessions 分析
    - 查看 Grading Sessions 分析

- **背後的業務邏輯**：
  - `app/services/analytics.server.ts` 提供 `getOverallTeacherStats`、`getCoursePerformance`、`getRubricUsage`
  - `app/services/queue-jobs.server.ts` 管理佇列狀態
  - `app/services/queue-cleanup.server.ts` 執行佇列清理
  - Admin 路由：`/admin`、`/admin/users`、`/admin/queues`、`/admin/analytics`
  - Admin API：`/api/admin/queue-status`、`/api/admin/users`、`/api/admin/analytics/*`
  - 教師審核佇列：`/teacher/agent-review`

---

### 13. 功能名稱：AI 平台助理 (Agent Playground)

- **使用情境**：教師/學生透過對話式介面與 AI 助理互動，獲得教學或學習建議。

- **使用者能做什麼**：
  - 與 AI 進行多輪對話
  - 查看 AI 思考步驟與工具呼叫記錄
  - 管理對話歷史
  - 新增/刪除對話 Session

- **背後的業務邏輯**：
  - `app/services/platform-assistant.server.ts` 處理 Agent 對話邏輯
  - 使用 Vercel AI SDK 6 的 `generateText`、`generateObject` 與 `ToolLoopAgent`（非 `streamText`）
  - 對話 Session 儲存於 `AgentChatSession`，訊息儲存於 `AgentChatMessage`
  - 工具步驟記錄於 `AgentChatStepLog`
  - Token 使用量追蹤 (`totalTokens`)
  - 路由：`/agent-playground`、`/agent-playground/:sessionId`
  - API：`/api/agent-chat`、`/api/chat-sessions/*`

---

## 補充功能

### 14. 功能名稱：健康檢查與開發工具

- **使用情境**：系統運維與開發調試。

- **使用者能做什麼**：
  - 檢查系統健康狀態（主服務 + WebSocket 服務）
  - 測試 SSE 事件流
  - 開發環境快速登入

- **背後的業務邏輯**：
  - 主服務：`/health` 端點回傳系統狀態
  - WebSocket 服務：`websocket-server/src/server.ts` 提供獨立 `/health` 端點（回傳連線數）
  - `/test-sse` 測試 SSE 連線
  - `/auth/test-login` 開發環境跳過 OAuth
  - `/api/auth/check` 檢查認證狀態
  - `/api/version` 回傳 API 版本資訊

---

### 15. 功能名稱：使用者設定

- **使用情境**：使用者調整 AI 模型偏好。

- **使用者能做什麼**：
  - 查看個人資訊（姓名、Email、角色）
  - 選擇 AI 模型提供者（Auto / Local vLLM / Gemini Cloud）

- **背後的業務邏輯**：
  - `/settings` 路由（`app/routes/settings.tsx`）
  - 偏好儲存於 Cookie `ai-model-provider`（非 User 模型）

---

### 16. 功能名稱：一般聊天歷史（Rubric Chat）

- **使用情境**：使用者（不限角色）與 AI 互動製作 Rubric 時的對話記錄管理。

- **使用者能做什麼**：
  - 建立新聊天
  - 查看聊天歷史清單
  - 取得特定聊天的訊息
  - 增量拉取新訊息

- **背後的業務邏輯**：
  - 資料模型：`Chat` + `Msg`（非 AgentChatSession）
  - API 端點：
    - `POST /api/chat`：建立新聊天
    - `GET /api/chat`：取得聊天清單
    - `GET /api/chat/:id`：取得特定聊天
    - `POST /api/chat/:id/messages-since`：增量拉取訊息（需帶 `since` 時間戳）
    - `GET /api/messages/:id`：單一訊息查詢（需 API Key，內部服務用）

---

### 17. 功能名稱：研究日誌記錄

- **使用情境**：學術研究資料蒐集。

- **使用者能做什麼**：
  - 系統自動記錄使用行為

- **背後的業務邏輯**：
  - `/api/logs` 端點記錄研究資料
  - `app/services/grading-logger.server.ts` 處理批改過程詳細日誌

---

## API 端點完整參考

### 上傳相關 API

| 端點 | 說明 |
|------|------|
| `POST /api/upload` | 檔案上傳 |
| `POST /api/upload/create-id` | 預先建立上傳 ID |
| `GET /api/upload/progress` | 上傳進度查詢 |
| `DELETE /api/upload/delete-file` | 刪除上傳檔案 |

### 檔案庫 API

| 端點 | 說明 |
|------|------|
| `GET /api/files` | 檔案清單 |
| `GET /api/files/user-files` | 使用者檔案 |
| `POST /api/files/upload` | 替代上傳端點 |
| `POST /api/files/batch` | 批次檔案操作 |
| `POST /api/files/:fileId/reparse` | 重新解析 |
| `GET /api/files/:fileId/download` | 下載檔案 |
| `GET /api/reports/download` | 下載報告 |

### 批改即時串流 API

| 端點 | 類型 | 說明 |
|------|------|------|
| `/api/grading/events/:sessionId` | SSE | 批改進度即時串流 |
| `/api/grading/bridge` | HTTP Stream | AI SDK UIMessageStream（非 WebSocket） |

### 教師專用 API

| 端點 | 說明 |
|------|------|
| `GET /api/teacher/submissions/recent` | 最近提交動態 |
| `GET /api/teacher/notifications` | 教師通知 |
| `POST /api/teacher/notifications/mark-read` | 標記已讀 |
| `GET /api/teacher/submissions/:submissionId/history` | 提交歷史 |

### 學生專用 API

| 端點 | 說明 |
|------|------|
| `GET /api/student/assignments` | 學生作業清單 |
| `POST /api/student/submit` | 學生提交作業 |
| `GET/POST /api/student/assignments/:assignmentId/draft` | 草稿管理 |
| `POST /api/student/assignments/:assignmentId/sparring-response` | 對練回應 |
| `GET /api/student/submissions/:submissionId/history` | 提交歷史 |

### 課程註冊 API

| 端點 | 說明 |
|------|------|
| `POST /api/enrollments` | 建立註冊（加入班級） |
| `GET /api/courses/discover` | 探索可報名課程 |
| `GET /api/invitations/validate?code=` | 驗證邀請碼 |

### 系統級 API

| 端點 | 說明 |
|------|------|
| `GET /api/auth/check` | 檢查認證狀態 |
| `GET /api/auth/logout` | Ping（無條件回 success） |
| `POST /api/auth/logout` | 執行登出 |
| `GET /api/version` | API 版本資訊 |
| `GET /health` | 主服務健康檢查 |
| `GET :3001/health` | WebSocket 服務健康檢查（獨立 port） |

### 批改 Session API

| 端點 | 說明 |
|------|------|
| `GET /api/grading/session` | 列出 Session（view=my/all, limit, offset） |
| `POST /api/grading/session` | 建立批改 Session |
| `GET /api/grading/session/:sessionId` | 取得 Session 狀態 |
| `POST /api/grading/session/:sessionId` | 控制 Session（action=start/cancel） |
| `GET /api/grading/results` | 取得批改結果 |
| `POST /api/grading/results` | 更新結果（action=complete/fail） |
| `POST /api/grade-with-rubric` | 舊版：直接批改 |
| `GET /api/grade-progress` | 舊版：批改進度 |
| `POST /api/grade/init` | 舊版：初始化批改 |

### Assignment API

| 端點 | 說明 |
|------|------|
| `GET /api/assignments` | 作業清單 |
| `POST /api/assignments` | 建立作業 |
| `GET /api/assignments/:assignmentId` | 單一作業詳情 |
| `PATCH /api/assignments/:assignmentId` | 更新作業 |

### Submission 管理 API

| 端點 | 說明 |
|------|------|
| `GET /api/submissions/compare` | 版本比較 |
| `DELETE /api/submissions/:submissionId/delete` | 刪除提交（教師） |

### Admin 佇列管理 API

| 端點 | 說明 |
|------|------|
| `GET /api/admin/queue-status` | 佇列狀態 |
| `GET /api/admin/queue-jobs` | 佇列任務清單 |
| `GET /api/admin/cleanup-preview` | 清理預覽 |
| `POST /api/admin/cleanup-jobs` | 執行清理 |

### Admin 使用者/分析 API

| 端點 | 說明 |
|------|------|
| `GET /api/admin/users` | 使用者清單 |
| `PATCH /api/admin/users/:userId` | 更新使用者（role/aiEnabled） |
| `DELETE /api/admin/users/:userId` | 刪除使用者 |
| `GET /api/admin/analytics/overview` | 分析總覽 |
| `GET /api/admin/analytics/chat-sessions` | Chat Sessions 分析 |
| `GET /api/admin/analytics/grading-sessions` | Grading Sessions 分析 |
| `GET /api/admin/analytics/insights` | AI 洞察 |

### Rubric API

| 端點 | 說明 |
|------|------|
| `GET /api/rubrics` | 教師 Rubric 清單 |

### AI 服務 API

| 端點 | 說明 |
|------|------|
| `POST /api/ai/rubric-chat` | Rubric Chat（streamObject） |
| `POST /api/ai/generate-rubric` | AI 生成 Rubric |
| `POST /api/agent-chat` | Agent Playground Chat |

### Agent Chat Session API

| 端點 | 說明 |
|------|------|
| `GET /api/chat-sessions/list` | 對話 Session 清單 |
| `GET /api/chat-sessions/:sessionId` | 取得特定 Session |
| `PATCH /api/chat-sessions/:sessionId/update` | 更新 Session 標題 |
| `DELETE /api/chat-sessions/:sessionId/delete` | 刪除 Session |

### 通知 API（一般版）

| 端點 | 說明 |
|------|------|
| `GET /api/notifications/recent` | 最近通知 |
| `POST /api/notifications/mark-read` | 標記已讀 |

### Message API

| 端點 | 說明 |
|------|------|
| `GET /api/messages/:id` | 訊息查詢（需 API Key） |
| `GET /api/messages/:messageId` | 訊息查詢（重複端點，需 API Key） |

---

## 已知問題與改進建議

### 🔴 Critical（關鍵等級）

1. **Submission ↔ GradingSession 關聯不完整**
   - `Submission.sessionId` 為 string 欄位無 FK 約束
   - 建議：增加 FK 或建立關聯表確保資料一致性

2. **Rubric 版本更新無快照**
   - 更新為原地 version+1，AssignmentArea 只存 rubricId
   - 風險：同一作業不同時間評分可能使用不同 Rubric 內容
   - 建議：建立 rubricSnapshot 或每次更新建新記錄

3. **AI 批改失敗補救機制不足**
   - Job 失敗後 GradingSession 可能卡在 PROCESSING
   - 建議：在 BullMQ failed handler 更新狀態，增加手動重試 UI

### 🟡 High（高優先）

4. **Submission 狀態機缺 GRADING/FAILED**
   - 目前只有 DRAFT→SUBMITTED→ANALYZED→GRADED
   - 建議：增加狀態或在 UI 明確區分

5. **邀請碼審計紀錄缺失**
   - `useInvitationCode` 未更新 `usedById/usedAt`
   - 建議：每次使用記錄或建立 `InvitationUsage` 審計表

### 🟢 Medium（中優先）

6. **檔案安全檢查不足**
   - 無 MIME whitelist、無病毒掃描
   - 建議：增加 MIME 限制與安全掃描

7. **班級容量併發控制**
   - `createEnrollment` 未使用 transaction lock
   - 高併發可能超收
   - 建議：加入樂觀鎖或 SELECT FOR UPDATE

---

## 資料模型總覽

| 模型 | 說明 |
|------|------|
| User | 使用者（學生/教師/管理員） |
| Course | 課程 |
| Class | 班級/上課時段 |
| Enrollment | 學生↔班級註冊 |
| InvitationCode | 邀請碼 |
| AssignmentArea | 作業區域 |
| Submission | 學生提交（含版本控制） |
| Rubric | 評分標準 |
| GradingSession | 批改會話 |
| GradingResult | 單檔批改結果 |
| UploadedFile | 上傳檔案 |
| AgentExecutionLog | Agent 步驟記錄 |
| Chat / Msg | Rubric Chat 對話 |
| AgentChatSession / AgentChatMessage / AgentChatStepLog | 平台助理對話 |
| Notification | 通知 |
| CoursePost | 課程貼文 |
| CoursePostComment | 貼文留言 |
| CoursePostLike / CoursePostCommentLike | 按讚記錄 |

---

*報告生成日期：2026-01-16*
*報告版本：v2.0（基於完整程式碼審計）*
