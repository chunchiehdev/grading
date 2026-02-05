import { type ActionFunctionArgs } from 'react-router';
import { requireAuth } from '@/services/auth.server';
import { getPostById, togglePostLike, canAccessCourse } from '@/services/coursePost.server';

/**
 * POST /api/posts/:postId/like - Toggle like on a post
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  const { postId } = params;

  if (!postId) {
    return Response.json({ success: false, error: 'Post ID is required' }, { status: 400 });
  }

  if (request.method !== 'POST') {
    return Response.json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  const post = await getPostById(postId);
  if (!post) {
    return Response.json({ success: false, error: 'Post not found' }, { status: 404 });
  }

  // Check access
  const hasAccess = await canAccessCourse(user.id, post.courseId);
  if (!hasAccess) {
    return Response.json({ success: false, error: 'Access denied' }, { status: 403 });
  }

  const result = await togglePostLike(postId, user.id);
  if (!result) {
    return Response.json({ success: false, error: 'Failed to toggle like' }, { status: 500 });
  }

  return Response.json({ success: true, data: result });
}
