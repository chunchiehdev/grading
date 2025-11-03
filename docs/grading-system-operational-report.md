# 評分系統問答報告（2025-11-02）

以下整理 30 個問題的現況。每題都以白話方式說明，並標註程式碼位置方便追蹤。若功能缺漏，也一併點出。

## 1. 提交到出分的 SLO 與降級策略
- 程式碼沒有明訂「提交→出分」的時間或成功率 SLO，監控服務只設了一些粗略警戒值，例如 10 秒回應、錯誤率 20% 才告警。`app/services/monitoring.server.ts:12`
- 降級流程是：先用 Gemini，失敗就改投 OpenAI；如果有三把 Key 會做輪替。`app/services/ai-grader.server.ts:26`、`app/services/ai-grader.server.ts:41-112`

## 2. 最終分數來源與原始 AI 分紀錄
- AI 完成後會把 `totalScore` 四捨五入寫入 submission.finalScore，狀態只標為 `ANALYZED`。`app/services/submission.server.ts:211-240`
- 教師畫面只能改回饋文字，沒有地方覆寫分數，最後顯示的仍是 AI 分。`app/routes/teacher/submissions/$submissionId.view.tsx:85-105`
- 原始 AI JSON、模型、Token、耗時、思考摘要都留在 `grading_results` 表。`app/services/grading-result.server.ts:18-45`、`prisma/schema.prisma:262-304`

## 3. 連按「重新評分」的保護機制
- 若之前失敗，系統會把評分記錄狀態重設為 `PENDING` 再跑，避免殘留 `FAILED`。`app/services/grading-engine.server.ts:90-104`
- BullMQ 只是單純 `addBulk` 進佇列，沒有設定 `jobId` 或唯一鍵，等於同一份作業可以被排多次。`app/services/bullmq-grading.server.ts:205-236`
- 沒有看到鎖或防重複的 Redis Key，因此重複點「重新評分」可能同時跑好幾個 job，只能靠 AI 端自己處理重試。

## 4. 評分結果必須成立的規則與失敗處理
- Gemini 呼叫時用 JSON Schema 規定：每個 rubric 項目一定要出現在 breakdown；`totalScore`、`maxScore`、`feedback` 全是必填。`app/services/gemini-simple.server.ts:30-82`
- DB 入庫前再走 Zod 檢查，格式不對會直接丟失敗。`app/schemas/grading.ts:8-33`、`app/services/grading-result.server.ts:18-61`
- 但程式沒有驗證「小項得分總和＝總分」或權重加總 100%，要靠 AI 自律。一旦驗證失敗，`grading_result` 會留 `FAILED` 狀態，看不到成績。

## 5. 能否重現每筆成績（含 prompt/模型/參考資料）
- `grading_logger` 會把使用者、檔案連結、rubric、完整 prompt、AI raw response、思考內容、耗時都寫成 JSON 檔存在 `logs/`。`app/services/grading-logger.server.ts:11-210`
- `grading_results` 表還記錄模型名稱、token 數、耗時、用到的參考文件（`usedContext`）、思考摘要等欄位，可還原出當時的上下文。`prisma/schema.prisma:262-304`

## 6. request-id 能否串到 submission-id / job-id / model-call
- 目前伺服器只用裸的 Pino logger，沒有掛 `pino-http`、沒有 request-id。`app/utils/logger.ts:8-18`
- 因此無法從 request-id 查到 submission 或 BullMQ job；要追查得靠手動比對時間與使用者資訊。

## 7. Rubric 更新時的快照
- `AssignmentArea` 只有 `rubricId`，沒有任何快照欄位。`prisma/schema.prisma:117-124`
- 只要老師改了 rubric，舊作業跟著讀最新版本，沒有保留「當時用的版本」，這是缺口。

