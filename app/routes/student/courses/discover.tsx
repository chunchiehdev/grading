import { useRouteLoaderData, useNavigation, redirect } from 'react-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CourseDiscoveryContent } from '@/components/student/CourseDiscoveryContent';
import { PageHeader } from '@/components/ui/page-header';
import { Loader2 } from 'lucide-react';
import { getUserId } from '@/services/auth.server';
import { createEnrollmentSchema } from '@/schemas/enrollment';
import { getDiscoverableCourses, getStudentEnrolledCourseIds } from '@/services/course-discovery.server';
import type { LoaderData } from '../layout';

/**
 * Course Discovery Page - /student/courses/discover
 * Displays all discoverable courses for students to browse and enroll
 */
export default function CourseDiscoveryPage() {
  const { t } = useTranslation(['course']);
  const navigation = useNavigation();

  // Get loader data from this route
  const loaderData = useRouteLoaderData<any>('student-discover');

  // Get layout data for student info
  const parentData = useRouteLoaderData<LoaderData>('student-layout');

  if (!parentData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { student } = parentData;
  const courses = loaderData?.data?.courses || [];
  const enrolledCourseIds = new Set(courses.filter((c: any) => c.enrollmentStatus === 'enrolled').map((c: any) => c.id));

  // Memoize component props to prevent unnecessary re-renders
  const contentProps = useMemo(
    () => ({
      student,
      courses,
      enrolledCourseIds,
    }),
    [student.id, courses.length]
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t('course:discovery.title')} subtitle={t('course:discovery.subtitle')} />

      <div className="animate-in fade-in-50 duration-300">
        <CourseDiscoveryContent {...contentProps} />
      </div>

      {/* Loading indicator */}
      {navigation.state === 'loading' && (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center pointer-events-none z-40">
          <div className="bg-background border border-border rounded-lg p-4 shadow-lg">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Action - Handle POST enrollment requests
 * Processes form submissions for course enrollment
 */
export async function action({ request }: { request: Request }) {
  // Only handle POST requests
  if (request.method !== 'POST') {
    return { error: 'Method not allowed' };
  }

  // Verify user is authenticated
  const userId = await getUserId(request);
  if (!userId) {
    return redirect('/auth/login');
  }

  try {
    // Parse form data
    const formData = await request.formData();
    const classId = formData.get('classId') as string;
    const courseId = formData.get('courseId') as string;

    // Validate input
    const validation = createEnrollmentSchema.safeParse({
      classId,
      courseId,
      studentId: userId,
    });

    if (!validation.success) {
      return {
        error: 'Invalid enrollment data',
        details: validation.error.errors,
      };
    }

    // Call enrollment API
    const enrollResponse = await fetch(`${process.env.SERVER_URL || 'http://localhost:3000'}/api/enrollments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: request.headers.get('cookie') || '',
      },
      body: JSON.stringify({
        classId,
        courseId,
      }),
    });

    if (!enrollResponse.ok) {
      const errorData = await enrollResponse.json();
      return {
        error: errorData.error?.message || 'Enrollment failed',
        status: enrollResponse.status,
      };
    }

    // Success - redirect back to discovery page
    return redirect('/student/courses/discover');
  } catch (error) {
    console.error('Enrollment action error:', error);
    return {
      error: error instanceof Error ? error.message : 'Enrollment failed',
    };
  }
}

/**
 * Loader - Fetch discoverable courses and student's enrolled courses
 * Calls service functions directly instead of HTTP (for server-side execution)
 */
export async function loader({ request }: { request: Request }) {
  try {
    // Verify authentication
    const userId = await getUserId(request);
    if (!userId) {
      return redirect('/auth/login');
    }

    const url = new URL(request.url);

    // Get query parameters for filtering
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);
    const sort = (url.searchParams.get('sort') || 'newest') as 'newest' | 'teacher' | 'name';
    const search = url.searchParams.get('search') || undefined;

    // Call service functions directly (no HTTP fetch needed)
    const { courses, total, hasMore } = await getDiscoverableCourses({
      limit,
      offset,
      sort,
      search,
    });

    // Get enrolled course IDs
    const enrolledCourseIds = await getStudentEnrolledCourseIds(userId);

    // Add enrollment status to courses
    const coursesWithStatus = courses.map((course) => ({
      ...course,
      enrollmentStatus: enrolledCourseIds.has(course.id) ? 'enrolled' : ('not_enrolled' as const),
    }));

    return {
      success: true,
      data: {
        courses: coursesWithStatus,
        total,
        hasMore,
      },
      meta: {
        total,
        limit,
        offset,
        hasMore,
      },
    };
  } catch (error) {
    console.error('Error fetching discoverable courses:', error);
    return {
      success: false,
      data: {
        courses: [],
        total: 0,
        hasMore: false,
      },
      error: error instanceof Error ? error.message : 'Failed to fetch courses',
    };
  }
}
