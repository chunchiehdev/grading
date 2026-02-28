/**
 * Agent Executor for Grading (True Agent Pattern)
 *
 * Uses Vercel AI SDK ToolLoopAgent for autonomous grading.
 *
 * Key differences from previous phase-based approach:
 * - All tools available at once (LLM decides order)
 * - Natural thinking flow (no hardcoded phases)
 * - Stops when generate_feedback is called
 * - Transparent reasoning for UI display
 *
 * Inspired by Anthropic's "Building Effective Agents":
 * https://www.anthropic.com/engineering/building-effective-agents
 */

import { ToolLoopAgent, generateObject, streamText, type StepResult, type ToolSet } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { redis } from '@/lib/redis';

// ============================================================================
// MODEL PROVIDER CONFIGURATION
// ============================================================================

function createGeminiModel(apiKey: string) {
  const gemini = createGoogleGenerativeAI({ apiKey });
  // Gemini 3 Flash Preview (Correct ID: gemini-3-flash-preview)
  return gemini('gemini-2.5-flash');
}
import type {
  AgentGradingParams,
  AgentGradingResult,
  AgentStep,
  ParsedCriterion,
  ReferenceDocument,
} from '@/types/agent';
import { createAgentTools } from './agent-tools.server';
import logger from '@/utils/logger';
import { getKeyHealthTracker, type ErrorType } from './gemini-key-health.server';

// ============================================================================
// TYPES
// ============================================================================

interface GradingContext {
  rubricName: string;
  criteria: ParsedCriterion[];
  content: string;
  fileName: string;
  referenceDocuments?: ReferenceDocument[];
  assignmentTitle?: string;
  assignmentDescription?: string;
  assignmentType?: string;
  userLanguage?: string;
}

interface GradingLocaleText {
  noSpecificFeedback: string;
  priorityLabel: string;
  strengthsLabel: string;
  improvementsLabel: string;
  encouragementExcellent: string;
  encouragementGood: string;
  encouragementFair: string;
  encouragementNeedsWork: string;
  defaultOverallGood: string;
  defaultOverallNeedsWork: string;
  gradingCompletedFallback: string;
  totalScorePrefix: string;
  fallbackInterrupted: string;
  unableToAnalyze: string;
  pleaseResubmit: string;
  gradingInterrupted: string;
  analysisInterrupted: string;
}

function getGradingLocaleText(userLanguage?: string): GradingLocaleText {
  const isZh = (userLanguage || 'zh-TW').startsWith('zh');

  if (isZh) {
    return {
      noSpecificFeedback: '無具體回饋',
      priorityLabel: '優先改進',
      strengthsLabel: '優點',
      improvementsLabel: '改進建議',
      encouragementExcellent: '表現優異！繼續保持！',
      encouragementGood: '整體表現良好，仍有進步空間。',
      encouragementFair: '表現尚可，建議加強以下方面的學習。',
      encouragementNeedsWork: '建議重新檢視作業要求，並針對評分標準逐項改進。',
      defaultOverallGood: '整體表現良好，仍有進步空間。',
      defaultOverallNeedsWork: '建議重新檢視作業要求，並針對評分標準逐項改進。',
      gradingCompletedFallback: '評分已完成，請參閱各項目的回饋。',
      totalScorePrefix: '總分',
      fallbackInterrupted: '評分過程未正常完成（3-Step Process Interrupted）。請重新嘗試。',
      unableToAnalyze: '無法分析',
      pleaseResubmit: '請重新提交',
      gradingInterrupted: '評分中斷',
      analysisInterrupted: '評分中斷',
    };
  }

  return {
    noSpecificFeedback: 'No specific feedback provided',
    priorityLabel: 'Top Priority',
    strengthsLabel: 'Strengths',
    improvementsLabel: 'Suggestions for Improvement',
    encouragementExcellent: 'Excellent work. Keep it up!',
    encouragementGood: 'Overall performance is good, with room to improve.',
    encouragementFair: 'The work is acceptable, but targeted improvement is recommended.',
    encouragementNeedsWork: 'Please review the assignment requirements and improve each rubric area step by step.',
    defaultOverallGood: 'Overall performance is good, with room to improve.',
    defaultOverallNeedsWork: 'Please review the assignment requirements and improve each rubric area step by step.',
    gradingCompletedFallback: 'Grading is complete. Please review the feedback for each criterion.',
    totalScorePrefix: 'Total Score',
    fallbackInterrupted: 'Grading did not complete successfully (3-Step Process Interrupted). Please try again.',
    unableToAnalyze: 'Unable to analyze',
    pleaseResubmit: 'Please resubmit',
    gradingInterrupted: 'Grading interrupted',
    analysisInterrupted: 'Grading interrupted',
  };
}

// ============================================================================
// HELPER: Optimize Rubric with LLM
// ============================================================================

