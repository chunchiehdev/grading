import { type ActionFunctionArgs } from 'react-router';
import { z } from 'zod';
import { requireAuth } from '@/services/auth.server';
import {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  togglePostLike,
  canAccessCourse,
  canModifyPost,
} from '@/services/coursePost.server';
import type { PostType } from '@/generated/prisma/client';

// Validation schemas
const CreatePostSchema = z.object({
  courseId: z.string(),
  classId: z.string().optional(),
  type: z.enum(['ANNOUNCEMENT', 'ASSIGNMENT', 'DISCUSSION', 'MATERIAL']),
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  attachments: z.array(z.object({
    fileId: z.string(),
    fileName: z.string(),
    fileSize: z.number(),
    mimeType: z.string(),
  })).optional(),
  assignmentAreaId: z.string().optional(),
  rubricId: z.string().optional(), // Direct rubric link for ASSIGNMENT posts
});

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

const GetPostsSchema = z.object({
  courseId: z.string(),
  classId: z.string().optional(),
  type: z.enum(['ANNOUNCEMENT', 'ASSIGNMENT', 'DISCUSSION', 'MATERIAL']).optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  includeArchived: z.boolean().optional(),
});

/**
 * GET /api/courses/:courseId/posts - Get posts for a course
 * POST /api/courses/:courseId/posts - Create a new post
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  const { courseId } = params;

  if (!courseId) {
    return Response.json({ success: false, error: 'Course ID is required' }, { status: 400 });
  }

  // Check access
  const hasAccess = await canAccessCourse(user.id, courseId);
  if (!hasAccess) {
    return Response.json({ success: false, error: 'Access denied' }, { status: 403 });
  }

  if (request.method === 'GET') {
    // Get posts
    const url = new URL(request.url);
    const queryParams = {
      courseId,
      classId: url.searchParams.get('classId') || undefined,
      type: url.searchParams.get('type') as PostType | undefined,
      limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined,
      offset: url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!) : undefined,
      includeArchived: url.searchParams.get('includeArchived') === 'true',
    };

    const validation = GetPostsSchema.safeParse(queryParams);
    if (!validation.success) {
      return Response.json(
        { success: false, error: 'Invalid query parameters', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const result = await getPosts(validation.data);
    return Response.json({ success: true, data: result });
  }

  if (request.method === 'POST') {
    // Create post
    const body = await request.json();
    const validation = CreatePostSchema.safeParse({ ...body, courseId });

    if (!validation.success) {
      return Response.json(
        { success: false, error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Only teachers can create ANNOUNCEMENT and ASSIGNMENT posts
    if ((validation.data.type === 'ANNOUNCEMENT' || validation.data.type === 'ASSIGNMENT') && user.role !== 'TEACHER') {
      return Response.json(
        { success: false, error: 'Only teachers can create announcements and assignments' },
        { status: 403 }
      );
    }

    const post = await createPost({
      ...validation.data,
      authorId: user.id,
      authorRole: user.role,
    });

    if (!post) {
      return Response.json({ success: false, error: 'Failed to create post' }, { status: 500 });
    }

    return Response.json({ success: true, data: post }, { status: 201 });
  }

  return Response.json({ success: false, error: 'Method not allowed' }, { status: 405 });
}

/**
 * GET /api/posts/:postId - Get a single post
 * PUT /api/posts/:postId - Update a post
 * DELETE /api/posts/:postId - Delete a post
 */
export async function postAction({ request, params }: ActionFunctionArgs) {
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

/**
 * POST /api/posts/:postId/like - Toggle like on a post
 */
export async function likeAction({ request, params }: ActionFunctionArgs) {
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
