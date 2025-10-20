'use client';

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { DiscoverableCourse, CourseDiscoveryContentProps } from '@/types/course';

export function CourseDiscoveryContent({
  student,
  courses,
  enrolledCourseIds,
}: CourseDiscoveryContentProps) {
  const { t } = useTranslation(['course']);
  const [enrollingClassId, setEnrollingClassId] = useState<string | null>(null);
  const [enrolledClasses, setEnrolledClasses] = useState<Set<string>>(enrolledCourseIds);

  // Handle enrollment
  const handleEnroll = async (classId: string, courseName: string) => {
    setEnrollingClassId(classId);
    try {
      const response = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          courseId: courses.find((c) => c.classes.some((cl) => cl.id === classId))?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error?.message || t('course:discovery.enrollmentError'));
        return;
      }

      // Update enrolled set
      const courseId = courses.find((c) => c.classes.some((cl) => cl.id === classId))?.id;
      if (courseId) {
        setEnrolledClasses(new Set([...enrolledClasses, courseId]));
      }

      toast.success(t('course:discovery.enrollmentSuccess', { courseName }));
    } catch (error) {
      toast.error(t('course:discovery.enrollmentError'));
      console.error('Enrollment error:', error);
    } finally {
      setEnrollingClassId(null);
    }
  };

  // Empty state
  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
        <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {t('course:discovery.empty')}
        </h3>
        <p className="text-muted-foreground max-w-sm">
          {t('course:discovery.emptyDescription')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Grid layout: responsive columns */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {courses.map((course) => (
          <Card
            key={course.id}
            className="flex flex-col transition-all hover:shadow-lg dark:hover:shadow-lg/50"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <CardTitle className="text-base line-clamp-2">{course.name}</CardTitle>
                {course.code && (
                  <Badge variant="outline" className="shrink-0">
                    {course.code}
                  </Badge>
                )}
              </div>
              {course.description && (
                <CardDescription className="line-clamp-2">{course.description}</CardDescription>
              )}
            </CardHeader>

            <CardContent className="flex-1 flex flex-col justify-between space-y-4">
              {/* Teacher info */}
              <div className="flex items-center gap-2">
                {course.teacher.picture && (
                  <img
                    src={course.teacher.picture}
                    alt={course.teacher.name}
                    className="h-6 w-6 rounded-full bg-muted"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {t('course:discovery.instructor')}
                  </p>
                  <p className="text-sm font-medium truncate">{course.teacher.name}</p>
                </div>
              </div>

              {/* Classes */}
              <div className="space-y-2">
                {course.classes.map((cls) => (
                  <div
                    key={cls.id}
                    className="p-3 rounded-lg bg-muted/50 space-y-2 text-sm"
                  >
                    <div className="font-medium">{cls.name}</div>

                    {/* Schedule */}
                    {cls.schedule && (
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>
                          <span className="font-medium">{t('course:discovery.schedule')}:</span>{' '}
                          {cls.schedule.weekday}
                        </div>
                        <div>
                          <span className="font-medium">{t('course:discovery.capacity')}:</span>{' '}
                          {cls.enrollmentCount}
                          {cls.capacity ? `/${cls.capacity}` : ''}
                          {' '}
                          {t('course:discovery.students')}
                        </div>
                        {cls.schedule.room && (
                          <div>
                            <span className="font-medium">Room:</span> {cls.schedule.room}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Enroll button */}
                    <Button
                      size="sm"
                      className="w-full mt-2"
                      disabled={
                        enrolledClasses.has(course.id) ||
                        cls.isFull ||
                        enrollingClassId === cls.id
                      }
                      onClick={() => handleEnroll(cls.id, course.name)}
                      variant={
                        enrolledClasses.has(course.id) || cls.isFull
                          ? 'outline'
                          : 'default'
                      }
                    >
                      {enrollingClassId === cls.id && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      {enrolledClasses.has(course.id)
                        ? t('course:discovery.enrolled')
                        : cls.isFull
                          ? t('course:discovery.classFull')
                          : t('course:discovery.enroll')}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
