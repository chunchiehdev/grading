import { Link } from 'react-router';
import { GraduationCap, Users, FileText, Plus, MoreVertical, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';
import { formatDateForDisplay } from '@/lib/date';

interface TeacherCoursesData {
  teacher: { id: string; email: string; name: string; role: string };
  courses: any[];
}

interface TeacherCoursesContentProps {
  data: TeacherCoursesData;
}

export function TeacherCoursesContent({ data }: TeacherCoursesContentProps) {
  const { teacher, courses } = data;
  const { t } = useTranslation(['course', 'dashboard']);

  return (
    <div className="space-y-6 md:space-y-8 lg:space-y-10 xl:space-y-12">
      {/* Add Course Button */}
      <div className="flex justify-end">
        <Button asChild variant="outline" size="icon" className="h-12 w-12 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors">
          <Link to="/teacher/courses/new">
            <Plus className="w-6 h-6" />
          </Link>
        </Button>
      </div>

      {courses.length === 0 ? (
        /* Empty State */
        <Card>
          <CardContent className="p-12 md:p-16 lg:p-20 text-center">
            <GraduationCap className="mx-auto h-20 md:h-24 lg:h-28 xl:h-32 w-20 md:w-24 lg:w-28 xl:w-32 text-muted-foreground" />
            <h3 className="mt-6 md:mt-8 text-xl md:text-2xl lg:text-3xl font-medium text-foreground">
              {t('dashboard:emptyState.noCourses')}
            </h3>
            <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('dashboard:emptyState.noCoursesDescription')}
            </p>
            <Button asChild size="lg" className="mt-8 text-lg md:text-xl px-8 md:px-10 py-4 md:py-5">
              <Link to="/teacher/courses/new">
                <Plus className="w-6 h-6 mr-2" />
                {t('dashboard:teacher.createCourse')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Courses Grid */
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
          {courses.map((course) => {
            const totalSubmissions = course.assignmentAreas?.reduce(
              (total: number, area: any) => total + (area._count?.submissions || 0),
              0
            ) || 0;

            return (
              <Link key={course.id} to={`/teacher/courses/${course.id}`} className="block">
                <Card className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20 h-full grid grid-rows-[1fr_auto_auto]">
                  <CardHeader className="p-6 min-h-[140px] flex flex-col justify-start">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {course.name}
                        </CardTitle>
                        {course.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                            {course.description}
                          </p>
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
                            <Link to={`/teacher/courses/${course.id}/edit`}>
                              {t('course:edit.title')}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/teacher/courses/${course.id}/settings`}>
                              {t('course:settings')}
                            </Link>
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

                  <div className="px-6 py-4">
                    <div className="flex items-center justify-start gap-8">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <span className="text-lg font-semibold text-muted-foreground">{course.assignmentAreas?.length || 0}</span>
                        <span className="text-sm text-muted-foreground">{t('dashboard:stats.assignmentAreas')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-muted-foreground" />
                        <span className="text-lg font-semibold text-muted-foreground">{totalSubmissions}</span>
                        <span className="text-sm text-muted-foreground">{t('dashboard:teacher.submissions')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Course Meta - 固定高度區域 */}
                  <div className="mx-2 mb-2 px-4 py-3 bg-muted rounded-lg">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>{formatDateForDisplay(course.createdAt)}</span>
                    </div>
                  </div>
                  
                </Card>
              </Link>
              
            );
            
          })}
          
        </div>
      )}
    </div>
  );
}