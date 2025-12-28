import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, useRouteError, isRouteErrorResponse } from 'react-router';
import { requireStudent } from '@/services/auth.server';
import { getStudentCourseDetail, type StudentCourseDetailData } from '@/services/student-course-detail.server';
import { CourseDetailContent } from '@/components/student/CourseDetailContent';
import { ErrorPage } from '@/components/errors/ErrorPage';

interface LoaderData extends StudentCourseDetailData {
  student: { id: string; email: string; role: string; name: string };
}

export async function loader({ request, params }: LoaderFunctionArgs): Promise<LoaderData> {
  const student = await requireStudent(request);
  const courseId = params.courseId;

  if (!courseId) {
    throw new Response('Course ID is required', { status: 400 });
  }

  try {
    const courseData = await getStudentCourseDetail(courseId, student.id);

    if (!courseData) {
      throw new Response('Course not found or you are not enrolled', { status: 404 });
    }

    return {
      student,
      ...courseData,
    };
  } catch (error) {
    console.error('Error loading student course:', error);
    throw new Response('Course not found', { status: 404 });
  }
}

export default function StudentCourseDetail() {
  const data = useLoaderData<typeof loader>();

  return <CourseDetailContent data={data} />;
}

// Error Boundary for handling loader errors
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 400) {
    return <ErrorPage statusCode={400} messageKey="errors.400.missingCourseParams" returnTo="/student" />;
  }

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <ErrorPage statusCode={404} messageKey="errors.404.course" returnTo="/student" />;
  }

  return <ErrorPage statusCode="errors.generic.title" messageKey="errors.generic.course" returnTo="/student" />;
}
