'use client';

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen, Grid3x3, List, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import type { CourseDiscoveryContentProps } from '@/types/course';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import gsap from 'gsap';

export function CourseDiscoveryContent({ student, courses, enrolledCourseIds }: CourseDiscoveryContentProps) {
  const { t } = useTranslation(['course']);
  const [enrollingClassId, setEnrollingClassId] = useState<string | null>(null);
  const [enrolledClasses, setEnrolledClasses] = useState<Set<string>>(enrolledCourseIds);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');

  // Refs for GSAP animations
  const gridIconRef = useRef<SVGSVGElement>(null);
  const listIconRef = useRef<SVGSVGElement>(null);

  // Animation function for icon
  const animateIcon = (iconRef: React.RefObject<SVGSVGElement>) => {
    if (!iconRef.current) return;

    gsap.fromTo(
      iconRef.current,
      {
        scale: 1,
        rotate: 0,
      },
      {
        scale: 1.2,
        rotate: 180,
        duration: 0.3,
        ease: 'back.out',
        yoyo: true,
        repeat: 1,
      }
    );
  };

  // Handle view mode change with animation
  const handleViewModeChange = (mode: 'grid' | 'list') => {
    if (mode === 'grid') {
      animateIcon(gridIconRef);
    } else {
      animateIcon(listIconRef);
    }
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
        <h3 className="text-lg font-semibold text-foreground mb-2">{t('course:discovery.empty')}</h3>
        <p className="text-muted-foreground max-w-sm">{t('course:discovery.emptyDescription')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar: Search + View Mode Toggle */}
      <div className="flex items-center justify-between gap-4">
        {/* Left: Search Box */}
        <div className="flex-1 max-w-md relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={t('course:discovery.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9 h-9 text-sm"
              aria-label={t('course:discovery.search')}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Right: View Mode Toggle - Icon Only */}
        <div className="inline-flex rounded-lg border border-border bg-muted p-1 gap-1">
          {/* Grid View Button */}
          <button
            onClick={() => handleViewModeChange('grid')}
            className={`p-2 rounded transition-all ${
              viewMode === 'grid'
                ? 'bg-background shadow-sm'
                : 'hover:bg-background/50'
            }`}
            aria-label={t('course:discovery.gridView')}
            title={t('course:discovery.gridView')}
          >
            <Grid3x3
              ref={gridIconRef}
              className="h-5 w-5 text-foreground"
              style={{ transformOrigin: 'center' }}
            />
          </button>

          {/* List View Button */}
          <button
            onClick={() => handleViewModeChange('list')}
            className={`p-2 rounded transition-all ${
              viewMode === 'list'
                ? 'bg-background shadow-sm'
                : 'hover:bg-background/50'
            }`}
            aria-label={t('course:discovery.listView')}
            title={t('course:discovery.listView')}
          >
            <List
              ref={listIconRef}
              className="h-5 w-5 text-foreground"
              style={{ transformOrigin: 'center' }}
            />
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {courses.map((course) => (
            <Card key={course.id} className="flex flex-col transition-all hover:shadow-lg dark:hover:shadow-lg/50">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <CardTitle className="text-base line-clamp-2">{course.name}</CardTitle>
                  {course.code && (
                    <Badge variant="outline" className="shrink-0">
                      {course.code}
                    </Badge>
                  )}
                </div>
                {course.description && <CardDescription className="line-clamp-2">{course.description}</CardDescription>}
              </CardHeader>

              <CardContent className="flex-1 flex flex-col justify-between space-y-4">
                {/* Teacher info */}
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    {course.teacher.picture && <AvatarImage src={course.teacher.picture} alt={course.teacher.name} />}
                    <AvatarFallback>{course.teacher.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{t('course:discovery.instructor')}</p>
                    <p className="text-sm font-medium truncate">{course.teacher.name}</p>
                  </div>
                </div>

                {/* Classes */}
                <div className="space-y-2">
                  {course.classes.map((cls) => (
                    <div key={cls.id} className="p-3 rounded-lg bg-muted/50 space-y-2 text-sm">
                      <div className="font-medium">{cls.name}</div>

                      {/* Schedule */}
                      {cls.schedule && (
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>
                            <span className="font-medium">{t('course:discovery.schedule')}:</span> {cls.schedule.weekday}
                          </div>
                          <div>
                            <span className="font-medium">{t('course:discovery.capacity')}:</span> {cls.enrollmentCount}
                            {cls.capacity ? `/${cls.capacity}` : ''} {t('course:discovery.students')}
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
                        disabled={enrolledClasses.has(course.id) || cls.isFull || enrollingClassId === cls.id}
                        onClick={() => handleEnroll(cls.id, course.name)}
                        variant={enrolledClasses.has(course.id) || cls.isFull ? 'outline' : 'default'}
                      >
                        {enrollingClassId === cls.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-semibold">{t('course:discovery.courseName')}</TableHead>
                <TableHead className="font-semibold">{t('course:instructorLabel')}</TableHead>
                <TableHead className="font-semibold">{t('course:discovery.class')}</TableHead>
                <TableHead className="font-semibold text-center">{t('course:discovery.capacity')}</TableHead>
                <TableHead className="font-semibold text-right w-[140px]">{t('common:edit')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) =>
                course.classes.map((cls) => (
                  <TableRow key={`${course.id}-${cls.id}`} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium line-clamp-1">{course.name}</span>
                        {course.code && <Badge variant="outline" className="w-fit text-xs">{course.code}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 flex-shrink-0">
                          {course.teacher.picture && <AvatarImage src={course.teacher.picture} alt={course.teacher.name} />}
                          <AvatarFallback className="text-xs">{course.teacher.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate">{course.teacher.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-sm">{cls.name}</span>
                        {cls.schedule && (
                          <span className="text-xs text-muted-foreground">
                            {cls.schedule.weekday}
                            {cls.schedule.room && ` • ${cls.schedule.room}`}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      <span className={cls.isFull ? 'text-destructive font-medium' : ''}>
                        {cls.enrollmentCount}
                        {cls.capacity ? `/${cls.capacity}` : ''}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        disabled={enrolledClasses.has(course.id) || cls.isFull || enrollingClassId === cls.id}
                        onClick={() => handleEnroll(cls.id, course.name)}
                        variant={enrolledClasses.has(course.id) || cls.isFull ? 'outline' : 'default'}
                      >
                        {enrollingClassId === cls.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {enrolledClasses.has(course.id)
                          ? t('course:discovery.enrolled')
                          : cls.isFull
                            ? t('course:discovery.classFull')
                            : t('course:discovery.enroll')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
