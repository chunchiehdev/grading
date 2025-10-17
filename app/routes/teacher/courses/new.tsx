import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { useActionData, Form } from 'react-router';

import { requireTeacher } from '@/services/auth.server';
import { createCourse, type CreateCourseData } from '@/services/course.server';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormPageLayout, FormSection, FormActionButtons } from '@/components/forms';
import { useTranslation } from 'react-i18next';

interface LoaderData {
  teacher: { id: string; email: string; role: string };
}

interface ActionData {
  error?: string;
  success?: boolean;
}

export async function loader({ request }: LoaderFunctionArgs): Promise<LoaderData> {
  const teacher = await requireTeacher(request);
  return { teacher };
}

export async function action({ request }: ActionFunctionArgs) {
  const teacher = await requireTeacher(request);
  const formData = await request.formData();

  const name = formData.get('name') as string;
  const description = formData.get('description') as string;

  if (!name || name.trim().length === 0) {
    return { error: 'course:validation.nameRequired' };
  }

  try {
    const courseData: CreateCourseData = {
      name: name.trim(),
      description: description?.trim() || undefined,
    };

    const course = await createCourse(teacher.id, courseData);

    // Redirect to the newly created course
    return redirect(`/teacher/courses/${course.id}`);
  } catch (error) {
    console.error('Error creating course:', error);
    return { error: 'course:messages.createError' };
  }
}

export default function NewCourse() {
  const actionData = useActionData<ActionData>();
  const { t } = useTranslation(['course', 'common']);

  return (
    <FormPageLayout title={t('course:create')} subtitle={t('course:createSubtitle')}>
      <Form method="post" className="space-y-6 lg:space-y-8 xl:space-y-10">
        {/* 錯誤提示 */}
        {actionData?.error && (
          <Alert variant="destructive" className="rounded-2xl lg:text-base">
            <AlertDescription>{t(actionData.error)}</AlertDescription>
          </Alert>
        )}

        {/* 課程資訊區塊 */}
        <FormSection>
          <div className="space-y-2 lg:space-y-3">
            <Label htmlFor="name" className="text-base lg:text-lg xl:text-xl font-medium text-foreground">
              {t('course:name')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              required
              placeholder={t('course:namePlaceholder')}
              className="rounded-xl h-11 sm:h-12 lg:h-14 xl:h-16 text-base lg:text-lg xl:text-xl"
            />
          </div>

          <div className="space-y-2 lg:space-y-3">
            <Label htmlFor="description" className="text-base lg:text-lg xl:text-xl font-medium text-foreground">
              {t('course:description')}
            </Label>
            <Textarea
              id="description"
              name="description"
              rows={10}
              placeholder={t('course:descriptionPlaceholder')}
              className="rounded-xl text-base lg:text-lg xl:text-xl"
            />
          </div>
        </FormSection>

        {/* Action Buttons */}
        <FormActionButtons
          cancelTo="/teacher/courses"
          submitText={t('course:create')}
          cancelText={t('common:cancel')}
        />
      </Form>
    </FormPageLayout>
  );
}
