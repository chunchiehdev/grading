import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { useLoaderData, useActionData, Form, Link } from 'react-router';
import { Save, Trash2, Calendar, FileText, Users, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { requireTeacher } from '@/services/auth.server';
import {
  getAssignmentAreaById,
  updateAssignmentArea,
  deleteAssignmentArea,
  type UpdateAssignmentAreaData,
} from '@/services/assignment-area.server';
import { listRubrics } from '@/services/rubric.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
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

  // Format due date for form input
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

      // Basic validation
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

  const headerActions = (
    <div className="flex gap-2">
      <Button asChild variant="outline">
        <Link to={`/teacher/courses/${assignmentArea.courseId}/assignments/${assignmentArea.id}/submissions`}>
          <Users className="w-4 h-4 mr-2" />
          {t('course:assignment.manage.viewSubmissions')}
        </Link>
      </Button>
    </div>
  );

  return (
    <div className="bg-background text-foreground">
      <PageHeader
        title={assignmentArea.name}
        subtitle={t('course:assignment.manage.pageSubtitle', { courseName: assignmentArea.course.name })}
        actions={headerActions}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('course:assignment.manage.stats.submissions')}
                    </p>
                    <p className="text-2xl font-bold text-foreground">{assignmentArea._count.submissions}</p>
                  </div>
                  <FileText className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('course:assignment.manage.stats.status')}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {isOverdue
                        ? t('course:assignment.manage.stats.overdue')
                        : t('course:assignment.manage.stats.active')}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('course:assignment.manage.stats.daysUntilDue')}
                    </p>
                    <p className="text-xl font-bold text-foreground">
                      {daysUntilDue !== null
                        ? daysUntilDue < 0
                          ? t('course:assignment.manage.stats.daysOverdue', { days: Math.abs(daysUntilDue) })
                          : daysUntilDue.toString()
                        : t('course:assignment.manage.stats.noDueDate')}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('course:assignment.manage.stats.rubric')}
                    </p>
                    <p className="text-xl font-bold text-foreground">{assignmentArea.rubric.name}</p>
                  </div>
                  <Settings className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Management Form */}
          <Card className="bg-card text-card-foreground border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {t('course:assignment.manage.settings.title')}
              </CardTitle>
              <CardDescription>{t('course:assignment.manage.settings.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form id="update-assignment-form" method="post" className="space-y-6">
                <input type="hidden" name="intent" value="update" />

                <div className="space-y-2">
                  <Label htmlFor="name">
                    {t('course:assignment.manage.settings.nameLabel')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    defaultValue={assignmentArea.name}
                    className="bg-background border-border focus:ring-ring"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t('course:assignment.manage.settings.descriptionLabel')}</Label>
                  <Textarea
                    id="description"
                    name="description"
                    rows={20}
                    defaultValue={assignmentArea.description || ''}
                    placeholder={t('course:assignment.manage.settings.descriptionPlaceholder')}
                    className="bg-background border-border focus:ring-ring"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rubricId">
                    {t('course:assignment.manage.settings.rubricLabel')} <span className="text-destructive">*</span>
                  </Label>
                  <Select name="rubricId" defaultValue={assignmentArea.rubricId} required>
                    <SelectTrigger className="bg-background border-border focus:ring-ring">
                      <SelectValue placeholder={t('course:assignment.manage.settings.rubricPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {rubrics.map((rubric) => (
                        <SelectItem key={rubric.id} value={rubric.id}>
                          <div>
                            <div className="font-medium">{rubric.name}</div>
                            {rubric.description && (
                              <div className="text-xs text-muted-foreground">{rubric.description}</div>
                            )}
                            {rubric.id === assignmentArea.rubricId && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                {t('course:assignment.manage.settings.currentBadge')}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate" className="flex items-center gap-2">
                    {t('course:assignment.manage.settings.dueDateLabel')}
                  </Label>
                  <DatePicker
                    name="dueDate"
                    defaultISOString={
                      assignmentArea.dueDate ? new Date(assignmentArea.dueDate).toISOString() : undefined
                    }
                  />
                </div>

                {actionData?.error && (
                  <Alert variant="destructive">
                    <AlertDescription>{actionData.error}</AlertDescription>
                  </Alert>
                )}

                {actionData?.success && actionData.action === 'update' && (
                  <Alert>
                    <AlertDescription>{t('course:assignment.manage.settings.updateSuccess')}</AlertDescription>
                  </Alert>
                )}
              </Form>

              <div className="flex justify-between pt-4">
                <Form method="post">
                  <input type="hidden" name="intent" value="delete" />
                  <Button
                    type="submit"
                    variant="destructive"
                    onClick={(e) => {
                      if (!confirm(t('course:assignment.manage.settings.deleteConfirm'))) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('course:assignment.manage.settings.deleteButton')}
                  </Button>
                </Form>

                <div className="flex gap-2">
                  <Button asChild variant="outline">
                    <Link to={`/teacher/courses/${assignmentArea.courseId}`}>
                      {t('course:assignment.manage.settings.cancelButton')}
                    </Link>
                  </Button>
                  <Button type="submit" form="update-assignment-form">
                    <Save className="w-4 h-4 mr-2" />
                    {t('course:assignment.manage.settings.saveButton')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assignment Info */}
          <Card className="bg-card text-card-foreground border">
            <CardHeader>
              <CardTitle>{t('course:assignment.manage.info.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-foreground">{t('course:assignment.manage.info.created')}</h4>
                  <p className="text-muted-foreground">{formattedCreatedAt}</p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{t('course:assignment.manage.info.lastUpdated')}</h4>
                  <p className="text-muted-foreground">{formattedUpdatedAt}</p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{t('course:assignment.manage.info.course')}</h4>
                  <p className="text-muted-foreground">{assignmentArea.course.name}</p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{t('course:assignment.manage.info.currentRubric')}</h4>
                  <p className="text-muted-foreground">{assignmentArea.rubric.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
