/**
 * Agent Tools for Grading
 *
 * Defines all tools available to the grading Agent for multi-step reasoning
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  SearchReferenceInputSchema,
  CheckSimilarityInputSchema,
  CalculateConfidenceInputSchema,
  GenerateFeedbackInputSchema,
  ThinkAloudInputSchema,
} from '@/schemas/agent';
import type {
  ReferenceSearchResult,
  SimilarityCheckResult,
  ConfidenceScore,
  ReferenceDocument,
} from '@/types/agent';
import { db } from '@/lib/db.server';
import { redis } from '@/lib/redis';
import logger from '@/utils/logger';


// Tools moved to createAgentTools factory


/**
 * Tool 5: Calculate Confidence
 * 計算評分的信心度分數
 */
export const calculateConfidenceTool = tool({
  description: `計算 AI 對評分結果的信心度。

  此工具會：
  1. 評估 rubric 覆蓋率（是否所有標準都有評到）
  2. 評估證據品質（high/medium/low）
  3. 評估標準的模糊程度
  4. 綜合計算 0-1 的信心度分數
  5. 決定是否需要人工審核（< 0.7）

  使用時機：評分完成後，評估結果的可靠性。`,

  inputSchema: CalculateConfidenceInputSchema,

  execute: async ({
    rubricCoverage,
    evidenceQuality,
    criteriaAmbiguity,
  }: any): Promise<ConfidenceScore> => {
    // 證據品質分數
    const evidenceScore = ({
      high: 1.0,
      medium: 0.7,
      low: 0.4,
    } as Record<string, number>)[evidenceQuality as string];

    // 綜合信心度計算（加權平均）
    const confidenceScore =
      rubricCoverage * 0.4 + // 40% 權重
      evidenceScore * 0.4 + // 40% 權重
      (1 - criteriaAmbiguity) * 0.2; // 20% 權重

    const shouldReview = confidenceScore < 0.7;

    // 生成建議
    let reason = '';
    if (confidenceScore >= 0.85) {
      reason = '信心度極高，評分證據充分且標準明確';
    } else if (confidenceScore >= 0.7) {
      reason = '信心度良好，評分基本可靠';
    } else if (confidenceScore >= 0.5) {
      reason = '信心度中等，建議人工審核以確保準確性';
    } else {
      reason = '信心度偏低，強烈建議人工審核';
    }

    // 補充具體原因
    const issues: string[] = [];
    if (rubricCoverage < 0.9) issues.push('部分評分標準未完全涵蓋');
    if (evidenceQuality !== 'high') issues.push('證據品質不夠充分');
    if (criteriaAmbiguity > 0.3) issues.push('評分標準存在模糊性');

    if (issues.length > 0) {
      reason += `。問題：${issues.join('、')}`;
    }

    logger.debug('[Agent Tool] Confidence calculated', {
      confidenceScore,
      shouldReview,
      factors: { rubricCoverage, evidenceQuality, criteriaAmbiguity },
    });

    return {
      confidenceScore,
      shouldReview,
      reason,
      factors: {
        rubricCoverage,
        evidenceQuality,
        criteriaAmbiguity,
      },
    };
  },
});

/**
 * Tool 6: Generate Feedback
 * 生成結構化的評分反饋
 */
