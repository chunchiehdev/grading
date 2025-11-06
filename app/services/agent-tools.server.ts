/**
 * Agent Tools for Grading
 *
 * Defines all tools available to the grading Agent for multi-step reasoning
 */

import { tool } from 'ai';
import {
  AnalyzeRubricInputSchema,
  ParseContentInputSchema,
  SearchReferenceInputSchema,
  CheckSimilarityInputSchema,
  CalculateConfidenceInputSchema,
  GenerateFeedbackInputSchema,
} from '@/schemas/agent';
import type {
  RubricAnalysis,
  ContentAnalysis,
  ReferenceSearchResult,
  SimilarityCheckResult,
  ConfidenceScore,
} from '@/types/agent';
import { db } from '@/lib/db.server';
import logger from '@/utils/logger';

/**
 * Tool 1: Analyze Rubric
 * 分析評分標準並識別關鍵評分維度
 */
export const analyzeRubricTool = tool({
  description: `分析評分標準（Rubric）並識別關鍵評分維度。

  此工具會：
  1. 評估 rubric 的複雜度（簡單/中等/複雜）
  2. 計算總分
  3. 提取關鍵評分維度
  4. 建議評分方法

  使用時機：開始評分前，了解評分標準的結構。`,

  inputSchema: AnalyzeRubricInputSchema,

  execute: async ({ rubricName, criteria }): Promise<RubricAnalysis> => {
    const totalMaxScore = criteria.reduce((sum: number, c: any) => sum + c.maxScore, 0);
    const criteriaCount = criteria.length;
    
    let complexity: 'simple' | 'medium' | 'complex' = 'simple';
    if (criteriaCount > 8 || criteria.some((c: any) => c.description.length > 500)) {
      complexity = 'complex';
    } else if (criteriaCount > 4) {
      complexity = 'medium';
    }

    const keyDimensions = criteria.map((c: any) => c.name);

    let recommendedApproach = '逐項評分後匯總';
    if (complexity === 'complex') {
      recommendedApproach = '先整體理解，再逐項細評，最後交叉驗證';
    } else if (complexity === 'simple') {
      recommendedApproach = '直接逐項評分';
    }

    logger.debug('[Agent Tool] Rubric analyzed', {
      rubricName,
      complexity,
      criteriaCount,
      totalMaxScore,
    });

    return {
      complexity,
      totalMaxScore,
      keyDimensions,
      recommendedApproach,
      criteriaCount,
    };
  },
});


