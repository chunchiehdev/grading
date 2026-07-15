type ProvocationStrategy =
  | 'evidence_check'
  | 'logic_gap'
  | 'counter_argument'
  | 'warrant_probe'
  | 'metacognitive'
  | 'conceptual'
  | 'clarification' // legacy/agent variant
  | 'extension'; // legacy/agent variant

/** Kember (2008) 反思深度四層級 — 論文核心依變項 */
export type ReflectionLevel = 'L1' | 'L2' | 'L3' | 'L4';

export interface SparringQuestion {
  related_rubric_id: string; // 對應的評分維度 ID (用於量化分析)
  target_quote: string; // 學生文章中的具體引文
  provocation_strategy: ProvocationStrategy; // 策略標籤 (用於質性編碼)
  question: string; // 顯示給學生的問題
  ai_hidden_reasoning: string; // AI 的評分依據 (揭曉時顯示)
}

// 結構化的整體回饋類型
export interface OverallFeedbackStructured {
  documentStrengths?: string[];
  keyImprovements?: string[];
  nextSteps?: string;
  summary?: string;
}

// 統一的評分結果資料結構 - 支援 Gemini 和 OpenAI
export interface GradingResultData {
  totalScore: number;
  maxScore: number;
  breakdown: Array<{
    criteriaId: string;
    name: string;
    score: number;
    feedback: string;
  }>;
  overallFeedback: string | OverallFeedbackStructured;
  sparringQuestions?: SparringQuestion[];
  sparringResponses?: SparringResponseData[];
  chatHistory?: any[];
}

// 學生對練回應資料結構
interface SparringResponseData {
  questionIndex: number;
  questionId: string;
  strategy: string;
  response: string;
  respondedAt: string;
  // Dialectical Feedback (1.5 輪對練)
  dialecticalFeedback?: string;
  // 對練回應的反思深度 (Kember L1-L4) 與回應狀態 (決策流程 A-F) — 量化分析用
  reflectionLevel?: ReflectionLevel;
  responseState?: string;
  studentDecision?: 'agree' | 'disagree';
  decisionAt?: string;
}
