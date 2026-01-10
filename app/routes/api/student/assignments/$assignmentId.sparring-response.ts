import { type ActionFunctionArgs, data } from 'react-router';
import { requireStudent } from '@/services/auth.server';
import { db } from '@/lib/db.server';
import logger from '@/utils/logger';
import { generateDialecticalFeedback } from '@/services/dialectical-feedback.server';
import { checkAIAccess } from '@/services/ai-access.server';
import type { SparringQuestion } from '@/types/grading';

export const action = async ({ request, params }: ActionFunctionArgs) => {
  if (request.method !== 'POST') {
    return data({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const student = await requireStudent(request);
    const { assignmentId } = params;

    // Check AI access permission
    const aiAccess = await checkAIAccess(student.id);
    if (!aiAccess.allowed) {
      logger.warn('[SparringResponse] AI access denied', { studentId: student.id, reason: aiAccess.reason });
      return data({ error: aiAccess.reason || 'AI access denied' }, { status: 403 });
    }

    if (!assignmentId) {
      return data({ error: 'Assignment ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { 
      sessionId, 
      questionIndex, 
      questionId, 
      strategy, 
      response, 
      respondedAt,
      // 新增：用於生成辯證回饋
      sparringQuestion,
      rubricCriterionName,
      // 新增：學生選擇（第二次呼叫時）
      studentDecision,
      decisionAt,
    } = body;

    // 驗證基本欄位 - sessionId 是 optional，我們可以用 assignmentId + studentId 找 submission
    if (questionIndex === undefined) {
      return data({ error: 'Missing required fields: questionIndex' }, { status: 400 });
    }

    // Find the submission (draft or submitted) for this assignment and student
    const submission = await db.submission.findFirst({
      where: {
        assignmentAreaId: assignmentId,
        studentId: student.id,
        isLatest: true,
        isDeleted: false,
      },
    });

    if (!submission) {
      return data({ error: 'No submission found' }, { status: 404 });
    }

    // 取得學生完整作業內容（避免 AI 斷章取義）
    // filePath 存的是 UploadedFile 的 ID
    let fullAssignmentContent: string | undefined;
    if (submission.filePath) {
      const uploadedFile = await db.uploadedFile.findUnique({
        where: { id: submission.filePath },
        select: { parsedContent: true },
      });
      fullAssignmentContent = uploadedFile?.parsedContent || undefined;
    }

    // Get existing sparring responses or initialize empty array
    const existingResponses = (submission.aiAnalysisResult as any)?.sparringResponses || [];

    // 找到現有的回應（如果有）
    const existingIdx = existingResponses.findIndex(
      (r: any) => r.questionIndex === questionIndex
    );

    // ============================================================
    // 情況 1：學生提交回應 → 生成辯證回饋
    // ============================================================
    if (response && sparringQuestion) {
      let dialecticalFeedback: string | undefined;

      // 呼叫 AI 生成辯證回饋
      try {
        const feedbackResult = await generateDialecticalFeedback({
          sparringQuestion: sparringQuestion as SparringQuestion,
          studentResponse: response,
          rubricCriterionName,
          fullAssignmentContent,  // 傳入完整作業內容，避免 AI 斷章取義
          language: 'zh',
        });

        if (feedbackResult.success && feedbackResult.feedback) {
          dialecticalFeedback = feedbackResult.feedback;

          // Record token usage (Feature: Sparring Token Tracking)
          // Prefer sessionId from request body, fallback to submission record
          const targetSessionId = sessionId || submission.sessionId;
          
          if (feedbackResult.usage && targetSessionId) {
            try {
              // submission.filePath stores the UploadedFile ID
              // Find existing record first, then update (handles NULL as 0)
              const existingResult = await db.gradingResult.findFirst({
                where: { 
                  gradingSessionId: targetSessionId,
                  uploadedFileId: submission.filePath 
                },
                select: { id: true, sparringTokens: true }
              });

              if (existingResult) {
                const currentTokens = existingResult.sparringTokens ?? 0;
                const newTokens = currentTokens + (feedbackResult.usage.totalTokens || 0);
                
                await db.gradingResult.update({
                  where: { id: existingResult.id },
                  data: { sparringTokens: newTokens }
                });
              }
              logger.debug(`[SparringResponse] Updated tokens for session ${targetSessionId}: +${feedbackResult.usage.totalTokens}`);
            } catch (tokenError) {
              logger.error('[SparringResponse] Failed to update token usage', tokenError);
            }
          }
        }

        logger.info(`[SparringResponse] Generated dialectical feedback`, {
          submissionId: submission.id,
          questionIndex,
          provider: feedbackResult.provider,
          feedbackLength: dialecticalFeedback?.length || 0,
        });
      } catch (error) {
        logger.error('[SparringResponse] Failed to generate dialectical feedback', error);
        // Fallback: 使用原本的 AI 推理
        dialecticalFeedback = (sparringQuestion as SparringQuestion).ai_hidden_reasoning;
      }

      // 建立或更新回應資料
      const responseData = {
        questionIndex,
        questionId,
        strategy,
        response,
        respondedAt,
        dialecticalFeedback,
      };

      if (existingIdx >= 0) {
        existingResponses[existingIdx] = {
          ...existingResponses[existingIdx],
          ...responseData,
        };
      } else {
        existingResponses.push(responseData);
      }

      // 更新資料庫
      const currentResult = (submission.aiAnalysisResult as any) || {};
      await db.submission.update({
        where: { id: submission.id },
        data: {
          aiAnalysisResult: {
            ...currentResult,
            sparringResponses: existingResponses,
          },
        },
      });

      logger.info(`[SparringResponse] Saved response for question ${questionIndex}`, {
        submissionId: submission.id,
        questionId,
        strategy,
        responseLength: response.length,
        hasDialecticalFeedback: !!dialecticalFeedback,
      });

      return data({ 
        success: true,
        dialecticalFeedback,
      });
    }

    // ============================================================
    // 情況 2：學生做出選擇（同意/不同意）
    // ============================================================
    if (studentDecision && existingIdx >= 0) {
      existingResponses[existingIdx] = {
        ...existingResponses[existingIdx],
        studentDecision,
        decisionAt,
      };

      // 更新資料庫
      const currentResult = (submission.aiAnalysisResult as any) || {};
      await db.submission.update({
        where: { id: submission.id },
        data: {
          aiAnalysisResult: {
            ...currentResult,
            sparringResponses: existingResponses,
          },
        },
      });

      logger.info(`[SparringResponse] Saved student decision for question ${questionIndex}`, {
        submissionId: submission.id,
        questionIndex,
        studentDecision,
      });

      return data({ success: true });
    }

    return data({ error: 'Invalid request: missing response or decision' }, { status: 400 });
  } catch (error) {
    logger.error('Failed to save sparring response', error);
    return data({ error: 'Failed to save response' }, { status: 500 });
  }
};
