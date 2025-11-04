/**
 * Agent Executor for Grading
 *
 * Core engine that executes the multi-step Agent grading workflow
 */

import { generateText, stepCountIs } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type {
  AgentGradingParams,
  AgentGradingResult,
  AgentStep,
  ParsedCriterion,
  ReferenceDocument,
} from '@/types/agent';
import { agentTools } from './agent-tools.server';
import logger from '@/utils/logger';
import { getKeyHealthTracker } from './gemini-key-health.server';

/**
 * Generate Agent system prompt
 */
function generateAgentSystemPrompt(params: {
  rubricName: string;
  criteria: ParsedCriterion[];
  fileName: string;
  referenceDocuments?: ReferenceDocument[];
  customInstructions?: string;
  assignmentType?: string;
  userLanguage?: string;
}): string {
  const lang = params.userLanguage || 'zh-TW';
  const isZh = lang.startsWith('zh');

  const basePrompt = isZh
    ? `你是一個專業的評分 Agent，專門協助教師進行作業評分。`
    : `You are a professional grading Agent specialized in assisting teachers with assignment grading.`;

  const workflow = isZh
    ? `

## 評分流程

你必須按照以下步驟進行評分：

1. **分析評分標準** - 使用 \`analyze_rubric\` 工具理解評分標準的結構和複雜度
2. **解析學生作業** - 使用 \`parse_content\` 工具分析作業內容的特徵
3. **搜尋參考資料**（如有）- 使用 \`search_reference\` 工具查找相關參考文件
4. **檢查相似度** - 使用 \`check_similarity\` 工具檢測是否有抄襲嫌疑
5. **逐項評分** - 根據評分標準逐項給分，並提供詳細證據
6. **計算信心度** - 使用 \`calculate_confidence\` 工具評估評分的可靠性
7. **生成反饋** - 使用 \`generate_feedback\` 工具生成最終評分結果

## 評分原則

- **證據導向**：每個分數都要有明確的證據支持
- **一致性**：確保評分標準的一致應用
- **建設性**：反饋要具體且有助於學生改進
- **公正性**：避免偏見，客觀評價
- **透明度**：清楚說明評分理由

## 信心度判斷

評分後必須計算信心度，如果信心度低於 0.7，必須標記為需要人工審核。

信心度受以下因素影響：
- **Rubric 覆蓋率**：是否所有評分標準都有評到
- **證據品質**：評分依據是否充分（high/medium/low）
- **標準模糊度**：評分標準是否清晰明確（0-1，越低越好）
`
    : `

## Grading Workflow

You must follow these steps:

1. **Analyze Rubric** - Use \`analyze_rubric\` to understand the structure
2. **Parse Content** - Use \`parse_content\` to analyze submission features
3. **Search References** (if available) - Use \`search_reference\` for relevant materials
4. **Check Similarity** - Use \`check_similarity\` to detect potential plagiarism
5. **Grade Each Criterion** - Provide scores with detailed evidence
6. **Calculate Confidence** - Use \`calculate_confidence\` to assess reliability
7. **Generate Feedback** - Use \`generate_feedback\` for final result

## Grading Principles

- **Evidence-based**: Every score must be supported by evidence
- **Consistency**: Apply rubric consistently
- **Constructive**: Provide specific, actionable feedback
- **Fair**: Avoid bias, evaluate objectively
- **Transparent**: Explain grading rationale clearly

## Confidence Threshold

Calculate confidence after grading. If confidence < 0.7, mark for human review.
`;

  return `${basePrompt}

${workflow}

## 評分標準（Rubric）

**名稱：** ${params.rubricName}

${params.criteria
  .map(
    (c, idx) => `
### ${idx + 1}. ${c.name}
- **說明：** ${c.description}
- **滿分：** ${c.maxScore}
${
  c.levels
    ? `- **評分等級：**\n${c.levels.map((l) => `  - ${l.score} 分：${l.description}`).join('\n')}`
    : ''
}
`
  )
  .join('\n')}

${
  params.customInstructions
    ? `
## 老師的特別指示

${params.customInstructions}
`
    : ''
}

${
  params.referenceDocuments && params.referenceDocuments.length > 0
    ? `
## 參考資料

老師提供了 ${params.referenceDocuments.length} 份參考文件，你可以使用 \`search_reference\` 工具搜尋相關內容。

參考文件：
${params.referenceDocuments.map((d) => `- ${d.fileName} (${d.contentLength} 字元)`).join('\n')}
`
    : ''
}

## 學生作業

**檔案名稱：** ${params.fileName}
**作業類型：** ${params.assignmentType || '未指定'}

