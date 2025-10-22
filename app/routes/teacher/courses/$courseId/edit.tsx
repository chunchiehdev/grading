import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { useLoaderData, useActionData, Form, Link } from 'react-router';
import { Save, Trash2 } from 'lucide-react';

import { requireTeacher } from '@/services/auth.server';
import { getCourseById, updateCourse, deleteCourse } from '@/services/course.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';

interface LoaderData {
  teacher: { id: string; email: string; role: string };
  course: { id: string; name: string; description: string | null };
}

interface ActionData {
  error?: string;
  success?: boolean;
}

export async function loader({ request, params }: LoaderFunctionArgs): Promise<LoaderData> {
  const teacher = await requireTeacher(request);
  const courseId = params.courseId;
  if (!courseId) throw new Response('Course ID is required', { status: 400 });

  const course = await getCourseById(courseId, teacher.id);
  if (!course) throw new Response('Course not found', { status: 404 });

  return { teacher, course };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const teacher = await requireTeacher(request);
  const courseId = params.courseId;
  if (!courseId) throw new Response('Course ID is required', { status: 400 });

  const formData = await request.formData();
  const intent = (formData.get('intent') as string) || 'update';

  // Handle delete action
  if (intent === 'delete') {
    try {
      const ok = await deleteCourse(courseId, teacher.id);
      if (!ok) {
        return { error: 'Failed to delete course' };
      }
      return redirect('/teacher/courses');
    } catch (error) {
      console.error('Error deleting course:', error);
      return { error: 'An error occurred while deleting the course' };
    }
  }

  // Handle update action
  if (intent === 'update') {
    const name = (formData.get('name') as string) || '';
    const description = (formData.get('description') as string) || '';

    if (!name || name.trim().length === 0) {
      return { error: 'Course name is required' };
    }

    try {
      const updated = await updateCourse(courseId, teacher.id, {
        name: name.trim(),
        description: description?.trim() || undefined,
      });

      if (!updated) {
        return { error: 'Failed to update course' };
      }

      return redirect(`/teacher/courses/${courseId}`);
    } catch (error) {
      console.error('Error updating course:', error);
      return { error: 'An error occurred while updating the course' };
    }
  }

  return { error: 'Invalid intent' };
}

export default function EditCourse() {
  const { course } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const { t } = useTranslation(['course', 'common']);

  return (
    <div className="min-h-full flex items-center justify-center p-8">
      <div className="w-full max-w-4xl space-y-6">
        {/* Basic Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t('course:edit.title')}</CardTitle>
            <CardDescription>{t('course:edit.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-6">
              <input type="hidden" name="intent" value="update" />

              <div className="space-y-2">
                <Label htmlFor="name">
                  {t('course:edit.courseName')} <span className="text-red-500">*</span>
                </Label>
                <Input id="name" name="name" required defaultValue={course.name} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('course:edit.courseDescription')}</Label>
                <Textarea id="description" name="description" rows={4} defaultValue={course.description || ''} />
              </div>

              {actionData?.error && (
                <Alert variant="destructive">
                  <AlertDescription>{actionData.error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end space-x-4">
                <Button asChild variant="outline">
                  <Link to={`/teacher/courses/${course.id}`}>{t('course:edit.cancel')}</Link>
                </Button>
                <Button type="submit">
                  <Save className="w-4 h-4 mr-2" />
                  {t('course:edit.save')}
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>

        {/* Danger Zone Card */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">{t('course:setting.dangerZone')}</CardTitle>
            <CardDescription>{t('course:setting.dangerZoneDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{t('course:setting.deleteWarning')}</AlertDescription>
            </Alert>
            <Form method="post">
              <input type="hidden" name="intent" value="delete" />
              <Button
                type="submit"
                variant="destructive"
                onClick={(e) => {
                  if (!confirm(t('course:setting.deleteConfirm'))) {
                    e.preventDefault();
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('course:setting.deleteCourse')}
              </Button>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