async function optimizeRubricWithLLM(
  model: any,
  rubricName: string,
  rawCriteria: ParsedCriterion[],
  userLanguage?: string
): Promise<ParsedCriterion[]> {
  logger.info('[Agent] Optimizing rubric...');
  const isZh = (userLanguage || 'zh-TW').startsWith('zh');

  const prompt = isZh
    ? `
你是一位專業的教育評量專家。優化以下評分標準，使其對 AI 評分助教更具體、客觀且可執行。

原始評分標準名稱：${rubricName}

要求：
1. 保留：ID、名稱、總分不變
2. 擴充說明：具體的觀察指標，告訴 AI 應該尋找什麼證據
3. 優化等級：更具體區分不同分數段的差異

輸入：${JSON.stringify(rawCriteria, null, 2)}
`
    : `
You are an expert in educational assessment. Improve the following rubric to make it more specific, objective, and actionable for AI grading assistants.

Original rubric name: ${rubricName}

Requirements:
1. Preserve ID, name, and max score.
2. Expand descriptions with concrete observable indicators and expected evidence.
3. Refine scoring levels to better differentiate performance bands.

Input: ${JSON.stringify(rawCriteria, null, 2)}
`;

  try {
    const { object: optimizedCriteria } = await generateObject({
      model,
      schema: z.array(
        z.object({
          criteriaId: z.string(),
          name: z.string(),
          description: z.string(),
          maxScore: z.number(),
          levels: z.array(z.object({ score: z.number(), description: z.string() })).optional(),
        })
      ),
      messages: [{ role: 'user', content: prompt }],
      temperature: 1.0,
      providerOptions: {
        google: {
          safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          ],
        },
      },
    });

    logger.info({
      originalCount: rawCriteria.length,
      optimizedCount: optimizedCriteria.length,
    }, '[Agent] Rubric optimized');

    return optimizedCriteria;
  } catch (error) {
    logger.warn({ err: error }, '[Agent] Rubric optimization failed, using original');
    return rawCriteria;
  }
}

// ============================================================================
// SYSTEM PROMPT (Unified, not phase-locked)
// ============================================================================

