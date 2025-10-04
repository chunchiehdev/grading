import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { getSession, commitSession } from '@/sessions.server';
import { useLoaderData, useActionData, Form, Link } from 'react-router';
import { CheckCircle, AlertCircle, Users, User, Clock, MapPin } from 'lucide-react';
import { useState } from 'react';

import { getUser } from '@/services/auth.server';
import { validateInvitationCode, useInvitationCode, type InvitationValidation } from '@/services/invitation.server';
import { listClassesByCourse, type ClassInfo } from '@/services/class.server';
import { enrollStudentInClass } from '@/services/enrollment.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';

interface LoaderData {
  user: { id: string; email: string; role: string; name: string };
  validation: InvitationValidation;
  invitationCode?: string;
  availableClasses: ClassInfo[];
}

interface ActionData {
  success?: boolean;
  error?: string;
  redirectTo?: string;
}

export async function loader({ request }: LoaderFunctionArgs): Promise<LoaderData> {
  const user = await getUser(request);
  if (!user) {
    throw redirect('/auth/login');
  }
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    throw new Response('Invitation code is required', { status: 400 });
  }

  try {
    const validation = await validateInvitationCode(code, user.id);

    // Load available classes if invitation is course-level (no specific classId)
    let availableClasses: ClassInfo[] = [];
    if (validation.isValid && validation.invitationCode && !validation.invitationCode.classId) {
      const courseId = validation.invitationCode.courseId;
      const teacherId = validation.course?.teacher.id;
      if (courseId && teacherId) {
        availableClasses = await listClassesByCourse(courseId, teacherId);
      }
    }

    return {
      user,
      validation,
      invitationCode: code,
      availableClasses,
    };
  } catch (error) {
    console.error('Error validating invitation:', error);
    throw new Response('Failed to validate invitation', { status: 500 });
  }
}

export async function action({ request }: ActionFunctionArgs): Promise<ActionData | Response> {
  const user = await getUser(request);
  if (!user) {
    throw redirect('/auth/login');
  }
  const formData = await request.formData();
  const code = formData.get('code') as string;
  let classId = formData.get('classId') as string;

  if (!code) {
    return {
      success: false,
      error: 'Invitation code is required',
    };
  }

  // Validate invitation and get classId if not provided
  if (!classId) {
    const validation = await validateInvitationCode(code, user.id);
    if (validation.invitationCode?.classId) {
      classId = validation.invitationCode.classId;
    } else {
      return {
        success: false,
        error: '請選擇班次',
      };
    }
  }

  try {
    // Enroll student in the selected class
    await enrollStudentInClass(user.id, classId);

    // Mark invitation code as used
    await useInvitationCode(code, user.id);

    // Set a flash toast message in session and redirect to dashboard
    const session = await getSession(request);
    session.flash('toast', { type: 'success', message: 'Successfully joined the course!' });
    const cookie = await commitSession(session);
    const redirectTo = user.role === 'STUDENT' ? '/student/dashboard' : '/teacher/dashboard';
    const res = redirect(redirectTo);
    res.headers.set('Set-Cookie', cookie);
    return res;
  } catch (error) {
    console.error('Error joining class:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to join course. Please try again.',
    };
  }
}

