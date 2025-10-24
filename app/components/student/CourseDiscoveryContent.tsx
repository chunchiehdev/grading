'use client';

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen, Grid3x3, List, Users, Clock, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import type { CourseDiscoveryContentProps } from '@/types/course';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function CourseDiscoveryContent({ student, courses, enrolledCourseIds, searchQuery = '', isSearching = false }: CourseDiscoveryContentProps) {
  const { t } = useTranslation(['course']);
  const [enrollingClassId, setEnrollingClassId] = useState<string | null>(null);
  const [locallyEnrolled, setLocallyEnrolled] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // 合併從 props 來的 enrolledCourseIds 和本地新增的
  const enrolledClasses = new Set([...enrolledCourseIds, ...locallyEnrolled]);

  // Handle view mode change
  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
  };

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

      // Update local enrolled set
      const courseId = courses.find((c) => c.classes.some((cl) => cl.id === classId))?.id;
      if (courseId) {
        setLocallyEnrolled(prev => new Set([...prev, courseId]));
      }

      toast.success(t('course:discovery.enrollmentSuccess', { courseName }));
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
        <h3 className="text-lg font-semibold text-foreground mb-2">No Courses Found</h3>
        <p className="text-muted-foreground max-w-sm">
          No courses match your search for <strong>"{searchQuery}"</strong>. Try a different search term.
        </p>
      </div>
    );
  }

  // Empty state (no search, no courses)
  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
        <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">{t('course:discovery.empty')}</h3>
        <p className="text-muted-foreground max-w-sm">{t('course:discovery.emptyDescription')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Mode Toggle - Using Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => handleViewModeChange(v as 'grid' | 'list')} className="w-full">
        <TabsList className="inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground gap-1">
          <TabsTrigger
            value="grid"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm hover:text-foreground gap-2"
          >
            <Grid3x3 className="h-4 w-4" />
            <span className="hidden sm:inline text-xs lg:text-sm">{t('course:discovery.gridView')}</span>
          </TabsTrigger>
          <TabsTrigger
            value="list"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm hover:text-foreground gap-2"
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline text-xs lg:text-sm">{t('course:discovery.listView')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-4 animate-in fade-in-50 duration-300" data-state="active">
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
                                      Full
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
                                <p>{cls.enrollmentCount}/{cls.capacity} students</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </TooltipProvider>

                  {/* Enroll Button */}
                  <Button
                    size="sm"
                    className="w-full mt-2"
                    disabled={enrolledClasses.has(course.id) || enrollingClassId === course.id}
                    onClick={() => {
                      const firstClass = course.classes[0];
                      if (firstClass) handleEnroll(firstClass.id, course.name);
                    }}
                    variant={enrolledClasses.has(course.id) ? 'outline' : 'default'}
                  >
                    {enrollingClassId === course.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {enrolledClasses.has(course.id)
                      ? t('course:discovery.enrolled')
                      : t('course:discovery.enroll')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-4 animate-in fade-in-50 duration-300" data-state="active">
          <div className="rounded-lg border border-border/50 overflow-hidden bg-card">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-muted/30">
                  <TableHead className="font-semibold">{t('course:discovery.courseName')}</TableHead>
                  <TableHead className="font-semibold">{t('course:instructorLabel')}</TableHead>
                  <TableHead className="font-semibold">{t('course:discovery.class')}</TableHead>
                  <TableHead className="font-semibold text-center">{t('course:discovery.capacity')}</TableHead>
                  <TableHead className="font-semibold text-right w-[140px]">{t('common:edit')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) =>
                  course.classes.map((cls) => {
                    const capacityPercent = cls.capacity ? (cls.enrollmentCount / cls.capacity) * 100 : 0;
                    const isFull = cls.isFull || capacityPercent >= 100;

                    return (
                      <TableRow
                        key={`${course.id}-${cls.id}`}
                        className="hover:bg-muted/40 transition-colors border-b border-border/30 last:border-b-0"
                      >
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            <span className="font-semibold text-sm line-clamp-1">{course.name}</span>
                            {course.code && (
                              <Badge variant="secondary" className="w-fit text-xs font-mono">
                                {course.code}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5">
                            <span className="font-semibold text-sm">{cls.name}</span>
                            {cls.schedule && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3 flex-shrink-0" />
                                <span>{cls.schedule.weekday}</span>
                                {cls.schedule.room && (
                                  <>
                                    <span>•</span>
                                    <MapPin className="h-3 w-3 flex-shrink-0" />
                                    <span>{cls.schedule.room}</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-center gap-1.5">
                            <div className={`text-sm font-semibold ${isFull ? 'text-destructive' : 'text-foreground'}`}>
                              {cls.enrollmentCount}
                              {cls.capacity && <span className="text-muted-foreground">/{cls.capacity}</span>}
                            </div>
                            {cls.capacity && (
                              <Progress
                                value={capacityPercent}
                                className="h-1 w-16"
                              />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            disabled={enrolledClasses.has(course.id) || isFull || enrollingClassId === cls.id}
                            onClick={() => handleEnroll(cls.id, course.name)}
                            variant={enrolledClasses.has(course.id) || isFull ? 'outline' : 'default'}
                          >
                            {enrollingClassId === cls.id && (
                              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            )}
                            <span className="hidden sm:inline text-xs">
                              {enrolledClasses.has(course.id)
                                ? t('course:discovery.enrolled')
                                : isFull
                                  ? t('course:discovery.classFull')
                                  : t('course:discovery.enroll')}
                            </span>
                            <span className="sm:hidden text-xs">
                              {enrolledClasses.has(course.id) ? '✓' : isFull ? 'Full' : '+'}
                            </span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
