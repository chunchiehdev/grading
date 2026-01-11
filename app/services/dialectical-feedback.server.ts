/**
 * Dialectical Feedback Service
 *
 * 生成針對學生回應的動態 AI 回饋（1.5 輪對練機制）
 *
 * 設計理念：基於 Advait Sarkar 的「Productive Friction」
 * - AI 不只是揭曉預設答案，而是真正「聽到」學生的回應
 * - 針對學生的辯護給予具體回饋
 * - 促進 meta-cognition（後設認知）
 */

import { generateText, type LanguageModelUsage } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import logger from '@/utils/logger';
import { getKeyHealthTracker } from './gemini-key-health.server';
import type { SparringQuestion } from '@/types/grading';

// ============================================================================
// TYPES
// ============================================================================

export interface DialecticalFeedbackParams {
  sparringQuestion: SparringQuestion;
  studentResponse: string;
  rubricCriterionName?: string;
  /** 完整的評分維度資料（包含描述與等級） */
  rubricCriterion?: {
    description: string;
    maxScore: number;
    levels?: Array<{ score: number; description: string }>;
  };
  fullAssignmentContent?: string;  // 學生完整作業內容（避免斷章取義）
  language?: 'zh' | 'en';
}

export interface DialecticalFeedbackResult {
  success: boolean;
  feedback?: string;
  error?: string;
  provider?: 'gemini' | 'fallback';
  usage?: LanguageModelUsage;
}

// ============================================================================
// PROMPT GENERATION
// ============================================================================

