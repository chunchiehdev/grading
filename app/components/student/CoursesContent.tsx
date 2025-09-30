import { Users, FileText, Calendar, UserPlus } from 'lucide-react';
import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

interface CourseWithEnrollmentInfo {
  id: string;
  name: string;
  description: string | null;
  enrolledAt: Date | null;
  teacher: {
    id: string;
    email: string;
    name: string;
    picture: string;
  };
  _count?: {
    enrollments?: number;
    assignmentAreas?: number;
  };
}

interface CoursesData {
  student: { id: string; email: string; role: string; name: string };
  courses: (CourseWithEnrollmentInfo & { formattedEnrolledDate?: string })[];
}

interface CoursesContentProps {
  data: CoursesData;
}

export function CoursesContent({ data }: CoursesContentProps) {
  const { courses } = data;
  const { t } = useTranslation(['course', 'common']);

  // If no courses enrolled
  if (courses.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="bg-card text-card-foreground border max-w-md">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <UserPlus className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">{t('course:emptyState.title')}</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {t('course:emptyState.description')}
              </p>

              <div className="bg-muted rounded-lg p-4 mb-6 max-w-md mx-auto">
                <h4 className="font-medium text-foreground mb-2">{t('course:emptyState.howToJoin')}</h4>
                <ul className="text-sm text-muted-foreground space-y-1 text-left">
                  <li>• {t('course:emptyState.steps.getCode')}</li>
                  <li>• {t('course:emptyState.steps.scanQR')}</li>
                  <li>• {t('course:emptyState.steps.visitLink')}</li>
                  <li>• {t('course:emptyState.steps.contactTeacher')}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">

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
    <Link to="/student/assignments" className="block">
      <Card className="group hover:shadow-lg transition-all duration-200 hover:border-primary/20 bg-card text-card-foreground border hover:bg-muted/50 h-full grid grid-rows-[1fr_auto_auto_auto]">
        {/* Header - 可變高度但有最小高度 */}
        <CardHeader className="pb-3 min-h-[140px] flex flex-col justify-start">
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
        <div className="px-6 py-4">
          <div className="flex items-center justify-start gap-8">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <span className="text-lg font-semibold text-muted-foreground">{totalAssignments}</span>
              <span className="text-sm text-muted-foreground">{t('course:assignments')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="text-lg font-semibold text-muted-foreground">{totalEnrollments}</span>
              <span className="text-sm text-muted-foreground">{t('course:students')}</span>
            </div>
          </div>
        </div>

        {/* Teacher Info - 固定高度區域 */}
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <img
              src={course.teacher.picture}
              alt={course.teacher.name}
              className="w-10 h-10 rounded-full object-cover bg-muted"
            />
            <div className="flex-1">
              <div className="text-base font-medium text-muted-foreground">{course.teacher.name}</div>
              <Badge variant="secondary" className="text-xs mt-1">Teacher</Badge>
            </div>
          </div>
        </div>

        {/* Enrolled Date - 固定高度區域 */}
        {enrolledDate && (
          <div className="mx-2 mb-2 px-4 py-3 bg-muted rounded-lg">
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{t('course:joined', { date: enrolledDate })}</span>
            </div>
          </div>
        )}
      </Card>
    </Link>
  );
}