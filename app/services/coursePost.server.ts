import { db } from '@/lib/db.server';
import type { PostType, UserRole } from '@/generated/prisma/client/client';

// ============================================================================
// Types
// ============================================================================

export interface CreatePostInput {
  courseId: string;
  classId?: string;
  authorId: string;
  authorRole: UserRole;
  type: PostType;
  title: string;
  content: string;
  attachments?: Array<{
    fileId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }>;
  assignmentAreaId?: string;
  rubricId?: string; // Direct rubric link for ASSIGNMENT posts
}

export interface UpdatePostInput {
  title?: string;
  content?: string;
  attachments?: Array<{
    fileId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }>;
  isPinned?: boolean;
  isArchived?: boolean;
}

export interface CreateCommentInput {
  postId: string;
  authorId: string;
  authorRole: UserRole;
  content: string;
  attachments?: Array<{
    fileId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }>;
  submissionId?: string;
  parentCommentId?: string;
}

export interface GetPostsOptions {
  courseId: string;
  classId?: string;
  type?: PostType;
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
}

// ============================================================================
// Post CRUD Operations
// ============================================================================

/**
 * Create a new course post
 */
export async function createPost(input: CreatePostInput) {
  try {
    const post = await db.coursePost.create({
      data: {
        courseId: input.courseId,
        classId: input.classId,
        authorId: input.authorId,
        authorRole: input.authorRole,
        type: input.type,
        title: input.title,
        content: input.content,
        attachments: input.attachments ? input.attachments : undefined,
        assignmentAreaId: input.assignmentAreaId,
        rubricId: input.rubricId, // Direct rubric link
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            picture: true,
            role: true,
          },
        },
        course: {
          select: {
            id: true,
            name: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        assignmentArea: {
          select: {
            id: true,
            name: true,
            dueDate: true,
          },
        },
      },
    });

    return post;
  } catch (error) {
    console.error('Failed to create post:', error);
    return null;
  }
}

/**
 * Get posts for a course/class with pagination
 */
export async function getPosts(options: GetPostsOptions) {
  try {
    const {
      courseId,
      classId,
      type,
      limit = 20,
      offset = 0,
      includeArchived = false,
    } = options;

    const where: any = {
      courseId,
      isArchived: includeArchived ? undefined : false,
    };

    if (classId) {
      // Show class-specific posts AND course-wide posts (classId = null)
      where.OR = [{ classId }, { classId: null }];
    } else {
      // Show only course-wide posts
      where.classId = null;
    }

    if (type) {
      where.type = type;
    }

    const [posts, total] = await Promise.all([
      db.coursePost.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              picture: true,
              role: true,
            },
          },
          assignmentArea: {
            select: {
              id: true,
              name: true,
              description: true,
              dueDate: true,
            },
          },
          rubric: {
            select: {
              id: true,
              name: true,
            },
          },
          comments: {
            take: 3,
            orderBy: { createdAt: 'asc' },
            where: { deletedAt: null, parentCommentId: null },
            select: {
              id: true,
              content: true,
              createdAt: true,
              isEdited: true,
              authorRole: true,
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  picture: true,
                  role: true,
                },
              },
              gradingResult: {
                select: {
                  id: true,
                  normalizedScore: true,
                  result: true,
                  thoughtSummary: true,
                  createdAt: true,
                },
              },
            },
          },
          _count: {
            select: {
              comments: { where: { deletedAt: null } },
              likes: true,
            },
          },
          likes: {
            take: 5, // Show up to 5 likers' avatars
            orderBy: { createdAt: 'desc' },
            select: {
              user: {
                select: {
                  id: true,
                  name: true,
                  picture: true,
                },
              },
            },
          },
        },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      db.coursePost.count({ where }),
    ]);

    return { posts, total };
  } catch (error) {
    console.error('Failed to get posts:', error);
    return { posts: [], total: 0 };
  }
}

/**
 * Get a single post by ID with full details
 */
export async function getPostById(postId: string) {
  try {
    const post = await db.coursePost.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            picture: true,
            role: true,
          },
        },
        course: {
          select: {
            id: true,
            name: true,
            teacherId: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        assignmentArea: {
          select: {
            id: true,
            name: true,
            description: true,
            dueDate: true,
            rubric: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return post;
  } catch (error) {
    console.error('Failed to get post:', error);
    return null;
  }
}

/**
 * Update a post
 */
export async function updatePost(postId: string, input: UpdatePostInput) {
  try {
    const post = await db.coursePost.update({
      where: { id: postId },
      data: input,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            picture: true,
            role: true,
          },
        },
      },
    });

    return post;
  } catch (error) {
    console.error('Failed to update post:', error);
    return null;
  }
}

/**
 * Delete a post
 */
export async function deletePost(postId: string) {
  try {
    await db.coursePost.delete({
      where: { id: postId },
    });
    return true;
  } catch (error) {
    console.error('Failed to delete post:', error);
    return false;
  }
}

/**
 * Toggle like on a post
 */