export const parseContentTool = tool({
  description: `解析學生作業內容並提取關鍵資訊。

  此工具會：
  1. 計算字數、字元數
  2. 檢測內容類型（程式碼、圖片、表格）
  3. 分析內容結構（章節、標題、重點）
  4. 評估內容複雜度

  使用時機：在評分前，了解學生作業的特徵。`,

  inputSchema: ParseContentInputSchema,

  execute: async ({ content, assignmentType }): Promise<ContentAnalysis> => {
    const wordCount = content.split(/\s+/).filter((w: string) => w.length > 0).length;
    const characterCount = content.length;

    // 檢測內容特徵
    const hasCode = /```[\s\S]*?```|`[^`]+`/.test(content) || assignmentType === 'code';
    const hasImages = /!\[.*?\]\(.*?\)|<img/.test(content);
    const hasTables = /\|.*\|.*\|/.test(content) || /<table/.test(content);

    // 提取結構
    const headings: string[] = [];
    const headingMatches = content.matchAll(/^#+\s+(.+)$/gm);
    for (const match of headingMatches) {
      headings.push(match[1].trim());
    }

    // 提取關鍵點（使用換行分段）
    const paragraphs = content.split(/\n\n+/).filter((p: string) => p.trim().length > 20);
    const keyPoints = paragraphs.slice(0, 5).map((p: string) => p.substring(0, 100).trim());

    // 評估複雜度
    let estimatedComplexity: 'low' | 'medium' | 'high' = 'low';
    if (wordCount > 2000 || headings.length > 5 || hasCode) {
      estimatedComplexity = 'high';
    } else if (wordCount > 500 || headings.length > 2) {
      estimatedComplexity = 'medium';
    }

    logger.debug('[Agent Tool] Content parsed', {
      wordCount,
      hasCode,
      sections: headings.length,
      estimatedComplexity,
    });

    return {
      wordCount,
      characterCount,
      hasCode,
      hasImages,
      hasTables,
      structure: {
        sections: headings.length,
        headings: headings.slice(0, 10), // Top 10
        keyPoints,
      },
      estimatedComplexity,
    };
  },
});

/**
 * Tool 3: Search Reference
 * 搜尋參考文件中的相關內容（簡化版 - 關鍵字搜尋）
 */
export const searchReferenceTool = tool({
  description: `搜尋參考文件中與學生作業相關的內容。

  此工具會：
  1. 在參考文件中搜尋相關段落
  2. 計算相關度分數
  3. 返回最相關的前 N 個結果

  使用時機：需要根據課程講義或參考資料進行評分時。`,

  inputSchema: SearchReferenceInputSchema,

  execute: async ({
    query,
    referenceDocuments,
    topK = 3,
  }: any): Promise<ReferenceSearchResult> => {
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

/**
 * Tool 4: Check Similarity
 * 檢查與歷史作業的相似度（抄襲檢測）
 */
export const checkSimilarityTool = tool({
  description: `檢查學生作業與歷史提交的相似度，偵測可能的抄襲。

  此工具會：
  1. 與同一作業區的歷史提交比對
  2. 計算文字相似度
  3. 標記高相似度案例

  使用時機：懷疑作業可能有抄襲時，或作為標準檢查流程。`,

  inputSchema: CheckSimilarityInputSchema,

  execute: async ({
    currentSubmission,
    assignmentAreaId,
    threshold = 0.8,
  }: any): Promise<SimilarityCheckResult> => {
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

  此工具會：
  1. 彙總各項評分標準的分數
  2. 整合各項反饋
  3. 生成整體評語
  4. 計算總分

  使用時機：完成所有評分標準的評分後，生成最終結果。`,

  inputSchema: GenerateFeedbackInputSchema,

  execute: async ({ criteriaScores, overallObservation, strengths, improvements }) => {
    // 計算總分
    const totalScore = criteriaScores.reduce((sum: number, c: any) => sum + c.score, 0);
    const maxScore = criteriaScores.reduce((sum: number, c: any) => sum + c.maxScore, 0);
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    // 生成各項反饋
    const breakdown = criteriaScores.map((c: any) => ({
      criteriaId: c.criteriaId,
      name: c.name,
      score: c.score,
      feedback: c.evidence,
    }));

    // 生成整體評語
    let overallFeedback = overallObservation;

    if (strengths && strengths.length > 0) {
      overallFeedback += `\n\n**優點：**\n${strengths.map((s: any) => `- ${s}`).join('\n')}`;
    }

    if (improvements && improvements.length > 0) {
      overallFeedback += `\n\n**改進建議：**\n${improvements.map((i: any) => `- ${i}`).join('\n')}`;
    }

    // 根據得分提供鼓勵或建議
    if (percentage >= 90) {
      overallFeedback += '\n\n表現優異！繼續保持！';
    } else if (percentage >= 70) {
      overallFeedback += '\n\n整體表現良好，仍有進步空間。';
    } else if (percentage >= 50) {
      overallFeedback += '\n\n表現尚可，建議加強以下方面的學習。';
    } else {
      overallFeedback += '\n\n建議重新檢視作業要求，並針對評分標準逐項改進。';
    }

    logger.debug('[Agent Tool] Feedback generated', {
      totalScore,
      maxScore,
      percentage: percentage.toFixed(1),
    });

    return {
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
 * All Agent tools collection
 */
export const agentTools = {
  analyze_rubric: analyzeRubricTool,
  parse_content: parseContentTool,
  search_reference: searchReferenceTool,
  check_similarity: checkSimilarityTool,
  calculate_confidence: calculateConfidenceTool,
  generate_feedback: generateFeedbackTool,
};

export type AgentToolName = keyof typeof agentTools;
