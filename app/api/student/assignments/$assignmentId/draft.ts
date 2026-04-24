import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { requireStudent } from '@/services/auth.server';
import { getDraftSubmission, saveDraftSubmission } from '@/services/submission.server';
import { createErrorResponse } from '@/types/api';
import { db } from '@/lib/db.server';
import logger from '@/utils/logger';
import { normalizeDraftPhase, parseDraftUiState } from '@/utils/draft-ui-state';

/**
 * GET /api/student/assignments/[assignmentId]/draft
 * Retrieves existing draft submission data for the student
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    const student = await requireStudent(request);
    const { assignmentId } = params;

    if (!assignmentId) {
      return Response.json(createErrorResponse('Assignment ID is required'), { status: 400 });
    }

    const draftSubmission = await getDraftSubmission(assignmentId, student.id);

    return Response.json({
      success: true,
      data: draftSubmission,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to get draft submission:');
    return Response.json(createErrorResponse('Failed to get draft submission'), { status: 500 });
  }
}

/**
 * POST /api/student/assignments/[assignmentId]/draft
 * Saves/updates draft submission data
 *
 * DELETE /api/student/assignments/[assignmentId]/draft
 * Deletes draft submission (DRAFT status only)
 */
export async function action({ request, params }: ActionFunctionArgs) {
  try {
    const student = await requireStudent(request);
    const { assignmentId } = params;

    if (!assignmentId) {
      return Response.json(createErrorResponse('Assignment ID is required'), { status: 400 });
    }

    // Handle DELETE request - clear draft submission
    if (request.method === 'DELETE') {
      try {
        const submission = await db.submission.findFirst({
          where: {
            assignmentAreaId: assignmentId,
            studentId: student.id,
            status: 'DRAFT', // Only delete DRAFT submissions
          },
        });

        if (submission) {
          await db.submission.delete({
            where: { id: submission.id },
          });
          logger.info({ data: submission.id }, 'Deleted draft submission:');
        }

        return Response.json({ success: true });
      } catch (error) {
        logger.error({ err: error }, 'Failed to delete draft submission:');
        return Response.json(createErrorResponse('Failed to delete draft submission'), { status: 500 });
      }
    }

    // Handle POST request - save/update draft
    const contentType = request.headers.get('content-type') || '';
    let body: Record<string, unknown>;

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());

      // Parse JSON fields if they exist
      if (body.fileMetadata && typeof body.fileMetadata === 'string') {
        try {
          body.fileMetadata = JSON.parse(body.fileMetadata);
        } catch (e) {
          logger.warn({ err: e }, 'Could not parse fileMetadata JSON:');
        }
      }
      if (body.aiAnalysisResult && typeof body.aiAnalysisResult === 'string') {
        try {
          body.aiAnalysisResult = JSON.parse(body.aiAnalysisResult);
        } catch (e) {
          logger.warn({ err: e }, 'Could not parse aiAnalysisResult JSON:');
        }
      }
      if (body.draftUiState && typeof body.draftUiState === 'string') {
        try {
          body.draftUiState = JSON.parse(body.draftUiState);
        } catch (e) {
          logger.warn({ err: e }, 'Could not parse draftUiState JSON:');
        }
      }
    }

    const draftData = {
      assignmentAreaId: assignmentId,
      studentId: student.id,
      fileMetadata: body.fileMetadata || null,
      sessionId: body.sessionId || null,
      aiAnalysisResult: body.aiAnalysisResult || null,
      draftUiState: parseDraftUiState(body.draftUiState) || null,
      thoughtSummary: body.thoughtSummary ?? null,
      thinkingProcess: body.thinkingProcess ?? null,
      gradingRationale: body.gradingRationale ?? null,
      lastState: normalizeDraftPhase(body.lastState),
    };

    const savedDraft = await saveDraftSubmission(draftData);

    if (!savedDraft) {
      return Response.json(createErrorResponse('Could not save draft submission'), { status: 500 });
    }

    return Response.json({
      success: true,
      data: savedDraft,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to save draft submission:');
    return Response.json(createErrorResponse('Failed to save draft submission'), { status: 500 });
  }
}
