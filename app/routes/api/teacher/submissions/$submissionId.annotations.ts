import { type ActionFunctionArgs } from 'react-router';
import { z } from 'zod';
import { requireTeacher } from '@/services/auth.server';
import {
  createSubmissionAiFeedbackComment,
  deleteSubmissionAiFeedbackComment,
  getSubmissionByIdForTeacher,
} from '@/services/submission.server';
import { markdownToPlainText } from '@/utils/markdown-plain-text';

const CreateSubmissionAnnotationSchema = z
  .object({
    targetType: z.literal('overall'),
    targetId: z.literal('overall-feedback'),
    annotationId: z.string().trim().min(1).max(255),
    quote: z.string().trim().min(1).max(5000),
    startOffset: z.number().int().min(0),
    endOffset: z.number().int().min(0),
    comment: z.string().trim().min(1).max(5000),
  })
  .refine((value) => value.endOffset > value.startOffset, {
    message: 'Annotation offsets are invalid',
    path: ['endOffset'],
  });

const DeleteSubmissionAnnotationSchema = z.object({
  annotationId: z.string().trim().min(1).max(255),
});

function getOverallFeedbackPlainText(rawAiAnalysisResult: unknown): string | null {
  if (!rawAiAnalysisResult || typeof rawAiAnalysisResult !== 'object' || Array.isArray(rawAiAnalysisResult)) {
    return null;
  }

  const overallFeedback = (rawAiAnalysisResult as { overallFeedback?: unknown }).overallFeedback;
  if (typeof overallFeedback !== 'string' || !overallFeedback.trim()) {
    return null;
  }

  return markdownToPlainText(overallFeedback);
}

function isAnnotationAlignedWithFeedback(
  overallFeedback: string,
  quote: string,
  startOffset: number,
  endOffset: number
) {
  if (startOffset < 0 || startOffset >= endOffset) {
    return false;
  }

  const normalizedFeedback = overallFeedback.replace(/\s+/g, ' ').trim();
  const normalizedQuote = quote.replace(/\s+/g, ' ').trim();

  if (!normalizedQuote) {
    return false;
  }

  return normalizedFeedback.includes(normalizedQuote);
}

export async function action({ request, params }: ActionFunctionArgs) {
  if (request.method !== 'POST' && request.method !== 'DELETE') {
    return Response.json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  const teacher = await requireTeacher(request);
  const submissionId = params.submissionId;

  if (!submissionId) {
    return Response.json({ success: false, error: 'Submission ID is required' }, { status: 400 });
  }

  try {
    const payload = await request.json();

    if (request.method === 'DELETE') {
      const parsed = DeleteSubmissionAnnotationSchema.safeParse(payload);

      if (!parsed.success) {
        return Response.json({ success: false, error: 'Invalid annotation payload' }, { status: 400 });
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

    const parsed = CreateSubmissionAnnotationSchema.safeParse(payload);

    if (!parsed.success) {
      return Response.json({ success: false, error: 'Invalid annotation payload' }, { status: 400 });
    }

    const submission = await getSubmissionByIdForTeacher(submissionId, teacher.id);
    if (!submission) {
      return Response.json({ success: false, error: 'Submission not found or unauthorized' }, { status: 404 });
    }

    const overallFeedback = getOverallFeedbackPlainText(submission.aiAnalysisResult);
    if (!overallFeedback) {
      return Response.json({ success: false, error: 'Overall feedback is not annotatable' }, { status: 400 });
    }

    if (
      !isAnnotationAlignedWithFeedback(
        overallFeedback,
        parsed.data.quote,
        parsed.data.startOffset,
        parsed.data.endOffset
      )
    ) {
      return Response.json(
        { success: false, error: 'Annotation range does not match current overall feedback' },
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
    console.error('Failed to create submission annotation:', error);
    return Response.json({ success: false, error: 'Failed to create annotation' }, { status: 500 });
  }
}
