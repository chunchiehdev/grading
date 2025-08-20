import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Link } from 'react-router';
import { Plus, BookOpen, Users, FileText, Calendar, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { requireTeacher } from '@/services/auth.server';
import { getTeacherCourses, type CourseInfo } from '@/services/course.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { useState } from 'react';

interface LoaderData {
  teacher: { id: string; email: string; role: string; name: string };
  courses: Array<
    CourseInfo & {
      assignmentAreas?: Array<{
        id: string;
        name: string;
        description: string | null;
        dueDate: Date | null;
        _count?: { submissions: number };
      }>;
      formattedCreatedDate: string;
    }
  >;
}

export async function loader({ request }: LoaderFunctionArgs): Promise<LoaderData> {
  const teacher = await requireTeacher(request);

  try {
    const courses = await getTeacherCourses(teacher.id);

    // Import date formatter on server side only
    const { formatDateForDisplay } = await import('@/lib/date.server');

    // Format creation dates
    const coursesWithFormattedDates = courses.map((course) => ({
      ...course,
      formattedCreatedDate: formatDateForDisplay(course.createdAt),
    }));

    return { teacher, courses: coursesWithFormattedDates };
  } catch (error) {
    console.error('Error loading teacher courses:', error);
    return { teacher, courses: [] };
  }
}

export default function TeacherCourses() {
  const { teacher, courses } = useLoaderData<typeof loader>();
  const { t } = useTranslation('course');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter courses based on search term
  const filteredCourses = courses.filter(
    (course) =>
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const headerActions = (
    <Button asChild>
      <Link to="/teacher/courses/new">
        <Plus className="w-4 h-4 mr-2" />
        {t('pageHeader.createCourse')}
      </Link>
    </Button>
  );

  return (
    <div>
      <PageHeader
        title={t('pageHeader.title')}
        subtitle={courses.length === 1 ? t('pageHeader.subtitle', { count: courses.length }) : t('pageHeader.subtitlePlural', { count: courses.length })}
        actions={headerActions}
      />

      <main className="max-w-7xl mx-auto space-y-8">
        {/* Search and filters */}
        {courses.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t('search.placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Course Grid */}
        {filteredCourses.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                {courses.length === 0 ? (
                  <>
                    <h3 className="text-lg font-medium text-foreground mb-2">{t('emptyState.noCoursesYet.title')}</h3>
                    <p className="text-muted-foreground mb-6">
                      {t('emptyState.noCoursesYet.description')}
                    </p>
                    <Button asChild>
                      <Link to="/teacher/courses/new">
                        <Plus className="w-4 h-4 mr-2" />
                        {t('emptyState.noCoursesYet.createFirstCourse')}
                      </Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-medium text-foreground mb-2">{t('emptyState.noCoursesFound.title')}</h3>
                    <p className="text-muted-foreground mb-6">
                      {t('emptyState.noCoursesFound.description')}
                    </p>
                    <Button variant="outline" onClick={() => setSearchTerm('')}>
                      {t('search.clearSearch')}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CourseCard({ course }: { course: any }) {
  const { t } = useTranslation('course');
  const totalSubmissions =
    course.assignmentAreas?.reduce((total: number, area: any) => total + (area._count?.submissions || 0), 0) || 0;

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 hover:border-primary">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2">
              <Link to={`/teacher/courses/${course.id}`} className="block">
                {course.name}
              </Link>
            </CardTitle>
            <div className='mt-1 min-h-[1rem]'>
              {course.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{course.description}</p>}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Course stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-xl font-bold text-foreground">{course.assignmentAreas?.length || 0}</div>
            <div className="text-xs font-medium text-muted-foreground">{t('courseCard.assignmentAreas')}</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-xl font-bold text-foreground">{totalSubmissions}</div>
            <div className="text-xs font-medium text-muted-foreground">{t('courseCard.submissions')}</div>
          </div>
        </div>

        {/* Recent assignment areas */}
        {course.assignmentAreas && course.assignmentAreas.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">{t('courseCard.recentAssignmentAreas')}</h4>
            <div className="space-y-1">
              {course.assignmentAreas.slice(0, 2).map((area: any) => (
                <div key={area.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate flex-1">{area.name}</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {area._count?.submissions || 0} {t('courseCard.submissions').toLowerCase()}
                  </Badge>
                </div>
              ))}
              {course.assignmentAreas.length > 2 && (
                <p className="text-xs text-muted-foreground">{t('courseCard.moreAreas', { count: course.assignmentAreas.length - 2 })}</p>
              )}
            </div>
          </div>
        )}

        {/* Created date */}
        <div className="flex items-center text-xs text-muted-foreground pt-2 border-t">
          <Calendar className="h-3 w-3 mr-1" />
          {t('courseCard.created', { date: course.formattedCreatedDate })}
        </div>

        {/* Action buttons */}
        <div className="flex space-x-2 pt-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link to={`/teacher/courses/${course.id}`}>{t('courseCard.viewDetails')}</Link>
          </Button>
          <Button asChild size="sm" className="flex-1">
            <Link to={`/teacher/courses/${course.id}/assignments/new`}>{t('courseCard.addAssignment')}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
