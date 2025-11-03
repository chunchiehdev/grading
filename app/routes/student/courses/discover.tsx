import { useLoaderData, redirect, useFetcher, useSearchParams } from 'react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CourseDiscoveryContent } from '@/components/student/CourseDiscoveryContent';
import { CourseSearchModal } from '@/components/discover/CourseSearchModal';
import { InvitationCodeModal } from '@/components/discover/InvitationCodeModal';
import { SearchErrorBoundary } from '@/components/discover/SearchErrorBoundary';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Ticket, Grid3x3, List } from 'lucide-react';
import { getUserId } from '@/services/auth.server';
import { createEnrollmentSchema } from '@/schemas/enrollment';
import { getDiscoverableCourses, getStudentEnrolledCourseIds } from '@/services/course-discovery.server';
import type { DiscoveryResponse, DiscoverableCourse } from '@/types/course';

interface DiscoverLoaderData {
  success: boolean;
  student: { id: string; email: string; role: string; name: string };
  data: {
    courses: DiscoverableCourse[];
    total: number;
    hasMore: boolean;
  };
  error?: string;
}

/**
 * Course Discovery Page - /student/courses/discover
 * Independent page for browsing and enrolling in courses
 * Has its own loader to avoid impacting other tabs' performance
 * Includes search filtering via URL parameters and React Router
 */
export default function CourseDiscoveryPage() {
  const { t } = useTranslation(['course']);
  const loaderData = useLoaderData<DiscoverLoaderData>();
  const searchFetcher = useFetcher<DiscoveryResponse>();
  const [searchParams] = useSearchParams();
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [invitationModalOpen, setInvitationModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Read searchQuery from URL - single source of truth
  const searchQuery = searchParams.get('search') || '';

  if (!loaderData?.success) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { student } = loaderData;

  // Parse API response correctly
  // Type is already known from useFetcher<DiscoveryResponse>(), no assertion needed
  const searchData = searchFetcher.data;
  const searchError = searchData && !searchData.success ? searchData.error : null;
  const courses = searchData?.success && searchData.data
    ? searchData.data.courses  // Search results
    : loaderData.data.courses || [];  // Initial data or empty array

  const isSearching = searchFetcher.state === 'loading';

  // Calculate enrolled course IDs
  const enrolledCourseIds = new Set(
    courses.filter((c: DiscoverableCourse) => c.enrollmentStatus === 'enrolled').map((c: DiscoverableCourse) => c.id)
  );

  return (
    <div className="space-y-6">
      {/* Action Buttons - Icon Triggers for Modals and View Mode */}
      <div className="flex items-center justify-between gap-2">
        {/* Left: Search and Invitation Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSearchModalOpen(true)}
            aria-label={t('course:discovery.openSearchModal')}
            title={t('course:discovery.openSearchModal')}
            className="h-10 w-10 rounded-lg"
          >
            <Search className="h-5 w-5" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setInvitationModalOpen(true)}
            aria-label={t('course:discovery.openInvitationModal')}
            title={t('course:discovery.openInvitationModal')}
            className="h-10 w-10 rounded-lg"
          >
            <Ticket className="h-5 w-5" />
          </Button>
        </div>

        {/* Right: View Mode Toggle */}
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
            aria-label={t('course:discovery.gridView')}
            title={t('course:discovery.gridView')}
            className="h-8 w-8"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>

          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
            aria-label={t('course:discovery.listView')}
            title={t('course:discovery.listView')}
            className="h-8 w-8"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search Modal */}
      <SearchErrorBoundary>
        <CourseSearchModal
          open={searchModalOpen}
          onOpenChange={setSearchModalOpen}
          fetcher={searchFetcher}
        />
      </SearchErrorBoundary>

      {/* Invitation Code Modal */}
      <SearchErrorBoundary>
        <InvitationCodeModal
          open={invitationModalOpen}
          onOpenChange={setInvitationModalOpen}
        />
      </SearchErrorBoundary>

      {/* Search Error Alert (if any) */}
      {searchError && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/5 text-destructive animate-in fade-in-50">
          <div className="mt-0.5 text-lg">⚠️</div>
          <div className="flex-1">
            <p className="font-medium">{t('course:discovery.errorFetching')}</p>
            <p className="text-sm opacity-75">{searchError}</p>
          </div>
        </div>
      )}

      {/* Course Content Section */}
      <SearchErrorBoundary>
        <div className="relative">
          {isSearching && (
            <div className="absolute top-4 right-4 z-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
          <CourseDiscoveryContent
            student={student}
            courses={courses}
            enrolledCourseIds={enrolledCourseIds}
            searchQuery={searchQuery}
            isSearching={isSearching}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>
      </SearchErrorBoundary>
    </div>
  );
}

/**
 * Loader - Fetch discoverable courses and student's enrolled courses
 * Independent loader for this route to avoid impacting other tabs
 * Supports search filtering via URL parameters
 */
export async function loader({ request }: { request: Request }): Promise<DiscoverLoaderData | Response> {
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

    // Call service functions directly (with search parameter)
    const { courses, total, hasMore } = await getDiscoverableCourses({
      limit,
      offset,
      sort,
      search,  // Pass search parameter to service layer
    });

    // Get enrolled course IDs
    const enrolledCourseIds = await getStudentEnrolledCourseIds(userId);

    // Add enrollment status to courses
    const coursesWithStatus: DiscoverableCourse[] = courses.map((course) => {
      const enrollmentStatus: 'enrolled' | 'not_enrolled' = enrolledCourseIds.has(course.id) ? 'enrolled' : 'not_enrolled';
      return {
        ...course,
        enrollmentStatus,
      };
    });

    return {
      success: true,
      student: {
        id: userId,
        email: '',
        role: 'STUDENT',
        name: '',
      },
      data: {
        courses: coursesWithStatus,
        total,
        hasMore,
      },
    };
  } catch (error) {
    console.error('Error fetching discoverable courses:', error);
    return {
      success: false,
      student: { id: '', email: '', role: 'STUDENT', name: '' },
      data: {
        courses: [],
        total: 0,
        hasMore: false,
      },
      error: error instanceof Error ? error.message : 'Failed to fetch courses',
    };
  }
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
