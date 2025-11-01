import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { useLoaderData, useActionData, Form, Await, Link } from 'react-router';
import { Suspense, useState } from 'react';

import { requireTeacher } from '@/services/auth.server';
import { getCourseById, type CourseInfo } from '@/services/course.server';
import { createAssignmentArea, type CreateAssignmentAreaData } from '@/services/assignment-area.server';
import { listRubrics } from '@/services/rubric.server';
import { listClassesByCourse, type ClassInfo } from '@/services/class.server';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { DatePicker } from '@/components/ui/DatePicker';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FormPageLayout, FormSection, FormActionButtons } from '@/components/forms';
import { ReferenceFileUpload } from '@/components/grading/ReferenceFileUpload';
import { CustomInstructionsField } from '@/components/teacher/CustomInstructionsField';
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
  const referenceFileIds = formData.get('referenceFileIds') as string; // JSON string
  const customGradingPrompt = formData.get('customGradingPrompt') as string;

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

    // Update reference files and custom grading prompt if provided
    const updateData: any = {};

    if (referenceFileIds && referenceFileIds.trim() !== '') {
      try {
        const fileIds = JSON.parse(referenceFileIds);
        // Filter out null/undefined values and only save if we have valid file IDs
        const validFileIds = fileIds.filter((id: any) => id && typeof id === 'string');
        if (validFileIds.length > 0) {
          updateData.referenceFileIds = JSON.stringify(validFileIds);
        }
      } catch (error) {
        console.error('Failed to parse referenceFileIds:', error);
      }
    }

    if (customGradingPrompt && customGradingPrompt.trim() !== '') {
      updateData.customGradingPrompt = customGradingPrompt.trim();
    }

    if (Object.keys(updateData).length > 0) {
      const { db } = await import('@/lib/db.server');
      await db.assignmentArea.update({
        where: { id: assignment.id },
        data: updateData,
      });
    }

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
    <div className="min-h-screen bg-background">
      {/* Centered header section */}
      <div className="max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 lg:pt-16 xl:pt-20 pb-8 lg:pb-12 text-center">
        <Skeleton className="h-12 w-64 mx-auto mb-4" /> {/* Title */}
        <Skeleton className="h-6 w-80 mx-auto" /> {/* Subtitle */}
      </div>

      {/* Form container */}
      <div className="max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 lg:pb-32">
        <div className="space-y-6 lg:space-y-8 xl:space-y-10">
          {/* Form section skeleton */}
          <div className="bg-card rounded-2xl shadow-sm p-5 sm:p-6 lg:p-8 xl:p-10">
            <div className="space-y-6">
              {/* Assignment Name */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" /> {/* Label */}
                <Skeleton className="h-14 w-full" /> {/* Input */}
              </div>
              {/* Description */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" /> {/* Label */}
                <Skeleton className="h-24 w-full" /> {/* Textarea */}
              </div>
              {/* Rubric Selection */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" /> {/* Label */}
                <Skeleton className="h-14 w-full" /> {/* Select */}
              </div>
              {/* Due Date */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" /> {/* Label */}
                <Skeleton className="h-14 w-full" /> {/* Date input */}
              </div>
            </div>
          </div>
          {/* Action Buttons skeleton */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-5 xl:gap-6 pt-4">
            <Skeleton className="flex-1 h-14" /> {/* Cancel */}
            <Skeleton className="flex-1 h-14" /> {/* Submit */}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Suspense fallback={<PageSkeleton />}>
      <Await resolve={teacher}>
        {(resolvedTeacher) => (
          <AssignmentForm
            teacher={resolvedTeacher}
            course={course}
            rubrics={rubrics}
            classes={classes}
            actionData={actionData}
          />
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
  const [referenceFileIds, setReferenceFileIds] = useState<string[]>([]);
  const [customGradingPrompt, setCustomGradingPrompt] = useState<string>('');

  return (
    <FormPageLayout
      title={t('course:assignment.area.createTitle')}
      subtitle={t('course:assignment.area.createSubtitle', { courseName: course.name })}
    >
      <Form method="post" className="space-y-6 lg:space-y-8 xl:space-y-10">
        {actionData?.error && (
          <Alert variant="destructive" className="rounded-2xl lg:text-base">
            <AlertDescription>{actionData.error}</AlertDescription>
          </Alert>
        )}

        <FormSection>
          <div className="space-y-2 lg:space-y-3">
            <Label htmlFor="name" className="text-base lg:text-lg xl:text-xl font-medium text-foreground">
              {t('course:assignment.area.nameLabel')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              required
              placeholder={t('course:assignment.area.namePlaceholder')}
              className="rounded-xl h-11 sm:h-12 lg:h-14 xl:h-16 text-base lg:text-lg xl:text-xl"
            />
          </div>

          <div className="space-y-2 lg:space-y-3">
            <Label htmlFor="description" className="text-base lg:text-lg xl:text-xl font-medium text-foreground">
              {t('course:assignment.area.descriptionLabel')}
            </Label>
            <Textarea
              id="description"
              name="description"
              rows={8}
              placeholder={t('course:assignment.area.descriptionPlaceholder')}
              className="rounded-xl text-base lg:text-lg xl:text-xl"
            />
          </div>

          {/* Class Target Selection */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
            <Label className="text-base lg:text-lg xl:text-xl font-medium text-foreground">目標班次</Label>
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
                <Label htmlFor="classId" className="text-base lg:text-lg xl:text-xl font-medium text-foreground">
                  選擇班次 <span className="text-destructive">*</span>
                </Label>
                <Select name="classId" required={classTarget === 'specific'}>
                  <SelectTrigger className="rounded-xl h-11 sm:h-12 lg:h-14 xl:h-16 text-base lg:text-lg xl:text-xl">
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
                <p className="text-sm text-muted-foreground">只有選定班次的學生可以看到並提交此作業</p>
              </div>
            )}
          </div>

          <div className="space-y-2 lg:space-y-3">
            <Label htmlFor="rubricId" className="text-base lg:text-lg xl:text-xl font-medium text-foreground">
              {t('course:assignment.area.rubricLabel')} <span className="text-destructive">*</span>
            </Label>
            <Select name="rubricId" required>
              <SelectTrigger className="rounded-xl h-11 sm:h-12 lg:h-14 xl:h-16 text-base lg:text-lg xl:text-xl">
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

          <div className="space-y-2 lg:space-y-3">
            <Label htmlFor="dueDate" className="text-base lg:text-lg xl:text-xl font-medium text-foreground">
              {t('course:assignment.area.dueDateLabel')}
            </Label>
            <DatePicker name="dueDate" />
          </div>

          {/* AI Grading Context - Reference Files */}
          <div className="space-y-2 lg:space-y-3 pt-4 border-t border-border">
            <div className="space-y-1">
              <Label className="text-base lg:text-lg xl:text-xl font-medium text-foreground">AI 評分知識庫</Label>
              <p className="text-sm text-muted-foreground">
                上傳參考資料（如課程講義、標準答案）讓 AI 根據這些內容評分
              </p>
            </div>
            <ReferenceFileUpload value={referenceFileIds} onChange={setReferenceFileIds} maxFiles={5} />
            <input type="hidden" name="referenceFileIds" value={JSON.stringify(referenceFileIds)} />
          </div>

          {/* AI Grading Context - Custom Instructions */}
          <div className="space-y-2 lg:space-y-3">
            <CustomInstructionsField
              value={customGradingPrompt}
              onChange={setCustomGradingPrompt}
              maxLength={5000}
              placeholder="例如：重點檢查學生是否正確套用公式。注意單位換算和計算步驟的完整性。"
            />
            <input type="hidden" name="customGradingPrompt" value={customGradingPrompt} />
          </div>
        </FormSection>

        <FormActionButtons
          cancelTo={`/teacher/courses/${course.id}`}
          submitText={t('course:assignment.area.createButton')}
          cancelText={t('course:assignment.area.cancel')}
          isDisabled={rubrics.length === 0}
        />
      </Form>
    </FormPageLayout>
  );
}