export const generateFeedbackTool = tool({
  description: `根據各項評分標準的分數和證據，生成結構化的評分反饋。

  ⚠️ **重要：必須提供完整的 reasoning 欄位！**
  
  reasoning 欄位必須包含你對這份作業的完整評分推理：
  - 對每個評分項目的逐項分析
  - 引用學生原文作為證據（用「」標示）
  - 解釋為什麼給這個分數
  - 指出優點和可改進之處
  
  這個推理過程會顯示給教師和學生看，讓他們理解你的評分邏輯。
  
  此工具會：
  1. 保存你的評分推理過程
  2. 彙總各項評分標準的分數
  3. 整合各項反饋
  4. 生成整體評語
  5. 計算總分

  使用時機：完成所有評分標準的評分後，生成最終結果。`,

  inputSchema: GenerateFeedbackInputSchema,

  execute: async ({ reasoning, criteriaScores, overallObservation, strengths, improvements, messageToStudent, topPriority, encouragement }) => {
    // 計算總分
    const totalScore = criteriaScores.reduce((sum: number, c: any) => sum + c.score, 0);
    const maxScore = criteriaScores.reduce((sum: number, c: any) => sum + c.maxScore, 0);
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    // 生成各項反饋 - 優先使用 analysis/justification，fallback 到 evidence
    const breakdown = criteriaScores.map((c: any) => {
      // 組合有意義的回饋：分析 > 理由 > 證據引用
      let feedback = '';
      
      if (c.analysis) {
        feedback = c.analysis;
      } else if (c.justification) {
        feedback = c.justification;
      }
      
      // 如果有證據且有分析，把證據作為補充
      if (c.evidence && feedback) {
        feedback += `\n\n**引用原文：**\n「${c.evidence}」`;
      } else if (c.evidence && !feedback) {
        // 如果只有證據，至少顯示它
        feedback = `「${c.evidence}」`;
      }
      
      return {
        criteriaId: c.criteriaId,
        name: c.name,
        score: c.score,
        feedback: feedback || '無具體回饋',
      };
    });

    // 生成整體評語
    let overallFeedback = messageToStudent || overallObservation;

    if (topPriority) {
      overallFeedback += `\n\n**優先改進：**\n${topPriority}`;
    }

    if (strengths && strengths.length > 0) {
      overallFeedback += `\n\n**優點：**\n${strengths.map((s: any) => `- ${s}`).join('\n')}`;
    }

    if (improvements && improvements.length > 0) {
      overallFeedback += `\n\n**改進建議：**\n${improvements.map((i: any) => `- ${i}`).join('\n')}`;
    }

    if (encouragement) {
      overallFeedback += `\n\n${encouragement}`;
    } else {
      // 根據得分提供鼓勵或建議 (Fallback)
      if (percentage >= 90) {
        overallFeedback += '\n\n表現優異！繼續保持！';
      } else if (percentage >= 70) {
        overallFeedback += '\n\n整體表現良好，仍有進步空間。';
      } else if (percentage >= 50) {
        overallFeedback += '\n\n表現尚可，建議加強以下方面的學習。';
      } else {
        overallFeedback += '\n\n建議重新檢視作業要求，並針對評分標準逐項改進。';
      }
    }

    logger.debug('[Agent Tool] Feedback generated', {
      totalScore,
      maxScore,
      percentage: percentage.toFixed(1),
      hasReasoning: !!reasoning,
      reasoningLength: reasoning?.length || 0,
    });

    return {
      reasoning, // 保存評分推理過程
      breakdown,
      overallFeedback: overallFeedback.trim(),
      totalScore,
      maxScore,
      percentage: Math.round(percentage),
      summary: `總分：${totalScore}/${maxScore} (${percentage.toFixed(1)}%)`,
    };
  },
});

/**
 * Tool: Evaluate Subtrait (Phase 1) - DEPRECATED/REMOVED
 * 評估單一子面向
 */
// export const evaluateSubtraitTool = ... (Removed for efficiency)

/**
 * Tool: Match to Level (Phase 2) - DEPRECATED/REMOVED
 * 對照 Rubric Level 給分
 */
// export const matchToLevelTool = ... (Removed for efficiency)


/**
 * All Agent tools collection
 */
