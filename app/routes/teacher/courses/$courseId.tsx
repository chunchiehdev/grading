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
  Clock,
  MapPin,
  Trash2,
  AlertCircle,
} from 'lucide-react';

import { requireTeacher } from '@/services/auth.server';
import {
  createInvitationCode,
  generateInvitationQRCode,
} from '@/services/invitation.server';
import { getCoursePageData, type CoursePageData } from '@/services/course-detail.server';
import { listClassesByCourse, type ClassInfo } from '@/services/class.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InvitationDisplay } from '@/components/ui/invitation-display';
import { useTranslation } from 'react-i18next';
import { formatScheduleDisplay, formatScheduleShort } from '@/constants/schedule';

interface LoaderData extends CoursePageData {
  teacher: { id: string; email: string; role: string };
  classes: ClassInfo[];
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
    // Use optimized course page data service
    const [coursePageData, classes] = await Promise.all([
      getCoursePageData(courseId, teacher.id),
      listClassesByCourse(courseId, teacher.id),
    ]);

    if (!coursePageData) {
      throw new Response('Course not found', { status: 404 });
    }

    return {
      teacher,
      ...coursePageData,
      classes,
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
      // Verify at least one class exists before generating invitation code
      const classes = await listClassesByCourse(courseId, teacher.id);
      if (classes.length === 0) {
        return {
          success: false,
          error: '請先建立至少一個時段，才能產生邀請碼',
        };
      }

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
  const { course, invitation, classes } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const { t } = useTranslation(['course', 'common']);

  /**
   * 格式化時段顯示文字（支援新舊格式）
   */
  function formatClassSchedule(schedule: any): string {
    if (!schedule) return '';

    // 新格式：使用 weekday + periodCode
    if (schedule.weekday && schedule.periodCode) {
      return formatScheduleDisplay(schedule.weekday, schedule.periodCode);
    }

    // 舊格式：使用 day + startTime + endTime
    if (schedule.day && schedule.startTime && schedule.endTime) {
      return `${schedule.day} ${schedule.startTime}-${schedule.endTime}`;
    }

    return '';
  }

  return (
    <div>
      <PageHeader
        title={course.name}
        subtitle={undefined}
        actions={
          <Button asChild variant="outline">
            <Link to={`/teacher/courses/${course.id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              {t('course:edit.title')}
            </Link>
          </Button>
        }
        showInlineActions={true}
      />

      {/* Course Description */}
      {course.description && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4 border">
            {course.description}
          </p>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8 pb-8">
        {/* Class Management */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                時段管理
              </CardTitle>
              {classes.length > 0 && (
                <Button asChild size="sm">
                  <Link to={`/teacher/courses/${course.id}/classes/new`}>
                    <Plus className="h-4 w-4 mr-2" />
                    新增時段
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {classes.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                  <Clock className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">尚未建立時段</h3>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  課程需要至少一個時段，學生才能透過邀請碼選擇加入的時段
                </p>
                <Button asChild size="lg">
                  <Link to={`/teacher/courses/${course.id}/classes/new`}>
                    <Plus className="h-5 w-5 mr-2" />
                    建立第一個時段
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {classes.map((cls) => {
                  const isFull = cls.capacity && cls._count.enrollments >= cls.capacity;
                  return (
                    <div
                      key={cls.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">{cls.name}</h3>
                          {cls.schedule && (
                            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3 flex-shrink-0" />
                              <span>{formatClassSchedule(cls.schedule)}</span>
                              {cls.schedule.room && (
                                <>
                                  <MapPin className="w-3 h-3 ml-2 flex-shrink-0" />
                                  <span>{cls.schedule.room}</span>
                                </>
                              )}
                            </p>
                          )}
                          {/* <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {cls._count.enrollments}
                              {cls.capacity ? `/${cls.capacity}` : ''} 位學生
                              {isFull && ' (已滿)'}
                            </span>
                          </div> */}
                        </div>
                        <div className="flex gap-2">
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/teacher/courses/${course.id}/classes/${cls.id}/students`}>
                              查看學生
                            </Link>
                          </Button>
                          <Button asChild variant="ghost" size="sm" title="編輯時段">
                            <Link to={`/teacher/courses/${course.id}/classes/${cls.id}/edit`}>
                              <Pencil className="w-4 h-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                {t('course:courseInvitation.title')}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {actionData?.error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{actionData.error}</AlertDescription>
              </Alert>
            )}

            {classes.length === 0 ? (
              <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-900 dark:text-amber-100">
                  請先建立時段，學生才能透過邀請碼加入課程
                </AlertDescription>
              </Alert>
            ) : !invitation && !actionData?.newInvitation ? (
              <div className="text-center py-12">
                <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                  <QrCode className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">尚未產生邀請碼</h3>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  產生邀請碼後，學生可以掃描 QR Code 或輸入邀請碼加入課程並選擇時段
                </p>
                <Form method="post">
                  <input type="hidden" name="intent" value="generate-invitation" />
                  <Button type="submit" size="lg">
                    <QrCode className="h-5 w-5 mr-2" />
                    產生邀請碼
                  </Button>
                </Form>
              </div>
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
