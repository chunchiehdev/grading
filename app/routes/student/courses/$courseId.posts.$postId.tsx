import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, useNavigate } from 'react-router';
import { requireAuth } from '@/services/auth.server';
import { getPostById, getComments, canAccessCourse } from '@/services/coursePost.server';
import { CoursePostCard } from '@/components/course-community/CoursePostCard';
import { CommentSection } from '@/components/course-community/CommentSection';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  const { courseId, postId } = params;

  if (!courseId || !postId) {
    throw new Response('Invalid parameters', { status: 400 });
  }

  const post = await getPostById(postId);
  if (!post) {
    throw new Response('Post not found', { status: 404 });
  }

  // Verify access
  const hasAccess = await canAccessCourse(user.id, courseId);
  if (!hasAccess) {
    throw new Response('Access denied', { status: 403 });
  }

  // Get comments
  const commentsData = await getComments(postId);

  return {
    user,
    post,
    comments: commentsData.comments,
    courseId,
  };
}

export default function PostDetailPage() {
  const { user, post, comments, courseId } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const handleLike = async (postId: string) => {
    try {
      await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
      navigate('.', { replace: true });
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  // Transform post data
  const postForDisplay = {
    ...post,
    createdAt: new Date(post.createdAt).toISOString(),
    likeCount: post.likeCount || 0,
    commentCount: post.commentCount || 0,
    assignmentArea: post.assignmentArea
      ? {
          id: post.assignmentArea.id,
          name: post.assignmentArea.name,
          description: post.assignmentArea.description,
          dueDate: post.assignmentArea.dueDate ? new Date(post.assignmentArea.dueDate).toISOString() : null,
        }
      : null,
    attachments: post.attachments as any,
  };

  // Transform comments data
  const commentsForDisplay = comments.map((comment) => ({
    ...comment,
    createdAt: new Date(comment.createdAt).toISOString(),
    gradingResult: comment.gradingResult
      ? {
          ...comment.gradingResult,
          result: comment.gradingResult.result as any,
          createdAt: new Date(comment.gradingResult.createdAt).toISOString(),
        }
      : null,
    replies: comment.replies?.map((reply) => ({
      ...reply,
      createdAt: new Date(reply.createdAt).toISOString(),
      gradingResult: reply.gradingResult
        ? {
            ...reply.gradingResult,
            result: reply.gradingResult.result as any,
            createdAt: new Date(reply.gradingResult.createdAt).toISOString(),
          }
        : null,
    })),
  }));

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Post */}
      <div className="mb-8">
        <CoursePostCard
          post={postForDisplay}
          currentUserId={user.id}
          currentUserName={user.name}
          currentUserAvatar={user.picture}
          onLike={handleLike}
        />
      </div>

      {/* Comments */}
      <CommentSection
        postId={post.id}
        comments={commentsForDisplay}
        currentUserId={user.id}
        currentUserRole={user.role}
      />
    </div>
  );
}