function buildGradingSystemPrompt(ctx: GradingContext, isDirectMode: boolean = false): string {
  const lang = ctx.userLanguage || 'zh-TW';
  const isZh = lang.startsWith('zh');
  const languageRule = isZh
    ? `【語言規範】所有對外可見文字（含思考過程、reasoning、messageToStudent、analysis、sparringQuestions.question）必須使用繁體中文。除專有名詞外，避免英文句子。`
    : `[Language Rule] All user-visible text (including thinking process, reasoning, messageToStudent, analysis, and sparringQuestions.question) must be in English. Avoid Chinese sentences except unavoidable proper nouns or quotes.`;

  // Core role definition with sparringQuestions requirement upfront
  const baseRole = isZh
    ? `【重要】調用 generate_feedback 時，sparringQuestions 欄位為必填（至少 3 個問題）。
${languageRule}

---

你是一位具有 15 年經驗的資深學科教師，專長於寫作教學與形成性評量。
你熟悉 Rubric-Based Assessment、SOLO Taxonomy、Bloom's Taxonomy、Diagnostic Feedback 等教育評量方法。
你的評分風格嚴謹但具建設性，重視 Evidence-Based Assessment（證據本位評量）。`
    : `【IMPORTANT】When calling generate_feedback, sparringQuestions field is REQUIRED (minimum 3 questions).
${languageRule}

---

You are a senior subject teacher with 15 years of experience in writing instruction and formative assessment.
You are proficient in Rubric-Based Assessment, SOLO Taxonomy, Bloom's Taxonomy, and Diagnostic Feedback.
Your grading style is rigorous yet constructive, emphasizing evidence-based assessment.`;

  const assignmentInfo = ctx.assignmentTitle
    ? isZh
      ? `
## 作業資訊
- 標題：${ctx.assignmentTitle}
- 說明：${ctx.assignmentDescription || '無'}
- 檔案：${ctx.fileName}
`
      : `
## Assignment Info
- Title: ${ctx.assignmentTitle}
- Description: ${ctx.assignmentDescription || 'N/A'}
- File: ${ctx.fileName}
`
    : isZh
      ? `## 檔案：${ctx.fileName}`
      : `## File: ${ctx.fileName}`;

  const rubricInfo = isZh
    ? `
## 評分標準 (Rubric)：${ctx.rubricName}
${ctx.criteria.map((c, i) => `${i + 1}. **${c.name}** (${c.maxScore}分): ${c.description}`).join('\n')}

## 評量維度參考

### 文章結構
- **Cohesion（銜接）**：連接詞、指代詞使用
- **Coherence（連貫）**：段落邏輯關係
- **Discourse Markers**：轉折詞、承接詞

### 語言運用
- **Syntactic Complexity（句法複雜度）**：句型變化
- **Lexical Diversity（詞彙豐富度）**：用詞精準度
- **Mechanics（書寫規範）**：標點、格式

### 內容深度（SOLO Taxonomy）
Prestructural（離題）→ Unistructural（單點）→ Multistructural（多點無整合）→ Relational（整合）→ Extended Abstract（批判反思）

### 證據運用
- **Specificity（具體性）**
- **Elaboration（闡述深度）**
- **Evidence-Claim Alignment（證據-論點對應）**
`
    : `
## Rubric: ${ctx.rubricName}
${ctx.criteria.map((c, i) => `${i + 1}. **${c.name}** (${c.maxScore} points): ${c.description}`).join('\n')}

## Assessment Dimensions

### Structure
- **Cohesion**: use of connectors and references
- **Coherence**: paragraph logic and flow
- **Discourse Markers**: transitions and signposting

### Language Use
- **Syntactic Complexity**: sentence variety and control
- **Lexical Diversity**: precision and richness of vocabulary
- **Mechanics**: punctuation and formatting

### Depth of Understanding (SOLO Taxonomy)
Prestructural -> Unistructural -> Multistructural -> Relational -> Extended Abstract

### Use of Evidence
- **Specificity**
- **Elaboration**
- **Evidence-Claim Alignment**
`;

  const coreInstructions = isZh
    ? `
## 評量原則

1. **Evidence-Based Scoring**：引用原文證據（用「」標示），每個分數需 Justification
2. **Criterion-Referenced**：對照 Rubric 給分，預設 80% 滿分，達 Exemplary 才給滿分
3. **Diagnostic Feedback**：進行 Error Analysis，提供 Revision Strategy
4. **Authentic Context**：這是真實學生作業，直接評分，不要說「假設」
5. **Concise**：避免重複，Feedback 要精準

## generate_feedback 欄位說明

### overallFeedback【必填】
給學生看的整體回饋，2-4 句話，語氣溫暖像班導師：
- 整體表現總評
- 最大優點
- 最需改進點
- 一句鼓勵

### reasoning（給教師）
完整的專業評分推理，格式範例：
\`\`\`
【論點發展 - 3/5 分】(SOLO: Multistructural)
Text Evidence：「大家都在滑手機...」
Error Analysis：Oversimplification，未區分 Physical/Psychological Presence
Revision Strategy：引用 Sherry Turkle「Alone Together」概念
\`\`\`

### 給學生的欄位
- **messageToStudent**: 溫暖語氣，像班導師鼓勵
- **topPriority**: 最需改進的一件事
- **encouragement**: 找出值得肯定的點

### criteriaScores（每項評分）
- criteriaId, name, score, maxScore
- evidence: 關鍵引用（最多 50 字）
- analysis: 【給學生】口語化建議
- justification: 【給教師】專業給分理由

### 整體摘要
- overallObservation, strengths (2-3 個), improvements (2-3 個)

### sparringQuestions【必填，3 個】
針對學生作業生成「促進反思」的問題（非糾錯導向）：

**設計原則**：
- 目標是讓學生「想深」，不是讓學生「改對」
- 成功的對練 = 學生開始質疑自己的假設，或發現概念中的張力
- 「我沒想過這個」是正面結果（Aporia）

**策略使用指引**：
- 「warrant_probe」(L2): 追問理由 — 你說 X 讓你滿足，為什麼？
- 「evidence_check」(L2): 查證來源 — 這個數據是從哪裡來的？
- 「logic_gap」(L3): 邏輯跳躍 — 從 A 到 B，中間少了什麼？
- 「counter_argument」(L3): 反方觀點 — 有人可能會說...你怎麼看？
- 「metacognitive」(L3): 寫作選擇 — 你為什麼選擇用這個方式表達？
- 「conceptual」(L4): 概念辯證 — 『理想』對你來說意味著什麼？

**限制**：
- 至少 2 個問題必須是 L3+ 層級 (logic_gap / counter_argument / metacognitive / conceptual)
- 避免只問「可以講具體一點嗎？」這類純澄清問題

**provocation_strategy 選項**：evidence_check | logic_gap | counter_argument | warrant_probe | metacognitive | conceptual

## 語氣對照表

| 欄位 | 對象 | 語氣 |
|-----|-----|-----|
| reasoning, justification | 教師 | 專業術語 |
| messageToStudent, analysis | 學生 | 口語化、像老師說話 |
| sparringQuestions.question | 學生 | 挑戰但友善 |
`
    : `
## Assessment Principles

1. **Evidence-Based Scoring**: cite original text evidence and justify each score.
2. **Criterion-Referenced**: score against rubric criteria; reserve full marks for truly exemplary work.
3. **Diagnostic Feedback**: include error analysis and a practical revision strategy.
4. **Authentic Context**: this is a real student submission. Grade directly.
5. **Concise**: avoid repetition and keep feedback precise.

## generate_feedback Fields

### overallFeedback [REQUIRED]
Provide 2-4 warm mentor-like sentences covering overall performance, major strength, priority improvement, and encouragement.

### reasoning (teacher-facing)
Provide professional grading rationale with evidence and revision strategy.

### student-facing fields
- **messageToStudent**: warm and supportive
- **topPriority**: one highest-priority improvement
- **encouragement**: one genuinely positive point

### criteriaScores (each criterion)
- criteriaId, name, score, maxScore
- evidence: key quote (max 50 words)
- analysis: student-friendly recommendation
- justification: teacher-facing scoring rationale

### overall summary
- overallObservation, strengths (2-3), improvements (2-3)

### sparringQuestions [REQUIRED, 3 items]
Create reflection-promoting questions (not just correction prompts).

**Constraints**:
- At least 2 questions must be L3+ (logic_gap / counter_argument / metacognitive / conceptual)
- Avoid shallow clarification-only prompts

**provocation_strategy options**: evidence_check | logic_gap | counter_argument | warrant_probe | metacognitive | conceptual

## Tone Matrix

| Field | Audience | Tone |
|-----|-----|-----|
| reasoning, justification | Teacher | Professional |
| messageToStudent, analysis | Student | Conversational and supportive |
| sparringQuestions.question | Student | Challenging but friendly |
`;

  const workflowInstructions = isZh
    ? `
## 評分流程（ReAct 模式）

### 核心原則：Think First, Act Later

1. **[Text]** 先輸出純文字分析（會即時顯示給使用者）
2. **[Action]** 分析完畢後呼叫工具

### 嚴格區分

**Text Output（思考過程）**
- 用途：深度分析、找證據、推理
- 禁止：不要在文字中包含 JSON

**Tool Call（行動）**
- reasoning 欄位：提煉 Text 中的關鍵發現（勿逐字複製）

### 執行順序

1. **輸出思考**：閱讀作業，逐項對照 Rubric，引用原文
2. **calculate_confidence**：說明初步分析與信心
3. **generate_feedback**：提煉完整評分（含 3 個 sparringQuestions）

**重要**：必須先輸出文字再呼叫工具。直接呼叫工具是錯誤的。
`
    : `
## Grading Workflow (ReAct)

1. Output plain-text analysis first.
2. Call tools after analysis.

Do not put JSON in plain-text thinking output.
Execution order: think -> calculate_confidence -> generate_feedback.
`;

  const relevanceCheck = isZh
    ? `
## 任務相關性檢查

如果判定為離題回應（Off-Topic）：
1. reasoning 使用：「此回應為 Prestructural Level - 完全離題」
2. 所有評分項目給 0 分
3. 說明 Task Alignment 問題
`
    : `
## Off-topic Check

If the submission is off-topic:
1. Use reasoning: "This response is Prestructural level and off-topic."
2. Assign 0 to all rubric criteria.
3. Explain the task-alignment issue.
`;

  if (isDirectMode) {
    return `${baseRole}\n${assignmentInfo}\n${rubricInfo}\n${coreInstructions}\n${relevanceCheck}`;
  }

  return `${baseRole}\n${assignmentInfo}\n${rubricInfo}\n${coreInstructions}\n${workflowInstructions}\n${relevanceCheck}`;
}

