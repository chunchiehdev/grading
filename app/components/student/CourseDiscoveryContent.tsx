'use client';

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen, Users, Clock, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import type { CourseDiscoveryContentProps } from '@/types/course';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

export function CourseDiscoveryContent({
  student,
  courses,
  enrolledCourseIds,
  searchQuery = '',
  isSearching = false,
  viewMode = 'grid',
  onViewModeChange,
}: CourseDiscoveryContentProps & { viewMode?: 'grid' | 'list'; onViewModeChange?: (mode: 'grid' | 'list') => void }) {
  const { t } = useTranslation(['course']);
  const [enrollingClassId, setEnrollingClassId] = useState<string | null>(null);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const effectiveEnrolledCourseIds = enrolledCourseIds;

  const getCourseByClassId = (classId: string) => courses.find((course) => course.classes.some((cls) => cls.id === classId));

  const getFirstAvailableClass = (courseClasses: CourseDiscoveryContentProps['courses'][number]['classes']) => {
    return courseClasses.find((cls) => {
      const capacityPercent = cls.capacity ? (cls.enrollmentCount / cls.capacity) * 100 : 0;
      return !(cls.isFull || capacityPercent >= 100);
    });
  };

  const getEnrollmentErrorMessage = (message?: string): string => {
    if (!message) {
      return t('course:discovery.enrollmentError');
    }

    const normalized = message.toLowerCase();

    if (normalized.includes('already enrolled') || normalized.includes('unique constraint failed')) {
      return t('course:discovery.duplicateEnrollment');
    }

    if (normalized.includes('full') || normalized.includes('capacity')) {
      return t('course:discovery.classAtCapacity');
    }

    if (normalized.includes('no longer available') || normalized.includes('inactive') || normalized.includes('not found')) {
      return t('course:discovery.courseInactive');
    }

    return message;
  };

  // Toggle course expansion
  const toggleCourse = (courseId: string) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  // Handle enrollment
  const handleEnroll = async (classId: string) => {
    setEnrollingClassId(classId);
    try {
      const course = getCourseByClassId(classId);
      if (!course) {
        toast.error(t('course:discovery.enrollmentError'));
        return;
      }

      const response = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          courseId: course.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(getEnrollmentErrorMessage(data.error?.message));
        return;
      }

      navigate('/student/courses');
    } catch (error) {
      toast.error(t('course:discovery.enrollmentError'));
      console.error('Enrollment error:', error);
    } finally {
      setEnrollingClassId(null);
    }
  };

  // 移除愚蠢的 skeleton - 搜尋時保持內容不變
  // 載入狀態已經在父層顯示 spinner

  // Show no results state for search
  if (courses.length === 0 && searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
        <BookOpen className="h-16 w-16 text-amber-300 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">{t('course:discovery.noCoursesFoundTitle')}</h3>
        <p className="text-muted-foreground max-w-sm">
          {t('course:discovery.noCoursesFoundMessage', { query: searchQuery })}
        </p>
      </div>
    );
  }

  // Empty state (no search, no courses)
  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6">
        {/* Icon */}
        <BookOpen className="h-16 w-16 text-muted-foreground mb-6" />

        {/* Main Content */}
        <div className="space-y-3 mb-8 max-w-md">
          <h3 className="text-2xl font-semibold text-foreground">{t('course:discovery.empty')}</h3>
          <p className="text-muted-foreground">{t('course:discovery.emptyDescription')}</p>
        </div>

        
      </div>
    );
  }

  return (
    <div>
      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="animate-in fade-in-50 duration-300">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {courses.map((course) => (
              <Card
                key={course.id}
                className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 dark:hover:shadow-lg/50 border-border/50 group"
              >
                {/* Card Header with Gradient Background */}
                <CardHeader className="pb-3 bg-gradient-to-br from-primary/10 to-accent/10">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <CardTitle className="text-base line-clamp-2 group-hover:text-primary transition-colors">
                      {course.name}
                    </CardTitle>
                    {course.code && (
                      <Badge variant="secondary" className="shrink-0 font-mono text-xs">
                        {course.code}
                      </Badge>
                    )}
                  </div>
                  {course.description && (
                    <CardDescription className="line-clamp-2 text-xs">
                      {course.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="flex-1 flex flex-col justify-between space-y-4 pt-6">
                  {/* Teacher Info Card */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/30">
                    <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-primary/20">
                      {course.teacher.picture && <AvatarImage src={course.teacher.picture} alt={course.teacher.name} />}
                      <AvatarFallback className="text-xs font-semibold">
                        {course.teacher.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {t('course:discovery.instructor')}
                      </p>
                      <p className="text-sm font-semibold truncate text-foreground">
                        {course.teacher.name}
                      </p>
                    </div>
                  </div>

                  {/* Classes List */}
                  <TooltipProvider>
                    <div className="space-y-2">
                      {course.classes.map((cls) => {
                        const capacityPercent = cls.capacity ? (cls.enrollmentCount / cls.capacity) * 100 : 0;
                        const isFull = cls.isFull || capacityPercent >= 100;

                        return (
                          <Tooltip key={cls.id}>
                            <TooltipTrigger asChild>
                              <div className="p-3 rounded-lg bg-card border border-border/50 space-y-2 text-sm cursor-help hover:border-border transition-colors">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-foreground">{cls.name}</span>
                                  {isFull && (
                                    <Badge variant="destructive" className="text-xs">
                                      {t('course:discovery.classFull')}
                                    </Badge>
                                  )}
                                </div>

                                {/* Schedule and Room Info */}
                                {cls.schedule && (
                                  <div className="space-y-1 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
                                      <Clock className="h-3 w-3" />
                                      <span>{cls.schedule.weekday}</span>
                                    </div>
                                    {cls.schedule.room && (
                                      <div className="flex items-center gap-2">
                                        <MapPin className="h-3 w-3" />
                                        <span>{cls.schedule.room}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Capacity Progress */}
                                {cls.capacity && (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        {cls.enrollmentCount}/{cls.capacity}
                                      </span>
                                      <span className="text-muted-foreground">
                                        {Math.round(capacityPercent)}%
                                      </span>
                                    </div>
                                    <Progress value={capacityPercent} className="h-1.5" />
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="start">
                              <div className="text-xs space-y-1">
                                <p className="font-semibold">{cls.name}</p>
                                <p>{cls.schedule?.weekday} • {cls.schedule?.room}</p>
                                <p>{cls.enrollmentCount}/{cls.capacity} {t('course:discovery.students')}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </TooltipProvider>

                  {/* Enroll Button */}
                  {(() => {
                    const firstAvailableClass = getFirstAvailableClass(course.classes);
                    const isFullyBooked = !firstAvailableClass;
                    const isEnrolled = effectiveEnrolledCourseIds.has(course.id);
                    const isLoading = !!firstAvailableClass && enrollingClassId === firstAvailableClass.id;

                    return (
                  <Button
                    size="sm"
                    className="w-full mt-2"
                    disabled={isEnrolled || isFullyBooked || isLoading}
                    onClick={() => {
                      if (firstAvailableClass) {
                        handleEnroll(firstAvailableClass.id);
                      }
                    }}
                    variant={isEnrolled || isFullyBooked ? 'outline' : 'emphasis'}
                  >
                    {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {isEnrolled
                      ? t('course:discovery.enrolled')
                      : isFullyBooked
                        ? t('course:discovery.classFull')
                        : t('course:discovery.enroll')}
                  </Button>
                    );
                  })()}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="animate-in fade-in-50 duration-300 bg-background">
          {/* Header Row - Hidden on mobile */}
          <div className="hidden md:block px-6 md:px-8 lg:px-10 py-4 border-b border-border">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
              <div className="col-span-3">{t('course:discovery.courseName')}</div>
              <div className="col-span-2">{t('course:instructorLabel')}</div>
              <div className="col-span-3">{t('course:discovery.class')}</div>
              <div className="col-span-2 text-center">{t('course:discovery.capacity')}</div>
              <div className="col-span-2 text-right">{t('common:edit')}</div>
            </div>
          </div>

          {/* List Content */}
          <div className="divide-y divide-border/50">
            {courses.map((course) => {
              const isExpanded = expandedCourses.has(course.id);

              return (
                <div key={course.id}>
                  {/* Mobile Layout - Course Level */}
                  <div className="md:hidden">
                    {/* Course Header - Always clickable */}
                    <div
                      className="px-4 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => toggleCourse(course.id)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Teacher Avatar */}
                        <Avatar className="h-12 w-12 flex-shrink-0 ring-2 ring-primary/20">
                          {course.teacher.picture && (
                            <AvatarImage src={course.teacher.picture} alt={course.teacher.name} />
                          )}
                          <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-primary/20 to-accent/20">
                            {course.teacher.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        {/* Course Info */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{course.name}</span>
                            {course.code && (
                              <Badge variant="secondary" className="text-xs font-mono">
                                {course.code}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{course.teacher.name}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{course.classes.length} {t('course:discovery.class')}</span>
                            {effectiveEnrolledCourseIds.has(course.id) && (
                                <Badge variant="outline" className="text-xs">
                                  {t('course:discovery.enrolled')}
                                </Badge>
                            )}
                          </div>
                        </div>

                        {/* Expand Icon - Always shown */}
                        <div className="flex-shrink-0 pt-1">
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Class List - Expandable for all courses */}
                    {isExpanded && (
                      <div className="bg-muted/20 border-t border-border/50">
                        {course.classes.map((cls, index) => {
                          const capacityPercent = cls.capacity ? (cls.enrollmentCount / cls.capacity) * 100 : 0;
                          const isFull = cls.isFull || capacityPercent >= 100;

                          return (
                            <div
                              key={cls.id}
                              className={`px-4 py-3 ${index !== course.classes.length - 1 ? 'border-b border-border/30' : ''}`}
                            >
                              <div className="space-y-2.5">
                                {/* Class Name */}
                                <div className="font-medium text-sm">{cls.name}</div>

                                {/* Schedule and Capacity */}
                                <div className="space-y-1">
                                  {cls.schedule && (
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      <span>{cls.schedule.weekday}</span>
                                      {cls.schedule.room && (
                                        <>
                                          <span>•</span>
                                          <MapPin className="h-3 w-3" />
                                          <span>{cls.schedule.room}</span>
                                        </>
                                      )}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Users className="h-3 w-3" />
                                    <span>
                                      {cls.enrollmentCount}
                                      {cls.capacity && `/${cls.capacity}`}
                                    </span>
                                    {cls.capacity && (
                                      <Progress value={capacityPercent} className="h-1 w-20" />
                                    )}
                                  </div>
                                </div>

                                {/* Enroll Button */}
                                <Button
                                  size="sm"
                                  disabled={effectiveEnrolledCourseIds.has(course.id) || isFull || enrollingClassId === cls.id}
                                  onClick={() => handleEnroll(cls.id)}
                                  variant={effectiveEnrolledCourseIds.has(course.id) || isFull ? 'outline' : 'emphasis'}
                                  className="w-full"
                                >
                                  {enrollingClassId === cls.id && (
                                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                                  )}
                                  <span className="text-xs">
                                    {effectiveEnrolledCourseIds.has(course.id)
                                      ? t('course:discovery.enrolled')
                                      : isFull
                                        ? t('course:discovery.classFull')
                                        : t('course:discovery.enroll')}
                                  </span>
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Desktop Layout - Keep per-class rows */}
                  {course.classes.map((cls) => {
                    const capacityPercent = cls.capacity ? (cls.enrollmentCount / cls.capacity) * 100 : 0;
                    const isFull = cls.isFull || capacityPercent >= 100;

                    return (
                      <div
                        key={`${course.id}-${cls.id}`}
                        className="hidden md:block px-6 md:px-8 lg:px-10 py-4 hover:bg-muted/30 transition-colors"
                      >
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Course Name */}
                      <div className="col-span-3">
                        <div className="flex flex-col gap-1.5">
                          <span className="font-semibold text-sm">{course.name}</span>
                          {course.code && (
                            <Badge variant="secondary" className="w-fit text-xs font-mono">
                              {course.code}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Teacher */}
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 flex-shrink-0 ring-1 ring-border/50">
                            {course.teacher.picture && (
                              <AvatarImage src={course.teacher.picture} alt={course.teacher.name} />
                            )}
                            <AvatarFallback className="text-xs font-semibold">
                              {course.teacher.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium truncate">{course.teacher.name}</span>
                        </div>
                      </div>

                      {/* Class */}
                      <div className="col-span-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-sm">{cls.name}</span>
                          {cls.schedule && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{cls.schedule.weekday}</span>
                              {cls.schedule.room && (
                                <>
                                  <span>•</span>
                                  <MapPin className="h-3 w-3" />
                                  <span>{cls.schedule.room}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Capacity */}
                      <div className="col-span-2 flex flex-col items-center gap-1.5">
                        <div className={`text-sm font-semibold ${isFull ? 'text-destructive' : 'text-foreground'}`}>
                          {cls.enrollmentCount}
                          {cls.capacity && <span className="text-muted-foreground">/{cls.capacity}</span>}
                        </div>
                        {cls.capacity && <Progress value={capacityPercent} className="h-1 w-16" />}
                      </div>

                      {/* Action */}
                      <div className="col-span-2 text-right">
                        <Button
                          size="sm"
                          disabled={effectiveEnrolledCourseIds.has(course.id) || isFull || enrollingClassId === cls.id}
                          onClick={() => handleEnroll(cls.id)}
                          variant={effectiveEnrolledCourseIds.has(course.id) || isFull ? 'outline' : 'emphasis'}
                        >
                          {enrollingClassId === cls.id && (
                            <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                          )}
                          <span className="text-xs">
                            {effectiveEnrolledCourseIds.has(course.id)
                              ? t('course:discovery.enrolled')
                              : isFull
                                ? t('course:discovery.classFull')
                                : t('course:discovery.enroll')}
                          </span>
                        </Button>
                      </div>
                    </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
