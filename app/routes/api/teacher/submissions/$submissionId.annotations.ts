import { type ActionFunctionArgs } from 'react-router';
import { z } from 'zod';
import { requireTeacher } from '@/services/auth.server';
import {
  createSubmissionAiFeedbackComment,
  deleteSubmissionAiFeedbackComment,
  updateSubmissionAiFeedbackComment,
  getSubmissionByIdForTeacher,
} from '@/services/submission.server';
import { markdownToPlainText } from '@/utils/markdown-plain-text';
import { db } from '@/lib/db.server';

const CreateAnnotationSchema = z
  .object({
    targetType: z.enum(['overall', 'submission']),
    targetId: z.string().trim().min(1).max(255),
    annotationId: z.string().trim().min(1).max(255),
    quote: z.string().trim().min(1).max(5000),
    startOffset: z.number().int().min(0),
    endOffset: z.number().int().min(0),
    comment: z.string().trim().min(1).max(5000),
  })
  .refine((v) => v.endOffset > v.startOffset, {
    message: 'Annotation offsets are invalid',
    path: ['endOffset'],
  });

const UpdateAnnotationSchema = z.object({
  annotationId: z.string().trim().min(1).max(255),
  comment: z.string().trim().min(1).max(5000),
});

const DeleteAnnotationSchema = z.object({
  annotationId: z.string().trim().min(1).max(255),
});

function getOverallFeedbackPlainText(rawAiAnalysisResult: unknown): string | null {
  if (!rawAiAnalysisResult || typeof rawAiAnalysisResult !== 'object' || Array.isArray(rawAiAnalysisResult)) {
    return null;
  }
  const overallFeedback = (rawAiAnalysisResult as { overallFeedback?: unknown }).overallFeedback;
  if (typeof overallFeedback !== 'string' || !overallFeedback.trim()) return null;
  return markdownToPlainText(overallFeedback);
}

function normalizeAnnotationText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function isAnnotationAlignedWithText(
  sourceText: string,
  quote: string,
  startOffset: number,
  endOffset: number
): boolean {
  if (startOffset < 0 || startOffset >= endOffset) return false;
  if (endOffset > sourceText.length) return false;

  const normalizedQuote = normalizeAnnotationText(quote);
  if (!normalizedQuote) return false;

  const textAtOffset = normalizeAnnotationText(sourceText.slice(startOffset, endOffset));
  if (textAtOffset === normalizedQuote) return true;

  const nearbyText = normalizeAnnotationText(sourceText.slice(Math.max(0, startOffset - 20), endOffset + 20));
  return nearbyText.includes(normalizedQuote);
}

async function resolveSourceText(
  targetType: string,
  submission: { aiAnalysisResult: unknown; filePath: string | null }
): Promise<{ text: string | null; error?: string }> {
  if (targetType === 'overall') {
    const text = getOverallFeedbackPlainText(submission.aiAnalysisResult);
    return text ? { text } : { text: null, error: 'Overall feedback is not annotatable' };
  }

  if (targetType === 'submission') {
    if (!submission.filePath) return { text: null, error: 'No file attached to this submission' };

    const uploadedFile = await db.uploadedFile.findUnique({
      where: { id: submission.filePath },
      select: { parsedContent: true, parseStatus: true },
    });

    if (uploadedFile?.parseStatus !== 'COMPLETED' || !uploadedFile.parsedContent) {
      return { text: null, error: 'Submission text is not available for annotation' };
    }

    return { text: uploadedFile.parsedContent };
  }

  return { text: null, error: 'Unknown target type' };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const allowed = ['POST', 'PATCH', 'DELETE'];
  if (!allowed.includes(request.method)) {
    return Response.json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  const teacher = await requireTeacher(request);
  const submissionId = params.submissionId;

  if (!submissionId) {
    return Response.json({ success: false, error: 'Submission ID is required' }, { status: 400 });
  }

  try {
    const payload = await request.json();

    // DELETE
    if (request.method === 'DELETE') {
      const parsed = DeleteAnnotationSchema.safeParse(payload);
      if (!parsed.success) {
        return Response.json({ success: false, error: 'Invalid payload' }, { status: 400 });
      }

      const submission = await getSubmissionByIdForTeacher(submissionId, teacher.id);
      if (!submission) {
        return Response.json({ success: false, error: 'Submission not found or unauthorized' }, { status: 404 });
      }

      const deleted = await deleteSubmissionAiFeedbackComment(submissionId, teacher.id, parsed.data.annotationId);
      if (!deleted) {
        return Response.json({ success: false, error: 'Annotation not found' }, { status: 404 });
      }

      return Response.json({ success: true });
    }

    // PATCH (edit comment text only)
    if (request.method === 'PATCH') {
      const parsed = UpdateAnnotationSchema.safeParse(payload);
      if (!parsed.success) {
        return Response.json({ success: false, error: 'Invalid payload' }, { status: 400 });
      }

      const submission = await getSubmissionByIdForTeacher(submissionId, teacher.id);
      if (!submission) {
        return Response.json({ success: false, error: 'Submission not found or unauthorized' }, { status: 404 });
      }

      const updated = await updateSubmissionAiFeedbackComment(
        submissionId,
        teacher.id,
        parsed.data.annotationId,
        parsed.data.comment
      );

      if (!updated) {
        return Response.json({ success: false, error: 'Annotation not found' }, { status: 404 });
      }

      return Response.json({
        success: true,
        data: {
          id: updated.id,
          annotationId: updated.annotationId,
          submissionId: updated.submissionId,
          teacherId: updated.teacherId,
          teacherName: updated.teacher.name,
          targetType: updated.targetType,
          targetId: updated.targetId,
          quote: updated.quote,
          startOffset: updated.startOffset,
          endOffset: updated.endOffset,
          comment: updated.comment,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      });
    }

    // POST (create)
    const parsed = CreateAnnotationSchema.safeParse(payload);
    if (!parsed.success) {
      return Response.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const submission = await getSubmissionByIdForTeacher(submissionId, teacher.id);
    if (!submission) {
      return Response.json({ success: false, error: 'Submission not found or unauthorized' }, { status: 404 });
    }

    const { text: sourceText, error: sourceError } = await resolveSourceText(parsed.data.targetType, submission);
    if (!sourceText) {
      return Response.json({ success: false, error: sourceError ?? 'Annotation target unavailable' }, { status: 400 });
    }

    if (!isAnnotationAlignedWithText(sourceText, parsed.data.quote, parsed.data.startOffset, parsed.data.endOffset)) {
      return Response.json(
        { success: false, error: 'Annotation range does not match current content' },
        { status: 400 }
      );
    }

    const comment = await createSubmissionAiFeedbackComment(submissionId, teacher.id, parsed.data);
    if (!comment) {
      return Response.json({ success: false, error: 'Submission not found or unauthorized' }, { status: 404 });
    }

    return Response.json({
      success: true,
      data: {
        id: comment.id,
        annotationId: comment.annotationId,
        submissionId: comment.submissionId,
        teacherId: comment.teacherId,
        teacherName: comment.teacher.name,
        targetType: comment.targetType,
        targetId: comment.targetId,
        quote: comment.quote,
        startOffset: comment.startOffset,
        endOffset: comment.endOffset,
        comment: comment.comment,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to handle annotation request:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
