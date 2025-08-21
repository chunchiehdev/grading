import { type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router';
import { useLoaderData, useActionData, Form, Link } from 'react-router';
import {
  ArrowLeft,
  Plus,
  FileText,
  Users,
  QrCode,
  RefreshCw,
  Share2,
  Pencil,
  Settings as SettingsIcon,
} from 'lucide-react';

import { requireTeacher } from '@/services/auth.server';
import { getCourseById, type CourseInfo } from '@/services/course.server';
import {
  getActiveCourseInvitation,
  createInvitationCode,
  generateInvitationQRCode,
} from '@/services/invitation.server';
import { getCourseEnrollmentStats } from '@/services/enrollment.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/ui/stats-card';
import { PageHeader } from '@/components/ui/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { InvitationDisplay } from '@/components/ui/invitation-display';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface LoaderData {
  teacher: { id: string; email: string; role: string };
  course: CourseInfo & {
    assignmentAreas?: Array<{
      id: string;
      name: string;
      description: string | null;
      dueDate: Date | null;
      rubricId: string;
      formattedDueDate?: string;
      _count?: { submissions: number };
    }>;
  };
  formattedCreatedDate: string;
  invitation?: {
    id: string;
    code: string;
    expiresAt: Date;
    qrCodeUrl: string;
  };
  enrollmentStats: {
    totalEnrollments: number;
    recentEnrollments: Array<{
      student: {
        id: string;
        email: string;
        name: string;
      };
      enrolledAt: Date;
    }>;
  };
}

interface ActionData {
  success?: boolean;
  error?: string;
  newInvitation?: {
    code: string;
    qrCodeUrl: string;
  };
}

export async function loader({ request, params }: LoaderFunctionArgs): Promise<LoaderData> {
  const teacher = await requireTeacher(request);
  const courseId = params.courseId;

  if (!courseId) {
    throw new Response('Course ID is required', { status: 400 });
  }

  try {
    const [course, activeInvitation, enrollmentStats] = await Promise.all([
      getCourseById(courseId, teacher.id),
      getActiveCourseInvitation(courseId, teacher.id),
      getCourseEnrollmentStats(courseId, teacher.id),
    ]);

    if (!course) {
      throw new Response('Course not found', { status: 404 });
    }

    // Import date formatter on server side only
    const { formatDateForDisplay } = await import('@/lib/date.server');
    const formattedCreatedDate = formatDateForDisplay(course.createdAt);

    // Format assignment area due dates
    const courseWithFormattedDates = {
      ...course,
      assignmentAreas: course.assignmentAreas?.map((area: any) => ({
        ...area,
        formattedDueDate: area.dueDate ? formatDateForDisplay(area.dueDate) : undefined,
      })),
    };

    // Generate QR code for active invitation if exists
    let invitation = undefined;
    if (activeInvitation) {
      const qrCodeUrl = await generateInvitationQRCode(activeInvitation.code);
      invitation = {
        id: activeInvitation.id,
        code: activeInvitation.code,
        expiresAt: activeInvitation.expiresAt,
        qrCodeUrl,
      };
    }

    return {
      teacher,
      course: courseWithFormattedDates,
      formattedCreatedDate,
      invitation,
      enrollmentStats,
    };
  } catch (error) {
    console.error('Error loading course:', error);
    throw new Response('Course not found', { status: 404 });
  }
}

