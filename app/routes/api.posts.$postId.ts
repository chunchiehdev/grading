import { type ActionFunctionArgs } from 'react-router';
import { z } from 'zod';
import { requireAuth } from '@/services/auth.server';
import {
  getPostById,
  updatePost,
  deletePost,
  canAccessCourse,
  canModifyPost,
} from '@/services/coursePost.server';

const UpdatePostSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  attachments: z.array(z.object({
    fileId: z.string(),
    fileName: z.string(),
    fileSize: z.number(),
    mimeType: z.string(),
  })).optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export async function action({ request, params }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  const { postId } = params;

  if (!postId) {
    return Response.json({ success: false, error: 'Post ID is required' }, { status: 400 });
  }

  const post = await getPostById(postId);
  if (!post) {
    return Response.json({ success: false, error: 'Post not found' }, { status: 404 });
  }

  // Check access to course
  const hasAccess = await canAccessCourse(user.id, post.courseId);
  if (!hasAccess) {
    return Response.json({ success: false, error: 'Access denied' }, { status: 403 });
  }

  if (request.method === 'GET') {
    // Get post detail
    return Response.json({ success: true, data: post });
  }

  if (request.method === 'PUT') {
    // Update post - only author or teacher can update
    const canModify = await canModifyPost(user.id, postId);
    if (!canModify) {
      return Response.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const validation = UpdatePostSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        { success: false, error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updatePost(postId, validation.data);
    if (!updated) {
      return Response.json({ success: false, error: 'Failed to update post' }, { status: 500 });
    }

    return Response.json({ success: true, data: updated });
  }

  if (request.method === 'DELETE') {
    // Delete post - only author or teacher can delete
    const canModify = await canModifyPost(user.id, postId);
    if (!canModify) {
      return Response.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const success = await deletePost(postId);
    if (!success) {
      return Response.json({ success: false, error: 'Failed to delete post' }, { status: 500 });
    }

    return Response.json({ success: true });
  }

  return Response.json({ success: false, error: 'Method not allowed' }, { status: 405 });
}
