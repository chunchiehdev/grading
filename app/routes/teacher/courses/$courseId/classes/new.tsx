import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { useLoaderData, useActionData, Form } from 'react-router';
import { Users, MapPin, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { requireTeacher } from '@/services/auth.server';
import { getCourseById } from '@/services/course.server';
import { createClass } from '@/services/class.server';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PeriodSelector } from '@/components/course/PeriodSelector';
import { FormPageLayout, FormSection, FormActionButtons } from '@/components/forms';

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
    <FormPageLayout
      title={t('course:classForm.newClass')}
      subtitle={`${t('course:classForm.createFor')} ${course.name}`}
    >
      <Form method="post" className="space-y-6 lg:space-y-8 xl:space-y-10">
        {/* 錯誤提示 */}
        {actionData?.error && (
          <Alert variant="destructive" className="rounded-2xl lg:text-base">
            <AlertDescription>{t(`course:${actionData.error}`)}</AlertDescription>
          </Alert>
        )}

        {/* 基本資訊區塊 */}
        <FormSection>
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
        </FormSection>

        {/* 時間地點區塊 */}
        <FormSection>
          <div className="space-y-2 lg:space-y-3">
            <Label className="text-base lg:text-lg xl:text-xl font-medium text-foreground flex items-center gap-2 lg:gap-3">
              <Clock className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 text-muted-foreground" />
              {t('course:classForm.schedule')}
            </Label>
            <p className="text-sm lg:text-base xl:text-lg text-muted-foreground mb-4">
              {t('course:classForm.scheduleDescription')}
            </p>
            <PeriodSelector required={true} weekdayName="weekday" periodName="periodCode" showPreview={true} />
          </div>

          <div className="space-y-2 lg:space-y-3 pt-2 lg:pt-4">
            <Label
              htmlFor="room"
              className="text-base lg:text-lg xl:text-xl font-medium text-foreground flex items-center gap-2 lg:gap-3"
            >
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
        </FormSection>

        {/* 人數限制區塊 */}
        <FormSection>
          <div className="space-y-2 lg:space-y-3">
            <Label
              htmlFor="capacity"
              className="text-base lg:text-lg xl:text-xl font-medium text-foreground flex items-center gap-2 lg:gap-3"
            >
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
        </FormSection>

        {/* Action Buttons */}
        <FormActionButtons
          cancelTo={`/teacher/courses/${course.id}`}
          submitText={t('course:classForm.create')}
          cancelText={t('course:classForm.cancel')}
        />
      </Form>
    </FormPageLayout>
  );
}