export async function action({ request, params }: ActionFunctionArgs): Promise<ActionData> {
  const teacher = await requireTeacher(request);
  const courseId = params.courseId;
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  if (!courseId) {
    return { success: false, error: 'Course ID is required' };
  }

  try {
    if (intent === 'generate-invitation') {
      const invitation = await createInvitationCode(courseId, teacher.id);
      const qrCodeUrl = await generateInvitationQRCode(invitation.code);

      return {
        success: true,
        newInvitation: {
          code: invitation.code,
          qrCodeUrl,
        },
      };
    }

    return { success: false, error: 'Invalid action' };
  } catch (error) {
    console.error('Error in course action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    };
  }
}

export default function CourseDetail() {
  const { teacher, course, formattedCreatedDate, invitation, enrollmentStats } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const { t } = useTranslation(['course', 'common']);

  const totalSubmissions =
    course.assignmentAreas?.reduce((total, area) => total + (area._count?.submissions || 0), 0) || 0;

  const headerMenuItems = [
    { label: t('common:back'), to: '/teacher/dashboard', icon: ArrowLeft },
    { label: t('course:students'), to: `/teacher/courses/${course.id}/students`, icon: Users },
    { label: t('course:edit.title'), to: `/teacher/courses/${course.id}/edit`, icon: Pencil },
    { label: t('course:settings.title'), to: `/teacher/courses/${course.id}/settings`, icon: SettingsIcon },
    { label: t('course:assignment.create'), to: `/teacher/courses/${course.id}/assignments/new`, icon: Plus },
  ];

  return (
    <div>
      <PageHeader
        title={course.name}
        subtitle={course.description || 'Course management and assignment areas'}
        menuItems={headerMenuItems}
        showInlineActions={false}
      />
      
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatsCard
            title={t('course:stats.assignmentAreas')}
            value={course.assignmentAreas?.length || 0}
            icon={FileText}
            variant="transparent"
          />
          <StatsCard
            title={t('course:stats.totalSubmissions')}
            value={totalSubmissions}
            icon={Users}
            variant="transparent"
          />
          <StatsCard
            title={t('course:stats.enrolledStudents')}
            value={enrollmentStats.totalEnrollments}
            icon={Users}
            variant="transparent"
          />
          <StatsCard
          title={t('course:stats.createdDate')}
          value={formattedCreatedDate}
          icon={FileText}
          size='sm'
          variant="transparent"
        />
        </div>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                {t('course:courseInvitation.title')}
              </CardTitle>
              {!invitation && (
                <Form method="post">
                  <input type="hidden" name="intent" value="generate-invitation" />
                  <Button type="submit" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('course:courseInvitation.generateInvitationCode')}
                  </Button>
                </Form>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {actionData?.error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{actionData.error}</AlertDescription>
              </Alert>
            )}

            {!invitation && !actionData?.newInvitation ? (
              <EmptyState
                title={t('course:emptyState.noInvitationCode')}
                description={t('course:emptyState.noInvitationCodeDescription')}
                icon={<QrCode className="h-12 w-12" />}
                action={
                  <Form method="post">
                    <input type="hidden" name="intent" value="generate-invitation" />
                    <Button type="submit">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {t('course:courseInvitation.generateInvitationCode')}
                    </Button>
                  </Form>
                }
                showCard={false}
              />
            ) : (
              ((invitation && !actionData?.newInvitation) || actionData?.newInvitation) && (
                <InvitationDisplay
                  code={actionData?.newInvitation?.code || invitation?.code || ''}
                  qrCodeUrl={actionData?.newInvitation?.qrCodeUrl || invitation?.qrCodeUrl || ''}
                  baseUrl={typeof window !== 'undefined' ? window.location.origin : '[domain]'}
                  codeLabel={t('course:courseInvitation.invitationCode')}
                  urlLabel={t('course:courseInvitation.invitationUrl')}
                  qrDescription="Students can scan this code to join"
                />
              )
            )}
          </CardContent>
        </Card>

        {/* Assignment Areas */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{t('course:assignment.title')}</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to={`/teacher/courses/${course.id}/assignments/new`}>{t('course:assignment.new')}</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!course.assignmentAreas || course.assignmentAreas.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium text-foreground">{t('course:emptyState.noAssignments')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('course:emptyState.noAssignmentsDescription')}
                </p>
                <div className="mt-6">
                  <Button asChild>
                    <Link to={`/teacher/courses/${course.id}/assignments/new`}>{t('course:assignment.new')}</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {course.assignmentAreas.map((area) => (
                  <div key={area.id} className="px-6 py-4 hover:bg-muted transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Link
                          to={`/teacher/courses/${course.id}/assignments/${area.id}/manage`}
                          className="block hover:text-primary transition-colors"
                        >
                          <h3 className="text-lg font-medium text-foreground">{area.name}</h3>
                          {area.description && <p className="text-sm text-muted-foreground mt-1">{area.description}</p>}
                        </Link>
                        <div className="flex items-center mt-2 text-sm text-muted-foreground">
                          <span>{area._count?.submissions || 0} submissions</span>
                          {area.formattedDueDate && (
                            <>
                              <span className="mx-2">•</span>
                              <span>Due {area.formattedDueDate}</span>
                            </>
                          )}
                          {area.rubricId && (
                            <>
                              <span className="mx-2">•</span>
                              <span className="text-green-600 dark:text-green-500">Has rubric</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/teacher/courses/${course.id}/assignments/${area.id}/submissions`}>
                            View Submissions
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/teacher/courses/${course.id}/assignments/${area.id}/manage`}>Manage</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
