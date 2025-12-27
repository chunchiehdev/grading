import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { useLoaderData, useActionData, Form, Link } from 'react-router';
import { Save, Trash2, Calendar, FileText, Users, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { requireTeacher } from '@/services/auth.server';
import {
  getAssignmentAreaById,
  updateAssignmentArea,
  deleteAssignmentArea,
  type UpdateAssignmentAreaData,
} from '@/services/assignment-area.server';
import { listRubrics } from '@/services/rubric.server';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/DatePicker';

interface LoaderData {
  teacher: { id: string; email: string; role: string; name: string };
  assignmentArea: any;
  rubrics: any[];
  formattedDueDate?: string;
  formattedCreatedAt: string;
  formattedUpdatedAt: string;
}

interface ActionData {
  success?: boolean;
  error?: string;
  action?: string;
}

export async function loader({ request, params }: LoaderFunctionArgs): Promise<LoaderData> {
  const teacher = await requireTeacher(request);
  const { courseId, assignmentId } = params;

  if (!courseId || !assignmentId) {
    throw new Response('Course ID and Assignment ID are required', { status: 400 });
  }

  const [assignmentArea, rubricsResult] = await Promise.all([
    getAssignmentAreaById(assignmentId, teacher.id),
    listRubrics(teacher.id),
  ]);

  if (!assignmentArea) {
    throw new Response('Assignment area not found', { status: 404 });
  }

  const { formatDateForForm, formatDateForDisplay } = await import('@/lib/date.server');
  const formattedDueDate = assignmentArea.dueDate ? formatDateForForm(assignmentArea.dueDate) : undefined;
  const formattedCreatedAt = formatDateForDisplay(new Date(assignmentArea.createdAt));
  const formattedUpdatedAt = formatDateForDisplay(new Date(assignmentArea.updatedAt));

  return {
    teacher,
    assignmentArea,
    rubrics: rubricsResult.rubrics?.filter((r: any) => r.isActive) || [],
    formattedDueDate,
    formattedCreatedAt,
    formattedUpdatedAt,
  };
}

export async function action({ request, params }: ActionFunctionArgs): Promise<ActionData> {
  const teacher = await requireTeacher(request);
  const { courseId, assignmentId } = params;
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  if (!courseId || !assignmentId) {
    return { success: false, error: 'Course ID and Assignment ID are required' };
  }

  try {
    if (intent === 'delete') {
      const success = await deleteAssignmentArea(assignmentId, teacher.id);
      if (success) {
        throw redirect(`/teacher/courses/${courseId}`);
      } else {
        return { success: false, error: 'Failed to delete assignment area' };
      }
    }

    if (intent === 'update') {
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const rubricId = formData.get('rubricId') as string;
      const dueDate = formData.get('dueDate') as string;

      if (!name || name.trim().length === 0) {
        return { success: false, error: 'Assignment name is required' };
      }

      if (!rubricId) {
        return { success: false, error: 'Please select a rubric' };
      }

      const updateData: UpdateAssignmentAreaData = {
        name: name.trim(),
        description: description?.trim() || undefined,
        rubricId,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      };

      const updatedArea = await updateAssignmentArea(assignmentId, teacher.id, updateData);

      if (updatedArea) {
        return { success: true, action: 'update' };
      } else {
        return { success: false, error: 'Failed to update assignment area' };
      }
    }

    return { success: false, error: 'Invalid action' };
  } catch (error) {
    console.error('Error in assignment area action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    };
  }
}

export default function ManageAssignmentArea() {
  const { teacher, assignmentArea, rubrics, formattedDueDate, formattedCreatedAt, formattedUpdatedAt } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const { t } = useTranslation(['course', 'common']);

  const isOverdue = assignmentArea.dueDate && new Date(assignmentArea.dueDate) < new Date();
  const daysUntilDue = assignmentArea.dueDate
    ? Math.ceil((new Date(assignmentArea.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="min-h-screen">
      {/* Header - Architectural Sketch Style */}
      <header className="border-b-2 border-[#2B2B2B] dark:border-gray-200">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-3xl font-light tracking-tight text-[#2B2B2B] dark:text-gray-100">
                {assignmentArea.name}
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {t('course:assignment.manage.settings.description')}
              </p>
            </div>
            <Link
              to={`/teacher/courses/${assignmentArea.courseId}/assignments/${assignmentArea.id}/submissions`}
              className="border-2 border-[#2B2B2B] px-4 py-2 text-sm font-medium text-[#2B2B2B] transition-colors hover:bg-[#D2691E] hover:text-white dark:border-gray-200 dark:text-gray-200 dark:hover:bg-[#E87D3E]"
            >
              <Users className="mr-2 inline-block h-4 w-4" />
              {t('course:assignment.manage.viewSubmissions')}
            </Link>
          </div>

          {/* Stats bar */}
          <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{assignmentArea._count.submissions} {t('course:assignment.manage.stats.submissions')}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>{assignmentArea.rubric.name}</span>
            </div>
            {assignmentArea.dueDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(assignmentArea.dueDate).toLocaleDateString('zh-TW', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                  {daysUntilDue !== null && daysUntilDue >= 0 && (
                    <span className="ml-1">
                      ({t('course:assignment.manage.stats.daysUntilDue', { count: daysUntilDue })})
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Settings Form */}
        <div className="mb-16 border-2 border-[#2B2B2B] dark:border-gray-200">
          <div className="border-b-2 border-[#2B2B2B] px-6 py-4 dark:border-gray-200">
            <h2 className="font-serif text-xl font-light text-[#2B2B2B] dark:text-gray-100">
              {t('course:assignment.manage.settings.title')}
            </h2>
          </div>

          <div className="p-6">
            <Form id="update-assignment-form" method="post" className="space-y-6">
              <input type="hidden" name="intent" value="update" />

              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('course:assignment.manage.settings.nameLabel')} <span className="text-[#D2691E]">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={assignmentArea.name}
                  className="border-2 border-[#2B2B2B] dark:border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('course:assignment.manage.settings.descriptionLabel')}
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={20}
                  defaultValue={assignmentArea.description || ''}
                  placeholder={t('course:assignment.manage.settings.descriptionPlaceholder')}
                  className="border-2 border-[#2B2B2B] font-serif dark:border-gray-200"
                />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rubricId" className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('course:assignment.manage.settings.rubricLabel')} <span className="text-[#D2691E]">*</span>
                  </Label>
                  <Select name="rubricId" defaultValue={assignmentArea.rubricId} required>
                    <SelectTrigger className="border-2 border-[#2B2B2B] dark:border-gray-200">
                      <SelectValue placeholder={t('course:assignment.manage.settings.rubricPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {rubrics.map((rubric) => (
                        <SelectItem key={rubric.id} value={rubric.id}>
                          <div>
                            <div className="font-medium">{rubric.name}</div>
                            {rubric.description && (
                              <div className="text-xs text-gray-600 dark:text-gray-400">{rubric.description}</div>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate" className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {t('course:assignment.manage.settings.dueDateLabel')}
                  </Label>
                  <DatePicker
                    name="dueDate"
                    defaultISOString={
                      assignmentArea.dueDate ? new Date(assignmentArea.dueDate).toISOString() : undefined
                    }
                  />
                </div>
              </div>

              {actionData?.error && (
                <div className="border-2 border-[#D2691E] bg-[#D2691E]/5 p-4 dark:border-[#E87D3E]">
                  <p className="text-sm text-[#D2691E] dark:text-[#E87D3E]">{actionData.error}</p>
                </div>
              )}

              {actionData?.success && actionData.action === 'update' && (
                <div className="border-2 border-[#2B2B2B] bg-[#2B2B2B]/5 p-4 dark:border-gray-200">
                  <p className="text-sm text-[#2B2B2B] dark:text-gray-200">
                    {t('course:assignment.manage.settings.updateSuccess')}
                  </p>
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t-2 border-[#2B2B2B] pt-6 dark:border-gray-200 sm:flex-row sm:justify-end">
                <Link
                  to={`/teacher/courses/${assignmentArea.courseId}`}
                  className="border-2 border-[#2B2B2B] px-6 py-2 text-center text-sm font-medium text-gray-600 transition-colors hover:text-[#2B2B2B] dark:border-gray-200 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <ArrowLeft className="mr-2 inline-block h-4 w-4" />
                  {t('course:assignment.manage.settings.cancelButton')}
                </Link>
                <button
                  type="submit"
                  className="border-2 border-[#2B2B2B] bg-[#2B2B2B] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[#D2691E] hover:border-[#D2691E] dark:border-gray-200 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-[#E87D3E] dark:hover:border-[#E87D3E]"
                >
                  <Save className="mr-2 inline-block h-4 w-4" />
                  {t('course:assignment.manage.settings.saveButton')}
                </button>
              </div>
            </Form>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="border-2 border-[#D2691E] dark:border-[#E87D3E]">
          <div className="border-b-2 border-[#D2691E] px-6 py-4 dark:border-[#E87D3E]">
            <h2 className="font-serif text-xl font-light text-[#D2691E] dark:text-[#E87D3E]">
              {t('course:assignment.manage.settings.deleteButton')}
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t('course:assignment.manage.settings.deleteWarning')}
            </p>
          </div>

          <div className="p-6">
            <Form method="post">
              <input type="hidden" name="intent" value="delete" />
              <button
                type="submit"
                className="border-2 border-[#D2691E] bg-[#D2691E] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[#D2691E]/90 dark:border-[#E87D3E] dark:bg-[#E87D3E]"
                onClick={(e) => {
                  if (!confirm(t('course:assignment.manage.settings.deleteConfirm'))) {
                    e.preventDefault();
                  }
                }}
              >
                <Trash2 className="mr-2 inline-block h-4 w-4" />
                {t('course:assignment.manage.settings.deleteButtonText')}
              </button>
            </Form>
          </div>
        </div>
      </main>
    </div>
  );
}
