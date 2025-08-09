import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Link } from 'react-router';
import { GraduationCap, FileText, Users, Plus } from 'lucide-react';

import { requireTeacher } from '@/services/auth.server';
import { getTeacherCourses, type CourseInfo } from '@/services/course.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/ui/stats-card';
import { PageHeader } from '@/components/ui/page-header';

import { formatDateForDisplay } from '@/lib/date';
import { useTranslation } from 'react-i18next';

interface LoaderData {
  teacher: { id: string; email: string; name: string; role: string };
  courses: CourseInfo[];
}

export async function loader({ request }: LoaderFunctionArgs): Promise<LoaderData> {
  const teacher = await requireTeacher(request);
  const courses = await getTeacherCourses(teacher.id);

  return { teacher, courses };
}

export default function TeacherDashboard() {
  const { teacher, courses } = useLoaderData<typeof loader>();
  const { t } = useTranslation(['course'])

  const totalAssignmentAreas = courses.reduce((total, course) => 
    total + (course.assignmentAreas?.length || 0), 0
  );

  const totalSubmissions = courses.reduce((total, course) => 
    total + (course.assignmentAreas?.reduce((areaTotal, area) => 
      areaTotal + (area._count?.submissions || 0), 0) || 0), 0
  );

  const headerActions = (
    <>
      <Button asChild variant="outline">
        <Link to="/teacher/rubrics">
          管理評分標準
        </Link>
      </Button>
      <Button asChild>
        <Link to="/teacher/courses/new">
          {t('course:new')}
        </Link>
      </Button>
    </>
  );

  return (
    <div>
      <PageHeader
        title="儀表板"
        subtitle={`歡迎回來, ${teacher.name}`}
        actions={headerActions}
      />

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="Total Courses"
            value={courses.length}
            icon={GraduationCap}
            variant="default"
          />
          <StatsCard
            title="Assignment Areas"
            value={totalAssignmentAreas}
            icon={FileText}
            variant="success"
          />
          <StatsCard
            title="Total Submissions"
            value={totalSubmissions}
            icon={Users}
            variant="warning"
          />
        </div>

        {/* Courses Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>My Courses</CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link to="/teacher/courses/new">
                  + Create New Course
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {courses.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No courses yet</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating your first course.</p>
                <div className="mt-6">
                  <Button asChild>
                    <Link to="/teacher/courses/new">
                      Create Course
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {courses.map((course) => (
                  <div key={course.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Link
                          to={`/teacher/courses/${course.id}`}
                          className="block hover:text-blue-600 transition-colors"
                        >
                          <h3 className="text-lg font-medium text-gray-900">{course.name}</h3>
                          {course.description && (
                            <p className="text-sm text-gray-600 mt-1">{course.description}</p>
                          )}
                        </Link>
                        <div className="flex items-center mt-2 text-sm text-gray-500">
                          <span>{course.assignmentAreas?.length || 0} assignment areas</span>
                          <span className="mx-2">•</span>
                          <span>
                            {course.assignmentAreas?.reduce((total, area) => 
                              total + (area._count?.submissions || 0), 0) || 0} submissions
                          </span>
                          <span className="mx-2">•</span>
                          <span>Created {formatDateForDisplay(course.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/teacher/courses/${course.id}/assignments/new`}>
                            Add Assignment
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/teacher/courses/${course.id}`}>
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