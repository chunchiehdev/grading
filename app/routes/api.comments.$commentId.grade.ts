import { type ActionFunctionArgs } from 'react-router';
import { requireAuth } from '@/services/auth.server';
import { gradeComment, canGradeComment, getCommentGradingResult } from '@/services/comment-grading.server';

/**
 * POST /api/comments/:commentId/grade - Grade a comment
 * GET /api/comments/:commentId/grade - Get grading result for a comment
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  const { commentId } = params;

  if (!commentId) {
    return Response.json({ success: false, error: 'Comment ID is required' }, { status: 400 });
  }

  if (request.method === 'GET') {
    // Get existing grading result
    const result = await getCommentGradingResult(commentId);
    if (!result) {
      return Response.json({ success: false, error: 'No grading result found' }, { status: 404 });
    }
    return Response.json({ success: true, data: result });
  }

  if (request.method === 'POST') {
    // Check if user can grade this comment
    const canGrade = await canGradeComment(user.id, commentId);
    if (!canGrade) {
      return Response.json(
        { success: false, error: 'Access denied. Only the course teacher can grade comments.' },
        { status: 403 }
      );
    }

    // Parse optional request body
    let rubricId: string | undefined;
    try {
      const body = await request.json();
      rubricId = body.rubricId;
    } catch {
      // No body provided, that's fine
    }

    // Grade the comment
    const result = await gradeComment(commentId, user.id, {
      rubricId,
      userLanguage: 'zh',
    });

    if (!result.success) {
      return Response.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return Response.json({ success: true, data: result });
  }

  return Response.json({ success: false, error: 'Method not allowed' }, { status: 405 });
}
