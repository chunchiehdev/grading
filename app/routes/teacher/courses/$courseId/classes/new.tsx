import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { useLoaderData, useActionData, Form, Link } from 'react-router';
import { Users, MapPin, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { requireTeacher } from '@/services/auth.server';
import { getCourseById } from '@/services/course.server';
import { createClass } from '@/services/class.server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PeriodSelector } from '@/components/course/PeriodSelector';

interface LoaderData {
  teacher: { id: string; email: string; role: string };
  course: {
    id: string;
    name: string;
    description: string | null;
  };
}

interface ActionData {
  error?: string;
  success?: boolean;
}

export async function loader({ request, params }: LoaderFunctionArgs): Promise<LoaderData> {
  const teacher = await requireTeacher(request);
  const courseId = params.courseId!;
  const course = await getCourseById(courseId, teacher.id);

  if (!course) {
    throw new Response('Course not found', { status: 404 });
  }

  return { teacher, course };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const teacher = await requireTeacher(request);
  const courseId = params.courseId!;
  const formData = await request.formData();

  const name = formData.get('name') as string;
  const weekday = formData.get('weekday') as string;
  const periodCode = formData.get('periodCode') as string;
  const room = formData.get('room') as string;
  const capacityStr = formData.get('capacity') as string;

  if (!name || name.trim().length === 0) {
    return { error: 'classForm.classNameRequired' };
  }

  if (!weekday || !periodCode) {
    return { error: 'classForm.scheduleRequired' };
  }

  try {
    const schedule = {
      weekday,
      periodCode,
      room: room || '',
    };

    const classData = {
      courseId,
      name: name.trim(),
      schedule,
      capacity: capacityStr ? parseInt(capacityStr, 10) : null,
      assistantId: null,
    };

    await createClass(teacher.id, classData);
    return redirect(`/teacher/courses/${courseId}`);
  } catch (error) {
    console.error('Error creating class:', error);
    return { error: 'classForm.createError' };
  }
}

export default function NewClass() {
  const { course } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const { t } = useTranslation(['course', 'common']);

  return (
    <div className="min-h-screen bg-background">
      {/* 標題區 - 居中 */}
      <div className="max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 lg:pt-16 xl:pt-20 pb-8 lg:pb-12 text-center">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-semibold tracking-tight mb-3 lg:mb-4 xl:mb-6 text-foreground">
          {t('course:classForm.newClass')}
        </h1>
        <p className="text-base lg:text-lg xl:text-xl text-muted-foreground">
          {t('course:classForm.createFor')}{' '}
          <span className="font-medium text-foreground">{course.name}</span>
        </p>
      </div>

      {/* 表單區 - Apple 風格淺色背景區塊 */}
      <div className="max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 lg:pb-32">
        <Form method="post" className="space-y-6 lg:space-y-8 xl:space-y-10">
          {/* 錯誤提示 */}
          {actionData?.error && (
            <Alert variant="destructive" className="rounded-2xl lg:text-base">
              <AlertDescription>{t(`course:${actionData.error}`)}</AlertDescription>
            </Alert>
          )}

          {/* 基本資訊區塊 */}
          <div className="bg-card rounded-2xl shadow-sm p-5 sm:p-6 lg:p-8 xl:p-10 space-y-5 lg:space-y-6">
            <div className="space-y-2 lg:space-y-3">
              <Label htmlFor="name" className="text-base lg:text-lg xl:text-xl font-medium text-foreground">
                {t('course:classForm.className')}
              </Label>
              <Input
                id="name"
                name="name"
                required
                placeholder={t('course:classForm.classNamePlaceholder')}
                className="rounded-xl h-11 sm:h-12 lg:h-14 xl:h-16 text-base lg:text-lg xl:text-xl"
              />
            </div>
          </div>

          {/* 時間地點區塊 */}
          <div className="bg-card rounded-2xl shadow-sm p-5 sm:p-6 lg:p-8 xl:p-10 space-y-5 lg:space-y-6">
            <div className="space-y-2 lg:space-y-3">
              <Label className="text-base lg:text-lg xl:text-xl font-medium text-foreground flex items-center gap-2 lg:gap-3">
                <Clock className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 text-muted-foreground" />
                {t('course:classForm.schedule')}
              </Label>
              <p className="text-sm lg:text-base xl:text-lg text-muted-foreground mb-4">
                {t('course:classForm.scheduleDescription')}
              </p>
              <PeriodSelector
                required={true}
                weekdayName="weekday"
                periodName="periodCode"
                showPreview={true}
              />
            </div>

            <div className="space-y-2 lg:space-y-3 pt-2 lg:pt-4">
              <Label htmlFor="room" className="text-base lg:text-lg xl:text-xl font-medium text-foreground flex items-center gap-2 lg:gap-3">
                <MapPin className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 text-muted-foreground" />
                {t('course:classForm.roomOptional')}
              </Label>
              <Input
                id="room"
                name="room"
                placeholder={t('course:classForm.roomPlaceholder')}
                className="rounded-xl h-11 sm:h-12 lg:h-14 xl:h-16 text-base lg:text-lg xl:text-xl"
              />
            </div>
          </div>

          {/* 人數限制區塊 */}
          <div className="bg-card rounded-2xl shadow-sm p-5 sm:p-6 lg:p-8 xl:p-10 space-y-3 lg:space-y-4">
            <div className="space-y-2 lg:space-y-3">
              <Label htmlFor="capacity" className="text-base lg:text-lg xl:text-xl font-medium text-foreground flex items-center gap-2 lg:gap-3">
                <Users className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 text-muted-foreground" />
                {t('course:classForm.capacityOptional')}
              </Label>
              <Input
                id="capacity"
                name="capacity"
                type="number"
                min="1"
                placeholder={t('course:classForm.capacityPlaceholder')}
                className="rounded-xl h-11 sm:h-12 lg:h-14 xl:h-16 text-base lg:text-lg xl:text-xl"
              />
              <p className="text-sm lg:text-base xl:text-lg text-muted-foreground">
                {t('course:classForm.capacityDescription')}
              </p>
            </div>
          </div>

          {/* Apple 風格大按鈕 */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-5 xl:gap-6 pt-4 lg:pt-6 xl:pt-8">
            <Button
              asChild
              variant="secondary"
              className="flex-1 h-11 sm:h-12 lg:h-14 xl:h-16 rounded-xl text-base lg:text-lg xl:text-xl font-medium"
            >
              <Link to={`/teacher/courses/${course.id}`}>{t('course:classForm.cancel')}</Link>
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11 sm:h-12 lg:h-14 xl:h-16 rounded-xl text-base lg:text-lg xl:text-xl font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {t('course:classForm.create')}
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