// ============================================================================
// FALLBACK: Build result from steps when generate_feedback wasn't called
// ============================================================================

function buildFallbackResultFromSteps(
  steps: AgentStep[],
  criteria: ParsedCriterion[],
  userLanguage?: string
): any | null {
  logger.warn('[Agent Fallback] 3-Step Process interrupted. No intermediate scores available.');
  const localeText = getGradingLocaleText(userLanguage);

  // In the new 3-step process, scores are only generated in the final step.
  // If we are here, it means generate_feedback was not called or failed.

  return {
    totalScore: 0,
    maxScore: criteria.reduce((sum, c) => sum + c.maxScore, 0),
    overallFeedback: localeText.fallbackInterrupted,
    strengths: [localeText.unableToAnalyze],
    improvements: [localeText.pleaseResubmit],
    criteriaScores: criteria.map((c) => ({
      criteriaId: c.criteriaId,
      name: c.name,
      score: 0,
      maxScore: c.maxScore,
      evidence: localeText.gradingInterrupted,
      analysis: localeText.analysisInterrupted,
      justification: 'Process interrupted before generate_feedback',
    })),
    reasoning: 'The agent failed to complete the grading process.',
  };
}

// ============================================================================
// STOP CONDITION: When generate_feedback is called
// ============================================================================

function createStopCondition(maxSteps: number) {
  return (params: { steps: any[] }) => {
    // Stop if generate_feedback was called
    for (const step of params.steps) {
      if (step.toolCalls) {
        for (const call of step.toolCalls) {
          if (call.toolName === 'generate_feedback') {
            logger.info('[Agent] Stop: generate_feedback called');
            return true;
          }
        }
      }
    }

    // Safety: stop if max steps reached
    if (params.steps.length >= maxSteps) {
      logger.warn({ steps: params.steps.length }, '[Agent] Stop: max steps reached');
      return true;
    }

    return false;
  };
}

// ============================================================================
// DIRECT GRADING SCHEMA
// ============================================================================

const DirectGradingSchema = z.object({
  reasoning: z.string().describe('Complete grading rationale with criterion-level analysis'),
  messageToStudent: z.string().describe('Student-facing feedback in a warm and supportive tone'),
  topPriority: z.string().describe('The single highest-priority improvement for the student'),
  encouragement: z.string().describe('A short encouraging message for the student'),
  criteriaScores: z.array(
    z.object({
      criteriaId: z.string(),
      name: z.string(),
      score: z.number().describe('Score value'),
      maxScore: z.number(),
      evidence: z.string().describe('Direct evidence quote from the submission'),
      analysis: z.string().optional().describe('Student-facing suggestion'),
      justification: z.string().optional().describe('Teacher-facing scoring justification'),
    })
  ),
  overallObservation: z.string().describe('Overall observation'),
  strengths: z.array(z.string()).optional().describe('List of strengths'),
  improvements: z.array(z.string()).optional().describe('List of improvement suggestions'),
  // Sparring Questions for Productive Friction - REQUIRED!
  sparringQuestions: z.array(
    z.object({
      related_rubric_id: z.string().describe('Related rubric criterion ID'),
      target_quote: z.string().describe('Specific quote from the student submission'),
      provocation_strategy: z.enum(['evidence_check', 'logic_gap', 'counter_argument', 'warrant_probe', 'metacognitive', 'conceptual']).describe('Reflection strategy: L2 (warrant_probe, evidence_check) or L3+ (logic_gap, counter_argument, metacognitive, conceptual)'),
      question: z.string().describe('Reflection-promoting question for the student'),
      ai_hidden_reasoning: z.string().describe('Internal reasoning for question design'),
    })
  ).min(1).describe('[Required] Reflection sparring questions for the student (minimum 3, with L3+ depth)'),
});

// ============================================================================
// MAIN EXECUTOR: True Agent Pattern (ToolLoopAgent)
// ============================================================================