請開始評分流程。記住：必須使用工具來完成評分，不要直接給出評分結果！`;
}

/**
 * Execute Agent-based grading
 */
export async function executeGradingAgent(
  params: AgentGradingParams
): Promise<AgentGradingResult> {
  const startTime = Date.now();
  const steps: AgentStep[] = [];

  try {
    logger.info('[Agent Executor] Starting Agent grading', {
      resultId: params.resultId,
      rubricName: params.rubricName,
      criteriaCount: params.criteria.length,
      hasReferences: !!params.referenceDocuments?.length,
    });

    // Get API key from KeyHealthTracker
    const healthTracker = getKeyHealthTracker();
    const availableKeyIds = process.env.GEMINI_API_KEY2 && process.env.GEMINI_API_KEY3
      ? ['1', '2', '3']
      : ['1'];
    const selectedKeyId = await healthTracker.selectBestKey(availableKeyIds);

    if (!selectedKeyId) {
      throw new Error('All Gemini API keys are throttled');
    }

    const apiKey =
      selectedKeyId === '1'
        ? process.env.GEMINI_API_KEY
        : selectedKeyId === '2'
          ? process.env.GEMINI_API_KEY2
          : process.env.GEMINI_API_KEY3;

    if (!apiKey) {
      throw new Error(`API key not found for keyId: ${selectedKeyId}`);
    }

    // Create Gemini provider
    const gemini = createGoogleGenerativeAI({ apiKey });
    const model = gemini('gemini-2.5-flash');

    // Generate system prompt
    const systemPrompt = generateAgentSystemPrompt({
      rubricName: params.rubricName,
      criteria: params.criteria,
      fileName: params.fileName,
      referenceDocuments: params.referenceDocuments,
      customInstructions: params.customInstructions,
      assignmentType: params.assignmentType,
      userLanguage: params.userLanguage,
    });

    // User message (student's work)
    const userMessage = `請評分以下學生作業：

${params.content}

記住：你必須使用提供的工具來完成評分流程。

**重要：最後一步你必須調用 generate_feedback 工具來生成最終評分結果！**

