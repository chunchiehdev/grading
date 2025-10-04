import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { useLoaderData, useActionData, Form, Await, Link } from 'react-router';
import { Suspense, useState } from 'react';
import { Plus } from 'lucide-react';

import { requireTeacher } from '@/services/auth.server';
import { getCourseById, type CourseInfo } from '@/services/course.server';
import { createAssignmentArea, type CreateAssignmentAreaData } from '@/services/assignment-area.server';
import { listRubrics } from '@/services/rubric.server';
import { listClassesByCourse, type ClassInfo } from '@/services/class.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { DatePicker } from '@/components/ui/DatePicker';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTranslation } from 'react-i18next';

interface LoaderData {
  teacher: Promise<{ id: string; email: string; role: string; name: string }>;
  course: CourseInfo;
  rubrics: any[];
  classes: ClassInfo[];
}

interface ActionData {
  success?: boolean;
  error?: string;
}

export async function loader({ request, params }: LoaderFunctionArgs): Promise<LoaderData> {
  const teacher = await requireTeacher(request);
  const courseId = params.courseId;

  if (!courseId) {
    throw new Response('Course ID is required', { status: 400 });
  }

  const [course, rubricsResult, classes] = await Promise.all([
    getCourseById(courseId, teacher.id),
    listRubrics(teacher.id),
    listClassesByCourse(courseId, teacher.id),
  ]);

  if (!course) {
    throw new Response('Course not found', { status: 404 });
  }

  // Create a promise for the teacher to enable Suspense
  const teacherPromise = new Promise<{ id: string; email: string; role: string; name: string }>(async (resolve) => {
    await new Promise((res) => setTimeout(res, 100)); // Small delay for demo
    resolve(teacher);
  });

  return {
    teacher: teacherPromise,
    course,
    rubrics: rubricsResult.rubrics?.filter((r: any) => r.isActive) || [],
    classes,
  };
}

export async function action({ request, params }: ActionFunctionArgs): Promise<ActionData | Response> {
  const teacher = await requireTeacher(request);
  const courseId = params.courseId;
  const formData = await request.formData();

  if (!courseId) {
    return { success: false, error: 'Course ID is required' };
  }

  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const rubricId = formData.get('rubricId') as string;
  const dueDate = formData.get('dueDate') as string;
  const classTarget = formData.get('classTarget') as string; // 'all' or 'specific'
  const classId = formData.get('classId') as string;

  // Basic validation
  if (!name || name.trim().length === 0) {
    return { success: false, error: 'Assignment name is required' };
  }

  if (!rubricId) {
    return { success: false, error: 'Please select a rubric' };
  }

  try {
    const assignmentData: CreateAssignmentAreaData = {
      name: name.trim(),
      description: description?.trim() || undefined,
      rubricId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      classId: classTarget === 'specific' ? classId : null,
    };

    const assignment = await createAssignmentArea(teacher.id, courseId, assignmentData);

    // Redirect to the manage page for the newly created assignment
    return redirect(`/teacher/courses/${courseId}/assignments/${assignment.id}/manage`);
  } catch (error) {
    console.error('Error creating assignment area:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create assignment. Please try again.',
    };
  }
}

