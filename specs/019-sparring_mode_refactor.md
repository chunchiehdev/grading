# AgenticGrader 系統重構計畫書：Sparring Mode 與學術價值對齊

## 1. 專案目標與學術定位

本計畫旨在將現有的自動化評分系統重構為符合 **"System Evaluation Study" (Tian et al., 2025)** 與 **"Productive Friction" (Sarkar, Microsoft Research)** 理論架構的教育介入工具。

### 核心目標
1.  **從「自動化批改」轉向「對練式評量」**：
    *   **Anti-Automation**: 防止學生將認知過程外包給 AI。
    *   **Pedagogical Agency**: 確保學生在獲得分數前，經歷「反思」與「辯證」的過程。
2.  **數據驅動的學術研究**：
    *   建立以「行為日誌 (System Logs)」為核心的質性研究方法。
    *   透過「挑釁策略 (Provocation Strategy)」的編碼，實現自動化的資料標註，支援論文的混合研究設計 (Convergent Design)。

### 研究架構 (Research Framework)
*   **方法論**: System Evaluation Study (小樣本、重質性、日誌輔助)。
*   **核心機制**: 生成一次，分段揭露 (Generate Once, Reveal Progressively)。
*   **預期貢獻**: 探討 AI 作為「挑釁者 (Provocateur)」而非「判官 (Judge)」時，對學生批判性思考與作業修改行為的影響。

---

## 2. 現況分析 (As-Is Analysis)

目前的系統設計是一個典型的「高效率工具」，在學術上被定義為「反教育 (Anti-Pedagogical)」。

*   **流程**: `Upload` (上傳) -> `Analyze` (AI 分析) -> `Result` (直接顯示分數與完整評語)。
*   **問題點**:
    1.  **認知卸載 (Cognitive Offloading)**: 學生只需點擊按鈕即可獲得答案，缺乏認知投入。
    2.  **總結性導向 (Summative Focus)**: 系統像是一個「驗屍報告」，而非學習過程的鷹架。
    3.  **單向權威**: 學生無法與評分結果互動，缺乏對成果的所有權感 (Ownership)。
*   **結論**: 雖然程式碼品質高且效率佳，但無法支撐以「批判性思考」為題的碩士論文。

---

## 3. 重構計畫詳解 (To-Be Design)

### 3.1 核心流程重構: The Sparring Loop

新流程將線性滑梯打斷，插入「無知之幕 (Veil of Ignorance)」與「對練 (Sparring)」階段。

1.  **上傳與自我校準 (Upload & Self-Regulation)**
    *   學生上傳檔案。
    *   (Option) 系統要求學生針對 Rubric 進行簡單的自我評分或指出最弱環節。
2.  **隱形分析 (Hidden Analysis)**
    *   後端執行 AI 評分，生成 `Score`, `Feedback` 以及 **`Sparring Questions`**。
    *   **關鍵**: 前端收到結果後，**不顯示分數**，進入對練模式。
3.  **對練階段 (Sparring Mode)**
    *   AI 拋出針對特定 Rubric 維度的「挑釁問題」。
    *   學生必須閱讀問題、思考並輸入回應。
4.  **揭曉與反思 (Reveal & Reflection)**
    *   學生提交回應後，系統揭曉 AI 的真實評分與 `Hidden Reasoning`。
    *   學生比對「自己的觀點」與「AI 的觀點」。

### 3.2 資料庫與 Schema 設計

不需大幅更動 DB Schema，主要透過擴充 API Response 的 JSON 結構來達成。

**Action 1: 更新 `GradingResultData` 介面**
目標檔案: `app/types/grading.ts`

