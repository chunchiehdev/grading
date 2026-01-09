# Spec 018: Dialectical Feedback（辯證式回饋）

## 概述

實作 1.5 輪對練機制，讓 AI 能夠針對學生的回應給予動態回饋，並強迫學生做出「同意/不同意」的選擇，取代原本的「揭曉 AI 推理」機制。

## 背景

### 現有問題
1. **垃圾進，流程過**：學生輸入亂碼也能過關
2. **時空錯置**：AI 揭曉的是「評分時寫好的推理」，而非針對學生回答的回饋
3. **巴甫洛夫效應**：學生把對練當成「看分數前的障礙」

### 設計理念
基於 Advait Sarkar (Microsoft Research) 的「Productive Friction」概念：
- AI 不應該只是「助理」，應該是「思考工具」
- 刻意製造認知摩擦，讓學生停下來思考
- 對話應該轉化為「行為改變」或「明確的認知選擇」

## 流程設計

### 1.5 輪流程（每題）

```
┌─────────────────────────────────────────────┐
│ 0.5 輪：AI 提問（已有）                       │
│ - 顯示 sparringQuestion.question            │
│ - 顯示 target_quote                         │
│ - 顯示 provocation_strategy badge           │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 0.5 輪：學生回應（已有）                      │
│ - Textarea 輸入                             │
│ - 最少 10 字                                │
│ - 點擊「提交回應」                           │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 0.5 輪：AI 動態回饋（新增）                   │
│ - 呼叫 AI API                               │
│ - 顯示 Loading 狀態                         │
│ - 顯示 AI 的動態回饋                         │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 學生選擇（新增）                             │
│ - ✅ AI 說得有道理                          │
│ - ❌ 我不同意，堅持我的觀點                  │
│ - 選擇後進入下一題或摘要                     │
└─────────────────────────────────────────────┘
```

## 技術實作

### 1. 新增 Service：`dialectical-feedback.server.ts`

```typescript
// app/services/dialectical-feedback.server.ts

interface DialecticalFeedbackParams {
  sparringQuestion: {
    question: string;
    target_quote: string;
    provocation_strategy: string;
    ai_hidden_reasoning: string;
    related_rubric_id: string;
  };
  studentResponse: string;
  rubricCriterionName?: string;
  language?: 'zh' | 'en';
}

interface DialecticalFeedbackResult {
  success: boolean;
  feedback?: string;
  error?: string;
}

export async function generateDialecticalFeedback(
  params: DialecticalFeedbackParams
): Promise<DialecticalFeedbackResult>
```

**Prompt 設計：**
```
你是一位蘇格拉底式的教學助理。學生剛剛回答了你的挑戰問題。

## 背景
- 評分維度：{rubricCriterionName}
- 你原本的觀察：{ai_hidden_reasoning}
- 你問的問題：{question}
- 學生原文引用：「{target_quote}」

## 學生的回應
「{studentResponse}」

## 你的任務
1. 如果學生的回應有道理，承認它
2. 如果回應沒有真正回答問題，溫和指出
3. 不要重複原本的批評
4. 保持簡短：2-4 句話
5. 用第二人稱直接對學生說話

## 回覆格式
直接回覆，不要有標題或分項。
```

### 2. 修改 API：`$assignmentId.sparring-response.ts`

**現有功能：** 儲存學生回應到 DB

**新增功能：**
1. 接收 `sparringQuestion` 資料
2. 呼叫 `generateDialecticalFeedback()`
3. 返回 `{ success, dialecticalFeedback }`
4. 儲存 feedback 到 DB

**新增欄位（在 sparringResponses 中）：**
```typescript
interface SparringResponseData {
  questionIndex: number;
  questionId: string;
  strategy: string;
  response: string;
  respondedAt: string;
  // 新增
  dialecticalFeedback?: string;
  studentDecision?: 'agree' | 'disagree';
  decisionAt?: string;
}
```

### 3. 修改 Component：`SparringInterface.tsx`

**狀態機：**
```typescript
type QuestionPhase = 
  | 'answering'      // 學生輸入中
  | 'loading'        // 等待 AI 回饋
  | 'feedback'       // 顯示 AI 回饋 + 選擇按鈕
  | 'completed';     // 已選擇，準備下一題
```

**新增 Props：**
```typescript
interface SparringInterfaceProps {
  // 現有
  questions: SparringQuestion[];
  savedResponses?: SparringResponseData[];
  onComplete: () => void;
  onResponse?: (data: SparringResponseData) => void;
  className?: string;
  // 新增
  assignmentId: string;  // 用於 API 呼叫
  sessionId?: string;    // 用於追蹤
}
```

**UI 變更：**
1. 提交回應後顯示 Loading Skeleton
2. Loading 完成後顯示 AI 回饋 + 選擇按鈕
3. 選擇後才能進入下一題
4. 摘要頁顯示每題的選擇結果

### 4. 修改 Types：`grading.ts`

```typescript
export interface SparringResponseData {
  questionIndex: number;
  questionId: string;
  strategy: string;
  response: string;
  respondedAt: string;
  // 新增
  dialecticalFeedback?: string;
  studentDecision?: 'agree' | 'disagree';
  decisionAt?: string;
}
```

### 5. 修改 Schema：`grading.ts`

```typescript
export const SparringResponseSchema = z.object({
  questionIndex: z.number(),
  questionId: z.string(),
  strategy: z.string(),
  response: z.string(),
  respondedAt: z.string(),
  // 新增
  dialecticalFeedback: z.string().optional(),
  studentDecision: z.enum(['agree', 'disagree']).optional(),
  decisionAt: z.string().optional(),
});
```

## 檔案變更清單

| 檔案 | 動作 | 說明 |
|------|------|------|
| `app/services/dialectical-feedback.server.ts` | 新增 | AI 回饋生成邏輯 |
| `app/routes/api/student/assignments/$assignmentId.sparring-response.ts` | 修改 | 加入 AI 呼叫 |
| `app/components/grading/SparringInterface.tsx` | 修改 | 新增 feedback 階段 |
| `app/types/grading.ts` | 修改 | 擴展 SparringResponseData |
| `app/schemas/grading.ts` | 修改 | 擴展 schema |

## Token 與成本估算

| 項目 | Token 估計 | 說明 |
|------|-----------|------|
| Input | ~800-1,200 | question + quote + reasoning + response |
| Output | ~100-200 | 2-4 句話 |
| 每題成本 | ~$0.0001 | Gemini 2.5 Flash |
| 2 題對練 | ~$0.0002 | 可忽略 |

## 錯誤處理

1. **AI 呼叫失敗**：Fallback 顯示原本的 `ai_hidden_reasoning`
2. **Rate Limit**：使用現有 key rotation 機制
3. **Timeout**：5 秒超時，顯示 fallback

## 研究數據追蹤

```typescript
// 可分析的數據
{
  questionIndex: number;
  strategy: 'evidence_check' | 'logic_gap' | ...;
  responseLength: number;
  studentDecision: 'agree' | 'disagree';
  timeToRespond: number;  // 回答花費時間
  timeToDecide: number;   // 選擇花費時間
}
```

## 實作順序

1. ✅ 建立 Spec（本文件）
2. 修改 Types 和 Schema
3. 建立 `dialectical-feedback.server.ts`
4. 修改 API route
5. 修改 `SparringInterface.tsx`
6. 測試

## 預期效果

- **學生**：感受到 AI 真的在「聽」他們的回答
- **研究**：可追蹤「哪種策略最能促進反思」
- **系統**：從「障礙」變成「對話」
