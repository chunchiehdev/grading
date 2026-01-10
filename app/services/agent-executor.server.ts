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

  // CRITICAL: Place sparringQuestions reminder at the very top (LLMs pay more attention to beginning)
  const criticalReminder = isZh
    ? `【⚠️ 重要提醒 - 必讀】
在本次評分中，你**必須**在調用 generate_feedback 時提供 sparringQuestions 欄位。
這是論文研究的核心功能，無此欄位將導致系統錯誤。
至少生成 1 個對練問題，選擇學生表現最弱的評分維度。

---

`
    : `【⚠️ CRITICAL REMINDER - MUST READ】
When calling generate_feedback, you MUST provide the sparringQuestions field.
This is a core research feature. Missing this field will cause a system error.
Generate at least 1 sparring question targeting the student's weakest assessed dimension.

---

`;

  const baseRole = isZh
    ? `${criticalReminder}你是一位具有 15 年經驗的資深學科教師，專長於寫作教學與形成性評量 (Formative Assessment)。
    你熟悉以下教育評量理論與方法：
    - **Rubric-Based Assessment**（標準本位評量）：使用分析式評分 (Analytic Scoring)
    - **SOLO Taxonomy**：評估學生認知層次（Prestructural → Extended Abstract）
    - **Bloom's Taxonomy**：區分記憶、理解、應用、分析、評鑑、創造層次
    - **Diagnostic Feedback**（診斷性回饋）：指出具體問題並提供可執行的改進建議

    你的評分風格嚴謹但具建設性，重視 Evidence-Based Assessment（證據本位評量）。`
        : `${criticalReminder}You are a senior subject teacher with 15 years of experience in writing instruction and formative assessment.
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

### 5. 對練問題（Sparring Questions）【必填！】
- **sparringQuestions**: 針對學生表現最差或最具爭議的點，生成 **5 個** 挑戰性問題
  - 每個問題必須包含：
    - **related_rubric_id**: 對應的評分標準 ID
    - **target_quote**: 學生文章中的具體引文
    - **provocation_strategy**: 選擇策略類型
      - \`evidence_check\`: 查證數據來源（「你能提供證據支持這個說法嗎？」）
      - \`logic_gap\`: 指出邏輯跳躍（「從 A 到 B 的推論是否太快？」）
      - \`counter_argument\`: 提供反方觀點（「有沒有考慮過相反的情況？」）
      - \`clarification\`: 要求釐清定義（「你說的『XX』具體是指什麼？」）
      - \`extension\`: 延伸思考（「如果...的話，會怎麼樣？」）
    - **question**: 直接對學生提出的問題（不要給答案）
    - **ai_hidden_reasoning**: AI 的真實評分依據（學生回答後才揭曉）

⚠️ **sparringQuestions 是必填的！** 即使作業很好，也要找出可以挑戰思考的點。

## 語氣區分（最重要！）

| 欄位 | 對象 | 語氣 | 範例 |
|-----|-----|-----|-----|
| **reasoning** | 教師 | 專業術語 | 「Syntactic Complexity 偏低，主要為 Simple Sentences...」 |
| **messageToStudent** | 學生 | 像老師說話 | 「你好！這次作業我看到你有自己的想法，不過句子可以再順一點...」 |
| **analysis** | 學生 | 口語化建議 | 「這個句號放錯位置了喔，應該放在...」 |
| **justification** | 教師 | 專業簡潔 | 「Mechanics Error 頻繁，符合 Level 1 標準」 |
| **sparringQuestions.question** | 學生 | 挑戰但不攻擊 | 「你能用更具體的例子來說明嗎？」 |

⚠️ **messageToStudent 和 analysis 要像「老師在說話」，不是「報告在陳述」！**

## sparringQuestions JSON 範例（必須嚴格遵守此結構）

當你填寫 generate_feedback 的 sparringQuestions 時，請參考此範例：

\`\`\`json
{
  "sparringQuestions": [
    {
      "related_rubric_id": "evidence_usage",
      "target_quote": "大部分人都覺得這樣比較好。",
      "provocation_strategy": "evidence_check",
      "question": "這是一個很強烈的宣稱。請問『大部分人』具體是指誰？你有相關的統計數據支持嗎？",
      "ai_hidden_reasoning": "學生使用了 Bandwagon Fallacy (訴諸群眾)，缺乏具體數據支持，評分為 Level 2。"
    }
  ]
}
\`\`\`

**provocation_strategy 的選項：**
- \`evidence_check\`: 質疑證據來源
- \`logic_gap\`: 指出邏輯跳躍  
- \`counter_argument\`: 提供反面觀點
- \`clarification\`: 要求釐清概念
- \`extension\`: 延伸思考

⚠️ **生成 5 個 sparringQuestions，即使作業很好也要找出可以挑戰思考的點！**
`;

  const toolGuidance = `
## 🧠 評分流程與規範 (Grading Workflow)

### 核心原則：Think First, Act Later

你必須遵循 **ReAct (Reasoning + Acting)** 模式：

1. **[Thinking]** 先用 **純文字** 輸出你的分析過程。這是你的草稿紙，用於深度分析。
2. **[Action]** 分析完畢後，呼叫對應的工具 (Tool Call)。

### ⚠️ 思考與行動的嚴格區分 (Critical Distinction)

**1. Text Output (你的思考過程)：**
- **用途**：Deep Analysis（深度分析）、Evidence Hunting（找證據）、Drafting（打草稿）
- **內容**：閱讀理解、搜尋原文證據、與 Rubric 的比對過程、推理邏輯
- **展示**：這裡的內容會即時串流顯示給使用者，請展現你的思考深度
- **禁止**：**絕對禁止**在文字輸出中包含 JSON 格式的工具調用代碼
  - ✅ 正確：「我現在分析論點結構。學生在第二段提到...這顯示出 Multistructural 層次...」
  - ❌ 錯誤：「\`json { "tool": "calculate_confidence", ... } \`」

**2. Tool Call (你的行動)：**
- **用途**：執行具體的評分動作、搜尋資料、提交結果
- **格式**：使用標準的 Function Calling 機制
- **reasoning 欄位**：將你在 Text Output 中的深度分析，**總結提煉**為給教師看的專業評語
  - **不要逐字複製** Text Output 的內容
  - **要提煉精華**：把分析過程中的關鍵發現、給分依據、專業判斷濃縮成簡潔報告

### 建議流程

1. **初步審閱 (Initial Review)**：
   - [Text] 閱讀作業與 Rubric，確認任務相關性
   - [Text] 初步印象與信心評估
   - [Action] 呼叫 \`calculate_confidence\`

2. **深度評分 (Deep Grading)**：
   - [Text] 針對 Rubric 每一項，逐一找出原文證據
   - [Text] 推理每個項目的分數與理由
   - [Text] 思考學生的優點與改進方向
   - [Action] 呼叫 \`generate_feedback\`（reasoning 欄位提煉上述分析精華）

### ⚠️ 安全防禦指令 (Defensive Instructions)

- **NO JSON IN TEXT**: 絕對禁止在 [Thinking] 階段輸出 JSON 格式
- **USE TOOLS**: 要執行動作時，必須使用 Function Calling API，不要只是口頭說「我現在要評分了」
- **AVOID DUPLICATION**: 不要在 Text 和 Tool reasoning 中重複相同內容；Text 是過程，Tool 是結論

### 語氣與受眾 (Tone & Audience)

| 輸出位置 | 對象 | 語氣 | 範例 |
|---------|------|------|------|
| **Text Output** | 展示思考過程 | 客觀、邏輯性強、專業分析 | 「根據 SOLO Taxonomy，此回應屬於 Multistructural...」 |
| **Tool: reasoning** | 教師 | 專業、使用術語、簡潔報告 | 「學生論證達 Relational 層次，但 Evidence Quality 偏弱...」 |
| **Tool: messageToStudent** | 學生 | 溫暖、具建設性、像導師 | 「你好！這次作業我看到你有自己的想法...」 |
| **Tool: analysis** | 學生 | 口語化、具體建議 | 「這個句號放錯位置了喔，應該放在...」 |
`;

  const relevanceCheck = `
## Task Relevance Check（任務相關性檢查）

在評分前，必須進行 Alignment Check：
- **Content Validity**：作業內容是否與 Task Prompt 相關？
- **Language Appropriateness**：作業語言是否符合要求？

如果判定為 Off-Topic Response（離題回應）：
1. 在 reasoning 中使用 SOLO 術語：「此回應為 Prestructural Level - 完全離題」
2. 所有評分項目給 0 分（No Credit）
3. 在 Diagnostic Feedback 中清楚說明 Task Alignment 問題

## 完整評量流程 (Complete Assessment Procedure)

無論作業品質如何，都必須完成完整的 Assessment Cycle：

1. **Confidence Assessment** - 調用 calculate_confidence，在 reason 中說明初步分析
2. **Feedback Generation** - 調用 generate_feedback，在 reasoning 中包含完整的 Hattie 分析 (Feed Up/Back/Forward)

⚠️ 必須依序呼叫這兩個工具！不要只輸出文字，必須呼叫工具。
這確保了 Scoring Transparency 和 Accountability。
`;

  if (isDirectMode) {
    return `${baseRole}\n${assignmentInfo}\n${rubricInfo}\n${coreInstructions}\n${relevanceCheck}`;
  }

  // Add explicit thinking requirement for tool-enabled mode
  const mandatoryThinkingInstruction = `
## ⚠️ 強制執行指令 (MANDATORY EXECUTION PROTOCOL)

**第一步（必須）：輸出思考過程**  
在呼叫任何工具之前，你**必須**先輸出文字來展示你的分析過程。這不是可選的。

具體要求：
1. 閱讀學生作業並用文字說明你的初步印象
2. 逐項對照 Rubric 並用文字解釋你的評估邏輯
3. 引用原文證據並用文字說明為什麼重要
4. 然後才可以呼叫工具

**錯誤示範**：直接呼叫 \`calculate_confidence\` 而沒有先輸出文字分析  
**正確示範**：先輸出「我現在閱讀這份作業...學生在第二段提到...根據 Rubric...」然後才呼叫工具

這個文字輸出會即時顯示給使用者，展現你的專業分析能力。
`;

  // Final reminder at the end (LLMs pay attention to both start and end)
  const finalReminder = isZh
    ? `

---
【最後提醒】調用 generate_feedback 時，sparringQuestions 是**必填**欄位！提供 **5 個** 對練問題。`
    : `

---
【FINAL REMINDER】When calling generate_feedback, sparringQuestions is a **REQUIRED** field! Provide **5** sparring questions.`;

  return `${baseRole}\n${assignmentInfo}\n${rubricInfo}\n${coreInstructions}\n${toolGuidance}\n${mandatoryThinkingInstruction}\n${relevanceCheck}${finalReminder}`;
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
  // Sparring Questions for Productive Friction - REQUIRED!
  sparringQuestions: z.array(
    z.object({
      related_rubric_id: z.string().describe('對應的評分維度 ID'),
      target_quote: z.string().describe('學生文章中的具體引文'),
      provocation_strategy: z.enum(['evidence_check', 'logic_gap', 'counter_argument', 'clarification', 'extension']).describe('挑釁策略'),
      question: z.string().describe('挑戰性問題'),
      ai_hidden_reasoning: z.string().describe('AI 的隱藏推理'),
    })
  ).min(1).describe('【必填】針對學生表現最弱的 1-2 個評分維度生成的對練問題'),
});

