import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Link } from 'react-router';
import { ArrowLeft, Plus, FileText, Users } from 'lucide-react';

import { requireTeacher } from '@/services/auth.server';
import { getCourseById, type CourseInfo } from '@/services/course.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/ui/stats-card';
import { PageHeader } from '@/components/ui/page-header';

interface LoaderData {
  teacher: { id: string; email: string; role: string };
  course: CourseInfo & {
    assignmentAreas?: Array<{
      id: string;
      name: string;
      description: string | null;
      dueDate: Date | null;
      rubricId: string;
      formattedDueDate?: string;
      _count?: { submissions: number };
    }>;
  };
  formattedCreatedDate: string;
}

export async function loader({ request, params }: LoaderFunctionArgs): Promise<LoaderData> {
  const teacher = await requireTeacher(request);
  const courseId = params.courseId;
  
  if (!courseId) {
    throw new Response('Course ID is required', { status: 400 });
  }

  try {
    const course = await getCourseById(courseId, teacher.id);
    if (!course) {
      throw new Response('Course not found', { status: 404 });
    }
    
    // Import date formatter on server side only
    const { formatDateForDisplay } = await import('@/lib/date.server');
    const formattedCreatedDate = formatDateForDisplay(course.createdAt);
    
    // Format assignment area due dates
    const courseWithFormattedDates = {
      ...course,
      assignmentAreas: course.assignmentAreas?.map(area => ({
        ...area,
        formattedDueDate: area.dueDate ? formatDateForDisplay(area.dueDate) : undefined,
      }))
    };
    
    return { teacher, course: courseWithFormattedDates, formattedCreatedDate };
  } catch (error) {
    console.error('Error loading course:', error);
    throw new Response('Course not found', { status: 404 });
  }
}

export default function CourseDetail() {
  const { teacher, course, formattedCreatedDate } = useLoaderData<typeof loader>();

  const totalSubmissions = course.assignmentAreas?.reduce((total, area) => 
    total + (area._count?.submissions || 0), 0
  ) || 0;

  const headerActions = (
    <>
      <Button asChild variant="outline">
        <Link to="/teacher/dashboard">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
      </Button>
      <Button asChild>
        <Link to={`/teacher/courses/${course.id}/assignments/new`}>
          <Plus className="w-4 h-4 mr-2" />
          Add Assignment Area
        </Link>
      </Button>
    </>
  );

  return (
    <div>
      <PageHeader
        title={course.name}
        subtitle={course.description || 'Course management and assignment areas'}
        actions={headerActions}
      />

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="Assignment Areas"
            value={course.assignmentAreas?.length || 0}
            icon={FileText}
            variant="default"
          />
          <StatsCard
            title="Total Submissions"
            value={totalSubmissions}
            icon={Users}
            variant="success"
          />
          <StatsCard
            title="Created"
            value={formattedCreatedDate}
            icon={FileText}
            variant="secondary"
          />
        </div>

        {/* Assignment Areas */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Assignment Areas</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to={`/teacher/courses/${course.id}/assignments/new`}>
                  + Add Assignment Area
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!course.assignmentAreas || course.assignmentAreas.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No assignment areas yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Create assignment areas to organize student submissions and apply rubrics.
                </p>
                <div className="mt-6">
                  <Button asChild>
                    <Link to={`/teacher/courses/${course.id}/assignments/new`}>
                      Create Assignment Area
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {course.assignmentAreas.map((area) => (
                  <div key={area.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Link
                          to={`/teacher/assignments/${area.id}`}
                          className="block hover:text-blue-600 transition-colors"
                        >
                          <h3 className="text-lg font-medium text-gray-900">{area.name}</h3>
                          {area.description && (
                            <p className="text-sm text-gray-600 mt-1">{area.description}</p>
                          )}
                        </Link>
                        <div className="flex items-center mt-2 text-sm text-gray-500">
                          <span>{area._count?.submissions || 0} submissions</span>
                          {area.formattedDueDate && (
                            <>
                              <span className="mx-2">•</span>
                              <span>Due {area.formattedDueDate}</span>
                            </>
                          )}
                          {area.rubricId && (
                            <>
                              <span className="mx-2">•</span>
                              <span className="text-green-600">Has rubric</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/teacher/assignments/${area.id}/submissions`}>
                            View Submissions
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/teacher/assignments/${area.id}/manage`}>
                            Manage
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 