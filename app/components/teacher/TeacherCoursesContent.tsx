import { Link } from 'react-router';
import { GraduationCap, Users, FileText, Settings, Plus, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 md:gap-8 lg:gap-10">
          {courses.map((course) => {
            const totalSubmissions = course.assignmentAreas?.reduce(
              (total: number, area: any) => total + (area._count?.submissions || 0),
              0
            ) || 0;

            return (
              <Card key={course.id} className="hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
                <CardHeader className="p-6 md:p-8">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <Link
                        to={`/teacher/courses/${course.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        <CardTitle className="text-lg md:text-xl lg:text-2xl font-semibold line-clamp-2">
                          {course.name}
                        </CardTitle>
                      </Link>
                      {course.description && (
                        <p className="text-sm md:text-base text-muted-foreground mt-2 line-clamp-3">
                          {course.description}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/teacher/courses/${course.id}`}>
                            {t('course:viewCourse')}
                          </Link>
                        </DropdownMenuItem>
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

                <CardContent className="p-6 md:p-8 pt-0">
                  {/* Statistics */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <FileText className="w-5 md:w-6 h-5 md:h-6 text-primary" />
                      </div>
                      <div className="text-xl md:text-2xl font-bold text-foreground">
                        {course.assignmentAreas?.length || 0}
                      </div>
                      <div className="text-xs md:text-sm text-muted-foreground">
                        {t('dashboard:stats.assignmentAreas')}
                      </div>
                    </div>

                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <Users className="w-5 md:w-6 h-5 md:h-6 text-primary" />
                      </div>
                      <div className="text-xl md:text-2xl font-bold text-foreground">
                        {totalSubmissions}
                      </div>
                      <div className="text-xs md:text-sm text-muted-foreground">
                        {t('dashboard:teacher.submissions')}
                      </div>
                    </div>
                  </div>

                  {/* Course Meta */}
                  <div className="space-y-3">
                    <div className="flex items-center text-sm md:text-base text-muted-foreground">
                      <span>{t('dashboard:teacher.createdDate')}: </span>
                      <Badge variant="outline" className="ml-2">
                        {formatDateForDisplay(course.createdAt)}
                      </Badge>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-6">
                    <Button asChild size="sm" className="flex-1 text-sm md:text-base">
                      <Link to={`/teacher/courses/${course.id}`}>
                        {t('course:viewCourse')}
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="text-sm md:text-base">
                      <Link to={`/teacher/courses/${course.id}/assignments/new`}>
                        <Plus className="w-4 h-4 mr-1" />
                        {t('course:assignment.new')}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}