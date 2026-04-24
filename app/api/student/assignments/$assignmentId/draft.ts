import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { requireStudent } from '@/services/auth.server';
import { getDraftSubmission, saveDraftSubmission } from '@/services/submission.server';
import { createErrorResponse } from '@/types/api';
import { db } from '@/lib/db.server';
import logger from '@/utils/logger';
import { normalizeDraftPhase, parseDraftUiState } from '@/utils/draft-ui-state';

function parseNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function parseFileMetadata(value: unknown): {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
} | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.fileId !== 'string' ||
    typeof candidate.fileName !== 'string' ||
    typeof candidate.fileSize !== 'number'
  ) {
    return null;
  }

  return {
    fileId: candidate.fileId,
    fileName: candidate.fileName,
    fileSize: candidate.fileSize,
    mimeType: typeof candidate.mimeType === 'string' ? candidate.mimeType : 'application/octet-stream',
  };
}

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

    if (contentType.includes('application/json') || contentType.includes('text/plain')) {
      body = await request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      body = Object.fromEntries((await request.formData()).entries());
      if (body.payload && typeof body.payload === 'string') {
        try {
          const parsedPayload = JSON.parse(body.payload);
          if (parsedPayload && typeof parsedPayload === 'object' && !Array.isArray(parsedPayload)) {
            body = parsedPayload as Record<string, unknown>;
          }
        } catch (e) {
          logger.warn({ err: e }, 'Could not parse draft beacon payload JSON:');
        }
      }
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
      fileMetadata: parseFileMetadata(body.fileMetadata),
      sessionId: parseNullableString(body.sessionId),
      aiAnalysisResult: body.aiAnalysisResult ?? null,
      draftUiState: parseDraftUiState(body.draftUiState) || null,
      thoughtSummary: parseNullableString(body.thoughtSummary),
      thinkingProcess: parseNullableString(body.thinkingProcess),
      gradingRationale: parseNullableString(body.gradingRationale),
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