export default function JoinCourse() {
  const { user, validation, invitationCode, availableClasses } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const { t } = useTranslation(['course', 'common']);

  // If invitation code specifies a class, use that; otherwise require selection
  const preselectedClassId = validation.invitationCode?.classId || null;
  const [selectedClassId, setSelectedClassId] = useState<string | null>(preselectedClassId);

  // Invalid invitation code
  if (!validation.isValid) {
    return (
      <div>
        <PageHeader
          title={t('course:joinCourse.invalidTitle')}
          subtitle={t('course:joinCourse.invalidSubtitle')}
        />

        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {t('course:joinCourse.notValid')}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {validation.error}
                </p>

                {validation.course && (
                  <div className="bg-muted/50 rounded-lg p-4 mb-6">
                    <h4 className="font-medium mb-2">
                      {t('course:joinCourse.courseInfo')}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      <strong>{t('course:course')}:</strong> {validation.course.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('course:instructor', { name: validation.course.teacher.name })} ({validation.course.teacher.email})
                    </p>
                    {validation.course.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {validation.course.description}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {t('course:joinCourse.contactTeacher')}
                  </p>

                  <Button asChild className="w-full">
                    <Link to={user.role === 'STUDENT' ? '/student/dashboard' : '/teacher/dashboard'}>
                      {t('course:joinCourse.returnToDashboard')}
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // User is already enrolled
  if (validation.isAlreadyEnrolled) {
    return (
      <div>
        <PageHeader
          title={t('course:joinCourse.alreadyEnrolledTitle')}
          subtitle={t('course:joinCourse.alreadyEnrolledSubtitle')}
        />

        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-12 w-12 text-green-600 dark:text-green-500 mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {t('course:joinCourse.alreadyEnrolled')}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {t('course:joinCourse.alreadyMember')}
                </p>

                {validation.course && (
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
                      <div className="text-left flex-1">
                        <h4 className="font-medium text-green-900 dark:text-green-100 mb-1">
                          {validation.course.name}
                        </h4>
                        <p className="text-sm text-green-800 dark:text-green-200">
                          {t('course:instructor', { name: validation.course.teacher.name })}
                        </p>
                        {validation.course.description && (
                          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                            {validation.course.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button asChild className="flex-1">
                    <Link to="/student/assignments">
                      {t('course:viewAssignments')}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="flex-1">
                    <Link to="/student/dashboard">
                      {t('course:joinCourse.goToDashboard')}
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Valid invitation - show course info and join button
  return (
    <div>
      <PageHeader
        title={t('course:joinCourse.title')}
        subtitle={t('course:joinCourse.subtitle')}
      />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('course:joinCourse.invitation')}
            </CardTitle>
            <CardDescription>
              {t('course:joinCourse.reviewDetails')}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Course Information */}
            {validation.course && (
              <div className="bg-muted/50 border rounded-lg p-6">
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {validation.course.name}
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <User className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span><strong className="text-foreground">{t('course:instructorLabel')}:</strong> {validation.course.teacher.name}</span>
                  </div>

                  <div className="flex items-center text-sm text-muted-foreground">
                    <span className="ml-6"><strong className="text-foreground">{t('course:student.email')}:</strong> {validation.course.teacher.email}</span>
                  </div>

                  {validation.course.description && (
                    <div className="mt-4 ml-6">
                      <p className="text-sm text-foreground font-medium">
                        {t('course:description')}:
                      </p>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        {validation.course.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* User role notice for non-students */}
            {user.role !== 'STUDENT' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{t('common:info')}:</strong> {t('course:joinCourse.roleNote', { role: user.role.toLowerCase() })}
                </AlertDescription>
              </Alert>
            )}

            {/* Action error display */}
            {actionData?.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{actionData.error}</AlertDescription>
              </Alert>
            )}

            {/* Join form */}
            <Form method="post" className="space-y-6">
              <input type="hidden" name="code" value={invitationCode} />
              <input type="hidden" name="classId" value={selectedClassId || ''} />

              {/* Class selection */}
              {availableClasses.length > 0 ? (
                <div className="space-y-4">
                  <Label className="text-base font-semibold">請選擇班次：</Label>
                  <RadioGroup value={selectedClassId || ''} onValueChange={setSelectedClassId}>
                    <div className="space-y-3">
                      {availableClasses.map((cls) => {
                        const isFull = cls.capacity && cls._count.enrollments >= cls.capacity;
                        const isSelected = selectedClassId === cls.id;

                        return (
                          <div
                            key={cls.id}
                            className={`flex items-start space-x-3 border rounded-lg p-4 transition-all ${
                              isFull
                                ? 'opacity-50 bg-muted/50 cursor-not-allowed'
                                : isSelected
                                ? 'border-primary bg-primary/5 shadow-sm'
                                : 'hover:bg-accent/50 hover:border-accent cursor-pointer'
                            }`}
                          >
                            <RadioGroupItem
                              value={cls.id}
                              id={cls.id}
                              disabled={isFull}
                              className="mt-1"
                            />
                            <Label
                              htmlFor={cls.id}
                              className={`flex-1 ${isFull ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              <div>
                                <div className="font-semibold text-base text-foreground">
                                  {cls.name}
                                </div>

                                {cls.schedule && (
                                  <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
                                    <Clock className="w-3 h-3" />
                                    <span>{cls.schedule.day}</span>
                                    <span>{cls.schedule.startTime}-{cls.schedule.endTime}</span>
                                    {cls.schedule.room && (
                                      <>
                                        <MapPin className="w-3 h-3 ml-2" />
                                        <span>{cls.schedule.room}</span>
                                      </>
                                    )}
                                  </div>
                                )}

                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant={isFull ? 'destructive' : 'secondary'} className="text-xs">
                                    <Users className="w-3 h-3 mr-1" />
                                    {cls._count.enrollments}
                                    {cls.capacity ? `/${cls.capacity}` : ''} 人
                                  </Badge>
                                  {isFull && (
                                    <span className="text-xs text-destructive font-medium">已滿</span>
                                  )}
                                </div>
                              </div>
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </RadioGroup>

                  {!selectedClassId && (
                    <p className="text-sm text-muted-foreground">
                      請選擇一個班次以繼續
                    </p>
                  )}
                </div>
              ) : validation.invitationCode?.classId ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    此邀請碼專屬於特定班次，將自動加入該班次
                  </AlertDescription>
                </Alert>
              ) : null}

              {/* What happens next */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">
                  {t('course:joinCourse.whatHappens')}
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {t('course:joinCourse.benefits.enrolled')}</li>
                  <li>• {t('course:joinCourse.benefits.viewSubmit')}</li>
                  <li>• {t('course:joinCourse.benefits.aiGrading')}</li>
                  <li>• {t('course:joinCourse.benefits.codeUsed')}</li>
                </ul>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button asChild variant="outline" className="flex-1">
                  <Link to={user.role === 'STUDENT' ? '/student/dashboard' : '/teacher/dashboard'}>
                    {t('common:cancel')}
                  </Link>
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={availableClasses.length > 0 && !selectedClassId}
                >
                  {t('course:joinCourse.joinCourse')}
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}