export default function NewAssignmentArea() {
  const { teacher, course, rubrics, classes } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const { t } = useTranslation(['course', 'common']);

  // Complete Skeleton that matches final layout exactly
  const PageSkeleton = () => (
    <div className="bg-background text-foreground">
      {/* PageHeader Skeleton */}
      <header className="bg-background py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <Skeleton className="h-9 w-64" /> {/* Title */}
              <div className="mt-3 px-1">
                <Skeleton className="h-5 w-80" /> {/* Subtitle */}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-10 w-40" /> {/* Back button */}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          {/* CardHeader */}
          <div className="flex flex-col space-y-1.5 p-6">
            <Skeleton className="h-6 w-32" /> {/* CardTitle */}
            <Skeleton className="h-4 w-96" /> {/* CardDescription */}
          </div>

          {/* CardContent */}
          <div className="p-6 pt-0">
            <div className="space-y-6">
              {/* Assignment Name */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" /> {/* Label */}
                <Skeleton className="h-10 w-full" /> {/* Input */}
              </div>
              {/* Description */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" /> {/* Label */}
                <Skeleton className="h-24 w-full" /> {/* Textarea */}
              </div>
              {/* Rubric Selection */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" /> {/* Label */}
                <Skeleton className="h-10 w-full" /> {/* Select */}
              </div>
              {/* Due Date */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" /> {/* Label */}
                <Skeleton className="h-10 w-full" /> {/* Date input */}
              </div>
              {/* Action Buttons */}
              <div className="flex justify-end space-x-4">
                <Skeleton className="h-10 w-16" /> {/* Cancel */}
                <Skeleton className="h-10 w-24" /> {/* Create */}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );

  return (
    <Suspense fallback={<PageSkeleton />}>
      <Await resolve={teacher}>
        {(resolvedTeacher) => (
          <AssignmentForm teacher={resolvedTeacher} course={course} rubrics={rubrics} classes={classes} actionData={actionData} />
        )}
      </Await>
    </Suspense>
  );
}

function AssignmentForm({
  teacher,
  course,
  rubrics,
  classes,
  actionData,
}: {
  teacher: { id: string; email: string; role: string; name: string };
  course: CourseInfo;
  rubrics: LoaderData['rubrics'];
  classes: ClassInfo[];
  actionData: ActionData | undefined;
}) {
  const { t } = useTranslation(['course', 'common']);
  const [classTarget, setClassTarget] = useState<'all' | 'specific'>('all');
  console.log(course.name, 'Course Name');

  return (
    <div className="bg-background text-foreground">
      <PageHeader
        title={t('course:assignment.area.createTitle')}
        subtitle={t('course:assignment.area.createSubtitle', { courseName: course.name })}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="bg-card text-card-foreground border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {t('course:assignment.area.details')}
            </CardTitle>
            <CardDescription>
              {t('course:assignment.area.detailsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">
                  {t('course:assignment.area.nameLabel')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder={t('course:assignment.area.namePlaceholder')}
                  className="bg-background border-border focus:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('course:assignment.area.descriptionLabel')}</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={4}
                  placeholder={t('course:assignment.area.descriptionPlaceholder')}
                  className="bg-background border-border focus:ring-ring"
                />
              </div>

              {/* Class Target Selection */}
              <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                <Label className="text-base font-medium">目標班次</Label>
                <input type="hidden" name="classTarget" value={classTarget} />
                <RadioGroup value={classTarget} onValueChange={(value) => setClassTarget(value as 'all' | 'specific')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all-classes" />
                    <Label htmlFor="all-classes" className="font-normal cursor-pointer">
                      所有班次（此課程的所有班次都可以看到此作業）
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="specific" id="specific-class" />
                    <Label htmlFor="specific-class" className="font-normal cursor-pointer">
                      指定班次
                    </Label>
                  </div>
                </RadioGroup>

                {classTarget === 'specific' && (
                  <div className="mt-3 space-y-2">
                    <Label htmlFor="classId">選擇班次 <span className="text-destructive">*</span></Label>
                    <Select name="classId" required={classTarget === 'specific'}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="選擇要派發作業的班次" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name} ({cls._count.enrollments} 位學生)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      只有選定班次的學生可以看到並提交此作業
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rubricId">
                  {t('course:assignment.area.rubricLabel')} <span className="text-destructive">*</span>
                </Label>
                <Select name="rubricId" required>
                  <SelectTrigger className="bg-background border-border focus:ring-ring">
                    <SelectValue placeholder={t('course:assignment.area.rubricPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {rubrics.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        {t('course:assignment.area.noRubrics')}{' '}
                        <Link to="/teacher/rubrics/new" className="text-primary hover:underline">
                          {t('course:assignment.area.createRubricFirst')}
                        </Link>
                        .
                      </div>
                    ) : (
                      rubrics.map((rubric) => (
                        <SelectItem key={rubric.id} value={rubric.id}>
                          <div>
                            <div className="font-medium">{rubric.name}</div>
                            
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate" className="flex items-center gap-2">
                  {t('course:assignment.area.dueDateLabel')}
                </Label>
                <DatePicker name="dueDate" />
              </div>

              {actionData?.error && (
                <Alert variant="destructive">
                  <AlertDescription>{actionData.error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end space-x-4 pt-4">
                <Button asChild variant="outline">
                  <Link to={`/teacher/courses/${course.id}`}>{t('course:assignment.area.cancel')}</Link>
                </Button>
                <Button type="submit" disabled={rubrics.length === 0}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('course:assignment.area.createButton')}
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