export const createAgentTools = (context: {
  referenceDocuments?: ReferenceDocument[];
  currentContent: string;
  assignmentType?: string;
  sessionId?: string;
}) => {
  const searchReferenceTool = tool({
    description: `搜尋參考文件中與學生作業相關的內容。

  此工具會：
  1. 在參考文件中搜尋相關段落
  2. 計算相關度分數
  3. 返回最相關的前 N 個結果

  使用時機：需要根據課程講義或參考資料進行評分時。`,

    inputSchema: SearchReferenceInputSchema.omit({ referenceDocuments: true }),

    execute: async ({
      query,
      topK = 3,
    }: any): Promise<ReferenceSearchResult> => {
      const { referenceDocuments } = context;
      if (!referenceDocuments || referenceDocuments.length === 0) {
        return {
          foundReferences: [],
          totalMatches: 0,
          searchQuery: query,
        };
      }

      // 簡單的關鍵字搜尋 + TF-IDF style scoring
      const queryTerms = query
        .toLowerCase()
        .split(/\s+/)
        .filter((t: string) => t.length > 2);

      const results = referenceDocuments
        .map((doc: any) => {
          const content = doc.content.toLowerCase();
          let relevanceScore = 0;

          // 計算每個查詢詞的出現頻率
          queryTerms.forEach((term: string) => {
            const count = (content.match(new RegExp(term, 'g')) || []).length;
            relevanceScore += count;
          });

          // 正規化分數（0-1）
          relevanceScore = Math.min(relevanceScore / (queryTerms.length * 5), 1);

          // 提取摘要（包含關鍵字的段落）
          let excerpt = '';
          const firstMatch = queryTerms.find((term: string) => content.includes(term));
          if (firstMatch) {
            const index = content.indexOf(firstMatch);
            const start = Math.max(0, index - 100);
            const end = Math.min(content.length, index + 400);
            excerpt = doc.content.substring(start, end);
          } else {
            excerpt = doc.content.substring(0, 500);
          }

          return {
            fileName: doc.fileName,
            content: doc.content,
            relevanceScore,
            excerpt: excerpt.trim(),
          };
        })
        .filter((r: any) => r.relevanceScore > 0.1) // Filter out low relevance
        .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
        .slice(0, topK);

      logger.debug('[Agent Tool] Reference search completed', {
        query,
        totalDocuments: referenceDocuments.length,
        foundMatches: results.length,
      });

      return {
        foundReferences: results,
        totalMatches: results.length,
        searchQuery: query,
      };
    },
  });

  const checkSimilarityTool = tool({
    description: `檢查學生作業與歷史提交的相似度，偵測可能的抄襲。

  此工具會：
  1. 與同一作業區的歷史提交比對
  2. 計算文字相似度
  3. 標記高相似度案例

  使用時機：懷疑作業可能有抄襲時，或作為標準檢查流程。`,

    inputSchema: CheckSimilarityInputSchema.omit({ currentSubmission: true }),

    execute: async ({
      assignmentAreaId,
      threshold = 0.8,
    }: any): Promise<SimilarityCheckResult> => {
      const { currentContent: currentSubmission } = context;
      try {
        // 從資料庫取得同作業區的已評分提交（排除當前提交）
        const historicalSubmissions = await db.submission.findMany({
          where: {
            assignmentAreaId,
            status: {
              in: ['ANALYZED', 'GRADED'],
            },
          },
          select: {
            id: true,
            filePath: true,
            student: {
              select: {
                name: true,
              },
            },
          },
          take: 20, // 最多檢查 20 份
        });

        if (historicalSubmissions.length === 0) {
          return {
            hasSuspiciousSimilarity: false,
            matches: [],
            recommendation: '無歷史作業可比對',
            checked: 0,
          };
        }

        // 簡化的相似度計算（Jaccard similarity on word sets）
        const calculateSimilarity = (text1: string, text2: string): number => {
          const words1 = new Set(
            text1
              .toLowerCase()
              .split(/\s+/)
              .filter((w) => w.length > 3)
          );
          const words2 = new Set(
            text2
              .toLowerCase()
              .split(/\s+/)
              .filter((w) => w.length > 3)
          );

          const intersection = new Set([...words1].filter((w) => words2.has(w)));
          const union = new Set([...words1, ...words2]);

          return union.size > 0 ? intersection.size / union.size : 0;
        };

        const similarities = historicalSubmissions
          .map((sub: any) => ({
            submissionId: sub.id,
            studentName: sub.student.name,
            similarity: calculateSimilarity(currentSubmission, sub.filePath || ''),
          }))
          .filter((s: any) => s.similarity >= threshold)
          .sort((a: any, b: any) => b.similarity - a.similarity);

        const hasSuspiciousSimilarity = similarities.length > 0;

        let recommendation = '未發現異常相似';
        if (similarities.length > 0) {
          recommendation = `發現 ${similarities.length} 份高相似度作業（≥${(threshold * 100).toFixed(0)}%），建議人工確認是否為抄襲`;
        }

        logger.info('[Agent Tool] Similarity check completed', {
          assignmentAreaId,
          checked: historicalSubmissions.length,
          suspicious: similarities.length,
        });

        return {
          hasSuspiciousSimilarity,
          matches: similarities.slice(0, 5), // Top 5
          recommendation,
          checked: historicalSubmissions.length,
        };
      } catch (error) {
        logger.error('[Agent Tool] Similarity check failed', { error });
        return {
          hasSuspiciousSimilarity: false,
          matches: [],
          recommendation: '相似度檢查失敗',
          checked: 0,
        };
      }
    },
  });

  // Tool: Think Aloud - Hattie & Timperley Framework
  const thinkAloudTool = tool({
    description: `Analyze the submission using Hattie & Timperley's "Three Questions" framework.
    This MUST be the first step in your grading process.
    
    **FORMAT**: Use Markdown formatting with clear sections:
    
    ## Feed Up: Where am I going? (the goals)
    Analyze the learning goals and expectations for this assignment.
    
    ## Feed Back: How am I going?
    Evaluate the student's current performance with specific evidence.
    
    ## Feed Forward: Where to next?
    Identify actionable next steps for improvement.
    
    ## Strategy
    Define your grading approach based on the analysis above.
    
    Your analysis will be streamed live to the user.`,

    inputSchema: z.object({
      analysis: z.string().describe(`Complete structured analysis using the Hattie & Timperley framework. 

Use this format:

## Feed Up
[What are the learning goals?]

## Feed Back  
[How is the student performing? Use specific evidence from their work]

## Feed Forward
[What are the next steps?]

## Strategy
[Your grading approach]

Use Markdown formatting for clarity.`)
    }),

    execute: async ({ analysis }: { analysis: string }) => {
      // Stream thinking to frontend via Redis (same as thinkTool)
      if (context.sessionId && analysis) {
        try {
          await redis.publish(
            `session:${context.sessionId}`,
            JSON.stringify({
              type: 'text-delta',
              content: analysis,
            })
          );
          
          logger.info('[Agent ThinkAloud] Streaming analysis via tool', {
            analysisLength: analysis.length,
            sessionId: context.sessionId
          });
        } catch (error) {
          logger.error('[Agent ThinkAloud] Failed to publish analysis', error);
        }
      }

      return {
        acknowledged: true,
        message: 'Framework analysis recorded. Proceed to calculate confidence and generate feedback.'
      };
    },
  });

  // Tool: Think (Inspired by Anthropic's Extended Thinking)
  // This allows model to explicitly output thinking before taking action
  const thinkTool = tool({
    description: `Use this tool to think through the grading task step-by-step BEFORE calling other tools.
    
    **MANDATORY FIRST STEP**: You MUST call this tool first to analyze the submission.
    
    Your thinking should include:
    1. Initial impression of the student's work
    2. Item-by-item comparison with the Rubric
    3. Evidence from the student's text (quote specific sentences)
    4. Your reasoning for each score
    
    This thinking process will be streamed live to the user, showing your professional analysis.
    
    **After thinking, then call calculate_confidence and generate_feedback.**`,

    inputSchema: z.object({
      thought: z.string().describe('Your detailed step-by-step thinking and analysis process. Be thorough and quote evidence from the student work.')
    }),

    execute: async ({ thought }: { thought: string }) => {
      // Stream thinking to frontend via Redis
      if (context.sessionId && thought) {
        try {
          await redis.publish(
            `session:${context.sessionId}`,
            JSON.stringify({
              type: 'text-delta',
              content: thought,
            })
          );
          
          logger.info('[Agent Think] Streaming thinking via tool', {
            thoughtLength: thought.length,
            sessionId: context.sessionId
          });
        } catch (error) {
          logger.error('[Agent Think] Failed to publish thinking', error);
        }
      }

      return {
        acknowledged: true,
        message: 'Thinking process recorded. Proceed to calculate confidence and generate feedback.'
      };
    },
  });

  return {
    // think: thinkTool,  // Temporarily disabled for testing
    think_aloud: thinkAloudTool,  // Testing Hattie & Timperley framework
    search_reference: searchReferenceTool,
    check_similarity: checkSimilarityTool,
    calculate_confidence: calculateConfidenceTool,
    generate_feedback: generateFeedbackTool,
    // evaluate_subtrait: evaluateSubtraitTool, // Removed for efficiency
    // match_to_level: matchToLevelTool, // Removed for efficiency
  };
};

export type AgentToolName = keyof ReturnType<typeof createAgentTools>;
