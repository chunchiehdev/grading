import { TrendingUp, Users, FileText, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import type { TeacherInfo, CourseInfo, OverallTeacherStats, CoursePerformance, RubricUsage } from '@/types/teacher';

interface TeacherAnalyticsContentProps {
  data: {
    teacher: TeacherInfo;
    courses: CourseInfo[];
    analyticsStats: OverallTeacherStats;
    analyticsCourses: CoursePerformance;
    analyticsRubrics: RubricUsage;
  };
}

export function TeacherAnalyticsContent({ data }: TeacherAnalyticsContentProps) {
  const { teacher, courses, analyticsStats, analyticsCourses, analyticsRubrics } = data;
  const { t } = useTranslation(['dashboard', 'analytics']);

  // Use real analytics data
  const {
    totalCourses = courses.length,
    totalStudents = 0,
    totalSubmissions = 0,
    averageScore = 0,
  } = analyticsStats || {};

  // Use real course performance data
  const coursePerformance = analyticsCourses || [];

  return (
    <div className="space-y-6 md:space-y-8 lg:space-y-10 xl:space-y-12">
      {/* Header Section */}
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground">
          {t('dashboard:analytics')}
        </h1>
        <p className="text-base md:text-lg lg:text-xl text-muted-foreground mt-2">{t('analytics:overview')}</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
        <Card>
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base md:text-lg font-medium text-muted-foreground">
                  {t('dashboard:stats.totalCourses')}
                </p>
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">{totalCourses}</p>
              </div>
              <FileText className="w-8 md:w-10 lg:w-12 h-8 md:h-10 lg:h-12 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base md:text-lg font-medium text-muted-foreground">
                  {t('dashboard:stats.totalSubmissions')}
                </p>
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">{totalSubmissions}</p>
              </div>
              <Users className="w-8 md:w-10 lg:w-12 h-8 md:h-10 lg:h-12 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base md:text-lg font-medium text-muted-foreground">{t('analytics:avgScore')}</p>
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
                  {averageScore ? `${Math.round(averageScore)}%` : '-'}
                </p>
              </div>
              <TrendingUp className="w-8 md:w-10 lg:w-12 h-8 md:h-10 lg:h-12 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base md:text-lg font-medium text-muted-foreground">
                  {t('analytics:completionRate')}
                </p>
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">91.2%</p>
              </div>
              <BarChart3 className="w-8 md:w-10 lg:w-12 h-8 md:h-10 lg:h-12 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Performance */}
      {coursePerformance.length > 0 && (
        <Card>
          <CardHeader className="p-6 md:p-8">
            <CardTitle className="text-xl md:text-2xl lg:text-3xl font-semibold flex items-center gap-3">
              <BarChart3 className="w-6 md:w-8 h-6 md:h-8" />
              {t('analytics:coursePerformance')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-0">
            <div className="space-y-4 md:space-y-6">
              {coursePerformance.map((course) => (
                <div key={course.id} className="p-4 md:p-6 border rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-base md:text-lg font-medium text-foreground truncate">{course.name}</h3>
                    <Badge variant="outline" className="ml-2">
                      {course.submissionsCount || 0} submissions
                    </Badge>
                  </div>

                  <div className="text-sm md:text-base">
                    <span className="text-muted-foreground">{t('analytics:avgScore')}: </span>
                    <span className="font-medium">
                      {course.averageScore ? `${Math.round(course.averageScore)}%` : 'N/A'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rubrics Usage */}
      {analyticsRubrics && analyticsRubrics.length > 0 && (
        <Card>
          <CardHeader className="p-6 md:p-8">
            <CardTitle className="text-xl md:text-2xl lg:text-3xl font-semibold flex items-center gap-3">
              <FileText className="w-6 md:w-8 h-6 md:h-8" />
              {t('analytics:rubricUsage')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-0">
            <div className="space-y-4">
              {analyticsRubrics.map((rubric) => (
                <div key={rubric.rubricId} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{rubric.rubricName}</span>
                    <span className="text-sm text-muted-foreground">{rubric.usageCount || 0} uses</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