export async function executeGradingAgent(params: AgentGradingParams): Promise<AgentGradingResult> {
  const startTime = Date.now();
  const steps: AgentStep[] = [];
  const healthTracker = getKeyHealthTracker();
  let selectedKeyId: string | null = null;
  const isZh = (params.userLanguage || 'zh-TW').startsWith('zh');
  const localeText = getGradingLocaleText(params.userLanguage);

  try {
    logger.info({
      resultId: params.resultId,
      rubricName: params.rubricName,
      hasAssignmentTitle: !!params.assignmentTitle,
    }, '[Agent] Starting autonomous grading (ToolLoopAgent)');

    // 1. Setup Model (Google Generative AI)
    let model: any;

    // Flexible key detection (supports 1, 2, or 3 keys)
    const availableKeyIds = ['1'];
    if (process.env.GEMINI_API_KEY2) availableKeyIds.push('2');
    if (process.env.GEMINI_API_KEY3) availableKeyIds.push('3');

    selectedKeyId = await healthTracker.selectBestKey(availableKeyIds);
    if (!selectedKeyId) throw new Error('All Gemini API keys are throttled');

    const apiKey =
      selectedKeyId === '1'
        ? process.env.GEMINI_API_KEY
        : selectedKeyId === '2'
          ? process.env.GEMINI_API_KEY2
          : process.env.GEMINI_API_KEY3;
    if (!apiKey) throw new Error(`API key not found for keyId: ${selectedKeyId}`);

    model = createGeminiModel(apiKey);

    // 2. Optimize Rubric
    let effectiveCriteria = params.criteria;
    try {
      effectiveCriteria = await optimizeRubricWithLLM(
        model,
        params.rubricName,
        params.criteria,
        params.userLanguage
      );
    } catch (e) {
      logger.warn({ err: e }, '[Agent] Rubric optimization failed, using original');
    }

    // 3. Build Context
    const ctx: GradingContext = {
      rubricName: params.rubricName,
      criteria: effectiveCriteria,
      content: params.content,
      fileName: params.fileName,
      referenceDocuments: params.referenceDocuments,
      assignmentTitle: params.assignmentTitle,
      assignmentDescription: params.assignmentDescription,
      assignmentType: params.assignmentType,
      userLanguage: params.userLanguage,
    };

    // CHECK FOR DIRECT GRADING MODE
    if (params.useDirectGrading) {
       logger.info('[Agent] Executing Direct Grading Mode (Manual Branch)');
       const systemPrompt = buildGradingSystemPrompt(ctx, true);
       const userMessage = isZh
         ? `請評分以下學生作業：

     ${params.assignmentTitle ? `【作業標題】${params.assignmentTitle}` : ''}
     ${params.assignmentDescription ? `【作業說明】${params.assignmentDescription}` : ''}
     【學生作業內容】
     ${params.content}

     請直接輸出評分結果 JSON。`
         : `Please grade the following student submission:

     ${params.assignmentTitle ? `[Assignment Title] ${params.assignmentTitle}` : ''}
     ${params.assignmentDescription ? `[Assignment Description] ${params.assignmentDescription}` : ''}
     [Student Submission]
     ${params.content}

     Please output the grading result in JSON directly.`;
 
       try {
         const { object: result, usage, providerMetadata } = await generateObject({
           model,
           schema: DirectGradingSchema,
           messages: [
             { role: 'system', content: systemPrompt },
             { role: 'user', content: userMessage },
           ],
           providerOptions: {
             google: {
               thinkingConfig: {
                 includeThoughts: true,
                 thinkingLevel: 'high',
               },
               safetySettings: [
                 { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
                 { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
                 { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
                 { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
               ],
             },
           },
         });
 
         // Capture Gemini Native Thinking
         let directThinking = '';
         const googleMetadata = providerMetadata?.google as any;
         if (googleMetadata?.thoughts) {
           directThinking = googleMetadata.thoughts as string;
           logger.info({ length: directThinking.length }, '[Agent] Captured Direct Mode Thinking');
         }
 
         // Stream thinking to Redis (Bridge format)
         if (params.sessionId && directThinking) {
           await redis.publish(
             `session:${params.sessionId}`,
             JSON.stringify({
               type: 'text-delta',
               content: directThinking,
             })
           );
         }
 
         // Construct a "fake" step for the direct execution to fit the AgentGradingResult structure
         const steps: AgentStep[] = [
           {
             stepNumber: 1,
             toolName: 'direct_grading',
             reasoning: directThinking || result.reasoning, // Prefer native thinking if available
             toolOutput: result,
             durationMs: Date.now() - startTime,
             timestamp: new Date(),
           },
         ];
 
         // Map to AIGradingResult format to satisfy type requirements
         const mappedData = {
           breakdown: result.criteriaScores.map((s: any) => ({
             criteriaId: s.criteriaId,
             name: s.name,
             score: s.score,
             feedback: s.analysis || s.justification || '',
           })),
           overallFeedback: result.messageToStudent || result.overallObservation,
           summary: result.overallObservation,
           // Include sparring questions for Productive Friction
           sparringQuestions: result.sparringQuestions || [],
         };
 
         // Stream finish to Redis (Bridge format) with telemetry for thesis research
         if (params.sessionId) {
           const directExecutionTimeMs = Date.now() - startTime;
           await redis.publish(
             `session:${params.sessionId}`,
             JSON.stringify({
               type: 'finish',
               result: mappedData,
               // Telemetry for thesis data analysis
               meta: {
                 executionTimeMs: directExecutionTimeMs,
                 totalTokens: usage?.totalTokens || 0,
                 modelName: 'gemini-2.5-flash',
                 sparringQuestionsCount: mappedData.sparringQuestions?.length || 0,
                 mode: 'direct',
               }
             })
           );
         }
 
         return {
           success: true,
           data: mappedData,
           steps,
           confidenceScore: 1.0, // Direct mode assumes high confidence or N/A
           requiresReview: false,
           totalTokens: usage?.totalTokens || 0,
           executionTimeMs: Date.now() - startTime,
         };
       } catch (error) {
         logger.error({ err: error }, '[Agent] Direct grading failed');
         throw error;
       }
    }

    // 4. Create Tools
    const tools = createAgentTools({
      referenceDocuments: params.referenceDocuments,
      currentContent: params.content,
      assignmentType: params.assignmentType,
      sessionId: params.sessionId,
      userLanguage: params.userLanguage,
    });

    // 5. Execute Agent (ToolLoopAgent)
    
    const userMessage = isZh
      ? `請評分以下學生作業：

    ${params.assignmentTitle ? `【作業標題】${params.assignmentTitle}` : ''}
    ${params.assignmentDescription ? `【作業說明】${params.assignmentDescription}` : ''}
    【學生作業內容】
    （注意：這是真實學生的提交，請直接評分，不要假設它是範例）
    ${params.content}
    `
      : `Please grade the following student submission:

    ${params.assignmentTitle ? `[Assignment Title] ${params.assignmentTitle}` : ''}
    ${params.assignmentDescription ? `[Assignment Description] ${params.assignmentDescription}` : ''}
    [Student Submission]
    (Note: This is a real student submission. Grade directly and do not treat it as a hypothetical sample.)
    ${params.content}
    `;

    logger.info({
      contentLength: params.content.length,
      hasTitle: !!params.assignmentTitle,
    }, '[Agent] Executing ToolLoopAgent');

    let stepCounter = 0;
    let confidenceCalled = false;
    let feedbackCalled = false;
    let thinkCalled = false;  // NEW: Track if think was called

    const agent = new ToolLoopAgent({
      model,
      instructions: buildGradingSystemPrompt(ctx),
      tools,
      prepareStep: async ({ steps: agentSteps }) => {
        stepCounter++;
        
        // Use the agent's internal steps array to check tool completion status
        // This is synchronous - the data is available immediately unlike our async stream handler
        const completedToolNames = new Set<string>();
        if (agentSteps && agentSteps.length > 0) {
          for (const step of agentSteps) {
            if (step.toolResults) {
              for (const result of step.toolResults) {
                completedToolNames.add(result.toolName);
              }
            }
          }
        }
        
        const hasThinkAloud = completedToolNames.has('think_aloud');
        const hasConfidence = completedToolNames.has('calculate_confidence');
        const hasFeedback = completedToolNames.has('generate_feedback');
        
        logger.info({ 
          agentStepsCount: agentSteps?.length || 0,
          hasThinkAloud, 
          hasConfidence, 
          hasFeedback,
          completedTools: Array.from(completedToolNames)
        }, `[Agent] prepareStep ${stepCounter}`);
        
        // STEP 0: If feedback already generated, we're done - no more steps needed
        if (hasFeedback) {
          logger.info('[Agent] generate_feedback completed, signaling stop via toolChoice: none');
          return { toolChoice: 'none' as const };
        }
        
        // Force think_aloud tool on first step
        if (!hasThinkAloud) {
          logger.info('[Agent] Forcing think_aloud tool on first step');
          return {
            toolChoice: { type: 'tool' as const, toolName: 'think_aloud' }
          };
        }
        
        // STEP 2: After thinking, allow confidence calculation
        if (hasThinkAloud && !hasConfidence) {
          logger.info('[Agent] Allowing calculate_confidence after thinking');
          return { toolChoice: 'auto' };  // Let model choose when to calculate confidence
        }
        
        // STEP 3: After confidence, force generate_feedback
        if (hasConfidence && !hasFeedback) {
          logger.info('[Agent] Forcing generate_feedback after calculate_confidence');
          return {
            toolChoice: { type: 'tool', toolName: 'generate_feedback' }
          };
        }
        
        // Default: allow any tool
        return { toolChoice: 'auto' };
      },
      stopWhen: ({ steps: agentSteps }) => {
        // Safety: stop if max steps reached
        if (stepCounter >= 10) {
          logger.warn('[Agent] Max steps reached, stopping');
          return true;
        }
        
        // Check if generate_feedback has completed (has toolResults, not just toolCalls)
        if (agentSteps && agentSteps.length > 0) {
          for (const step of agentSteps) {
            if (step.toolResults) {
              for (const result of step.toolResults) {
                if (result.toolName === 'generate_feedback') {
                  logger.info('[Agent] generate_feedback has toolResult, stopping');
                  return true;
                }
              }
            }
          }
        }
        
        return false;
      },
    });

    const stream = await agent.stream({
      messages: [{ role: 'user', content: userMessage }],
    });

    let finalResult: any = null;
    let confidenceData: any = null;
    let currentThinking = '';
    
    // Token tracking
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalTokens = 0;

    for await (const part of stream.fullStream) {
      // 0. Handle Token Usage - check all event types that might carry usage
      if ('usage' in part && part.usage) {
        const usage = part.usage as any;
        const stepTokens = usage.totalTokens || 0;
        
        totalPromptTokens += usage.promptTokens || 0;
        totalCompletionTokens += usage.completionTokens || 0;
        totalTokens += stepTokens;
        
        // Determine which step this belongs to (from most recent tool call)
        const currentStep = steps.length > 0 ? steps[steps.length - 1] : null;
        const toolName = currentStep?.toolName || 'unknown';
        
        logger.info({
          stepNumber: steps.length,
          toolName,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          stepTotal: stepTokens,
          cumulativeTotal: totalTokens,
        }, `[Agent] 📊 Step ${steps.length} Token Usage (${toolName})`);
      }
    
      // 1. Handle Text (Thinking)
      if (part.type === 'text-delta') {
        const text = part.text;
        currentThinking += text;
        
        // Stream to Redis (Bridge format)
        if (params.sessionId) {
          await redis.publish(
            `session:${params.sessionId}`,
            JSON.stringify({
              type: 'text-delta',
              content: text,
            })
          );
        }
      }

      // 2. Handle Tool Calls
      if (part.type === 'tool-call') {
        // 🔍 Debug: Log generate_feedback tool call args
        if (part.toolName === 'generate_feedback') {
          const args = part.input as any;
          logger.info(`🔍 [Agent] generate_feedback ARGS - has sparringQuestions: ${!!args?.sparringQuestions}, count: ${args?.sparringQuestions?.length || 0}`);
          if (args?.sparringQuestions && args.sparringQuestions.length > 0) {
            logger.info(`🔍 [Agent] sparringQuestions[0] in args: ${JSON.stringify(args.sparringQuestions[0]).substring(0, 300)}`);
          }
          
          // =========================================================
          // ✅ [FIX] Early Capture: Save args as fallback in case 
          // tool-result is never received (defense-in-depth)
          // =========================================================
          if (args && args.criteriaScores && args.sparringQuestions?.length > 0) {
            logger.info('[Agent] 🟢 Early Capture: Saving generate_feedback args as fallback');
            
            // Compute the same fields that the tool's execute function computes
            const totalScore = args.criteriaScores.reduce((sum: number, c: any) => sum + c.score, 0);
            const maxScore = args.criteriaScores.reduce((sum: number, c: any) => sum + c.maxScore, 0);
            const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
            
            // Transform criteriaScores to breakdown format
            const breakdown = args.criteriaScores.map((c: any) => ({
              criteriaId: c.criteriaId,
              name: c.name,
              score: c.score,
              feedback: c.analysis || c.justification || c.evidence || localeText.noSpecificFeedback,
            }));
            
            // Build overallFeedback from multiple sources (must match agent-tools execute logic)
            // Schema 必填是 overallFeedback，LLM 常只填它而沒填 messageToStudent/overallObservation
            let overallFeedback = (args.overallFeedback || args.messageToStudent || args.overallObservation || '').trim();
            if (args.topPriority) {
              overallFeedback += `\n\n**${localeText.priorityLabel}:**\n${args.topPriority}`;
            }
            if (args.strengths?.length > 0) {
              overallFeedback += `\n\n**${localeText.strengthsLabel}:**\n${args.strengths.map((s: string) => `- ${s}`).join('\n')}`;
            }
            if (args.improvements?.length > 0) {
              overallFeedback += `\n\n**${localeText.improvementsLabel}:**\n${args.improvements.map((i: string) => `- ${i}`).join('\n')}`;
            }
            if (args.encouragement?.trim()) {
              overallFeedback += `\n\n${args.encouragement.trim()}`;
            } else {
              if (percentage >= 90) overallFeedback += `\n\n${localeText.encouragementExcellent}`;
              else if (percentage >= 70) overallFeedback += `\n\n${localeText.encouragementGood}`;
              else if (percentage >= 50) overallFeedback += `\n\n${localeText.encouragementFair}`;
              else overallFeedback += `\n\n${localeText.encouragementNeedsWork}`;
            }
            const finalOverallFeedback = overallFeedback.trim() ||
              (percentage >= 70 ? localeText.defaultOverallGood : localeText.defaultOverallNeedsWork);

            // Only set as fallback if we don't already have a result
            // tool-result will override this if it arrives
            if (!finalResult) {
              finalResult = {
                reasoning: args.reasoning,
                breakdown,
                overallFeedback: finalOverallFeedback,
                totalScore,
                maxScore,
                percentage: Math.round(percentage),
                summary: `${localeText.totalScorePrefix}: ${totalScore}/${maxScore} (${percentage.toFixed(1)}%)`,
                sparringQuestions: args.sparringQuestions || [],
                // Mark as early capture for debugging
                _source: 'early_capture',
              };
              feedbackCalled = true;
              
              logger.info({
                totalScore,
                maxScore,
                sparringQuestionsCount: args.sparringQuestions?.length || 0,
              }, '[Agent] 🟢 Early Capture complete');
            }
          }
        }
        
        // Stream tool call metadata only (no reasoning extraction)
        // Reasoning should come from native text-delta, not from tool args
        if (params.sessionId) {
          await redis.publish(
            `session:${params.sessionId}`,
            JSON.stringify({
              type: 'tool-call',
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              args: part.input, // For observability in logs
            })
          );
        }
      }

      // 3. Handle Tool Results
      if (part.type === 'tool-result') {
        const toolName = part.toolName;
        const toolResult = part.output;

        logger.info(`[Agent] Tool completed: ${toolName}`);
        
        // 🔍 Debug: Log generate_feedback tool result structure
        if (toolName === 'generate_feedback') {
          const resultObj = toolResult as any;
          logger.info(`🔍 [Agent] generate_feedback result keys: ${Object.keys(resultObj || {}).join(', ')}`);
          logger.info(`🔍 [Agent] generate_feedback has sparringQuestions: ${!!resultObj?.sparringQuestions}, count: ${resultObj?.sparringQuestions?.length || 0}`);
        }

        // Special handling for think/think_aloud tool: extract thought from args
        let stepReasoning = currentThinking || 'Tool Execution';
        if ((toolName === 'think' || toolName === 'think_aloud') && part.input) {
          // Extract thought/analysis from think tool args
          const thinkArgs = part.input as any;
          const content = thinkArgs.thought || thinkArgs.analysis;
          if (content) {
            stepReasoning = content;
            // DO NOT accumulate to currentThinking - the thought is already complete
            // and we don't want subsequent steps to inherit this reasoning
          }
        }

        steps.push({
          stepNumber: steps.length + 1,
          reasoning: stepReasoning, // Use extracted thought for think tool
          toolName: toolName,
          toolInput: part.input,
          toolOutput: toolResult,
          durationMs: 0,
          timestamp: new Date(),
        });
        
        // Reset thinking buffer for next step (except for think tool)
        if (toolName !== 'think') {
          currentThinking = '';
        }

        // Track tool calls for prepareStep logic (FIX for premature termination)
        if (toolName === 'think' || toolName === 'think_aloud') {
          thinkCalled = true;
        }
        if (toolName === 'calculate_confidence') {
          confidenceCalled = true;
          confidenceData = toolResult;
        }
        if (toolName === 'generate_feedback') {
          const typedResult = toolResult as any;
          
          // Only mark as completed if we actually have the required sparringQuestions
          // This allows the agent to retry if the tool threw an error or failed validation
          if (typedResult && Array.isArray(typedResult.sparringQuestions) && typedResult.sparringQuestions.length > 0) {
            // Check if we're overriding early capture
            const wasEarlyCapture = finalResult?._source === 'early_capture';
            if (wasEarlyCapture) {
              logger.info('[Agent] 🔄 tool-result overriding early capture (preferred source)');
            }
            
            feedbackCalled = true;
            finalResult = toolResult;

            logger.info({
              hasSparringQuestions: true,
              sparringQuestionsCount: typedResult.sparringQuestions.length,
              resultKeys: Object.keys(toolResult || {}),
              source: 'tool_result',
            }, '[Agent] generate_feedback completed successfully');
          } else {
             logger.warn({ 
               toolResult: typeof toolResult === 'string' ? toolResult.substring(0, 100) : 'object' 
             }, '[Agent] generate_feedback failed validation (missing sparringQuestions or error)');
             // Do NOT set feedbackCalled = true, so the loop will retry
          }
        }
      }
    }

    if (!finalResult) {
      logger.warn('[Agent] ❌ No result captured (neither tool-result nor early-capture), building fallback...');
      finalResult = buildFallbackResultFromSteps(steps, params.criteria, params.userLanguage);
    } else if (finalResult._source === 'early_capture') {
      logger.info('[Agent] ⚠️ Using early capture result (tool-result was not received)');
    } else {
      logger.info('[Agent] ✅ Using tool-result (preferred source)');
    }

    // 8. Build Response
    const executionTimeMs = Date.now() - startTime;
    await healthTracker.recordSuccess(selectedKeyId, executionTimeMs);

    // Ensure finalResult has breakdown
    if (finalResult && finalResult.criteriaScores && !finalResult.breakdown) {
      finalResult.breakdown = finalResult.criteriaScores.map((c: any) => ({
        criteriaId: c.criteriaId,
        name: c.name,
        score: c.score,
        feedback: c.analysis || c.justification || '',
      }));
    }

    // Ensure overallFeedback is never empty (early_capture or tool-result can leave it blank)
    if (finalResult && !(finalResult.overallFeedback && finalResult.overallFeedback.trim())) {
      finalResult.overallFeedback =
        finalResult.messageToStudent?.trim() ||
        finalResult.overallObservation?.trim() ||
        (finalResult.totalScore != null && finalResult.maxScore != null && finalResult.maxScore > 0
          ? (finalResult.totalScore / finalResult.maxScore) >= 0.7
            ? localeText.defaultOverallGood
            : localeText.defaultOverallNeedsWork
          : localeText.gradingCompletedFallback);
    }

    logger.info({
      totalSteps: steps.length,
      totalScore: finalResult?.totalScore,
      maxScore: finalResult?.maxScore,
      tokenUsage: {
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        total: totalTokens,
      },
      executionTimeMs,
    }, '[Agent] Grading completed');

    // Stream to Redis (Bridge format) with telemetry for thesis research
    if (params.sessionId) {
      await redis.publish(
        `session:${params.sessionId}`,
        JSON.stringify({
          type: 'finish',
          result: finalResult,
          // Telemetry for thesis data analysis
          meta: {
            executionTimeMs,
            totalTokens,
            modelName: 'gemini-2.5-flash',
            sparringQuestionsCount: finalResult?.sparringQuestions?.length || 0,
          }
        })
      );
    }

    // 🔍 CRITICAL DEBUG: Check finalResult BEFORE returning
    logger.info(`🔍 [Agent Return] finalResult keys: ${Object.keys(finalResult || {}).join(', ')}`);
    logger.info(`🔍 [Agent Return] finalResult.sparringQuestions: ${finalResult?.sparringQuestions ? `YES (${finalResult.sparringQuestions.length})` : 'NO/UNDEFINED'}`);

    return {
      success: true,
      data: finalResult,
      steps,
      confidenceScore: confidenceData?.confidenceScore ?? 0.8,
      requiresReview: confidenceData?.shouldReview ?? false,
      totalTokens,  // Use tracked value instead of 0
      executionTimeMs,
    };
  } catch (error) {
    logger.error({ err: error }, '[Agent] Grading failed');

    // Stream to Redis (Bridge format)
    if (params.sessionId) {
      await redis.publish(
        `session:${params.sessionId}`,
        JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }

    // Report failure to health tracker
    if (selectedKeyId) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      let errorType: ErrorType = 'other';

      if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('limit')) {
        errorType = 'rate_limit';
      } else if (errorMessage.includes('503') || errorMessage.includes('overloaded')) {
        errorType = 'overloaded';
      }

      await healthTracker.recordFailure(selectedKeyId, errorType, errorMessage);
    }

    return {
      success: false,
      steps,
      confidenceScore: 0,
      requiresReview: true,
      totalTokens: 0,
      executionTimeMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if Agent grading is enabled
 */
export function isAgentGradingEnabled(): boolean {
  return process.env.USE_AGENT_GRADING === 'true';
}
