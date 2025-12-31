import { useLoaderData, redirect, useSearchParams, useRouteError, isRouteErrorResponse } from 'react-router';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CourseDiscoveryContent } from '@/components/student/CourseDiscoveryContent';
import { InvitationCodeModal } from '@/components/discover/InvitationCodeModal';
import { SearchErrorBoundary } from '@/components/discover/SearchErrorBoundary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Ticket, Grid3x3, List, X } from 'lucide-react';
import { getUserId } from '@/services/auth.server';
import { createEnrollmentSchema } from '@/schemas/enrollment';
import { getDiscoverableCourses, getStudentEnrolledCourseIds } from '@/services/course-discovery.server';
import type { DiscoverableCourse } from '@/types/course';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ErrorPage } from '@/components/errors/ErrorPage';

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
 * Uses React Router's official recommended approach with setSearchParams
 * Includes expandable search with GSAP animation
 */
export default function CourseDiscoveryPage() {
  const { t } = useTranslation(['course']);
  const loaderData = useLoaderData<DiscoverLoaderData>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [invitationModalOpen, setInvitationModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Search expansion state
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const buttonsContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Read searchQuery from URL - single source of truth
  const searchQuery = searchParams.get('search') || '';

  // Sync local search value with URL on mount and URL changes
  useEffect(() => {
    setSearchValue(searchQuery);
    if (searchQuery) {
      setSearchExpanded(true);
    }
  }, [searchQuery]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // GSAP animation for search expansion
  useGSAP(() => {
    if (!searchContainerRef.current || !buttonsContainerRef.current) return;

    if (searchExpanded) {
      // Expand animation
      const tl = gsap.timeline({
        onComplete: () => {
          searchInputRef.current?.focus();
        }
      });

      tl.to(searchContainerRef.current, {
        width: 160,
        duration: 0.4,
        ease: 'power2.out',
      })
      .to(buttonsContainerRef.current, {
        x: 0,
        duration: 0.4,
        ease: 'power2.out',
      }, '<');
    } else {
      // Collapse animation
      const tl = gsap.timeline();

      tl.to(searchContainerRef.current, {
        width: 0,
        duration: 0.3,
        ease: 'power2.in',
      })
      .to(buttonsContainerRef.current, {
        x: 0,
        duration: 0.3,
        ease: 'power2.in',
      }, '<');
    }
  }, { dependencies: [searchExpanded], scope: searchContainerRef });

  // Handle search input change with debounce
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce search parameter update
    debounceTimerRef.current = setTimeout(() => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        if (value.trim()) {
          newParams.set('search', value.trim());
        } else {
          newParams.delete('search');
        }
        newParams.set('offset', '0'); // Reset pagination
        return newParams;
      });
    }, 400);
  }, [setSearchParams]);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchValue('');
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.delete('search');
      newParams.set('offset', '0');
      return newParams;
    });
    setSearchExpanded(false);
  }, [setSearchParams]);

  // Toggle search expansion
  const handleSearchToggle = useCallback(() => {
    if (searchExpanded && searchValue.trim()) {
      // If expanded with value, clear search
      handleClearSearch();
    } else {
      // Toggle expansion
      setSearchExpanded(!searchExpanded);
    }
  }, [searchExpanded, searchValue, handleClearSearch]);

  if (!loaderData?.success) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { student, data } = loaderData;
  const courses = data.courses || [];

  // Calculate enrolled course IDs
  const enrolledCourseIds = new Set(
    courses.filter((c: DiscoverableCourse) => c.enrollmentStatus === 'enrolled').map((c: DiscoverableCourse) => c.id)
  );

  return (
    <div className="space-y-6">
      {/* Action Buttons with Expandable Search */}
      <div className="flex items-center gap-2">
        {/* Search Button and Expandable Input */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleSearchToggle}
            aria-label={t('course:discovery.openSearchModal')}
            title={t('course:discovery.openSearchModal')}
            className="h-10 w-10 rounded-lg flex-shrink-0"
          >
            {searchExpanded && searchValue.trim() ? (
              <X className="h-5 w-5" />
            ) : (
              <Search className="h-5 w-5" />
            )}
          </Button>

          {/* Expandable Search Input Container */}
          <div
            ref={searchContainerRef}
            className="overflow-hidden"
            style={{ width: 0 }}
          >
            <Input
              ref={searchInputRef}
              type="text"
              placeholder={t('course:discovery.search')}
              value={searchValue}
              onChange={handleSearchChange}
              className="h-10 w-full border-b-2 border-t-0 border-l-0 border-r-0 rounded-none focus-visible:ring-0 focus-visible:border-primary px-2 text-[16px]"
            />
          </div>
        </div>

        {/* Other Buttons Container - will shift right when search expands */}
        <div ref={buttonsContainerRef} className="flex items-center gap-2">
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

          {/* Divider */}
          <div className="w-px h-6 bg-border mx-1" />

          {/* View Mode Toggle */}
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
            aria-label={t('course:discovery.gridView')}
            title={t('course:discovery.gridView')}
            className="h-10 w-10 rounded-lg"
          >
            <Grid3x3 className="h-5 w-5" />
          </Button>

          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
            aria-label={t('course:discovery.listView')}
            title={t('course:discovery.listView')}
            className="h-10 w-10 rounded-lg"
          >
            <List className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Invitation Code Modal */}
      <SearchErrorBoundary>
        <InvitationCodeModal
          open={invitationModalOpen}
          onOpenChange={setInvitationModalOpen}
        />
      </SearchErrorBoundary>

      {/* Course Content Section */}
      <SearchErrorBoundary>
        <CourseDiscoveryContent
          student={student}
          courses={courses}
          enrolledCourseIds={enrolledCourseIds}
          searchQuery={searchQuery}
          isSearching={false}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
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

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <ErrorPage
        statusCode={404}
        messageKey="errors.404.course"
        returnTo="/student"
      />
    );
  }

  return (
    <ErrorPage
      statusCode="errors.generic.title"
      messageKey="errors.generic.course"
      returnTo="/student"
    />
  );
}

