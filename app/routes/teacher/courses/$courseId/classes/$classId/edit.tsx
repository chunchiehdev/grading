import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { useLoaderData, useActionData, Form, Link } from 'react-router';
import { Users, MapPin, Clock, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { requireTeacher } from '@/services/auth.server';
import { getClassById, updateClass, deleteClass } from '@/services/class.server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PeriodSelector, type PeriodSelectorValue } from '@/components/course/PeriodSelector';

interface LoaderData {
  teacher: { id: string; email: string; role: string };
  courseId: string;
  class: {
    id: string;
    name: string;
    schedule: any | null;
    capacity: number | null;
    course: {
      id: string;
      name: string;
    };
  };
}

interface ActionData {
  error?: string;
  success?: boolean;
}

export async function loader({ request, params }: LoaderFunctionArgs): Promise<LoaderData> {
  const teacher = await requireTeacher(request);
  const { courseId, classId } = params;

  if (!courseId || !classId) {
    throw new Response('Class not found', { status: 404 });
  }

  const classData = await getClassById(classId, teacher.id);

  if (!classData) {
    throw new Response('Class not found', { status: 404 });
  }

  return {
    teacher,
    courseId,
    class: classData,
  };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const teacher = await requireTeacher(request);
  const { courseId, classId } = params;

  if (!courseId || !classId) {
    throw new Response('Class not found', { status: 404 });
  }

  const formData = await request.formData();
  const intent = (formData.get('intent') as string) || 'update';

  // Handle delete action
  if (intent === 'delete') {
    try {
      const success = await deleteClass(classId, teacher.id);
      if (!success) {
        return { error: 'classForm.deleteError' };
      }
      return redirect(`/teacher/courses/${courseId}`);
    } catch (error: any) {
      console.error('Error deleting class:', error);
      return { error: error.message || 'classForm.deleteError' };
    }
  }

  // Handle update action
  if (intent === 'update') {
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
      // Build schedule object with new format
      const schedule = {
        weekday,
        periodCode,
        room: room || '',
      };

      const updateData = {
        name: name.trim(),
        schedule,
        capacity: capacityStr ? parseInt(capacityStr, 10) : null,
      };

      await updateClass(classId, teacher.id, updateData);

      return redirect(`/teacher/courses/${courseId}`);
    } catch (error) {
      console.error('Error updating class:', error);
      return { error: 'classForm.updateError' };
    }
  }

  return { error: 'Invalid intent' };
}

export default function EditClass() {
  const { courseId, class: classData } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const { t } = useTranslation(['course', 'common']);

  // Extract existing schedule data
  const initialPeriodValue: PeriodSelectorValue | undefined =
    classData.schedule?.weekday && classData.schedule?.periodCode
      ? { weekday: classData.schedule.weekday, periodCode: classData.schedule.periodCode }
      : undefined;

  return (
    <div className="min-h-screen bg-background">
      {/* Title Section - Centered */}
      <div className="max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 lg:pt-16 xl:pt-20 pb-8 lg:pb-12 text-center">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-semibold tracking-tight mb-3 lg:mb-4 xl:mb-6 text-foreground">
          {t('course:classForm.editClass')}
        </h1>
        <p className="text-base lg:text-lg xl:text-xl text-muted-foreground">
          {t('course:classForm.editFor')}{' '}
          <span className="font-medium text-foreground">{classData.course.name}</span>
          {' · '}
          <span className="font-medium text-foreground">{classData.name}</span>
        </p>
      </div>

      {/* Form Section - Apple Style */}
      <div className="max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 lg:pb-32 space-y-6 lg:space-y-8 xl:space-y-10">
        <Form method="post" className="space-y-6 lg:space-y-8 xl:space-y-10">
          <input type="hidden" name="intent" value="update" />

          {/* Error Alert */}
          {actionData?.error && (
            <Alert variant="destructive" className="rounded-2xl lg:text-base">
              <AlertDescription>{t(`course:${actionData.error}`)}</AlertDescription>
            </Alert>
          )}

          {/* Basic Information Block */}
          <div className="bg-card rounded-2xl shadow-sm p-5 sm:p-6 lg:p-8 xl:p-10 space-y-5 lg:space-y-6">
            <div className="space-y-2 lg:space-y-3">
              <Label htmlFor="name" className="text-base lg:text-lg xl:text-xl font-medium text-foreground">
                {t('course:classForm.className')}
              </Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={classData.name}
                placeholder={t('course:classForm.classNamePlaceholder')}
                className="rounded-xl h-11 sm:h-12 lg:h-14 xl:h-16 text-base lg:text-lg xl:text-xl"
              />
            </div>
          </div>

          {/* Schedule & Location Block */}
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
                value={initialPeriodValue}
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
                defaultValue={classData.schedule?.room || ''}
                placeholder={t('course:classForm.roomPlaceholder')}
                className="rounded-xl h-11 sm:h-12 lg:h-14 xl:h-16 text-base lg:text-lg xl:text-xl"
              />
            </div>
          </div>

          {/* Capacity Block */}
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
                defaultValue={classData.capacity || ''}
                placeholder={t('course:classForm.capacityPlaceholder')}
                className="rounded-xl h-11 sm:h-12 lg:h-14 xl:h-16 text-base lg:text-lg xl:text-xl"
              />
              <p className="text-sm lg:text-base xl:text-lg text-muted-foreground">
                {t('course:classForm.capacityDescription')}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-5 xl:gap-6 pt-4 lg:pt-6 xl:pt-8">
            <Button
              asChild
              variant="secondary"
              className="flex-1 h-11 sm:h-12 lg:h-14 xl:h-16 rounded-xl text-base lg:text-lg xl:text-xl font-medium"
            >
              <Link to={`/teacher/courses/${courseId}`}>{t('course:classForm.cancel')}</Link>
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11 sm:h-12 lg:h-14 xl:h-16 rounded-xl text-base lg:text-lg xl:text-xl font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {t('course:classForm.save')}
            </Button>
          </div>
        </Form>

        {/* Danger Zone - Delete Section */}
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-5 sm:p-6 lg:p-8 xl:p-10 space-y-4 lg:space-y-6">
          <div className="space-y-2 lg:space-y-3">
            <h2 className="text-xl lg:text-2xl xl:text-3xl font-semibold text-destructive flex items-center gap-2 lg:gap-3">
              <Trash2 className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7" />
              {t('course:classForm.dangerZone')}
            </h2>
            <p className="text-sm lg:text-base xl:text-lg text-muted-foreground">
              {t('course:classForm.dangerZoneDescription')}
            </p>
          </div>

          <Alert variant="destructive" className="rounded-xl lg:text-base">
            <AlertDescription>{t('course:classForm.deleteWarning')}</AlertDescription>
          </Alert>

          <Form method="post">
            <input type="hidden" name="intent" value="delete" />
            <Button
              type="submit"
              variant="destructive"
              className="h-11 sm:h-12 lg:h-14 xl:h-16 rounded-xl text-base lg:text-lg xl:text-xl font-medium"
              onClick={(e) => {
                if (!confirm(t('course:classForm.deleteConfirm'))) {
                  e.preventDefault();
                }
              }}
            >
              <Trash2 className="w-4 h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6 mr-2 lg:mr-3" />
              {t('course:classForm.delete')}
            </Button>
          </Form>
        </div>
      </div>
    </div>
  );
}