```typescript
export type ProvocationStrategy = 
  | 'evidence_check'    // 查證數據來源
  | 'logic_gap'         // 指出邏輯跳躍
  | 'counter_argument'  // 提供反方觀點
  | 'clarification'     // 要求釐清定義
  | 'extension';        // 延伸思考

export interface SparringQuestion {
  related_rubric_id: string;   // 對應的評分維度 ID (用於量化分析)
  target_quote: string;        // 學生文章中的具體引文
  provocation_strategy: ProvocationStrategy; // 策略標籤 (用於質性編碼)
  question: string;            // 顯示給學生的問題
  ai_hidden_reasoning: string; // AI 的評分依據 (揭曉時顯示)
}

// 擴充既有的結果介面
export interface GradingResultData {
  // ... 原有欄位
  sparring_questions?: SparringQuestion[]; // 新增此欄位
}
```

**Action 2: 建立日誌系統 (Telemetry)**
目標: 支援論文的「行為數據分析」。
需建立一個新的 API endpoint 或使用既有機制紀錄以下事件：
*   `SPARRING_START`: 對練開始時間
*   `SPARRING_RESPONSE`: 學生回應內容長度、回應時間
*   `REVEAL_SCORE`: 分數揭曉事件

### 3.3 後端邏輯 (Backend Logic)

**Action 1: Prompt Engineering**
目標檔案: `app/services/grading-engine.server.ts` 或 `app/services/ai-grader.server.ts` (需確認具體生成 Prompt 的位置)
*   **任務**: 修改送給 LLM 的 System Prompt。
*   **指令**: 要求 LLM 在評分的同時，針對表現最差或最具爭議的 1-2 個 Rubric 維度，生成 `SparringQuestion` 物件。
*   **一致性原則**: 評分 (Score) 與提問 (Question) 必須在同一次 Inference 中生成，確保邏輯一致。

### 3.4 前端介面與狀態機 (Frontend & UI)

**Action 1: 狀態機重構**
目標檔案: `app/routes/student/assignments/$assignmentId.submit.tsx`

```typescript
type SubmissionPhase = 
  | 'upload' 
  | 'analyze'           
  | 'sparring'          // [NEW] 對練模式
  | 'reveal'            // [NEW] 揭曉模式
  | 'submit'            
  | 'completed';
```

**Action 2: 新增 UI 組件**
目標目錄: `app/components/grading/`
1.  **`SparringInterface.tsx`**: 
    *   聊天室風格或卡片風格。
    *   顯示 `question`。
    *   提供 Textarea 供學生輸入。
    *   "Reveal Evaluation" 按鈕。
2.  **`VeilOfIgnorance.tsx`** (Optional): 
    *   包裝 `GradingResultDisplay`，在 `phase !== 'reveal'` 時模糊化或隱藏分數。

---

## 4. 檔案變更清單 (File Change List)

| 類別 | 檔案路徑 | 預期變更 |
| :--- | :--- | :--- |
| **Types** | `app/types/grading.ts` | 新增 `SparringQuestion`, `ProvocationStrategy` 介面定義。 |
| **Frontend** | `app/routes/student/assignments/$assignmentId.submit.tsx` | 重構 `submissionReducer`，移除 `DirectGrading`，實作 Sparring 流程。 |
| **Frontend** | `app/components/grading/SparringInterface.tsx` | (新建) 實作對練互動介面。 |
| **Backend** | `app/services/ai-grader.server.ts` (暫定) | 修改 Prompt，要求輸出包含 `sparring_questions` 的 JSON。 |
| **Backend** | `app/services/grading-result.server.ts` | 確保後端在儲存/讀取結果時包含新的欄位。 |
| **Logging** | `app/hooks/useResearchLogger.ts` | (新建) 前端 Hook，用於收集論文所需的行為數據。 |

---

## 5. 執行步驟 (Execution Steps)

1.  **Define Types**: 修改 `grading.ts`，確立資料結構。
2.  **Backend Refactor**: 調整 AI Prompt 與 Output Parser，確保後端能吐出擴充後的 JSON。
3.  **Frontend Logic**: 修改 `submit.tsx` 的 Reducer，打斷自動化流程。
4.  **UI Implementation**: 實作 `SparringInterface`，並將其嵌入頁面流程。
5.  **Logging**: 埋設 Log 點位，確保數據可被追蹤。
6.  **Testing**: 驗證「一次生成，分段揭露」的流暢度與穩定性。
