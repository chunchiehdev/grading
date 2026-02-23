/**
 * Zod Schemas for Agent-based Grading
 *
 * Validation schemas for Agent tool inputs/outputs and grading results
 */

import { z } from 'zod';

/**
 * Reference search tool schema
 */
export const ReferenceSearchResultSchema = z.object({
  foundReferences: z.array(
    z.object({
      fileName: z.string(),
      content: z.string(),
      relevanceScore: z.number().min(0).max(1),
      excerpt: z.string(),
    })
  ),
  totalMatches: z.number().int().nonnegative(),
  searchQuery: z.string(),
});

/**
 * Similarity check tool schema
 */
export const SimilarityCheckResultSchema = z.object({
  hasSuspiciousSimilarity: z.boolean(),
  matches: z.array(
    z.object({
      submissionId: z.string(),
      studentName: z.string().optional(),
      similarity: z.number().min(0).max(1),
      matchedSegments: z.array(z.string()).optional(),
    })
  ),
  recommendation: z.string(),
  checked: z.number().int().nonnegative(),
});

/**
 * Agent step schema
 */
export const AgentStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  toolName: z.string().optional(),
  toolInput: z.unknown().optional(),
  toolOutput: z.unknown().optional(),
  reasoning: z.string().optional(),
  durationMs: z.number().int().nonnegative(),
  timestamp: z.date(),
});

/**
 * Agent grading result schema
 */
export const AgentGradingResultSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      breakdown: z.array(
        z.object({
          criteriaId: z.string(),
          name: z.string(),
          score: z.number(),
          feedback: z.string(),
        })
      ),
      overallFeedback: z.string(),
      summary: z.string().optional(),
    })
    .optional(),
  steps: z.array(AgentStepSchema),
  confidenceScore: z.number().min(0).max(1),
  requiresReview: z.boolean(),
  totalTokens: z.number().int().nonnegative(),
  executionTimeMs: z.number().int().nonnegative(),
  error: z.string().optional(),
});

/**
 * Tool input schemas
 */

export const SearchReferenceInputSchema = z.object({
  query: z.string().min(1),
  referenceDocuments: z.array(
    z.object({
      fileName: z.string(),
      content: z.string(),
    })
  ),
  topK: z.number().int().positive().default(3).optional(),
});

export const CheckSimilarityInputSchema = z.object({
  currentSubmission: z.string(),
  assignmentAreaId: z.string(),
  threshold: z.number().min(0).max(1).default(0.8).optional(),
});

export const CalculateConfidenceInputSchema = z.object({
  rubricCoverage: z.number().min(0).max(1),
  evidenceQuality: z.enum(['high', 'medium', 'low']),
  criteriaAmbiguity: z.number().min(0).max(1),
});

/**
 * Think Aloud Tool - 讓模型說出當下的思考 (Hattie & Timperley Framework)
 */
export const ThinkAloudInputSchema = z.object({
  feedUp: z.string().describe('Feed Up (Where am I going?): Analyze the goal of this assignment. What is the student trying to achieve?'),
  feedBack: z.string().describe('Feed Back (How am I going?): Analyze the student\'s current performance. What are the strengths and weaknesses? Use specific evidence.'),
  feedForward: z.string().describe('Feed Forward (Where to next?): What are the next steps for the student? How can they close the gap?'),
  strategy: z.string().describe('Grading Strategy: How will you approach grading this specific submission based on the analysis above?'),
});

export const ThinkAloudOutputSchema = z.object({
  acknowledged: z.boolean(),
});

// Deprecated: Granular tools removed for efficiency
// export const EvaluateSubtraitInputSchema = ...
// export const MatchToLevelInputSchema = ...

/**
 * Sparring Question Schema - 對練問題（Productive Friction）
 */
export const ProvocationStrategySchema = z.enum([
  'evidence_check',    // 查證數據來源
  'logic_gap',         // 指出邏輯跳躍
  'counter_argument',  // 提供反方觀點
  'clarification',     // 要求釐清定義
  'extension',         // 延伸思考
]);

export const SparringQuestionSchema = z.object({
  related_rubric_id: z.string().describe('對應的評分維度 ID（必須與 criteriaScores 中的 criteriaId 一致）'),
  target_quote: z.string().describe('學生文章中的具體引文，作為發問的依據'),
  provocation_strategy: ProvocationStrategySchema.describe('挑釁策略類型'),
  question: z.string().describe('直接對學生提出的挑戰性問題，不包含答案'),
  ai_hidden_reasoning: z.string().describe('問題背後的邏輯與 AI 的真實評分依據（揭曉時才顯示給學生）'),
});

export const GenerateFeedbackInputSchema = z.object({
  // 新增：強制 AI 提供完整的評分推理過程
  reasoning: z.string().describe(`【完整思考過程】這是你作為評分者的內心獨白，會顯示給教師看。請用第一人稱，像老師批改作業時的思考：

「讀完這篇作業，我的第一印象是...
在【句子結構】方面，我注意到學生寫道「...」，這裡...
在【邏輯連貫】方面，文章從A段到B段...
整體來說，這份作業的亮點是...，但需要改進的是...
因此，我的評分是...」

請確保：
1. 每個評分項目都有具體分析
2. 引用學生原文作為證據（用「」標示）
3. 說明給分的邏輯（為什麼是這個分數而不是更高/更低）
4. 語氣像一位有經驗的老師在思考`),
  criteriaScores: z.array(
    z.object({
      criteriaId: z.string(),
      name: z.string(),
      score: z.number().int().min(1).max(4).describe("Score must be an integer matching the rubric levels (1-4). No decimals allowed."),
      maxScore: z.number(),
      evidence: z.string().describe('從學生作業中引用的原文證據'),
      analysis: z.string().optional().describe('【給學生看】簡潔的改進建議，1-2 句話即可，不要重複 reasoning 的內容'),
      justification: z.string().optional().describe('【給教師看】簡短的給分理由'),
    })
  ),
  overallFeedback: z.string().describe(`【必填】給學生看的整體回饋，2-4 句話。包含：
1. 整體表現總評
2. 最大的優點
3. 最需改進的點
4. 一句鼓勵語
語氣溫暖，像班導師對學生說話。`),
  overallObservation: z.string(),
  messageToStudent: z.string().optional().describe('給學生的友善回饋，語氣溫暖'),
  topPriority: z.string().optional().describe('學生最需要改進的一件事'),
  encouragement: z.string().optional().describe('給學生的鼓勵'),
  strengths: z.array(z.string()).optional(),
  improvements: z.array(z.string()).optional(),
  // 對練問題（Sparring Questions）- 必填！
  sparringQuestions: z.array(SparringQuestionSchema).min(1).max(3).describe(`
    【必填】針對學生表現最差或最具爭議的點生成 3 個對練問題。
    目的是引導學生反思，而非直接給答案。
    每個問題必須：
    1. 引用學生文章中的具體段落 (target_quote)
    2. 使用挑釁策略標籤 (provocation_strategy)
    3. 提供挑戰性問題 (question)
    4. 提供 AI 的隱藏推理 (ai_hidden_reasoning)
  `),
});
