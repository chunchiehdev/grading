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

import { ToolLoopAgent, generateObject, type StepResult, type ToolSet } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';

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

// ============================================================================
// HELPER: Optimize Rubric with LLM
// ============================================================================

async function optimizeRubricWithLLM(
  model: any,
  rubricName: string,
  rawCriteria: ParsedCriterion[]
): Promise<ParsedCriterion[]> {
  logger.info('[Agent] Optimizing rubric...');

  const prompt = `
你是一位專業的教育評量專家。優化以下評分標準，使其對 AI 評分助教更具體、客觀且可執行。

原始評分標準名稱：${rubricName}

要求：
1. 保留：ID、名稱、總分不變
2. 擴充說明：具體的觀察指標，告訴 AI 應該尋找什麼證據
3. 優化等級：更具體區分不同分數段的差異

輸入：${JSON.stringify(rawCriteria, null, 2)}
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

    logger.info('[Agent] Rubric optimized', {
      originalCount: rawCriteria.length,
      optimizedCount: optimizedCriteria.length,
    });

    return optimizedCriteria;
  } catch (error) {
    logger.warn('[Agent] Rubric optimization failed, using original', error);
    return rawCriteria;
  }
}

// ============================================================================
// SYSTEM PROMPT (Unified, not phase-locked)
// ============================================================================

function buildGradingSystemPrompt(ctx: GradingContext, isDirectMode: boolean = false): string {
  const lang = ctx.userLanguage || 'zh-TW';
  const isZh = lang.startsWith('zh');

  const baseRole = isZh
    ? `你是一位具有 15 年經驗的資深學科教師，專長於寫作教學與形成性評量 (Formative Assessment)。
你熟悉以下教育評量理論與方法：
- **Rubric-Based Assessment**（標準本位評量）：使用分析式評分 (Analytic Scoring)
- **SOLO Taxonomy**：評估學生認知層次（Prestructural → Extended Abstract）
- **Bloom's Taxonomy**：區分記憶、理解、應用、分析、評鑑、創造層次
- **Diagnostic Feedback**（診斷性回饋）：指出具體問題並提供可執行的改進建議

你的評分風格嚴謹但具建設性，重視 Evidence-Based Assessment（證據本位評量）。`
    : `You are a senior subject teacher with 15 years of experience in writing instruction and formative assessment.
You are proficient in the following educational assessment theories and methods:
- **Rubric-Based Assessment**: Using analytic scoring methodology
- **SOLO Taxonomy**: Evaluating student cognitive levels (Prestructural → Extended Abstract)
- **Bloom's Taxonomy**: Distinguishing between Remember, Understand, Apply, Analyze, Evaluate, Create
- **Diagnostic Feedback**: Identifying specific issues and providing actionable improvement suggestions

Your grading style is rigorous yet constructive, emphasizing evidence-based assessment.`;

  const assignmentInfo = ctx.assignmentTitle
    ? `
## 作業資訊
- 標題：${ctx.assignmentTitle}
- 說明：${ctx.assignmentDescription || '無'}
- 檔案：${ctx.fileName}
`
    : `## 檔案：${ctx.fileName}`;

  const rubricInfo = `
## 評分標準 (Rubric)：${ctx.rubricName}
${ctx.criteria.map((c, i) => `${i + 1}. **${c.name}** (${c.maxScore}分): ${c.description}`).join('\n')}

## 專業評量維度參考 (Assessment Dimensions Reference)

在分析學生作品時，請考慮以下專業評量維度：

### 文章結構 (Text Structure)
- **Cohesion（銜接）**：句子之間的連接詞、指代詞使用
- **Coherence（連貫）**：段落之間的邏輯關係
- **Discourse Markers**：轉折詞、承接詞的適切使用

### 語言運用 (Language Use)
- **Syntactic Complexity（句法複雜度）**：句型變化、從屬子句使用
- **Lexical Diversity（詞彙豐富度）**：用詞精準度與多樣性
- **Mechanics（書寫規範）**：標點符號、格式規範

### 內容深度 (Content Depth) - 參考 SOLO Taxonomy
- **Prestructural（前結構）**：離題或無關回應
- **Unistructural（單點結構）**：僅提供單一想法
- **Multistructural（多點結構）**：列舉多個想法但無整合
- **Relational（關聯結構）**：整合觀點，有因果邏輯
- **Extended Abstract（延伸抽象）**：批判反思，超越題目要求

### 證據運用 (Evidence & Elaboration)
- **Specificity（具體性）**：是否有 sensory details、concrete examples
- **Elaboration（闡述）**：是否充分解釋想法
- **Evidence-Claim Alignment（證據-論點對應）**：證據是否支持論點
`;

  const coreInstructions = `
## 評量原則 (Assessment Principles)

### 1. Evidence-Based Scoring（證據本位評分）
所有評語必須引用 Text Evidence（原文證據），使用「」標示引用。
避免 Impressionistic Scoring（印象式評分），每個分數都需要 Justification（給分依據）。

### 2. Criterion-Referenced Grading（標準參照評分）
嚴格對照 Rubric 的 Performance Levels（表現等級）給分。
預設分數為滿分的 80%（Proficient Level），只有達到 Exemplary 標準才給滿分。

### 3. Diagnostic Feedback（診斷性回饋）
給分前必須進行 Error Analysis（錯誤分析），找出至少一個 Area for Improvement。
回饋需要 Actionable（可執行）：不只指出問題，還要提供 Revision Strategy（修改策略）。

### 4. Authentic Assessment Context（真實評量情境）
這是一份**真實的學生作業**。直接進行 Content Analysis（內容分析）。
不要在思考或回答中說「假設」、「虛構」等字眼。

### 5. Avoid Redundancy（避免重複）
Feedback 要 Concise 且 Targeted，不要重複相同內容。

## 評分推理要求（最重要！）

當你調用 **generate_feedback** 時，**reasoning** 欄位是必填的。

你必須在 reasoning 中提供完整的評分推理，這會顯示給教師和學生看：

**reasoning 必須包含：**

1. **逐項分析**：對每個評分項目進行分析
2. **原文引用**：用「」標示引用學生的原文
3. **給分理由**：解釋為什麼給這個分數
4. **優缺點**：指出做得好的地方和可改進之處

**範例格式（請模仿此專業深度）：**
\`\`\`
【論點發展 - 3/5 分】(SOLO: Multistructural → 目標 Relational)
學生試圖論證「科技使人疏離」，但 Argumentation 存在 Logical Fallacy（邏輯謬誤）。
Text Evidence：「大家都在滑手機，所以都不講話了，這就是疏離。」
Error Analysis：這是 Oversimplification（過度簡化）的因果推論。學生未區分 Physical Presence 與 Psychological Presence 的差異。
Revision Strategy：應深入探討科技如何改變溝通的「質」，可引用 Sherry Turkle 的「Alone Together」概念增強 Persuasiveness。

【證據運用 - 2/5 分】(Evidence Quality: Weak → 目標 Moderate)
全文僅依賴 Anecdotal Evidence，缺乏 Empirical Data 或 Expert Sources。
Text Evidence：「我朋友就是這樣...」
Error Analysis：Personal Anecdote 可作為 Hook，但不能作為主要 Supporting Evidence。在 Academic Writing 中，此類證據 Credibility 較低。
Revision Strategy：請補充 Statistical Data 或 Scholarly Sources 來強化 Evidence-Claim Alignment。
\`\`\`

## generate_feedback 必填欄位（重要！）

調用 generate_feedback 時，必須提供以下欄位：

### 1. 給教師的專業分析
- **reasoning**: 完整的專業評分推理，使用教育評量術語（SOLO、Cohesion、Evidence 等）

### 2. 給學生的友善回饋（新增！）
- **messageToStudent**: 用溫暖的語氣跟學生說話，像班導師在鼓勵學生
- **topPriority**: 這次最需要改進的「一件事」，要具體可執行
- **encouragement**: 即使分數低，也要找出一個值得肯定的點

### 3. 各項評分
- **criteriaScores**: 每個評分項目的詳細資料
  - criteriaId, name, score, maxScore
  - evidence: 關鍵引用（最多 50 字）
  - analysis: 【給學生】口語化的改進建議
  - justification: 【給教師】專業術語的給分理由

### 4. 整體摘要
- **overallObservation**: 整體觀察
- **strengths**: 優點（2-3 個）
- **improvements**: 改進方向（2-3 個）

## 語氣區分（最重要！）

| 欄位 | 對象 | 語氣 | 範例 |
|-----|-----|-----|-----|
| **reasoning** | 教師 | 專業術語 | 「Syntactic Complexity 偏低，主要為 Simple Sentences...」 |
| **messageToStudent** | 學生 | 像老師說話 | 「你好！這次作業我看到你有自己的想法，不過句子可以再順一點...」 |
| **analysis** | 學生 | 口語化建議 | 「這個句號放錯位置了喔，應該放在...」 |
| **justification** | 教師 | 專業簡潔 | 「Mechanics Error 頻繁，符合 Level 1 標準」 |

⚠️ **messageToStudent 和 analysis 要像「老師在說話」，不是「報告在陳述」！**
`;

  const toolGuidance = `
## 可用工具
1. **think_aloud** - 🧠 Hattie & Timperley 分析 (Feed Up, Feed Back, Feed Forward)
2. **calculate_confidence** - 計算評分信心度
3. **generate_feedback** - 【最終步驟】生成評分結果
4. **search_reference** - [可選] 搜尋參考資料（僅當有上傳參考文件時使用）
5. **check_similarity** - [可選] 檢查抄襲（僅當需要時使用）

## 🧠 即時思考要求（Thinking Aloud Protocol）

**每次使用工具前，先用 think_aloud 進行 Metacognitive Verbalization（後設認知口語化）。**

像資深教師批改作業時的專業觀察：

✅ 好的範例（像專業教師）：
- 「Cohesion 有問題，這裡缺少 Transitional Phrase，導致段落之間 Coherence 不足...」
- 「從 SOLO 來看，這篇停留在 Multistructural Level，只是列舉想法，缺乏 Integration...」
- 「Syntactic Complexity 偏低，全文都是 Simple Sentences，需要更多 Subordinate Clauses...」
- 「這個 Evidence 太 Anecdotal，缺乏 Specificity 和 Credibility...」

❌ 不好的範例（像機器人）：
- 「我將使用 evaluate_subtrait 來分析句子結構...」
- 「現在進入 Phase 2 評分階段...」

## 建議流程 (3-Step Process)
1. **Hattie's Analysis** → think_aloud (Feed Up/Back/Forward)
2. **Confidence Check** → calculate_confidence
3. **Final Output** → generate_feedback

## ⚠️ 強制結束規則（非常重要！）

當你調用 **calculate_confidence** 後，你必須**立即**調用 **generate_feedback**。

**禁止在 calculate_confidence 之後調用任何其他工具！**

順序必須是：
\`\`\`
calculate_confidence → generate_feedback（結束）
\`\`\`

如果你不遵守這個規則，評分將失敗。
`;

  const relevanceCheck = `
## Task Relevance Check（任務相關性檢查）

在評分前，必須進行 Alignment Check：
- **Content Validity**：作業內容是否與 Task Prompt 相關？
- **Language Appropriateness**：作業語言是否符合要求？

如果判定為 Off-Topic Response（離題回應）：
1. 在思考中使用 SOLO 術語：「此回應為 Prestructural Level - 完全離題」
2. 所有評分項目給 0 分（No Credit）
3. 在 Diagnostic Feedback 中清楚說明 Task Alignment 問題

## 完整評量流程 (Complete Assessment Procedure)

無論作業品質如何，都必須完成完整的 Assessment Cycle：

1. **Initial Reading** - 進行 Holistic First Impression
2. **Hattie's Analysis** - 使用 think_aloud 進行 Feed Up/Back/Forward 分析
3. **Confidence Assessment** - 調用 calculate_confidence 評估 Inter-Rater Reliability 模擬
4. **Feedback Generation** - 調用 generate_feedback 產出 Summative & Diagnostic Feedback

⚠️ 不要跳過步驟！完整的 Assessment Documentation 是專業評量的基本要求。
這確保了 Scoring Transparency 和 Accountability。
`;

  if (isDirectMode) {
    return `${baseRole}\n${assignmentInfo}\n${rubricInfo}\n${coreInstructions}\n${relevanceCheck}`;
  }

  return `${baseRole}\n${assignmentInfo}\n${rubricInfo}\n${coreInstructions}\n${toolGuidance}\n${relevanceCheck}`;
}

