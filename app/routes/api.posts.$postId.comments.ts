import { type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { z } from 'zod';
import { requireAuth } from '@/services/auth.server';
import {
  createComment,
  getComments,
  updateComment,
  deleteComment,
  canAccessCourse,
  getPostById,
} from '@/services/coursePost.server';

const CreateCommentSchema = z.object({
  content: z.string().min(1),
  attachments: z.array(z.object({
    fileId: z.string(),
    fileName: z.string(),
    fileSize: z.number(),
    mimeType: z.string(),
  })).optional(),
  submissionId: z.string().optional(),
  parentCommentId: z.string().optional(),
});

/**
 * GET /api/posts/:postId/comments - Get comments for a post
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  const { postId } = params;

  if (!postId) {
    return Response.json({ success: false, error: 'Post ID is required' }, { status: 400 });
  }

  // Check if post exists and user has access
  const post = await getPostById(postId);
  if (!post) {
    return Response.json({ success: false, error: 'Post not found' }, { status: 404 });
  }

  const hasAccess = await canAccessCourse(user.id, post.courseId);
  if (!hasAccess) {
    return Response.json({ success: false, error: 'Access denied' }, { status: 403 });
  }

  // Get comments
  const url = new URL(request.url);
  const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined;
  const offset = url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!) : undefined;

  const result = await getComments(postId, { limit, offset });
  return Response.json({ success: true, data: result });
}

/**
 * POST /api/posts/:postId/comments - Create a new comment
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  const { postId } = params;

  if (!postId) {
    return Response.json({ success: false, error: 'Post ID is required' }, { status: 400 });
  }

  // Check if post exists and user has access
  const post = await getPostById(postId);
  if (!post) {
    return Response.json({ success: false, error: 'Post not found' }, { status: 404 });
  }

  const hasAccess = await canAccessCourse(user.id, post.courseId);
  if (!hasAccess) {
    return Response.json({ success: false, error: 'Access denied' }, { status: 403 });
  }

  if (request.method === 'POST') {
    // Create comment
    const body = await request.json();
    const validation = CreateCommentSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        { success: false, error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const comment = await createComment({
      postId,
      authorId: user.id,
      authorRole: user.role,
      ...validation.data,
    });

    if (!comment) {
      return Response.json({ success: false, error: 'Failed to create comment' }, { status: 500 });
    }

    return Response.json({ success: true, data: comment }, { status: 201 });
  }

  return Response.json({ success: false, error: 'Method not allowed' }, { status: 405 });
}
