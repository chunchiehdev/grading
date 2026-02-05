import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, useNavigate } from 'react-router';
import { requireTeacher } from '@/services/auth.server';
import { getPostById, getComments } from '@/services/coursePost.server';
import { db } from '@/lib/db.server';
import { CoursePostCard } from '@/components/course-community/CoursePostCard';
import { CommentSection } from '@/components/course-community/CommentSection';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const teacher = await requireTeacher(request);
  const { courseId, postId } = params;

  if (!courseId || !postId) {
    throw new Response('Invalid parameters', { status: 400 });
  }

  // Verify teacher owns this course
  const course = await db.course.findUnique({
    where: { id: courseId, teacherId: teacher.id },
  });

  if (!course) {
    throw new Response('Course not found', { status: 404 });
  }

  const post = await getPostById(postId);
  if (!post) {
    throw new Response('Post not found', { status: 404 });
  }

  // Get comments
  const commentsData = await getComments(postId);

  return {
    teacher,
    post,
    comments: commentsData.comments,
    courseId,
  };
}

export default function TeacherPostDetailPage() {
  const { teacher, post, comments, courseId } = useLoaderData<typeof loader>();
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

  const handleGradeComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}/grade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (data.success) {
        navigate('.', { replace: true });
      } else {
        console.error('Grading failed:', data.error);
      }
    } catch (error) {
      console.error('Failed to grade comment:', error);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Post */}
      <div className="mb-8">
        <CoursePostCard
          post={postForDisplay}
          currentUserId={teacher.id}
          currentUserName={teacher.name}
          currentUserAvatar={teacher.picture}
          onLike={handleLike}
        />
      </div>

      {/* Comments */}
      <CommentSection
        postId={post.id}
        comments={commentsForDisplay}
        currentUserId={teacher.id}
        currentUserRole={teacher.role}
        onGradeComment={handleGradeComment}
      />
    </div>
  );
}
