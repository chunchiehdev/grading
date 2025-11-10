import { type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router';
import { useLoaderData, useActionData, Form, Link } from 'react-router';
import { Plus, FileText, QrCode, Share2, Pencil, Clock, MapPin, AlertCircle } from 'lucide-react';

import { requireTeacher } from '@/services/auth.server';
import { createInvitationCode, generateInvitationQRCode } from '@/services/invitation.server';
import { getCoursePageData, type CoursePageData } from '@/services/course-detail.server';
import { listClassesByCourse, type ClassInfo } from '@/services/class.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InvitationDisplay } from '@/components/ui/invitation-display';
import { useTranslation } from 'react-i18next';
import { formatScheduleDisplay } from '@/constants/schedule';

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
  const { t, i18n } = useTranslation(['course', 'common']);

  // 獲取當前語言
  const currentLanguage = i18n.language.startsWith('zh') ? 'zh' : 'en';

  function formatClassSchedule(schedule: any): string {
    if (!schedule?.weekday || !schedule?.periodCode) return '';
    return formatScheduleDisplay(schedule.weekday, schedule.periodCode, currentLanguage);
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

      <div className="max-w-7xl mx-auto space-y-6 pb-8">
        {/* Course Description */}
        {course.description && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">{course.description}</p>
            </CardContent>
          </Card>
        )}
        {/* Class Management */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                {t('course:classManagement.title')}
              </CardTitle>
              {classes.length > 0 && (
                <Button asChild variant="emphasis">
                  <Link to={`/teacher/courses/${course.id}/classes/new`}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('course:classManagement.newClass')}
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
                <h3 className="text-xl font-bold mb-2">{t('course:classManagement.noClasses')}</h3>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  {t('course:classManagement.noClassesDescription')}
                </p>
                <Button asChild variant="emphasis">
                  <Link to={`/teacher/courses/${course.id}/classes/new`}>
                    <Plus className="h-5 w-5 mr-2" />
                    {t('course:classManagement.createFirstClass')}
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {classes.map((cls) => {
                  const isFull = cls.capacity && cls._count.enrollments >= cls.capacity;
                  return (
                    <Link
                      key={cls.id}
                      to={`/teacher/courses/${course.id}/classes/${cls.id}/students`}
                      className="block border rounded-lg p-4 hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                              {cls.name}
                            </h3>
                            <Link
                              to={`/teacher/courses/${course.id}/classes/${cls.id}/edit`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                              title={t('course:classManagement.editClass')}
                            >
                              <Pencil className="w-4 h-4" />
                            </Link>
                          </div>
                          {cls.schedule && (
                            <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-1 gap-y-0.5">
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
                      </div>
                    </Link>
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
              <div className="text-center py-8">
                <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-950/30 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-500" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">
                  {t('course:invitationSection.needClassesWarning')}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {t('course:invitationSection.createClassFirst')}
                </p>
              </div>
            ) : !invitation && !actionData?.newInvitation ? (
              <div className="text-center py-12">
                <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                  <QrCode className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">{t('course:invitationSection.noInvitation')}</h3>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  {t('course:invitationSection.noInvitationDescription')}
                </p>
                <Form method="post">
                  <input type="hidden" name="intent" value="generate-invitation" />
                  <Button type="submit" size="lg">
                    <QrCode className="h-5 w-5 mr-2" />
                    {t('course:invitationSection.generateCode')}
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
              {course.assignmentAreas && course.assignmentAreas.length > 0 && (
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/teacher/courses/${course.id}/assignments/new`}>{t('course:assignment.new')}</Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!course.assignmentAreas || course.assignmentAreas.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium text-foreground">{t('course:emptyState.noAssignments')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t('course:emptyState.noAssignmentsDescription')}</p>
                <div className="mt-6">
                  <Button asChild variant="emphasis">
                    <Link to={`/teacher/courses/${course.id}/assignments/new`}>{t('course:assignment.new')}</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {course.assignmentAreas.map((area) => (
                  <div key={area.id} className="px-6 py-4 hover:bg-muted transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/teacher/courses/${course.id}/assignments/${area.id}/manage`}
                          className="block hover:text-primary transition-colors"
                        >
                          <h3 className="text-lg font-medium text-foreground">{area.name}</h3>
                          {area.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{area.description}</p>}
                        </Link>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-sm text-muted-foreground">
                          <span>
                            {area._count?.submissions || 0} {t('course:assignmentSection.submissions')}
                          </span>
                          {area.formattedDueDate && (
                            <>
                              <span>•</span>
                              <span>
                                {t('course:assignmentSection.due')} {area.formattedDueDate}
                              </span>
                            </>
                          )}
                          {area.rubricId && (
                            <>
                              <span>•</span>
                              <span className="text-green-600 dark:text-green-500">
                                {t('course:assignmentSection.hasRubric')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button asChild variant="ghost" size="sm" className="flex-1 sm:flex-none">
                          <Link to={`/teacher/courses/${course.id}/assignments/${area.id}/submissions`}>
                            {t('course:assignmentSection.viewSubmissions')}
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
                          <Link to={`/teacher/courses/${course.id}/assignments/${area.id}/manage`}>
                            {t('course:assignmentSection.manage')}
                          </Link>
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
