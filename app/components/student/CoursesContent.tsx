import { BookOpen, Users, FileText, Calendar, Clock, User, UserPlus } from 'lucide-react';
import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface CourseWithEnrollmentInfo {
  id: string;
  name: string;
  description: string | null;
  enrolledAt: Date | null;
  teacher: {
    name: string;
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
      {/* Course Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card text-card-foreground border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('course:stats.totalCourses')}</p>
                <p className="text-2xl font-bold text-foreground">{courses.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('course:stats.totalAssignments')}</p>
                <p className="text-2xl font-bold text-foreground">
                  {courses.reduce((total, course) => total + (course._count?.assignmentAreas || 0), 0)}
                </p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('course:stats.recentlyJoined')}</p>
                <p className="text-sm text-foreground">{courses[0]?.formattedEnrolledDate || 'N/A'}</p>
              </div>
              <Clock className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
    <Card className="group hover:shadow-lg transition-all duration-200 hover:border-primary/20 bg-card text-card-foreground border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {course.name}
            </CardTitle>
            <div className="mt-1 min-h-[2.5rem]">
              {course.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{course.description}</p>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Course Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-xl font-bold text-primary">{totalAssignments}</div>
            <div className="text-xs text-muted-foreground font-medium">{t('course:assignments')}</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-xl font-bold text-primary">{totalEnrollments}</div>
            <div className="text-xs text-muted-foreground font-medium">{t('course:students')}</div>
          </div>
        </div>

        {/* Course Info */}
        <div className="space-y-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <User className="w-4 h-4 mr-2" />
            <span>{t('course:instructor', { name: course.teacher.name })}</span>
          </div>
          {enrolledDate && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{t('course:joined', { date: enrolledDate })}</span>
            </div>
          )}
        </div>

        {/* Enrollment Status */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Badge variant="secondary" className="text-xs">
            {t('course:enrolled')}
          </Badge>
          <span className="text-xs text-muted-foreground">{t('course:activeCourse')}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1">
            {t('course:viewAssignments')}
          </Button>
          <Button size="sm" className="flex-1">
            {t('course:browseContent')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}