import { Link } from 'react-router';
import { GraduationCap, Users, FileText, Plus, MoreVertical, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';
import { formatDateForDisplay } from '@/lib/date';
import type { TeacherInfo, CourseInfo } from '@/types/teacher';

interface TeacherCoursesContentProps {
  data: {
    teacher: TeacherInfo;
    courses: CourseInfo[];
  };
}

export function TeacherCoursesContent({ data }: TeacherCoursesContentProps) {
  const { teacher, courses } = data;
  const { t } = useTranslation(['course', 'dashboard']);

  return (
    <div className="space-y-6 md:space-y-8 lg:space-y-10 xl:space-y-12">
      {courses.length === 0 ? (
        /* Empty State */
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-8 max-w-md">
            {/* Icon */}
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-muted/40 to-muted/20 flex items-center justify-center">
              <GraduationCap className="w-12 h-12 text-muted-foreground" />
            </div>

            {/* Main Content */}
            <div className="space-y-3">
              <h1 className="text-2xl font-semibold text-foreground">{t('dashboard:emptyState.noCourses')}</h1>
              <p className="text-muted-foreground">{t('dashboard:emptyState.noCoursesDescription')}</p>
            </div>

            {/* Action Button - Larger with full rounded corners */}
            <Button asChild variant="emphasis" size="lg" className="rounded-full px-8 py-6 text-base">
              <Link to="/teacher/courses/new">
                <Plus className="w-6 h-6 mr-2" />
                {t('dashboard:teacher.createCourse')}
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        /* Courses Grid */
        <div className="w-full">
          <div className="mx-auto w-full max-w-[1200px] 2xl:max-w-[1800px] 3xl:max-w-[2400px]">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 gap-6 place-content-start justify-items-stretch">
              {courses.map((course) => {
            const totalSubmissions =
              course.assignmentAreas?.reduce(
                (total: number, area: any) => total + (area._count?.submissions || 0),
                0
              ) || 0;

            return (
              <Link key={course.id} to={`/teacher/courses/${course.id}`} className="block group">
                <Card className="border-2 h-full grid grid-rows-[1fr_auto_auto_auto] group-hover:-translate-y-1 group-hover:bg-accent/5 transition-[transform,background-color] duration-200">
                
                  <CardHeader className="p-4 sm:p-6 min-h-[140px] flex flex-col justify-start">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {course.name}
                        </CardTitle>
                        </div>
                        {course.description && (
                          <p className="text-sm text-muted-foreground line-clamp-3">{course.description}</p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/teacher/courses/${course.id}/edit`}>{t('course:edit.title')}</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/teacher/courses/${course.id}/settings`}>{t('course:settings.title')}</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link to={`/teacher/courses/${course.id}/assignments/new`}>
                              {t('dashboard:teacher.createAssignment')}
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>

                  <div className="px-4 sm:px-6 py-4 max-w-full">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-start gap-3 sm:gap-4 w-full">
                      <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto sm:flex-1 overflow-hidden">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-base font-semibold text-foreground shrink-0">
                          {course.assignmentAreas?.length || 0}
                        </span>
                        <span 
                          className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis block"
                          title={t('dashboard:stats.assignmentAreas')}
                        >
                          {t('dashboard:stats.assignmentAreas')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto sm:flex-1 overflow-hidden">
                        <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-base font-semibold text-foreground shrink-0">{totalSubmissions}</span>
                        <span 
                          className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis block"
                          title={t('dashboard:teacher.submissions')}
                        >
                          {t('dashboard:teacher.submissions')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Course Meta */}
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                    <div className="flex items-center text-xs sm:text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{formatDateForDisplay(course.createdAt)}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