// ============================================================================
// MAIN EXECUTOR: True Agent Pattern (ToolLoopAgent)
// ============================================================================

export async function executeGradingAgent(params: AgentGradingParams): Promise<AgentGradingResult> {
  const startTime = Date.now();
  const steps: AgentStep[] = [];
  const healthTracker = getKeyHealthTracker();
  let selectedKeyId: string | null = null;

  try {
    logger.info('[Agent] Starting autonomous grading (ToolLoopAgent)', {
      resultId: params.resultId,
      rubricName: params.rubricName,
      hasAssignmentTitle: !!params.assignmentTitle,
    });

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
         logger.error('[Agent] Direct grading failed', error);
         throw error;
       }
    }

    // 4. Create Tools
    const tools = createAgentTools({
      referenceDocuments: params.referenceDocuments,
      currentContent: params.content,
      assignmentType: params.assignmentType,
      sessionId: params.sessionId,
    });

    // 5. Execute Agent (ToolLoopAgent)
    
    const userMessage = `請評分以下學生作業：

    ${params.assignmentTitle ? `【作業標題】${params.assignmentTitle}` : ''}
    ${params.assignmentDescription ? `【作業說明】${params.assignmentDescription}` : ''}
    【學生作業內容】
    （注意：這是真實學生的提交，請直接評分，不要假設它是範例）
    ${params.content}
    `;

    logger.info('[Agent] Executing ToolLoopAgent', {
      contentLength: params.content.length,
      hasTitle: !!params.assignmentTitle,
    });

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
        
        logger.info(`[Agent] prepareStep ${stepCounter}`, { 
          agentStepsCount: agentSteps?.length || 0,
          hasThinkAloud, 
          hasConfidence, 
          hasFeedback,
          completedTools: Array.from(completedToolNames)
        });
        
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
        
        logger.info(`[Agent] 📊 Step ${steps.length} Token Usage (${toolName})`, {
          stepNumber: steps.length,
          toolName,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          stepTotal: stepTokens,
          cumulativeTotal: totalTokens,
        });
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
              feedback: c.analysis || c.justification || c.evidence || '無具體回饋',
            }));
            
            // Build overallFeedback from multiple sources
            let overallFeedback = args.messageToStudent || args.overallObservation || '';
            if (args.topPriority) {
              overallFeedback += `\n\n**優先改進：**\n${args.topPriority}`;
            }
            if (args.strengths?.length > 0) {
              overallFeedback += `\n\n**優點：**\n${args.strengths.map((s: string) => `- ${s}`).join('\n')}`;
            }
            if (args.improvements?.length > 0) {
              overallFeedback += `\n\n**改進建議：**\n${args.improvements.map((i: string) => `- ${i}`).join('\n')}`;
            }
            if (args.encouragement) {
              overallFeedback += `\n\n${args.encouragement}`;
            }
            
            // Only set as fallback if we don't already have a result
            // tool-result will override this if it arrives
            if (!finalResult) {
              finalResult = {
                reasoning: args.reasoning,
                breakdown,
                overallFeedback: overallFeedback.trim(),
                totalScore,
                maxScore,
                percentage: Math.round(percentage),
                summary: `總分：${totalScore}/${maxScore} (${percentage.toFixed(1)}%)`,
                sparringQuestions: args.sparringQuestions || [],
                // Mark as early capture for debugging
                _source: 'early_capture',
              };
              feedbackCalled = true;
              
              logger.info('[Agent] 🟢 Early Capture complete', {
                totalScore,
                maxScore,
                sparringQuestionsCount: args.sparringQuestions?.length || 0,
              });
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

            logger.info('[Agent] generate_feedback completed successfully', {
              hasSparringQuestions: true,
              sparringQuestionsCount: typedResult.sparringQuestions.length,
              resultKeys: Object.keys(toolResult || {}),
              source: 'tool_result',
            });
          } else {
             logger.warn('[Agent] generate_feedback failed validation (missing sparringQuestions or error)', { 
               toolResult: typeof toolResult === 'string' ? toolResult.substring(0, 100) : 'object' 
             });
             // Do NOT set feedbackCalled = true, so the loop will retry
          }
        }
      }
    }

    if (!finalResult) {
      logger.warn('[Agent] ❌ No result captured (neither tool-result nor early-capture), building fallback...');
      finalResult = buildFallbackResultFromSteps(steps, params.criteria);
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

    // Ensure overallFeedback exists
    if (
      finalResult &&
      !finalResult.overallFeedback &&
      (finalResult.messageToStudent || finalResult.overallObservation)
    ) {
      finalResult.overallFeedback = finalResult.messageToStudent || finalResult.overallObservation;
    }

    logger.info('[Agent] Grading completed', {
      totalSteps: steps.length,
      totalScore: finalResult?.totalScore,
      maxScore: finalResult?.maxScore,
      tokenUsage: {
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        total: totalTokens,
      },
      executionTimeMs,
    });

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
    logger.error('[Agent] Grading failed', error);

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