## 8. 參考文件拆段與來源標註
- 參考文件在載入時單檔最多 8,000 字，超過就截斷並在結尾寫註記，沒有再細分 chunk。`app/services/assignment-area.server.ts:430-492`
- Prompt 只把整段文字塞進去，也沒把頁碼或段落編號帶回給學生。`app/services/gemini-prompts.server.ts:205-224`

## 9. PDF 解析逾時或失敗時的處理
- 解析失敗或逾時計，檔案狀態會改成 `FAILED` 並記錄錯誤訊息，然後直接 throw。`app/services/pdf-parser.server.ts:169-214`
- 前端在開始評分前會輪詢 `/api/files`，只要看到 `FAILED` 就顯示「解析失敗，請重試」。`app/routes/student/assignments/$assignmentId.submit.tsx:324-348`、`app/locales/zh/assignment.json:101-107`
- 目前沒有自動 fallback 成「只用純文字」或轉人工，只能請學生換檔或再試。

## 10. 高峰期是否按課程/老師限額
- BullMQ worker 固定 concurrency=3，全系統共用，沒有依課程或老師做配額。`app/services/bullmq-grading.server.ts:123-157`
- 也沒有看見 Redis-based rate limiter，所以同一門課可以塞滿整個佇列。

## 11. 塞車時的 Admission Control
- 程式裡沒有 Admission Control 參數或佇列長度上限，佇列滿了只會排隊，也不會自動拆分大任務。
- 相關設定完全缺席，可以視為需求落空。

## 12. BullMQ 重試、退避、逾時與死信
- Job 預設 `attempts: 999`，退避是指數成長，初始 15 秒。`app/services/bullmq-grading.server.ts:108-151`
- 沒設定 job-level timeout，也沒 Dead Letter Queue；失敗紀錄只保留 500 筆。`app/services/bullmq-grading.server.ts:108-118`

## 13. WebSocket 斷線補漏
- WebSocket 只是把 Redis 事件丟給對應的房間，沒有重送機制。`websocket-server/src/event-handler.ts:18-132`
- 前端進教師介面時會主動用 REST 抓最近 50 筆通知，算是「重同步」備援。`app/stores/submissionStore.ts:232-271`、`app/api/teacher/notifications.ts:6-56`
- 因此頁籤睡著後回來至少會補上資料，但即時訊息仍可能錯過。

## 14. Google OAuth 的 state 與 session 固定攻擊
- 產生授權網址時沒有帶 `state`，少了一層 CSRF 防護。`app/services/auth.server.ts:45-50`
- 登入後直接在原 session 上塞使用者 ID，沒有重新生成 session，理論上仍有 session fixation 風險。`app/services/auth.server.ts:133-136`

## 15. 助教的權限控管
- 系統只有 `TEACHER` 與 `STUDENT` 兩種角色；助教只是 `Class.assistantId` 欄位，還沒有對應權限。`prisma/schema.prisma:72-103`
- 驗證 middleware 只有 `requireTeacher` / `requireStudent`，沒有 `requireAssistant`。`app/services/auth.server.ts:243-258`
- 換句話說，目前助教無法登入做任何老師功能。

## 16. 多租戶資料隔離
- 幾乎所有教師端查詢都會把 `teacherId` 當 where 條件，集中在 Service 層。`app/services/course.server.ts:46-98`
- 學生端也會用 `studentId` 過濾；雖然手工撰寫，但至少在資料層看得到防護。

## 17. 上傳檔案與 AI 結果的保留與清理
- 上傳檔案預設 30 天到期（`expiresAt`），Service 有 `cleanupExpiredFiles()` 會刪 DB 記錄，但未自動刪掉 S3 檔案，需要額外 job。`app/services/uploaded-file.server.ts:143`、`app/services/uploaded-file.server.ts:445-475`
- Grading 結果沒有保存期限欄位，目前看來會永久留在資料庫。

## 18. 日誌敏感欄位遮蔽
- Logger 沒有設定 `redact`，也沒提供遮蔽清單，代表若有人 `logger.info` 出 API Key 會原樣寫出。`app/utils/logger.ts:8-18`
- 這部分仍是風險點。

