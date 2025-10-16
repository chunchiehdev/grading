import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { useLoaderData, useActionData, Form, Link } from 'react-router';

import { requireTeacher } from '@/services/auth.server';
import { createCourse, type CreateCourseData } from '@/services/course.server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
    <div className="min-h-screen bg-background">
      {/* 標題區 - 居中 */}
      <div className="max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 lg:pt-16 xl:pt-20 pb-8 lg:pb-12 text-center">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-semibold tracking-tight mb-3 lg:mb-4 xl:mb-6 text-foreground">
          {t('course:create')}
        </h1>
        <p className="text-base lg:text-lg xl:text-xl text-muted-foreground">
          {t('course:createSubtitle')}
        </p>
      </div>

      {/* 表單區 - Apple 風格淺色背景區塊 */}
      <div className="max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 lg:pb-32">
        <Form method="post" className="space-y-6 lg:space-y-8 xl:space-y-10">
          {/* 錯誤提示 */}
          {actionData?.error && (
            <Alert variant="destructive" className="rounded-2xl lg:text-base">
              <AlertDescription>{t(actionData.error)}</AlertDescription>
            </Alert>
          )}

          {/* 課程資訊區塊 */}
          <div className="bg-card rounded-2xl shadow-sm p-5 sm:p-6 lg:p-8 xl:p-10 space-y-5 lg:space-y-6">
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
                rows={4}
                placeholder={t('course:descriptionPlaceholder')}
                className="rounded-xl text-base lg:text-lg xl:text-xl"
              />
            </div>
          </div>

          {/* Apple 風格大按鈕 */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-5 xl:gap-6 pt-4 lg:pt-6 xl:pt-8">
            <Button
              asChild
              variant="secondary"
              className="flex-1 h-11 sm:h-12 lg:h-14 xl:h-16 rounded-xl text-base lg:text-lg xl:text-xl font-medium"
            >
              <Link to="/teacher/courses">{t('common:cancel')}</Link>
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11 sm:h-12 lg:h-14 xl:h-16 rounded-xl text-base lg:text-lg xl:text-xl font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {t('course:create')}
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
