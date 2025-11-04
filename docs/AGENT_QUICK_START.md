# Agent 評分系統 - 快速開始

5 分鐘啟用 AI SDK 6 Agent 智能評分系統。

---

## ✅ 前置檢查

確保你已完成：

- [x] AI SDK 6 beta 已安裝（`ai@beta` 等套件）
- [x] 資料庫 migration 已執行（`add_agent_grading_fields`）
- [x] Gemini API Key 已設定

---

## 🚀 3 步驟啟用

### 步驟 1：設定環境變數

編輯 `.env` 檔案，添加以下內容：

```bash
# 啟用 Agent 評分
USE_AGENT_GRADING=true

# 信心度閾值（預設 0.7，可選）
AGENT_CONFIDENCE_THRESHOLD=0.7
```

確認你的 Gemini API Key 已設定：

```bash
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### 步驟 2：重啟服務

```bash
# 如果使用 Docker
docker-compose -f docker-compose.dev.yaml restart app

# 或如果使用 npm run dev
# 按 Ctrl+C 停止，然後重新執行：
npm run dev
```

### 步驟 3：測試評分

1. **以老師身份登入**
   - 訪問 `http://localhost:3000`
   - 選擇老師角色

2. **創建測試作業**（如已有作業可跳過）
   - 進入任一課程
   - 創建作業區域
   - 設定評分標準（Rubric）

3. **提交測試**
   - 切換到學生帳號（或使用另一個瀏覽器）
   - 上傳一份測試作業
   - 點擊「提交」

4. **啟動評分**
   - 切回老師帳號
   - 進入作業管理
   - 點擊「開始評分」

5. **查看結果**
   - 等待 10-30 秒（Agent 評分較慢）
   - 查看評分結果頁面
   - 應該能看到「AI Agent 執行過程」時間軸

6. **檢查審核佇列**
   - 訪問 `/teacher/agent-review`
   - 如果信心度 < 0.7，會出現在待審核列表

---

## ✨ 驗證成功

如果看到以下內容，表示 Agent 評分已成功啟用：

### 評分結果頁面

✅ **應該看到：**
- 🧠 「AI Agent 執行過程」卡片
- 📊 步驟時間軸（步驟 1、步驟 2、...）
- 🎯 信心度徽章（極高/高/中/低）
- 🔧 工具調用記錄（可展開查看）
- 📈 統計摘要（總步驟、工具調用、執行時間）

### 審核佇列頁面

✅ **應該看到：**
- 📋 待審核/已審核/全部 分頁
- 📊 統計卡片（待審核數量、已審核數量、平均信心度）
- 📝 評分列表（包含完整 Agent 執行記錄）
- ✅ 批准/重新評分按鈕

### Console 日誌

✅ **應該看到：**
```
🤖 Using Agent grading system
[Agent Executor] Starting Agent grading
[Agent Step] stepNumber: 1, toolName: analyze_rubric
[Agent Step] stepNumber: 2, toolName: parse_content
[Agent Step] stepNumber: 3, toolName: check_similarity
...
✅ Agent grading succeeded
```

---

## ❌ 故障排除

### 問題 1：仍使用傳統評分

**症狀：**
- Console 顯示「Using AI SDK grading system」或「Using Legacy grading system」
- 評分結果沒有 Agent 執行過程

**解決：**
```bash
# 檢查環境變數
echo $USE_AGENT_GRADING
# 應該輸出: true

# 如果不是，編輯 .env
nano .env
# 添加或修改: USE_AGENT_GRADING=true

# 重啟服務
docker-compose -f docker-compose.dev.yaml restart app
```

### 問題 2：評分失敗

**症狀：**
- 評分狀態顯示 FAILED
- Console 錯誤：「Agent grading failed」

**檢查：**
```bash
# 查看完整日誌
docker-compose -f docker-compose.dev.yaml logs app --tail=100 | grep Agent

# 常見錯誤：
# - "All Gemini API keys are throttled" → 等待 1 分鐘
# - "API key not found" → 檢查 GEMINI_API_KEY
# - "Agent did not generate final feedback" → 檢查 Rubric 格式
```

### 問題 3：審核頁面 404

**症狀：**
- 訪問 `/teacher/agent-review` 顯示 404

**解決：**
```bash
# 重新生成路由類型
npx react-router typegen

# 重啟開發伺服器
npm run dev
```

### 問題 4：資料庫錯誤

**症狀：**
- 錯誤：「Column 'agentSteps' does not exist」

**解決：**
```bash
# 重新執行 migration
npx prisma migrate dev

# 確認 migration 已套用
npx prisma migrate status
```

---

## 📊 查看執行記錄

### 方法 1：前端 UI

訪問 `/teacher/agent-review` 查看所有 Agent 評分記錄。

### 方法 2：資料庫查詢

```sql
-- 查看最近 10 次 Agent 評分
SELECT
  id,
  confidence_score,
  requires_review,
  agent_execution_time,
  created_at
FROM grading_results
WHERE agent_model IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

### 方法 3：程式查詢

```typescript
import { getAgentStatistics } from '@/services/agent-logger.server';

const stats = await getAgentStatistics();
console.log('Agent 統計:', stats);
```

---

## 🎯 下一步

### 1. 調整信心度閾值

根據實際使用情況調整：

```bash
# 嚴格模式（更多審核）
AGENT_CONFIDENCE_THRESHOLD=0.8

# 寬鬆模式（更少審核）
AGENT_CONFIDENCE_THRESHOLD=0.6
```

### 2. 優化 Rubric

確保評分標準：
- ✅ 具體明確（避免「好/不好」等模糊詞）
- ✅ 有量化指標（例如：「至少 5 個參考文獻」）
- ✅ 分級描述清楚

### 3. 提供參考資料

在作業區域設定中添加：
- 📝 課程講義
- 📄 範例作業
- 📚 評分標準說明

### 4. 建立審核流程

制定團隊 SOP：
- 📅 每日檢查審核佇列
- ✅ 優先處理低信心度評分
- 📊 定期檢視統計數據

---

## 📚 完整文檔

- [詳細使用指南](./AGENT_GRADING_GUIDE.md) - 完整功能說明
- [AI SDK 6 功能建議](./AI_SDK_V6_FEATURES_RECOMMENDATIONS.md) - 更多進階功能

---

## 🆘 需要幫助？

1. **查看日誌**：
   ```bash
   docker-compose -f docker-compose.dev.yaml logs app | grep Agent
   ```

2. **檢查資料庫**：
   ```bash
   docker-compose -f docker-compose.dev.yaml exec postgres psql -U postgres -d grading_db
   \d grading_results
   \d agent_execution_logs
   ```

3. **聯繫支援**：
   - 提供錯誤訊息
   - 附上 Agent 執行記錄
   - 說明問題發生時的操作步驟

---

**祝你使用愉快！🎉**
