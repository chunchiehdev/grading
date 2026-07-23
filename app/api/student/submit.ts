import { requireStudent } from '@/services/auth.server';
import { createSubmissionAndLinkGradingResult } from '@/services/submission.server';
import { createErrorResponse } from '@/types/api';
import type { FeedbackAcceptanceItem, FeedbackAcceptancePayload } from '@/types/feedback-mode';

function parseFeedbackAcceptance(value: unknown): FeedbackAcceptancePayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  if (record.mode !== 'THINKING_VISIBLE') return null;
  if (!Array.isArray(record.acceptedCriteria)) return null;

  const acceptedCriteria: FeedbackAcceptanceItem[] = record.acceptedCriteria
    .map((item): FeedbackAcceptanceItem | null => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const itemRecord = item as Record<string, unknown>;
      if (typeof itemRecord.criteriaId !== 'string' || typeof itemRecord.name !== 'string') return null;
      return {
        criteriaId: itemRecord.criteriaId,
        name: itemRecord.name,
        accepted: itemRecord.accepted === true,
      };
    })
    .filter((item): item is FeedbackAcceptanceItem => item !== null);

  return {
    mode: 'THINKING_VISIBLE',
    acceptedCriteria,
    note: typeof record.note === 'string' && record.note.trim().length > 0 ? record.note.trim() : null,
    submittedAt: typeof record.submittedAt === 'string' ? record.submittedAt : new Date().toISOString(),
  };
}

function parseJsonValue(value: FormDataEntryValue | null): unknown {
  if (typeof value !== 'string' || value.trim().length === 0) return null;

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export async function action({ request }: { request: Request }) {
  try {
    const student = await requireStudent(request);
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      const assignmentId = body.assignmentId ?? null;
      const fileToken = body.filePath ?? body.uploadedFileId ?? null;
      const sessionId = body.sessionId ?? null;
      const chatMessages = body.chatMessages ?? [];
      const feedbackAcceptance = parseFeedbackAcceptance(body.feedbackAcceptance);
      if (!assignmentId || !fileToken) {
        return Response.json(createErrorResponse('assignmentId and filePath/uploadedFileId are required'), {
          status: 400,
        });
      }
      const result = await createSubmissionAndLinkGradingResult(
        student.id,
        assignmentId,
        fileToken,
        sessionId,
        chatMessages,
        feedbackAcceptance
      );
      return Response.json({ success: true, ...result });
    } else {
      const formData = await request.formData();
      const assignmentId = (formData.get('assignmentId') as string) || null;
      const sessionId = formData.get('sessionId') as string;
      const fileToken = (formData.get('filePath') as string) || (formData.get('uploadedFileId') as string) || null;

      const chatMessagesData = parseJsonValue(formData.get('chatMessages'));
      const chatMessages = Array.isArray(chatMessagesData) ? chatMessagesData : [];
      const feedbackAcceptance = parseFeedbackAcceptance(parseJsonValue(formData.get('feedbackAcceptance')));

      if (!assignmentId || !fileToken) {
        return Response.json(createErrorResponse('assignmentId and filePath/uploadedFileId are required'), {
          status: 400,
        });
      }
      const result = await createSubmissionAndLinkGradingResult(
        student.id,
        assignmentId,
        fileToken,
        sessionId,
        chatMessages,
        feedbackAcceptance
      );
      return Response.json({ success: true, ...result });
    }
  } catch (error) {
    console.error('Failed to handle student submission:', error);

    const message = error instanceof Error ? error.message : 'Failed to submit assignment';
    if (message.startsWith('SUBMIT_GUARD:')) {
      return Response.json(createErrorResponse(message.replace('SUBMIT_GUARD:', '')), { status: 409 });
    }

    return Response.json(createErrorResponse('Failed to submit assignment'), { status: 500 });
  }
}

export async function loader() {
  return Response.json(createErrorResponse('Method Not Allowed'), { status: 405 });
}