function generateDialecticalPrompt(params: DialecticalFeedbackParams): string {
  const { sparringQuestion, studentResponse, rubricCriterionName, rubricCriterion, fullAssignmentContent, language = 'zh' } = params;

  // 組合完整的評分標準說明
  const rubricContextSection = rubricCriterion ? `
- 評分標準說明：${rubricCriterion.description}
- 滿分：${rubricCriterion.maxScore} 分${rubricCriterion.levels && rubricCriterion.levels.length > 0 ? `
- 評分等級：
${rubricCriterion.levels.map(l => `  * ${l.score} 分：${l.description}`).join('\n')}` : ''}` : '';

  // 如果有完整作業內容，加入 context
  const fullContentSection = fullAssignmentContent 
    ? `

## Student's Complete Assignment
<assignment>
${fullAssignmentContent}
</assignment>

Note: The student may reference other parts of their assignment in their response. Check the full text before judging.`
    : '';

  if (language === 'en') {
    return `You are a Socratic teaching assistant. A student just responded to your challenging question.

## Context
- Assessment Criterion: ${rubricCriterionName || 'General'}
- Your Original Observation: ${sparringQuestion.ai_hidden_reasoning}
- Your Question: ${sparringQuestion.question}
- The Specific Quote You Questioned: "${sparringQuestion.target_quote}"${fullContentSection}

## Student's Response
"${studentResponse}"

## Decision Protocol

First, classify the student's response into ONE of these states, then apply the corresponding strategy:

**State A: Stuck/Giving Up**
- Signs: "I don't know", "no idea", "too hard", or very short dismissive answers
- Strategy: [Scaffolding] Don't just ask them to think. Provide a concrete "before vs after" example and ask if they can feel the difference.

**State B: Off-Topic**
- Signs: The response doesn't match what you asked (${sparringQuestion.question})
- Strategy: [Gentle Redirect] Say "I noticed you mentioned X, but I was asking about Y." Give them an out: "Are these connected in your mind?" Then provide examples to lower difficulty.

**State C: Defensive**
- Signs: Student insists they're right, or blames the question/rubric
- Strategy: [Accept then Calibrate]
  1. First validate: "I see your point, and there's merit to that approach."
  2. Then calibrate: "However, under the [${rubricCriterionName}] criterion, readers might expect to see..."
  3. Give choice: Let them decide whether to adjust, don't command.

**State D: Engaged**
- Signs: Genuinely attempts to answer, explains reasoning, or proposes changes
- Strategy: [Deepen Dialogue] Give specific feedback on what's good and what could be better.

If the response shows multiple states, prioritize: B (Off-Topic) > A (Stuck) > C (Defensive) > D (Engaged)

## Output Requirements
1. Do NOT output your classification or thinking process
2. Reply directly to the student
3. Keep it warm, conversational, and supportive
4. Maximum 3-5 sentences
`;
  }

  // 中文版完整作業 section
  const fullContentSectionZh = fullAssignmentContent 
    ? `

## 學生的完整作業
<assignment>
${fullAssignmentContent}
</assignment>

注意：學生可能在回應中引用作業的其他段落。在做出判斷前，請先確認完整內容。`
    : '';

  return `你是一位蘇格拉底式的教學助理。學生剛剛回答了你的挑戰問題。

## 背景資訊
- 評分維度：${rubricCriterionName || '一般'}${rubricContextSection}
- 你原本的觀察：${sparringQuestion.ai_hidden_reasoning}
- 你問的問題：${sparringQuestion.question}
- 你質疑的特定段落：「${sparringQuestion.target_quote}」${fullContentSectionZh}

## 學生回應
「${studentResponse}」

## 對練成功指標

成功的對練**不是**讓學生「修正」作業，而是讓學生「反思」思考過程。

以下都是正面結果：
- 學生開始質疑自己原本的假設
- 學生發現自己概念中的張力或矛盾
- 學生說出「我沒想過這個」（Aporia）
- 學生主動提出新的問題

即使學生最後沒有「修正」作業，只要觸發了反思，對練就是成功的。

## 決策流程

請先在內心將學生的回應分類為以下其中一種狀態，再採取對應策略：

**狀態 E：測試/不當回應**
- 徵兆：回答明顯不合理、違反常識、或有故意挑釁的意味（如：「練習打人」、「做壞事」等）
- 策略：【不評價內容，追問動機】
  1. 不要說「很獨特」或「很個人化」
  2. 直接追問：「你說的 X 是指什麼？可以多說明一下嗎？」
  3. 如果無法給出合理解釋：「這是你的幽默嗎？那你真正想表達的是什麼？」

**狀態 F：反思覺醒 (Metacognitive Breakthrough)**
- 徵兆：學生說「我沒想過」「好像有矛盾」「讓我重新想想」「你問得我開始懷疑了」
- 策略：【肯定 + 不急著給答案】
  1. 明確肯定這是有價值的發現：「這是一個很好的覺察。」
  2. 不要急著告訴學生「正確答案」是什麼
  3. 可以說：「這種張力本身就值得探索。你現在怎麼想？」

**狀態 A：卡關/放棄**
- 徵兆：說「不知道」、「沒想法」、「太難了」，或極短敷衍的回覆
- 策略：【提供鷹架】不要只叫他想，直接給出「修改前 vs 修改後」的具體範例，問他能不能感受到差異

**狀態 B：答非所問/離題**
- 徵兆：回答的內容跟你的問題（${sparringQuestion.question}）主題不符
- 策略：【溫和糾正】明確指出：「我注意到你談的是 X，但我原本問的是 Y。」給台階下：「這兩者在你心中有關係嗎？」然後提供範例降低難度

**狀態 C：防禦/辯解**
- 徵兆：學生堅持自己沒錯，或認為是題目/評分標準的問題
- 策略：【接納並校準】
  1. 先肯定：「我理解你的想法，這樣寫確實有它的道理。」
  2. 再校準：「不過在『${rubricCriterionName || '這個評分維度'}』的標準下，閱卷者可能會期待看到...」
  3. 給選擇：讓學生決定是否調整，不要命令

**狀態 D：認真回答**
- 徵兆：正面回應問題，嘗試解釋或提出修改方向
- 策略：【深化對話】針對回答給予具體回饋，點出好在哪裡，或還有哪裡可以更好

如果學生回應包含多種狀態，按優先順序處理：E (測試) > F (反思覺醒) > B (離題) > A (卡關) > C (防禦) > D (認真)

## 輸出要求
1. 不要輸出你的分類判斷或思考過程
2. 直接輸出給學生的回覆
3. 語氣要像對話一樣自然、溫暖、有支持感
4. 長度控制在 3-5 句話以內
`;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

export async function generateDialecticalFeedback(
  params: DialecticalFeedbackParams
): Promise<DialecticalFeedbackResult> {
  const { sparringQuestion, studentResponse } = params;

  // 如果學生回應太短或明顯是垃圾輸入，給予通用回饋
  if (!studentResponse || studentResponse.trim().length < 5) {
    return {
      success: true,
      feedback: params.language === 'en'
        ? "It seems like you haven't fully engaged with the question. Would you like to think about it more carefully?"
        : '你的回應似乎還沒有完整地回答問題。要不要再想想看？',
      provider: 'fallback',
    };
  }

  // 檢測明顯的垃圾輸入（重複字元）
  const uniqueChars = new Set(studentResponse.replace(/\s/g, '')).size;
  if (uniqueChars < 3 && studentResponse.length > 10) {
    return {
      success: true,
      feedback: params.language === 'en'
        ? "Your response doesn't seem to address my question. Let me rephrase: I'm curious about your reasoning for this specific choice in your writing."
        : '你的回應似乎沒有針對我的問題。讓我換個方式問：我很好奇你在寫作時做這個選擇的原因是什麼？',
      provider: 'fallback',
    };
  }

  // 獲取 API Key
  const healthTracker = getKeyHealthTracker();
  const availableKeyIds = ['1'];
  if (process.env.GEMINI_API_KEY2) availableKeyIds.push('2');
  if (process.env.GEMINI_API_KEY3) availableKeyIds.push('3');

  const selectedKeyId = await healthTracker.selectBestKey(availableKeyIds);
  if (!selectedKeyId) {
    logger.warn('[DialecticalFeedback] All API keys throttled, using fallback');
    return {
      success: true,
      feedback: sparringQuestion.ai_hidden_reasoning,
      provider: 'fallback',
    };
  }

  const keyMap: Record<string, string | undefined> = {
    '1': process.env.GEMINI_API_KEY,
    '2': process.env.GEMINI_API_KEY2,
    '3': process.env.GEMINI_API_KEY3,
  };

  const apiKey = keyMap[selectedKeyId];
  if (!apiKey) {
    return {
      success: false,
      error: `Gemini API key ${selectedKeyId} not found`,
    };
  }

  const geminiProvider = createGoogleGenerativeAI({ apiKey });
  const startTime = Date.now();

  try {
    logger.info('[DialecticalFeedback] Generating feedback', {
      keyId: selectedKeyId,
      questionStrategy: sparringQuestion.provocation_strategy,
      responseLength: studentResponse.length,
    });

    const prompt = generateDialecticalPrompt(params);

    const result = await generateText({
      model: geminiProvider('gemini-2.5-flash'),
      prompt,
      temperature: 0.7, 
      maxOutputTokens: 8192,
    });

    const responseTimeMs = Date.now() - startTime;

    // 記錄成功
    await healthTracker.recordSuccess(selectedKeyId, responseTimeMs);

    logger.info('[DialecticalFeedback] Success', {
      keyId: selectedKeyId,
      responseTimeMs,
      outputLength: result.text.length,
      usage: result.usage,
    });

    return {
      success: true,
      feedback: result.text.trim(),
      provider: 'gemini',
      usage: result.usage,
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;

    // 記錄失敗
    await healthTracker.recordFailure(selectedKeyId, 'other', String(error));

    logger.error('[DialecticalFeedback] Failed, using fallback', {
      keyId: selectedKeyId,
      responseTimeMs,
      error: error instanceof Error ? error.message : String(error),
    });

    // Fallback: 顯示原本的 AI 推理
    return {
      success: true,
      feedback: sparringQuestion.ai_hidden_reasoning,
      provider: 'fallback',
    };
  }
}
