# Agent 評分系統使用指南

基於 AI SDK 6 Beta 的智能 Agent 評分系統完整使用手冊。

---

## 📋 目錄

1. [快速開始](#快速開始)
2. [系統架構](#系統架構)
3. [啟用 Agent 評分](#啟用-agent-評分)
4. [使用流程](#使用流程)
5. [審核佇列](#審核佇列)
6. [UI 元件](#ui-元件)
7. [效能與成本](#效能與成本)
8. [故障排除](#故障排除)

---

## 🚀 快速開始

### 前置需求

-   已升級到 AI SDK 6 beta
-   已執行資料庫 migration (`add_agent_grading_fields`)
-   Gemini API Key 已設定

### 3 步驟啟用

**步驟 1：設定環境變數**

編輯 `.env` 檔案：

```bash
# 啟用 Agent 評分
USE_AGENT_GRADING=true

# 信心度閾值（可選，預設 0.7）
AGENT_CONFIDENCE_THRESHOLD=0.7

# 確保有 Gemini API Key
GEMINI_API_KEY=your_actual_api_key_here
```

**步驟 2：重啟伺服器**

```bash
# 停止現有服務
docker-compose -f docker-compose.dev.yaml down

# 重啟所有服務
docker-compose -f docker-compose.dev.yaml up -d

# 或僅重啟 app（如果使用 npm run dev）
# 按 Ctrl+C 停止，然後重新執行 npm run dev
```

**步驟 3：測試評分**

1. 以老師身份登入
2. 進入任一作業區域
3. 提交一份測試作業
4. 啟動評分 → Agent 會自動運行
5. 查看 `/teacher/agent-review` 審核佇列

---

## 🏗️ 系統架構

### Agent 評分流程

```
學生提交作業
    ↓
系統啟動評分
    ↓
【Agent 執行引擎】
    ↓
┌─────────────────────────────────┐
│ 步驟 1: 分析評分標準             │ ← analyze_rubric
│ 步驟 2: 解析作業內容             │ ← parse_content
│ 步驟 3: 搜尋參考資料（如有）      │ ← search_reference
│ 步驟 4: 檢查相似度               │ ← check_similarity
│ 步驟 5-N: 逐項評分（多步驟）      │ ← AI 推理
│ 步驟 N+1: 計算信心度             │ ← calculate_confidence
│ 步驟 N+2: 生成反饋               │ ← generate_feedback
└─────────────────────────────────┘
    ↓
信心度 >= 0.7?
    ↓
  YES                NO
    ↓                ↓
直接完成        提交審核佇列
    ↓                ↓
學生可見結果    老師審核後才顯示
```

### 6 個核心工具

1. **analyze_rubric** - 分析評分標準
   - 評估複雜度（簡單/中等/複雜）
   - 識別關鍵評分維度
   - 建議評分策略

2. **parse_content** - 解析作業內容
   - 計算字數、字元數
   - 檢測程式碼、圖片、表格
   - 提取結構（標題、段落）

3. **search_reference** - 搜尋參考資料
   - 關鍵字搜尋參考文件
   - 計算相關度分數
   - 返回最相關段落

4. **check_similarity** - 相似度檢測
   - 與歷史作業比對
   - 計算 Jaccard similarity
   - 標記高相似度案例（抄襲警告）

5. **calculate_confidence** - 信心度計算
   - 評估 Rubric 覆蓋率（0-1）
   - 評估證據品質（high/medium/low）
   - 評估標準模糊度（0-1）
   - 綜合計算信心度（加權平均）

6. **generate_feedback** - 生成反饋
   - 彙總各項評分
   - 生成結構化反饋
   - 提供改進建議

### 資料庫結構

**GradingResult 新增欄位：**
- `agentSteps`: JSON - 完整執行步驟
- `toolCalls`: JSON - 工具調用摘要
- `confidenceScore`: Float - 信心度分數（0-1）
- `requiresReview`: Boolean - 是否需審核
- `reviewedBy`: String - 審核者 ID
- `reviewedAt`: DateTime - 審核時間
- `agentModel`: String - Agent 模型名稱
- `agentExecutionTime`: Int - 總執行時間（毫秒）

**AgentExecutionLog 新表：**
- 詳細記錄每個步驟
- 包含工具輸入/輸出
- 包含 AI 推理過程
- 按 `stepNumber` 排序

---

## ⚙️ 啟用 Agent 評分

### 環境變數說明

```bash
# ========== 必要設定 ==========

# 啟用 Agent 評分（預設：false）
USE_AGENT_GRADING=true

# Gemini API Key（Agent 使用 gemini-2.5-flash）
GEMINI_API_KEY=your_key_here

# ========== 可選設定 ==========

# 信心度閾值（預設：0.7）
# 低於此值的評分會提交人工審核
AGENT_CONFIDENCE_THRESHOLD=0.7

# 多 Key 輪換（可選，提升速率限制）
GEMINI_API_KEY2=your_second_key
GEMINI_API_KEY3=your_third_key
```

### 信心度閾值選擇

| 閾值  | 適用場景              | 預期審核率 |
| ----- | --------------------- | ---------- |
| 0.8   | 嚴格模式，要求極高準確度 | 40-50%     |
| **0.7** | **平衡模式（推薦）**     | **20-30%** |
| 0.6   | 寬鬆模式，信任 AI 判斷  | 10-20%     |

---

## 📝 使用流程

### 對學生：無需改變

學生使用流程完全不變：
1. 進入作業區域
2. 上傳檔案
3. 提交作業
4. 等待評分

**差異：**
- Agent 評分時間稍長（10-30 秒 vs 3-10 秒）
- 如果信心度低，需等待老師審核

### 對老師：新增審核流程

#### 1. 查看評分結果

評分完成後，在作業詳情頁會顯示：

-   **標準評分資訊**（總分、各項分數、反饋）
- 🆕 **信心度徽章**（極高/高/中/低）
- 🆕 **Agent 執行時間軸**（步驟展開）
- 🆕 **需審核標記**（如果信心度 < 閾值）

#### 2. 審核佇列

訪問 **`/teacher/agent-review`** 查看需審核的評分：

**功能：**
- 📊 統計面板（待審核、已審核、平均信心度）
- 🔍 篩選器（待審核/已審核/全部）
- 📋 評分清單（按信心度升序排列）
- 🔎 完整 Agent 執行記錄

**操作：**
- **批准評分** → 標記為已審核，學生可見
- **重新評分** → 重置為待評分，重新進入佇列
- **查看詳情** → 在新分頁開啟完整評分結果

#### 3. 審核決策

**何時批准：**
-   評分合理，反饋具體
-   各項分數有充分證據支持
-   沒有明顯錯誤

**何時重新評分：**
- ❌ 評分明顯偏高或偏低
- ❌ 反饋不夠具體
- ❌ 誤判學生意圖
- ❌ 相似度檢測誤報

---

## 🎨 UI 元件

### AgentExecutionTimeline

顯示 Agent 執行過程的時間軸元件。

**位置：**
- 評分詳情頁
- 審核佇列

**功能：**
- 📍 步驟編號 + 工具名稱
- ⏱️ 每步驟耗時
- 🧠 AI 推理過程
- 🔧 工具輸入/輸出（可摺疊）
- 📊 統計摘要（總步驟、工具調用、總時間）

**範例：**

```tsx
import { AgentExecutionTimeline } from '@/components/grading/AgentExecutionTimeline';

<AgentExecutionTimeline
  steps={gradingResult.agentSteps}
  confidenceScore={gradingResult.confidenceScore}
  requiresReview={gradingResult.requiresReview}
  totalExecutionTimeMs={gradingResult.agentExecutionTime}
/>
```

### AgentExecutionSummary

緊湊版本，適用於列表檢視。

```tsx
import { AgentExecutionSummary } from '@/components/grading/AgentExecutionTimeline';

<AgentExecutionSummary
  steps={steps}
  confidenceScore={0.85}
  requiresReview={false}
/>
```

**顯示：**
- 🧠 6 步驟
- 🟢 信心度：高 (85%)

---

## ⚡ 效能與成本

### 執行時間

| 評分類型 | 平均時間  | 原因                          |
| -------- | --------- | ----------------------------- |
| 傳統評分 | 3-10 秒   | 單次 API 調用                 |
| Agent 評分 | 10-30 秒 | 多步驟工具調用 + 推理循環      |

**影響因素：**
-   Rubric 複雜度（標準越多，步驟越多）
-   是否有參考資料（需搜尋時間）
-   是否啟用相似度檢測（需資料庫查詢）
-   Agent 推理深度（maxSteps 設定為 15）

### Token 使用

| 評分類型 | 平均 Tokens | 成本估算（Gemini 2.5 Flash） |
| -------- | ----------- | ---------------------------- |
| 傳統評分 | 1000-3000   | $0.0003 - $0.0009            |
| Agent 評分 | 5000-15000 | $0.0015 - $0.0045            |

**成本計算：**（以 Gemini 2.5 Flash 為例）
- Input: $0.15 per 1M tokens
- Output: $0.60 per 1M tokens
- 平均：每次 Agent 評分約 $0.003（約 NT$0.1）

### 優化建議

**降低成本：**
1. 提高信心度閾值（減少低品質評分）
2. 針對簡單作業使用傳統評分
3. 使用多 API Key 避免速率限制
4. 考慮批次評分而非即時評分

**提升速度：**
1. 減少 `maxSteps`（預設 15，可降至 10）
2. 關閉相似度檢測（如不需抄襲偵測）
3. 限制參考資料數量（最多 3-5 份）

---

## 🔧 故障排除

### 常見問題

#### 1. Agent 評分未啟用

**症狀：**
- 評分仍使用傳統模式
- 無 Agent 執行記錄

**解決：**
```bash
# 檢查環境變數
cat .env | grep USE_AGENT_GRADING

# 應該顯示
USE_AGENT_GRADING=true

# 如果沒有，編輯 .env 並重啟
docker-compose -f docker-compose.dev.yaml restart app
```

#### 2. 所有評分都需審核

**症狀：**
- 審核佇列擠滿
- 信心度都很低（< 0.5）

**原因：**
- Rubric 標準不夠明確
- 沒有提供參考資料
- 作業內容品質不佳

**解決：**
1. 優化 Rubric 描述（更具體的評分標準）
2. 提供參考資料（課程講義、範例作業）
3. 降低信心度閾值（0.7 → 0.6）

#### 3. Agent 執行失敗

**症狀：**
- 評分狀態為 FAILED
- 錯誤訊息：「Agent grading failed」

**排查：**

```bash
# 查看 logs
docker-compose -f docker-compose.dev.yaml logs app --tail=100

# 尋找關鍵字
grep "Agent Executor" logs
grep "Agent Tool" logs
```

**常見錯誤：**

| 錯誤訊息                                    | 原因            | 解決方法                       |
| ------------------------------------------- | --------------- | ------------------------------ |
| `All Gemini API keys are throttled`        | 超過速率限制    | 等待 1 分鐘或使用多 Key        |
| `Agent did not generate final feedback`    | Agent 未完成流程 | 檢查 Rubric 是否格式正確       |
| `Tool execution failed: check_similarity`  | 資料庫查詢錯誤  | 檢查 assignmentAreaId 是否存在 |

#### 4. 審核頁面無法載入

**症狀：**
- 訪問 `/teacher/agent-review` 顯示 404

**解決：**

```bash
# 確認路由已註冊
cat app/routes.ts | grep agent-review

# 應該看到
# route('agent-review', './routes/teacher.agent-review.tsx'),

# 如果沒有，檢查是否 merge 了最新代碼

# 重新生成路由類型
npx react-router typegen

# 重啟開發伺服器
```

#### 5. 信心度計算不準確

**症狀：**
- 明顯好的評分信心度卻很低
- 或明顯差的評分信心度很高

**調整策略：**

信心度計算公式：
```
confidence = rubricCoverage * 0.4
           + evidenceQuality * 0.4
           + (1 - criteriaAmbiguity) * 0.2
```

可以修改權重（在 `agent-tools.server.ts` 中）：

```typescript
// calculateConfidenceTool 的 execute 函數
const confidenceScore =
  rubricCoverage * 0.5 +      // 提高 Rubric 覆蓋率權重
  evidenceScore * 0.3 +        // 降低證據品質權重
  (1 - criteriaAmbiguity) * 0.2;
```

---

## 📊 監控與分析

### 查看 Agent 統計

```typescript
import { getAgentStatistics } from '@/services/agent-logger.server';

const stats = await getAgentStatistics({
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-01-31'),
});

console.log(stats);
// {
//   total: 150,
//   reviewed: 45,
//   reviewRate: 30,
//   avgConfidence: 0.78,
//   avgExecutionTimeMs: 18500
// }
```

### 資料庫查詢範例

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

-- 查看需審核的評分數量
SELECT COUNT(*)
FROM grading_results
WHERE requires_review = true
  AND reviewed_by IS NULL;

-- 查看平均執行時間（按日期）
SELECT
  DATE(created_at) as date,
  AVG(agent_execution_time) as avg_time_ms,
  COUNT(*) as count
FROM grading_results
WHERE agent_model IS NOT NULL
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 🎓 最佳實踐

### 1. 漸進式部署

**第 1 週：小範圍測試**
- 僅針對 1-2 門課程啟用
- 設定較高信心度閾值（0.8）
- 密切監控審核佇列

**第 2 週：擴大範圍**
- 如果測試成功，擴展到更多課程
- 調整信心度閾值（0.75）
- 收集老師反饋

**第 3-4 週：全面推廣**
- 所有課程啟用（除非老師選擇退出）
- 降至標準閾值（0.7）
- 建立審核流程 SOP

### 2. Rubric 優化

**好的 Rubric 特徵：**
  明確的評分標準（避免模糊詞彙）
  具體的分數級距描述
  量化指標（例如：「至少 5 個參考文獻」）
  範例說明

**範例對比：**

❌ **不好的 Rubric：**
```
內容品質：評估內容是否優秀
- 4 分：內容很好
- 3 分：內容不錯
- 2 分：內容普通
- 1 分：內容不佳
```

  **好的 Rubric：**
```
內容深度：評估論述的完整性和深度
- 4 分：論述完整，包含 5+ 個具體例子，有深入分析
- 3 分：論述清楚，包含 3-4 個例子，有基本分析
- 2 分：論述簡單，僅 1-2 個例子，缺乏分析
- 1 分：論述不完整，無例子或分析
```

### 3. 參考資料策略

**提供參考資料時：**
- 📝 限制在 3-5 份最相關文件
- 📄 每份文件不超過 5000 字元
- 🎯 包含關鍵概念和標準答案
- 🔖 使用清晰的檔名（如：`lecture_week3_summary.pdf`）

**範例：**
```
參考資料建議：
1. 課程大綱（核心概念定義）
2. 課堂講義（詳細說明）
3. 範例作業（優秀示範）
4. 評分量表（評分標準）
```

### 4. 審核效率

**快速審核技巧：**
1. 優先處理信心度 < 0.5 的（最可疑）
2. 批次批准信心度 0.65-0.7 的（接近閾值但合理）
3. 仔細檢查相似度警告的作業
4. 使用鍵盤快捷鍵（如有實作）

**審核檢查清單：**
- [ ] 總分是否合理？
- [ ] 各項分數加總正確？
- [ ] 反饋是否具體且有建設性？
- [ ] 是否有明顯的誤判？
- [ ] 相似度檢測是否誤報？

---

## 🆚 Agent vs 傳統評分對比

| 特性           | 傳統評分      | Agent 評分         |
| -------------- | ------------- | ------------------ |
| **執行時間**   | 3-10 秒       | 10-30 秒           |
| **Token 使用** | 1000-3000     | 5000-15000         |
| **成本**       | $0.0003       | $0.003（10 倍）    |
| **準確度**     | 中等          | 高                 |
| **透明度**     | 低（黑盒）    | 極高（完整軌跡）   |
| **信心度**     | 無            | 有（0-1 分數）     |
| **人工審核**   | 無機制        | 自動標記低信心度   |
| **抄襲檢測**   | 無            | 內建相似度檢測     |
| **參考資料**   | 靜態加入 prompt | 動態搜尋相關段落   |
| **錯誤處理**   | 簡單 retry    | 多步驟自我修正     |

---

## 📚 相關文檔

- [AI SDK 6 Beta 功能建議](./AI_SDK_V6_FEATURES_RECOMMENDATIONS.md) - 所有可用功能
- [AI SDK 官方文檔](https://ai-sdk.dev/) - Vercel AI SDK 文檔
- [Gemini API 文檔](https://ai.google.dev/gemini-api/docs) - Google Gemini API

---

## 🙋 常見問題 FAQ

**Q: Agent 評分會取代老師嗎？**
A: 不會。Agent 是輔助工具，低信心度的評分仍需老師審核。最終決定權在老師手中。

**Q: 可以只針對特定作業啟用 Agent 嗎？**
A: 目前是全局設定。如需針對特定作業，需在代碼中添加判斷邏輯（檢查 assignmentArea metadata）。

**Q: 信心度是如何計算的？**
A: 綜合考量 3 個因素：
  - Rubric 覆蓋率（40%）
  - 證據品質（40%）
  - 標準模糊度（20%）

**Q: 可以調整工具行為嗎？**
A: 可以。編輯 `app/services/agent-tools.server.ts` 中各工具的 `execute` 函數。

**Q: 如何禁用某個工具？**
A: 在 `agent-executor.server.ts` 中移除該工具，或在 Agent prompt 中告知不要使用。

**Q: 支援多語言嗎？**
A: 支援。Agent 會根據 `userLanguage` 參數調整 prompt 語言（目前支援中文/英文）。

---

## 📞 支援與回饋

如遇問題或有改進建議：

1. **檢查日誌**：`docker-compose logs app | grep Agent`
2. **查看資料庫**：檢查 `grading_results` 和 `agent_execution_logs` 表
3. **提交 Issue**：附上錯誤訊息和執行記錄

---

**最後更新：** 2025-01-04
**版本：** 1.0.0
**作者：** Claude (AI Assistant)
