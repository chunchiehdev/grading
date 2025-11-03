import { Users, FileText, Calendar, UserPlus, Compass } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import type { CourseWithEnrollmentInfo, StudentInfo } from '@/types/student';
import { useEffect } from 'react';
import { perfMonitor } from '@/utils/performance-monitor';

interface CoursesContentProps {
  data: {
    student: StudentInfo;
    courses: (CourseWithEnrollmentInfo & { formattedEnrolledDate?: string })[];
  };
}

export function CoursesContent({ data }: CoursesContentProps) {
  const { courses } = data;
  const { t } = useTranslation(['course', 'common']);

  useEffect(() => {
    perfMonitor.mark('courses-content-rendered', { coursesCount: courses.length });
  }, [courses.length]);

  // If no courses enrolled
  if (courses.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-8 max-w-md">
          {/* Icon */}
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-muted/40 to-muted/20 flex items-center justify-center">
            <UserPlus className="w-12 h-12 text-muted-foreground" />
          </div>

          {/* Main Content */}
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold text-foreground">{t('course:emptyState.title')}</h1>
            <p className="text-muted-foreground">{t('course:emptyState.description')}</p>
          </div>

          {/* Action Button */}
          <Button asChild size="lg">
            <Link to="/student/courses/discover">
              <Compass className="w-5 h-5 mr-2" />
              {t('course:discovery.discover')}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </div>
  );
}

interface CourseCardProps {
  course: CourseWithEnrollmentInfo & { formattedEnrolledDate?: string };
}

function CourseCard({ course }: CourseCardProps) {
  const { t } = useTranslation(['course', 'common']);
  const enrolledDate = course.formattedEnrolledDate;
  const totalEnrollments = course._count?.enrollments || 0;
  const totalAssignments = course._count?.assignmentAreas || 0;

  return (
    <Link to={`/student/courses/${course.id}`} className="block group">
      <Card className="border-2 h-full grid grid-rows-[1fr_auto_auto_auto] group-hover:-translate-y-1 group-hover:bg-accent/5 transition-[transform,background-color] duration-200">
        {/* Header - 可變高度但有最小高度 */}
        <CardHeader className="p-4 sm:p-6 min-h-[140px] flex flex-col justify-start">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {course.name}
              </CardTitle>
              <div className="mt-1">
                {course.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{course.description}</p>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Course Stats - 固定高度區域 */}
        <div className="px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-start gap-3 sm:gap-6">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-base font-semibold text-foreground">{totalAssignments}</span>
              <span className="text-xs sm:text-sm text-muted-foreground">{t('course:assignments')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-base font-semibold text-foreground">{totalEnrollments}</span>
              <span className="text-xs sm:text-sm text-muted-foreground">{t('course:students')}</span>
            </div>
          </div>
        </div>

        {/* Teacher Info - 固定高度區域 */}
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <img
              src={course.teacher.picture}
              alt={course.teacher.name}
              className="w-10 h-10 rounded-full object-cover bg-muted"
            />
            <div className="flex-1">
              <div className="text-base font-medium text-muted-foreground">{course.teacher.name}</div>
              <Badge variant="secondary" className="text-xs mt-1">
                Teacher
              </Badge>
            </div>
          </div>
        </div>

        {/* Enrolled Date - 固定高度區域 */}
        {enrolledDate && (
          <div className="mx-2 mb-2 px-3 sm:px-4 py-2 sm:py-3 bg-muted rounded-lg">
            <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
              <span className="truncate">{t('course:joined', { date: enrolledDate })}</span>
            </div>
          </div>
        )}
      </Card>
    </Link>
  );
}
