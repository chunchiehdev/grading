import { type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router';
import { useLoaderData, useActionData, Form, Link } from 'react-router';
import {
  ArrowLeft,
  Plus,
  FileText,
  Users,
  QrCode,
  Copy,
  RefreshCw,
  Share2,
  Pencil,
  Settings as SettingsIcon,
  Check,
} from 'lucide-react';
import { useState } from 'react';

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

  // Ephemeral copy-state for swapping icons after success
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleCopy = async (text: string, type: 'code' | 'url') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 1500);
      } else {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 1500);
      }
    } catch (err) {
      toast.error('Failed to copy');
      console.error('Failed to copy: ', err);
    }
  };

  const headerActions = (
    <>
      <Button asChild variant="outline">
        <Link to="/teacher/dashboard">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common:back')}
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link to={`/teacher/courses/${course.id}/students`}>
          <Users className="w-4 h-4 mr-2" />
          {t('course:students')}
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link to={`/teacher/courses/${course.id}/edit`}>
          <Pencil className="w-4 h-4 mr-2" />
          {t('course:edit')}
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link to={`/teacher/courses/${course.id}/settings`}>
          <SettingsIcon className="w-4 h-4 mr-2" />
          {t('course:settings')}
        </Link>
      </Button>
      <Button asChild>
        <Link to={`/teacher/courses/${course.id}/assignments/new`}>
          <Plus className="w-4 h-4 mr-2" />
          {t('course:assignment.create')}
        </Link>
      </Button>
    </>
  );

  return (
    <div>
      <PageHeader
        title={course.name}
        subtitle={course.description || 'Course management and assignment areas'}
        actions={headerActions}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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
              <div className="text-center py-8">
                <QrCode className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Invitation Code</h3>
                <p className="text-gray-600 mb-6">
                  Generate an invitation code to allow students to join this course. The code will be valid for 7 days
                  and include a QR code for easy sharing.
                </p>
                <Form method="post">
                  <input type="hidden" name="intent" value="generate-invitation" />
                  <Button type="submit">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Generate Invitation Code
                  </Button>
                </Form>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Display current or new invitation */}
                {((invitation && !actionData?.newInvitation) || actionData?.newInvitation) && (
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Invitation Details */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">{t('course:courseInvitation.invitationCode')}</label>
                        <div className="flex items-center space-x-2">
                          <code className="bg-gray-100 px-3 py-2 rounded-md font-mono text-lg tracking-wider flex-1">
                            {actionData?.newInvitation?.code || invitation?.code}
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleCopy(actionData?.newInvitation?.code || invitation?.code || '', 'code')
                            }
                            aria-label={copiedCode ? 'Copied' : 'Copy code'}
                            title={copiedCode ? 'Copied' : 'Copy code'}
                          >
                            {copiedCode ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">{t('course:courseInvitation.invitationUrl')}</label>
                        <div className="flex items-center space-x-2">
                          <code className="bg-gray-100 px-3 py-2 rounded-md text-sm text-gray-600 flex-1 break-all">
                            {typeof window !== 'undefined'
                              ? `${window.location.origin}/join?code=${actionData?.newInvitation?.code || invitation?.code}`
                              : `[domain]/join?code=${actionData?.newInvitation?.code || invitation?.code}`}
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleCopy(
                                typeof window !== 'undefined'
                                  ? `${window.location.origin}/join?code=${actionData?.newInvitation?.code || invitation?.code}`
                                  : `[domain]/join?code=${actionData?.newInvitation?.code || invitation?.code}`,
                                'url'
                              )
                            }
                            aria-label={copiedUrl ? 'Copied' : 'Copy URL'}
                            title={copiedUrl ? 'Copied' : 'Copy URL'}
                          >
                            {copiedUrl ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      
                      {/* <div className="pt-4">
                        <Form method="post">
                          <input type="hidden" name="intent" value="generate-invitation" />
                          <Button variant="outline" size="sm" type="submit">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            {t('course:courseInvitation.generateCode')}
                          </Button>
                        </Form>
                      </div> */}
                    </div>

                    {/* QR Code */}
                    <div className="flex flex-col items-center">
                      <label className="text-sm font-medium text-gray-700 mb-4 block">QR Code</label>
                      <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                        <img
                          src={actionData?.newInvitation?.qrCodeUrl || invitation?.qrCodeUrl}
                          alt="Course invitation QR code"
                          className="w-48 h-48"
                        />
                      </div>
                      
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assignment Areas */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Assignment Areas</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to={`/teacher/courses/${course.id}/assignments/new`}>+ Add Assignment Area</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!course.assignmentAreas || course.assignmentAreas.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No assignment areas yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Create assignment areas to organize student submissions and apply rubrics.
                </p>
                <div className="mt-6">
                  <Button asChild>
                    <Link to={`/teacher/courses/${course.id}/assignments/new`}>Create Assignment Area</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {course.assignmentAreas.map((area) => (
                  <div key={area.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Link
                          to={`/teacher/courses/${course.id}/assignments/${area.id}/manage`}
                          className="block hover:text-blue-600 transition-colors"
                        >
                          <h3 className="text-lg font-medium text-gray-900">{area.name}</h3>
                          {area.description && <p className="text-sm text-gray-600 mt-1">{area.description}</p>}
                        </Link>
                        <div className="flex items-center mt-2 text-sm text-gray-500">
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
                              <span className="text-green-600">Has rubric</span>
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
      </main>
    </div>
  );
}