export async function togglePostLike(postId: string, userId: string) {
  try {
    const existing = await db.coursePostLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existing) {
      // Unlike
      await db.$transaction([
        db.coursePostLike.delete({
          where: { id: existing.id },
        }),
        db.coursePost.update({
          where: { id: postId },
          data: {
            likeCount: {
              decrement: 1,
            },
          },
        }),
      ]);
      return { liked: false };
    } else {
      // Like
      await db.$transaction([
        db.coursePostLike.create({
          data: {
            postId,
            userId,
          },
        }),
        db.coursePost.update({
          where: { id: postId },
          data: {
            likeCount: {
              increment: 1,
            },
          },
        }),
      ]);
      return { liked: true };
    }
  } catch (error) {
    console.error('Failed to toggle like:', error);
    return null;
  }
}

// ============================================================================
// Comment Operations
// ============================================================================

/**
 * Create a comment on a post
 */
export async function createComment(input: CreateCommentInput) {
  try {
    const comment = await db.$transaction(async (tx) => {
      // Create comment
      const newComment = await tx.coursePostComment.create({
        data: {
          postId: input.postId,
          authorId: input.authorId,
          authorRole: input.authorRole,
          content: input.content,
          attachments: input.attachments ? input.attachments : undefined,
          submissionId: input.submissionId,
          parentCommentId: input.parentCommentId,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              picture: true,
              role: true,
            },
          },
          submission: {
            select: {
              id: true,
              status: true,
              finalScore: true,
              normalizedScore: true,
            },
          },
        },
      });

      // Increment comment count on post
      await tx.coursePost.update({
        where: { id: input.postId },
        data: {
          commentCount: {
            increment: 1,
          },
        },
      });

      return newComment;
    });

    return comment;
  } catch (error) {
    console.error('Failed to create comment:', error);
    return null;
  }
}

/**
 * Get comments for a post
 */
export async function getComments(postId: string, options?: { limit?: number; offset?: number }) {
  try {
    const { limit = 50, offset = 0 } = options || {};

    const [comments, total] = await Promise.all([
      db.coursePostComment.findMany({
        where: {
          postId,
          isDeleted: false,
          parentCommentId: null, // Only get top-level comments
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              picture: true,
              role: true,
            },
          },
          submission: {
            select: {
              id: true,
              status: true,
              finalScore: true,
              normalizedScore: true,
              uploadedAt: true,
            },
          },
          replies: {
            where: {
              isDeleted: false,
            },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  picture: true,
                  role: true,
                },
              },
              gradingResult: {
                select: {
                  id: true,
                  normalizedScore: true,
                  result: true,
                  thoughtSummary: true,
                  createdAt: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
          _count: {
            select: {
              likes: true,
            },
          },
          gradingResult: {
            select: {
              id: true,
              normalizedScore: true,
              result: true,
              thoughtSummary: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: limit,
        skip: offset,
      }),
      db.coursePostComment.count({
        where: {
          postId,
          isDeleted: false,
          parentCommentId: null,
        },
      }),
    ]);

    return { comments, total };
  } catch (error) {
    console.error('Failed to get comments:', error);
    return { comments: [], total: 0 };
  }
}

/**
 * Update a comment
 */
export async function updateComment(
  commentId: string,
  content: string
) {
  try {
    const comment = await db.coursePostComment.update({
      where: { id: commentId },
      data: {
        content,
        isEdited: true,
        editedAt: new Date(),
      },
    });

    return comment;
  } catch (error) {
    console.error('Failed to update comment:', error);
    return null;
  }
}

/**
 * Delete a comment (soft delete)
 */
export async function deleteComment(commentId: string) {
  try {
    await db.$transaction(async (tx) => {
      // Soft delete comment
      const comment = await tx.coursePostComment.update({
        where: { id: commentId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      // Decrement comment count on post
      await tx.coursePost.update({
        where: { id: comment.postId },
        data: {
          commentCount: {
            decrement: 1,
          },
        },
      });
    });

    return true;
  } catch (error) {
    console.error('Failed to delete comment:', error);
    return false;
  }
}

/**
 * Check if user has access to course
 */
export async function canAccessCourse(userId: string, courseId: string): Promise<boolean> {
  try {
    // Check if user is teacher of the course
    const course = await db.course.findFirst({
      where: {
        id: courseId,
        teacherId: userId,
      },
    });

    if (course) return true;

    // Check if user is enrolled in any class of the course
    const enrollment = await db.enrollment.findFirst({
      where: {
        studentId: userId,
        class: {
          courseId,
        },
      },
    });

    return !!enrollment;
  } catch (error) {
    console.error('Failed to check course access:', error);
    return false;
  }
}

/**
 * Check if user can modify post (author or teacher)
 */
export async function canModifyPost(userId: string, postId: string): Promise<boolean> {
  try {
    const post = await db.coursePost.findUnique({
      where: { id: postId },
      include: {
        course: {
          select: {
            teacherId: true,
          },
        },
      },
    });

    if (!post) return false;

    // Author can modify their own post
    if (post.authorId === userId) return true;

    // Course teacher can modify any post
    if (post.course.teacherId === userId) return true;

    return false;
  } catch (error) {
    console.error('Failed to check post modification permission:', error);
    return false;
  }
}