// ============================================================================
// FALLBACK: Build result from steps when generate_feedback wasn't called
// ============================================================================

function buildFallbackResultFromSteps(steps: AgentStep[], criteria: ParsedCriterion[]): any | null {
  logger.warn('[Agent Fallback] 3-Step Process interrupted. No intermediate scores available.');

  // In the new 3-step process, scores are only generated in the final step.
  // If we are here, it means generate_feedback was not called or failed.

  return {
    totalScore: 0,
    maxScore: criteria.reduce((sum, c) => sum + c.maxScore, 0),
    overallFeedback: '評分過程未正常完成（3-Step Process Interrupted）。請重新嘗試。',
    strengths: ['無法分析'],
    improvements: ['請重新提交'],
    criteriaScores: criteria.map((c) => ({
      criteriaId: c.criteriaId,
      name: c.name,
      score: 0,
      maxScore: c.maxScore,
      evidence: '評分中斷',
      analysis: '評分中斷',
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
      logger.warn('[Agent] Stop: max steps reached', { steps: params.steps.length });
      return true;
    }

    return false;
  };
}

// ============================================================================
// DIRECT GRADING SCHEMA
// ============================================================================

const DirectGradingSchema = z.object({
  reasoning: z.string().describe('完整的評分推理過程，包含對每個項目的分析'),
  messageToStudent: z.string().describe('給學生的友善回饋，語氣溫暖'),
  topPriority: z.string().describe('學生最需要改進的一件事'),
  encouragement: z.string().describe('給學生的鼓勵'),
  criteriaScores: z.array(
    z.object({
      criteriaId: z.string(),
      name: z.string(),
      score: z.number().describe('分數'),
      maxScore: z.number(),
      evidence: z.string().describe('原文證據'),
      analysis: z.string().optional().describe('給學生的建議'),
      justification: z.string().optional().describe('給教師的理由'),
    })
  ),
  overallObservation: z.string().describe('整體觀察'),
  strengths: z.array(z.string()).optional().describe('優點列表'),
  improvements: z.array(z.string()).optional().describe('改進建議列表'),
});

// ============================================================================
// MAIN EXECUTOR: True Agent Pattern
// ============================================================================

export async function executeGradingAgent(params: AgentGradingParams): Promise<AgentGradingResult> {
  const startTime = Date.now();
  const steps: AgentStep[] = [];
  const healthTracker = getKeyHealthTracker();
  let selectedKeyId: string | null = null;

  try {
    logger.info('[Agent] Starting autonomous grading', {
      resultId: params.resultId,
      rubricName: params.rubricName,
      hasAssignmentTitle: !!params.assignmentTitle,
    });

    // 1. Setup Model (Google Generative AI)
    let model: any;

    // Google Generative AI - 使用 key rotation
    logger.info('[Agent] Using Google Generative AI provider');

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
      effectiveCriteria = await optimizeRubricWithLLM(model, params.rubricName, params.criteria);
    } catch (e) {
      logger.warn('[Agent] Rubric optimization failed, using original', e);
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
      const userMessage = `請評分以下學生作業：

    ${params.assignmentTitle ? `【作業標題】${params.assignmentTitle}` : ''}
    ${params.assignmentDescription ? `【作業說明】${params.assignmentDescription}` : ''}
    【學生作業內容】
    ${params.content}

    請直接輸出評分結果 JSON。`;

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
          logger.info('[Agent] Captured Direct Mode Thinking', { length: directThinking.length });
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
        };

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
        logger.error('[Agent] Direct grading failed', error);
        throw error;
      }
    }

    // 4. Create Tools (ALL tools available at once)
    const tools = createAgentTools({
      referenceDocuments: params.referenceDocuments,
      currentContent: params.content,
      assignmentType: params.assignmentType,
      sessionId: params.sessionId,
    });

    // 5. Create Agent with ToolLoopAgent
    const agent = new ToolLoopAgent({
      model,
      instructions: buildGradingSystemPrompt(ctx),
      tools,
      stopWhen: createStopCondition(15), // Max 15 steps or until feedback generated
      prepareStep: async ({ stepNumber, steps: previousSteps }) => {
        logger.debug('[Agent] prepareStep', { stepNumber, previousSteps: previousSteps.length });

        // Record previous step for UI transparency
        if (previousSteps.length > 0) {
          const lastStep = previousSteps[previousSteps.length - 1];
          const toolsUsed = lastStep.toolCalls?.map((c) => c.toolName) || [];

          // DEBUG: Log the full content structure
          logger.info('[Agent] Step content structure', {
            stepNumber: previousSteps.length,
            contentLength: lastStep.content?.length || 0,
            contentTypes: lastStep.content?.map((p: any) => p.type) || [],
            reasoningArrayLength: lastStep.reasoning?.length || 0,
            reasoningParts:
              lastStep.reasoning?.map((r: any) => ({
                type: r.type,
                hasText: !!r.text,
                textPreview: r.text?.substring(0, 50),
              })) || [],
          });

          // Capture reasoning from multiple sources:
          // 1. reasoning array - contains parts with type "reasoning"
          // 2. reasoningText - computed from reasoning array
          // 3. text - regular text output
          let reasoning = '';

          // Try to get from reasoning array (structured parts)
          if (lastStep.reasoning && lastStep.reasoning.length > 0) {
            reasoning = lastStep.reasoning
              .map((r: any) => r.text)
              .filter(Boolean)
              .join('\n');
            logger.debug('[Agent] Captured from reasoning array', {
              partsCount: lastStep.reasoning.length,
              combinedLength: reasoning.length,
            });
          }

          // Fallback to reasoningText (computed string)
          if (!reasoning && lastStep.reasoningText) {
            reasoning = lastStep.reasoningText;
            logger.debug('[Agent] Captured reasoningText', {
              length: reasoning.length,
              preview: reasoning.substring(0, 100),
            });
          }

          // Also capture regular text output
          if (lastStep.text) {
            if (reasoning) {
              reasoning += '\n\n' + lastStep.text;
            } else {
              reasoning = lastStep.text;
            }
          }

          // Log what we captured for debugging
          const hasReasoningArray = (lastStep.reasoning?.length || 0) > 0;
          const hasReasoningText = !!lastStep.reasoningText;
          const hasText = !!lastStep.text;
          const reasoningPreview = reasoning.substring(0, 200);

          logger.info(
            `[Agent] Step ${previousSteps.length} completed: ` +
              `hasReasoningArray=${hasReasoningArray}, hasReasoningText=${hasReasoningText}, hasText=${hasText}, ` +
              `tools=[${toolsUsed.join(',')}], ` +
              `reasoning="${reasoningPreview}..."`
          );

          if (reasoning || toolsUsed.length > 0) {
            steps.push({
              stepNumber: previousSteps.length,
              reasoning: reasoning,
              toolName: toolsUsed[0],
              toolInput: lastStep.toolCalls?.[0]?.input,
              toolOutput: lastStep.toolResults?.[0]?.output,
              durationMs: 0,
              timestamp: new Date(),
            });
          }
        }

        // Soft guidance based on progress (NO tool locking)
        const thinkReminder = '\n\n⚠️ 在使用工具前，先用 think_aloud 說出你的想法。不要提及工具名稱！';

        // Check what tools have been called so far
        const toolsCalled = steps.map((s) => s.toolName).filter(Boolean);
        const hasCalledConfidence = toolsCalled.includes('calculate_confidence');
        const hasCalledThinkAloud = toolsCalled.includes('think_aloud');

        logger.debug('[Agent] Tools called so far', {
          stepNumber,
          toolsCalled: toolsCalled.join(', '),
          hasCalledConfidence,
          hasCalledThinkAloud,
        });

        let guidance = '';
        if (hasCalledConfidence) {
          // Force generate_feedback immediately after calculate_confidence
          guidance = `
          【強制結束】

          你已經調用了 calculate_confidence，現在必須**立即**調用 generate_feedback！

          不要再調用其他工具！不要輸出空內容！

          請直接調用 generate_feedback，包含：
          - reasoning: 完整的評分推理
          - totalScore / maxScore: 總分
          - criteriaScores: 每項分數
          - overallFeedback: 整體評語
          - strengths / improvements: 優缺點
          `;
        } else if (stepNumber >= 5) {
          // Force completion if taking too long (should be done in 3 steps)
          guidance = `
          【即將超時】你已經執行了 ${stepNumber} 個步驟。

          請立即完成評分：
          1. 如果還沒調用 calculate_confidence，現在調用
          2. 然後立即調用 generate_feedback 輸出結果`;
        } else if (stepNumber === 0) {
          guidance =
            '\n\n【步驟 1/3】請使用 think_aloud 進行完整的 Hattie & Timperley 分析 (Feed Up/Back/Forward)。' +
            thinkReminder;
        } else if (hasCalledThinkAloud && !hasCalledConfidence) {
          guidance = '\n\n【步驟 2/3】分析完成。請調用 calculate_confidence 評估信心度。';
        } else {
          guidance = thinkReminder;
        }

        return {
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
          ...(guidance ? { system: buildGradingSystemPrompt(ctx) + guidance } : {}),
        };
      },
    });

    // 6. Execute Agent
    const userMessage = `請評分以下學生作業：

    ${params.assignmentTitle ? `【作業標題】${params.assignmentTitle}` : ''}
    ${params.assignmentDescription ? `【作業說明】${params.assignmentDescription}` : ''}
    【學生作業內容】
    （注意：這是真實學生的提交，請直接評分，不要假設它是範例）
    ${params.content}
    請使用適當的工具進行評分，完成後調用 generate_feedback 輸出結果。`;

    logger.info('[Agent] Executing', {
      contentLength: params.content.length,
      hasTitle: !!params.assignmentTitle,
    });

    const result = await agent.generate({
      messages: [{ role: 'user', content: userMessage }],
    });

    // Log overall result structure for debugging
    const stepsWithReasoning = result.steps.filter((s) => s.reasoningText).length;
    const stepsWithText = result.steps.filter((s) => s.text).length;
    const stepsWithReasoningArray = result.steps.filter((s) => (s.reasoning?.length || 0) > 0).length;
    logger.info(
      `[Agent] Generation completed: totalSteps=${result.steps.length}, ` +
        `stepsWithReasoningArray=${stepsWithReasoningArray}, ` +
        `stepsWithReasoningText=${stepsWithReasoning}, stepsWithText=${stepsWithText}`
    );

    // DEBUG: Log ALL keys at result level to find thinking
    const resultKeys = Object.keys(result);
    logger.debug(`[Agent] Result object keys: ${resultKeys.join(', ')}`);

    // Check if thinking is at result level - DETAILED OUTPUT
    if ((result as any).reasoning) {
      const reasoning = (result as any).reasoning;
      logger.info(`[Agent] ✨ Result.reasoning FOUND! Type: ${typeof reasoning}, IsArray: ${Array.isArray(reasoning)}`);
      if (Array.isArray(reasoning)) {
        logger.info(`[Agent] ✨ Result.reasoning array length: ${reasoning.length}`);
        reasoning.forEach((r: any, i: number) => {
          logger.info(
            `[Agent] ✨ Result.reasoning[${i}]: type=${r?.type}, text=${JSON.stringify(r?.text || r)?.substring(0, 300)}`
          );
        });
      } else if (typeof reasoning === 'string') {
        logger.info(`[Agent] ✨ Result.reasoning string: ${reasoning.substring(0, 500)}`);
      } else {
        logger.info(`[Agent] ✨ Result.reasoning object: ${JSON.stringify(reasoning).substring(0, 500)}`);
      }
    }
    if ((result as any).reasoningText) {
      logger.info(`[Agent] ✨ Result.reasoningText: ${(result as any).reasoningText.substring(0, 500)}`);
    }
    if ((result as any).providerMetadata) {
      const pm = (result as any).providerMetadata;
      logger.info(`[Agent] Result.providerMetadata keys: ${Object.keys(pm).join(', ')}`);
      // Check for google-specific metadata
      if (pm.google) {
        logger.info(`[Agent] ✨ providerMetadata.google: ${JSON.stringify(pm.google).substring(0, 500)}`);
      }
    }

    // Log each step's content structure - DETAILED DEBUG
    result.steps.forEach((step, idx) => {
      // Log basic structure
      logger.info(
        `[Agent] Final Step ${idx} structure: ` +
          `contentTypes=[${step.content?.map((p: any) => p.type).join(',') || 'empty'}], ` +
          `reasoningArrayLen=${step.reasoning?.length || 0}, ` +
          `reasoningText=${step.reasoningText?.substring(0, 50) || 'null'}, ` +
          `text=${step.text?.substring(0, 50) || 'null'}`
      );

      // Log ALL keys in step object to find where thinking might be hiding
      const stepKeys = Object.keys(step);
      logger.debug(`[Agent] Step ${idx} all keys: ${stepKeys.join(', ')}`);

      // Check for providerMetadata (where Gemini thinking might be)
      if ((step as any).providerMetadata) {
        const pm = (step as any).providerMetadata;
        const pmKeys = Object.keys(pm);
        if (pmKeys.length > 0) {
          logger.info(`[Agent] Step ${idx} providerMetadata keys: ${pmKeys.join(', ')}`);
          if (pm.google) {
            logger.info(
              `[Agent] ✨ Step ${idx} providerMetadata.google: ${JSON.stringify(pm.google).substring(0, 500)}`
            );
          }
        }
      }

      // Check response.body for raw Gemini response (thinking might be here!)
      if ((step as any).response?.body) {
        const body = (step as any).response.body;

        // Log the raw body structure to find where thoughts are
        logger.debug(`[Agent] Step ${idx} response.body keys: ${Object.keys(body || {}).join(', ')}`);

        // Look for candidates[0].content.parts with thinking
        if (body.candidates?.[0]?.content?.parts) {
          const parts = body.candidates[0].content.parts;
          logger.info(`[Agent] Step ${idx} has ${parts.length} parts in response.body`);

          // Log ALL parts to see their structure
          parts.forEach((p: any, pIdx: number) => {
            const partKeys = Object.keys(p);
            logger.debug(`[Agent] Step ${idx} body.part[${pIdx}] keys: ${partKeys.join(', ')}`);

            // Check for thought flag or thinking content
            if (p.thought === true || p.thought === 'true') {
              logger.info(`[Agent] ✨✨✨ Step ${idx} FOUND THOUGHT PART! text: ${p.text?.substring(0, 500)}`);
            }
            if (p.thinkingContent) {
              logger.info(
                `[Agent] ✨✨✨ Step ${idx} FOUND thinkingContent! ${JSON.stringify(p.thinkingContent).substring(0, 500)}`
              );
            }
          });
        }

        // Check for thoughts at various levels
        if (body.thoughts) {
          logger.info(`[Agent] ✨✨✨ Step ${idx} body.thoughts: ${JSON.stringify(body.thoughts).substring(0, 500)}`);
        }
        if (body.candidates?.[0]?.thoughts) {
          logger.info(
            `[Agent] ✨✨✨ Step ${idx} candidates[0].thoughts: ${JSON.stringify(body.candidates[0].thoughts).substring(0, 500)}`
          );
        }
        if (body.candidates?.[0]?.thinkingContent) {
          logger.info(
            `[Agent] ✨✨✨ Step ${idx} candidates[0].thinkingContent: ${JSON.stringify(body.candidates[0].thinkingContent).substring(0, 500)}`
          );
        }
      }

      // Check each content part's providerMetadata
      if (step.content && step.content.length > 0) {
        step.content.forEach((part: any, partIdx: number) => {
          if (part.providerMetadata) {
            const partPm = part.providerMetadata;
            const partPmKeys = Object.keys(partPm);
            if (partPmKeys.length > 0) {
              logger.debug(`[Agent] Step ${idx} content[${partIdx}] providerMetadata keys: ${partPmKeys.join(', ')}`);
              if (partPm.google) {
                logger.info(
                  `[Agent] ✨ Step ${idx} content[${partIdx}] providerMetadata.google: ${JSON.stringify(partPm.google).substring(0, 300)}`
                );
              }
            }
          }
        });
      }
    });

    // 7. Extract Final Result and capture ALL reasoning from steps
    let finalResult: any = null;
    let confidenceData: any = null;
    let feedbackReasoning: string = ''; // 從 generate_feedback input 提取的推理
    let directThinking: string = ''; // 從 Direct Mode 的 providerMetadata 提取的思考

    // Also capture any reasoning we might have missed in prepareStep
    for (const step of result.steps) {
      // Capture reasoning from this step if not already captured
      const stepReasoning = step.reasoningText || step.text || '';
      if (stepReasoning) {
        logger.debug('[Agent] Final step reasoning', {
          hasReasoningText: !!step.reasoningText,
          hasText: !!step.text,
          preview: stepReasoning.substring(0, 100),
        });
      }

      // Capture Gemini Native Thinking (Direct Mode)
      if ((step as any).providerMetadata?.google?.thoughts) {
        directThinking = (step as any).providerMetadata.google.thoughts;
      }

      if (step.toolCalls) {
        for (let i = 0; i < step.toolCalls.length; i++) {
          const call = step.toolCalls[i];
          if (call.toolName === 'generate_feedback') {
            finalResult = step.toolResults?.[i]?.output;
            // 從 tool input 提取 reasoning（這是強制欄位）
            const toolInput = call.input as any;
            if (toolInput?.reasoning) {
              feedbackReasoning = toolInput.reasoning;
              logger.info('[Agent] Extracted reasoning from generate_feedback input', {
                reasoningLength: feedbackReasoning.length,
                preview: feedbackReasoning.substring(0, 200),
              });
            }
          }
          if (call.toolName === 'calculate_confidence') {
            confidenceData = step.toolResults?.[i]?.output;
          }
        }
      }
    }

    if (!finalResult) {
      logger.warn('[Agent] generate_feedback was not called, building fallback result from steps...');

      // Fallback: Try to build a partial result (though likely empty in 3-step process)
      finalResult = buildFallbackResultFromSteps(steps, params.criteria);

      if (!finalResult) {
        throw new Error('Agent completed but did not call generate_feedback and fallback failed');
      }

      logger.info('[Agent] Fallback result built successfully', {
        totalScore: finalResult.totalScore,
        maxScore: finalResult.maxScore,
      });
    }

    // 8. Build Response
    const executionTimeMs = Date.now() - startTime;
    await healthTracker.recordSuccess(selectedKeyId, executionTimeMs);

    // Ensure finalResult has breakdown (map from criteriaScores if needed)
    if (finalResult && finalResult.criteriaScores && !finalResult.breakdown) {
      finalResult.breakdown = finalResult.criteriaScores.map((c: any) => ({
        criteriaId: c.criteriaId,
        name: c.name,
        score: c.score,
        feedback: c.analysis || c.justification || '',
      }));
    }

    // Ensure overallFeedback exists
    if (
      finalResult &&
      !finalResult.overallFeedback &&
      (finalResult.messageToStudent || finalResult.overallObservation)
    ) {
      finalResult.overallFeedback = finalResult.messageToStudent || finalResult.overallObservation;
    }

    // Add reasoning step if we captured it from generate_feedback
    if (feedbackReasoning) {
      steps.push({
        stepNumber: steps.length + 1,
        reasoning: feedbackReasoning,
        toolName: 'generate_feedback',
        durationMs: 0,
        timestamp: new Date(),
      });
    } else if (directThinking) {
      // If we have native thinking but no explicit reasoning field (Direct Mode fallback)
      steps.push({
        stepNumber: steps.length + 1,
        reasoning: directThinking,
        toolName: 'direct_grading',
        durationMs: 0,
        timestamp: new Date(),
      });
    }

    // Add final summary step
    steps.push({
      stepNumber: steps.length + 1,
      reasoning: `評分完成。總分：${finalResult.totalScore}/${finalResult.maxScore}`,
      durationMs: 0,
      timestamp: new Date(),
    });

    logger.info('[Agent] Grading completed', {
      totalSteps: result.steps.length,
      totalScore: finalResult.totalScore,
      maxScore: finalResult.maxScore,
      executionTimeMs,
    });

    return {
      success: true,
      data: finalResult,
      steps,
      confidenceScore: confidenceData?.confidenceScore ?? 0.8,
      requiresReview: confidenceData?.shouldReview ?? false,
      totalTokens: 0,
      executionTimeMs,
    };
  } catch (error) {
    logger.error('[Agent] Grading failed', error);

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