## 19. 監控的紅線與告警
- 監控服務只設定 CPU 90%、記憶體 85%、回應 10 秒、錯誤率 20% 等簡單閾值，沒有 P95、成功率等細項。`app/services/monitoring.server.ts:12-17`
- 告警邏輯也停留在 `checkAlerts()`，沒有整合到外部告警系統。

## 20. 最慢的查詢與優化策略
- 監控程式把慢查詢欄位硬寫成 0，沒有實際追蹤。`app/services/monitoring.server.ts:85-102`
- 找不到任何 Prisma Query Event 或慢查詢報表，因此目前無法回答哪幾個查詢最慢。

## 21. 大檔、掃描 PDF、表格/公式的處理
- PDF 解析就是送外部 Parser，沒有針對掃描檔或表格做特別處理，超時就失敗。`app/services/pdf-parser.server.ts:169-214`
- 沒看到降噪或回報「這段讀不到」的機制。

## 22. 什麼時候從 Gemini 轉向 OpenAI，恢復條件
- Circuit breaker 對 Google AI 連續失敗 3 次後熔斷，45 秒後再試；OpenAI 的門檻是 5 次。`app/services/ai-protected.server.ts:12-104`
- `callAIWithFallback` 先走 Google，再走 OpenAI；兩邊都熔斷會丟出「服務暫時無法使用」。`app/services/ai-protected.server.ts:56-101`
- 恢復就是熔斷時間過了，進入半開模式測試成功即可。

## 23. 單份評分的成本/Token 上限與降級
- Gemini 目前把輸出 Token 上限拉到 8192，thinking budget 亦 8192，沒有費用上限判斷。`app/services/gemini-simple.server.ts:102-121`
- 也沒看到根據 token 消耗改用小模型或縮短上下文的邏輯。

## 24. 是否有人工標準答案評估 AI
- 專案裡沒有看到標準答案或 Benchmark Dataset；`test/` 也沒有評估 AI 準確度的腳本。整體仍缺乏品質基準。

## 25. 端到端測試是否覆蓋「逾時→重試→降級」
- 測試目錄只有 unit/integration/load，沒有 e2e 受控劇本，更沒有針對逾時→重試→降級流程的測試。`test/` 目錄結構可佐證。

## 26. 資料表異動的無痛部署與回退
- 專案僅保留 Prisma migrations，沒有看到藍綠或 feature flag 策略；回退也沒腳本，需手動還原 migration。

## 27. 金鑰輪替頻率與不中斷機制
- Gemini 支援三把 Key 做智慧輪替，有健康度與冷卻時間的控管。`app/services/gemini-rotating.server.ts:1-120`、`app/services/gemini-key-health.server.ts:1-115`
- 但沒有描述「多久換一次」、也沒有雙金鑰窗口流程，更多像是同時備用以分散流量。

## 28. 學生能否多次提交與鎖定時機
- 同一份作業可重交，只要尚未被標記為 `GRADED`。`app/services/submission.server.ts:124-148`
- 一旦老師把 submission 狀態改成 `GRADED`（目前應是後續流程預留），再想上傳會直接丟錯。

## 29. 小組作業支援狀態
- Submission 表只有 `studentId`，沒有群組或多作者欄位。`prisma/schema.prisma:139-160`
- API 也未處理多人繳交，代表目前只支援個人作業。

## 30. 截止時間時區與日光節約
- 日期格式化統一用 `new Date()` + `Intl.DateTimeFormat('en-US')`，走伺服器時區。`app/lib/date.server.ts:1-39`
- 前端表單用 `datetime-local`，也是依瀏覽器所在地區；沒有看到 DST 校正或統一時區邏輯，跨時區課程需自行注意。

---

以上是現狀盤點，可作為後續補強計畫的參考。
