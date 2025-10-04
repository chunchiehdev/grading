import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { requireStudent } from '@/services/auth.server';
import { getStudentCourseDetail, type StudentCourseDetailData } from '@/services/student-course-detail.server';
import { CourseDetailContent } from '@/components/student/CourseDetailContent';
import { PageHeader } from '@/components/ui/page-header';

interface LoaderData extends StudentCourseDetailData {
  student: { id: string; email: string; role: string };
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

  const headerMenuItems = [
    { label: '返回', to: '/student/dashboard', icon: ArrowLeft },
  ];

  return (
    <div>
      <PageHeader
        title={data.course.name}
        subtitle={data.course.description || '課程詳情'}
        menuItems={headerMenuItems}
        showInlineActions={false}
      />

      <CourseDetailContent data={data} />
    </div>
  );
}
