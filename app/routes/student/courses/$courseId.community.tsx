import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, useNavigate } from 'react-router';
import { requireStudent } from '@/services/auth.server';
import { getPosts } from '@/services/coursePost.server';
import { db } from '@/lib/db.server';

import { CourseInfoSidebar, CourseInfoMobileTrigger } from '@/components/course-community/CourseInfoSidebar';
import { CommunityCover } from '@/components/course-community/CommunityCover';
import { CourseCommunityFeed } from '@/components/course-community/CourseCommunityFeed';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const student = await requireStudent(request);
  const { courseId } = params;

  if (!courseId) {
    throw new Response('Course ID is required', { status: 400 });
  }

  // Verify student is enrolled in this course
  const enrollment = await db.enrollment.findFirst({
    where: {
      studentId: student.id,
      class: {
        courseId,
      },
    },
    include: {
      class: {
        include: {
          course: {
            include: {
              teacher: {
                select: {
                  id: true,
                  name: true,
                  picture: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!enrollment) {
    throw new Response('Course not found or you are not enrolled', { status: 404 });
  }

  const course = enrollment.class.course;

  // Generate proxy URL for cover image if exists
  let coverImageUrl: string | null = null;
  if (course.coverImage) {
    // Use API proxy route instead of presigned URL for browser access
    coverImageUrl = `/api/files/${encodeURIComponent(course.coverImage)}`;
  }

  // Get posts for this course (show class-specific and course-wide posts)
  const postsData = await getPosts({
    courseId,
    classId: enrollment.classId,
    limit: 50,
  });

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
    student,
    course,
    coverImageUrl,
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

export default function StudentCourseCommunity() {
  const { student, course, coverImageUrl, posts, stats, memberAvatars } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const handleLike = async (postId: string) => {
    try {
      await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
      navigate('.', { replace: true });
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  const handleComment = (postId: string) => {
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
    previewComments: post.comments.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    })),
    allComments: undefined,
  }));

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
    <div className="min-h-screen bg-white dark:bg-[#18191A]">
      <div className="flex flex-col lg:flex-row">
        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {/* Cover Image */}
          <CommunityCover
            courseName={course.name}
            memberCount={stats.memberCount}
            memberAvatars={memberAvatars}
            isPrivate={true}
            isTeacher={false}
            courseId={course.id}
            coverImage={coverImageUrl}
          />

          {/* Mobile Navigation Bar */}
          <div className="flex items-center gap-2 p-3 border-b border-[#E8E4DD] dark:border-[#393A3B] lg:hidden">
            <CourseInfoMobileTrigger {...courseInfoProps} />
          </div>

          {/* Feed Content */}
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
            <CourseCommunityFeed
              posts={postsForDisplay}
              currentUserId={student.id}
              currentUserName={student.name}
              currentUserAvatar={student.picture}
              isTeacher={false}
              courseId={course.id}
              onLike={handleLike}
              onComment={handleComment}
              onCommentSubmit={handleCommentSubmit}
            />
          </div>
        </main>

        {/* Right Sidebar - Course Info (hidden on mobile/tablet) */}
        <CourseInfoSidebar {...courseInfoProps} />
      </div>
    </div>
  );
}