評分流程：
1. 使用 analyze_rubric 分析評分標準
2. 使用 parse_content 解析作業內容
3. （可選）使用 search_reference 搜尋參考資料
4. （可選）使用 check_similarity 檢查相似度
5. 逐項評分（思考每個標準的分數）
6. 使用 calculate_confidence 計算信心度
7. **最後必須使用 generate_feedback 生成最終結果**`;

    // Execute Agent with tools
    const result = await generateText({
      model,
      system: systemPrompt,
      prompt: userMessage,
      tools: agentTools,
      stopWhen: stepCountIs(params.maxSteps || 15),  // Use stopWhen instead of maxSteps
      temperature: 0.3,
      maxTokens: 8192,
      onStepFinish: ({ text, toolCalls, toolResults, usage, finishReason }: any) => {
        // Record each step
        const stepStartTime = Date.now();

        logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        logger.info(`🤖 [Agent Step ${steps.length + 1}] Started`);

        // 記錄 AI 的推理過程（如果有）
        if (text) {
          logger.info('💭 [AI Reasoning]:', {
            text: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
            fullLength: text.length,
          });
        }

        if (toolCalls && toolCalls.length > 0) {
          toolCalls.forEach((call: any, idx: number) => {
            const toolResult = toolResults?.[idx];

            logger.info(`🔧 [Tool Call] ${call.toolName}`, {
              stepNumber: steps.length + 1,
              toolName: call.toolName,
              input: call.args,
            });

            if (toolResult) {
              logger.info(`✅ [Tool Result] ${call.toolName}`, {
                success: !toolResult.error,
                result: toolResult.result,
                error: toolResult.error,
              });
            }

            const step: AgentStep = {
              stepNumber: steps.length + 1,
              toolName: call.toolName,
              toolInput: call.args,
              toolOutput: toolResult?.result,
              reasoning: text || undefined,
              durationMs: Date.now() - stepStartTime,
              timestamp: new Date(),
            };
            steps.push(step);

            logger.debug('[Agent Step]', {
              stepNumber: step.stepNumber,
              toolName: step.toolName,
              hasOutput: !!step.toolOutput,
            });
          });
        } else if (text) {
          // Pure reasoning step (no tool call)
          logger.info('🧠 [Pure Reasoning Step]', {
            stepNumber: steps.length + 1,
            reasoning: text.substring(0, 300) + (text.length > 300 ? '...' : ''),
          });

          steps.push({
            stepNumber: steps.length + 1,
            reasoning: text,
            durationMs: Date.now() - stepStartTime,
            timestamp: new Date(),
          });
        }

        logger.info('📊 [Step Summary]', {
          resultId: params.resultId,
          currentStep: steps.length,
          totalStepsSoFar: steps.length,
          finishReason,
          hasToolCalls: !!toolCalls && toolCalls.length > 0,
          toolNames: toolCalls?.map((c: any) => c.toolName) || [],
          tokensUsed: usage.totalTokens,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
        });
        logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      },
    });

    // Record success in KeyHealthTracker
    await healthTracker.recordSuccess(selectedKeyId, Date.now() - startTime);

    // Extract grading result from generate_feedback tool
    logger.info('[Agent Executor] Extracting feedback from steps', {
      resultId: params.resultId,
      totalSteps: result.steps.length,
      toolNames: result.steps.flatMap(s => s.toolCalls?.map((c: any) => c.toolName) || []),
    });

    const feedbackStep = result.steps
      .slice()
      .reverse()
      .find((step) =>
        step.toolCalls?.some((call: any) => call.toolName === 'generate_feedback')
      );

    logger.info('[Agent Executor] Found feedback step', {
      resultId: params.resultId,
      hasFeedbackStep: !!feedbackStep,
      toolResultsCount: feedbackStep?.toolResults?.length || 0,
      toolResults: feedbackStep?.toolResults?.map((r: any) => ({ toolName: r.toolName, hasResult: !!r.result })) || [],
    });

    // Extract feedback result - handle both possible structures
    let feedbackResult: any = null;
    if (feedbackStep?.toolResults) {
      for (const toolResult of feedbackStep.toolResults) {
        // TypeScript workaround: toolResults can have different structures
        const result = (toolResult as any);
        if (result.toolName === 'generate_feedback') {
          feedbackResult = result.result || result;
          break;
        }
      }
    }

    if (!feedbackResult) {
      logger.error('[Agent Executor] No generate_feedback tool call found', {
        resultId: params.resultId,
        totalSteps: result.steps.length,
        stepsWithTools: result.steps.filter(s => s.toolCalls && s.toolCalls.length > 0).length,
        allStepsDetails: result.steps.map(s => ({
          hasToolCalls: !!s.toolCalls,
          toolCallCount: s.toolCalls?.length || 0,
          hasToolResults: !!s.toolResults,
          toolResultCount: s.toolResults?.length || 0,
        })),
      });
      throw new Error('Agent did not generate final feedback using generate_feedback tool');
    }

    // Extract confidence score
    const confidenceStep = result.steps
      .slice()
      .reverse()
      .find((step) =>
        step.toolCalls?.some((call: any) => call.toolName === 'calculate_confidence')
      );

    // Extract confidence result - handle both possible structures
    let confidenceResult: any = null;
    if (confidenceStep?.toolResults) {
      for (const toolResult of confidenceStep.toolResults) {
        const result = (toolResult as any);
        if (result.toolName === 'calculate_confidence') {
          confidenceResult = result.result || result;
          break;
        }
      }
    }

    const confidenceScore: number = confidenceResult?.confidenceScore ?? 0.5;
    const requiresReview = confidenceScore < (params.confidenceThreshold || 0.7);

    // 🔍 Log the complete feedbackResult structure for debugging
    logger.info('🔍 [Agent Executor] feedbackResult structure:', {
      resultId: params.resultId,
      feedbackResult: JSON.stringify(feedbackResult, null, 2),
      hasBreakdown: !!feedbackResult?.breakdown,
      breakdownType: feedbackResult?.breakdown ? typeof feedbackResult.breakdown : 'undefined',
      breakdownIsArray: Array.isArray(feedbackResult?.breakdown),
      breakdownLength: feedbackResult?.breakdown?.length,
    });

    // Convert to standard grading format
    const gradingData = {
      breakdown: feedbackResult.breakdown,
      overallFeedback: feedbackResult.overallFeedback,
      summary: feedbackResult.summary,
    };

    const executionTimeMs = Date.now() - startTime;

    logger.info('[Agent Executor] Agent grading completed', {
      resultId: params.resultId,
      success: true,
      totalSteps: steps.length,
      confidenceScore,
      requiresReview,
      executionTimeMs,
      totalTokens: result.usage.totalTokens,
    });

    return {
      success: true,
      data: gradingData,
      steps,
      confidenceScore,
      requiresReview,
      totalTokens: result.usage.totalTokens ?? 0,
      executionTimeMs,
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;

    logger.error('[Agent Executor] Agent grading failed', {
      resultId: params.resultId,
      error: error instanceof Error ? error.message : String(error),
      steps: steps.length,
      executionTimeMs,
    });

    return {
      success: false,
      steps,
      confidenceScore: 0,
      requiresReview: true,
      totalTokens: 0,
      executionTimeMs,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if Agent grading is enabled
 */
export function isAgentGradingEnabled(): boolean {
  return process.env.USE_AGENT_GRADING === 'true';
}
