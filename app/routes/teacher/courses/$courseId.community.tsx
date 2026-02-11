import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, useNavigate, useRevalidator } from 'react-router';
import { requireTeacher } from '@/services/auth.server';
import { getPosts } from '@/services/coursePost.server';
import { db } from '@/lib/db.server';

import { CommunitySidebar, CommunitySidebarMobileTrigger } from '@/components/course-community/CommunitySidebar';
import { CourseInfoSidebar, CourseInfoMobileTrigger } from '@/components/course-community/CourseInfoSidebar';
import { CommunityCover } from '@/components/course-community/CommunityCover';
import { CourseCommunityFeed } from '@/components/course-community/CourseCommunityFeed';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const teacher = await requireTeacher(request);
  const { courseId } = params;

  if (!courseId) {
    throw new Response('Course ID is required', { status: 400 });
  }

  // Verify teacher owns this course
  const course = await db.course.findUnique({
    where: { id: courseId, teacherId: teacher.id },
  });

  if (!course) {
    throw new Response('Course not found', { status: 404 });
  }

  // Generate proxy URL for cover image if exists
  let coverImageUrl: string | null = null;
  if (course.coverImage) {
    // Use API proxy route instead of presigned URL for browser access
    coverImageUrl = `/api/files/${encodeURIComponent(course.coverImage)}`;
  }

  // Get teacher's rubrics for the Create Post dialog
  const rubrics = await db.rubric.findMany({
    where: {
      OR: [
        { teacherId: teacher.id },
        { userId: teacher.id },
      ],
      isActive: true,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Get posts for this course
  const postsData = await getPosts({ courseId, limit: 50 });

  // Get enrollment count
  const enrollmentCount = await db.enrollment.count({
    where: {
      class: {
        courseId,
      },
    },
  });

  // Get post count
  const postCount = await db.coursePost.count({
    where: { courseId },
  });

  // Get total comment count and like count
  const commentCount = await db.coursePostComment.count({
    where: {
      post: {
        courseId,
      },
      deletedAt: null,
    },
  });

  const likeCount = await db.coursePostLike.count({
    where: {
      post: {
        courseId,
      },
    },
  });

  // Get member avatars (sample of enrolled students)
  const enrollments = await db.enrollment.findMany({
    where: {
      class: {
        courseId,
      },
    },
    include: {
      student: {
        select: {
          picture: true,
        },
      },
    },
    take: 10,
    orderBy: {
      enrolledAt: 'desc',
    },
  });

  const memberAvatars = enrollments.map((e) => e.student.picture);

  return {
    teacher,
    course,
    coverImageUrl,
    rubrics, // Changed from course.assignmentAreas
    posts: postsData,
    stats: {
      memberCount: enrollmentCount,
      postCount,
      commentCount,
      likeCount,
    },
    memberAvatars,
  };
}

export default function TeacherCourseCommunity() {
  const { teacher, course, coverImageUrl, rubrics, posts, stats, memberAvatars } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const revalidator = useRevalidator();

  const handleLike = async (postId: string) => {
    try {
      await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
      navigate('.', { replace: true });
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  const handleComment = (postId: string) => {
    // No longer navigate - modal will handle comments
    console.log('Comment button clicked for post:', postId);
  };

  const handleCommentSubmit = async (postId: string, content: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Comment submission failed');
      }
      // Return the new comment instead of refreshing
      return result.data;
    } catch (error) {
      console.error('Failed to submit comment:', error);
      throw error;
    }
  };

  const handleGradeComment = async (commentId: string) => {
    try {
      const response = await fetch(`/api/comments/${commentId}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Grading failed');
      }
      // Return the grading result instead of refreshing
      return result.data;
    } catch (error) {
      console.error('Failed to grade comment:', error);
      throw error;
    }
  };

  // Transform posts data
  const postsForDisplay = posts.posts.map((post) => ({
    ...post,
    createdAt: new Date(post.createdAt).toISOString(),
    likeCount: post._count?.likes || 0,
    commentCount: post._count?.comments || 0,
    assignmentArea: post.assignmentArea
      ? {
          id: post.assignmentArea.id,
          name: post.assignmentArea.name,
          description: post.assignmentArea.description,
          dueDate: post.assignmentArea.dueDate ? new Date(post.assignmentArea.dueDate).toISOString() : null,
        }
      : null,
    attachments: post.attachments as any,
    likes: post.likes,
    previewComments: post.comments.map((c: any) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      gradingResult: c.gradingResult ? {
        id: c.gradingResult.id,
        normalizedScore: c.gradingResult.normalizedScore,
        result: c.gradingResult.result,
        thoughtSummary: c.gradingResult.thoughtSummary,
        createdAt: c.gradingResult.createdAt.toISOString(),
      } : null,
    })),
    // Note: allComments will be fetched when modal opens
    allComments: undefined,
  }));

  const handleCoverImageChange = async (file: File | Blob) => {
    const formData = new FormData();
    // If it's a Blob (from cropping), give it a filename
    if (file instanceof Blob && !(file instanceof File)) {
      formData.append('file', file, 'cover.jpg');
    } else {
      formData.append('file', file);
    }

    const response = await fetch(`/api/courses/${course.id}/cover`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload cover image');
    }

    // Revalidate loader data to show the new cover image
    revalidator.revalidate();
  };

  const courseInfoProps = {
    course: {
      name: course.name,
      description: course.description,
      createdAt: course.createdAt.toISOString(),
    },
    stats,
    isPrivate: true,
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-white dark:bg-[#18191A]">
      {/* Left Sidebar - Navigation (hidden on mobile) */}
      <CommunitySidebar courseId={course.id} courseName={course.name} isTeacher={true} currentPath="overview" />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0">
        {/* Cover Image */}
        <CommunityCover
          courseName={course.name}
          memberCount={stats.memberCount}
          memberAvatars={memberAvatars}
          isPrivate={true}
          isTeacher={true}
          courseId={course.id}
          coverImage={coverImageUrl}
          onCoverImageChange={handleCoverImageChange}
        />

        {/* Mobile Navigation Bar */}
        <div className="flex items-center gap-2 p-3 border-b border-[#E8E4DD] dark:border-[#393A3B] md:hidden">
          <CommunitySidebarMobileTrigger
            courseId={course.id}
            courseName={course.name}
            isTeacher={true}
            currentPath="overview"
          />
          <CourseInfoMobileTrigger {...courseInfoProps} />
        </div>

        {/* Feed Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <CourseCommunityFeed
            posts={postsForDisplay}
            currentUserId={teacher.id}
            currentUserName={teacher.name}
            currentUserAvatar={teacher.picture}
            isTeacher={true}
            courseId={course.id}
            rubrics={rubrics}
            onLike={handleLike}
            onComment={handleComment}
            onCommentSubmit={handleCommentSubmit}
            onGradeComment={handleGradeComment}
          />
        </div>
      </main>

      {/* Right Sidebar - Course Info (hidden on mobile/tablet) */}
      <CourseInfoSidebar {...courseInfoProps} />
    </div>
  );
}
