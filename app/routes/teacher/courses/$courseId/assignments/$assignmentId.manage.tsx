import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { useLoaderData, useActionData, Form, Link } from 'react-router';
import { ArrowLeft, Save, Trash2, Calendar, FileText, Users, Settings } from 'lucide-react';

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
import { StatsCard } from '@/components/ui/stats-card';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/DatePicker';

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
  const { teacher, assignmentArea, rubrics, formattedDueDate, formattedCreatedAt, formattedUpdatedAt } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();

  const isOverdue = assignmentArea.dueDate && new Date(assignmentArea.dueDate) < new Date();
  const daysUntilDue = assignmentArea.dueDate
    ? Math.ceil((new Date(assignmentArea.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const headerActions = (
    <div className="flex gap-2">
      <Button asChild variant="outline">
        <Link to={`/teacher/courses/${assignmentArea.courseId}/assignments/${assignmentArea.id}/submissions`}>
          <Users className="w-4 h-4 mr-2" />
          View Submissions
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link to={`/teacher/courses/${assignmentArea.courseId}`}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Course
        </Link>
      </Button>
    </div>
  );

  return (
    <div className="bg-background text-foreground">
      <PageHeader
        title={assignmentArea.name}
        subtitle={`Manage assignment area in ${assignmentArea.course.name}`}
        actions={headerActions}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatsCard
              title="Submissions"
              value={assignmentArea._count.submissions}
              icon={FileText}
              variant="transparent"
            />
            <StatsCard
              title="Status"
              value={isOverdue ? 'Overdue' : 'Active'}
              icon={Calendar}
              variant="transparent"
            />
            <StatsCard
              title="Days Until Due"
              value={
                daysUntilDue !== null
                  ? daysUntilDue < 0
                    ? `${Math.abs(daysUntilDue)} overdue`
                    : daysUntilDue.toString()
                  : 'No due date'
              }
              icon={Calendar}
              variant="transparent"
            />
            <StatsCard title="Rubric" value={assignmentArea.rubric.name} icon={Settings} variant="transparent" />
          </div>

          {/* Management Form */}
          <Card className="bg-card text-card-foreground border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Assignment Settings
              </CardTitle>
              <CardDescription>Update assignment details, due date, and grading rubric.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form method="post" className="space-y-6">
                <input type="hidden" name="intent" value="update" />

                <div className="space-y-2">
                  <Label htmlFor="name">
                    Assignment Name <span className="text-destructive">*</span>
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
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    rows={4}
                    defaultValue={assignmentArea.description || ''}
                    placeholder="Provide details about what students need to submit..."
                    className="bg-background border-border focus:ring-ring"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rubricId">
                    Grading Rubric <span className="text-destructive">*</span>
                  </Label>
                  <Select name="rubricId" defaultValue={assignmentArea.rubricId} required>
                    <SelectTrigger className="bg-background border-border focus:ring-ring">
                      <SelectValue placeholder="Select a rubric for grading" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {rubrics.map((rubric) => (
                        <SelectItem key={rubric.id} value={rubric.id}>
                          <div>
                            <div className="font-medium">{rubric.name}</div>
                            {rubric.description && (
                              <div className="text-xs text-muted-foreground line-clamp-1">{rubric.description}</div>
                            )}
                            {rubric.id === assignmentArea.rubricId && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                Current
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
{/* 
                <div className="space-y-2">
                  <Label htmlFor="dueDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Due Date (Optional)
                  </Label>
                  <Input
                    id="dueDate"
                    name="dueDate"
                    type="datetime-local"
                    
                    className="bg-background border-border focus:ring-ring"
                  />
                </div> */}

                <div className="space-y-2">
                  <Label htmlFor="dueDate" className="flex items-center gap-2">
                    Due Date (Optional)
                  </Label>
                  <DatePicker
                    name="dueDate"
                    defaultISOString={assignmentArea.dueDate ? new Date(assignmentArea.dueDate).toISOString() : undefined}
                  />
                </div>

                {actionData?.error && (
                  <Alert variant="destructive">
                    <AlertDescription>{actionData.error}</AlertDescription>
                  </Alert>
                )}

                {actionData?.success && actionData.action === 'update' && (
                  <Alert>
                    <AlertDescription>Assignment area updated successfully!</AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-between pt-4">
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete" />
                    <Button
                      type="submit"
                      variant="destructive"
                      onClick={(e) => {
                        if (
                          !confirm(
                            'Are you sure you want to delete this assignment area? This action cannot be undone.'
                          )
                        ) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Assignment
                    </Button>
                  </Form>

                  <div className="flex gap-2">
                    <Button asChild variant="outline">
                      <Link to={`/teacher/courses/${assignmentArea.courseId}`}>Cancel</Link>
                    </Button>
                    <Button type="submit">
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              </Form>
            </CardContent>
          </Card>

          {/* Assignment Info */}
          <Card className="bg-card text-card-foreground border">
            <CardHeader>
              <CardTitle>Assignment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-foreground">Created</h4>
                  <p className="text-muted-foreground">{formattedCreatedAt}</p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Last Updated</h4>
                  <p className="text-muted-foreground">{formattedUpdatedAt}</p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Course</h4>
                  <p className="text-muted-foreground">{assignmentArea.course.name}</p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Current Rubric</h4>
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
