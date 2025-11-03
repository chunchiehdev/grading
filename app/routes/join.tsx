import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { getSession, commitSession } from '@/sessions.server';
import { useLoaderData, useActionData, Form, Link } from 'react-router';
import { CheckCircle, Users, User, Clock, MapPin, GraduationCap, AlertCircle } from 'lucide-react';
import { useState } from 'react';

import { getUser } from '@/services/auth.server';
import { validateInvitationCode, useInvitationCode, type InvitationValidation } from '@/services/invitation.server';
import { listClassesByCourse, type ClassInfo } from '@/services/class.server';
import { enrollStudentInClass } from '@/services/enrollment.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import { formatScheduleDisplay } from '@/constants/schedule';

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
    throw redirect(user.role === 'STUDENT' ? '/student/courses/discover' : '/teacher');
  }

  try {
    const validation = await validateInvitationCode(code, user.id);

    // Redirect back to discover if invitation is invalid or already enrolled
    if (!validation.isValid || validation.isAlreadyEnrolled) {
      throw redirect(user.role === 'STUDENT' ? '/student/courses/discover' : '/teacher');
    }

    // Load available classes if invitation is course-level (no specific classId)
    let availableClasses: ClassInfo[] = [];
    if (validation.invitationCode && !validation.invitationCode.classId) {
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
    throw redirect(user.role === 'STUDENT' ? '/student/courses/discover' : '/teacher');
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
    return { success: false, error: 'Invitation code is required' };
  }

  // Early return: Get classId from invitation or form data
  if (!classId) {
    const validation = await validateInvitationCode(code, user.id);

    // Case 1: Invitation has specific classId
    if (validation.invitationCode?.classId) {
      classId = validation.invitationCode.classId;
    }
    // Case 2: Course-level invitation, need to check if classes exist
    else {
      const courseId = validation.invitationCode?.courseId;
      const teacherId = validation.course?.teacher.id;

      if (!courseId || !teacherId) {
        return { success: false, error: 'course:joinCourse.invalidInvitationInfo' };
      }

      const classes = await listClassesByCourse(courseId, teacherId);

      // Early return: No classes available
      if (classes.length === 0) {
        return {
          success: false,
          error: 'course:joinCourse.noClassesAvailable',
        };
      }

      // Early return: Classes exist but none selected
      return { success: false, error: 'course:joinCourse.pleaseSelectClass' };
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
    const redirectTo = user.role === 'STUDENT' ? '/student' : '/teacher';
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
  const { t, i18n } = useTranslation(['course', 'common']);

  // 當前語言
  const currentLanguage = i18n.language.startsWith('zh') ? 'zh' : 'en';

  // If invitation code specifies a class, use that; otherwise require selection
  const preselectedClassId = validation.invitationCode?.classId || null;
  const [selectedClassId, setSelectedClassId] = useState<string | null>(preselectedClassId);

  // Valid invitation - show course info and join button
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="shadow-lg">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              {t('course:joinCourse.invitation')}
            </CardTitle>
            <CardDescription className="text-base">{t('course:joinCourse.reviewDetails')}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Course Information */}
            {validation.course && (
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground mb-1">{validation.course.name}</h3>
                    {validation.course.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{validation.course.description}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mt-4 pt-4 border-t border-primary/20">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">{t('course:instructorLabel')}:</strong>{' '}
                      {validation.course.teacher.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm ml-6">
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">{t('course:student.email')}:</strong>{' '}
                      {validation.course.teacher.email}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* User role notice for non-students */}
            {user.role !== 'STUDENT' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{t('common:info')}:</strong>{' '}
                  {t('course:joinCourse.roleNote', { role: user.role.toLowerCase() })}
                </AlertDescription>
              </Alert>
            )}

            {/* Action error display */}
            {actionData?.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {actionData.error.startsWith('course:') ? t(actionData.error) : actionData.error}
                </AlertDescription>
              </Alert>
            )}

            {/* Join form */}
            <Form method="post" className="space-y-6">
              <input type="hidden" name="code" value={invitationCode} />
              <input type="hidden" name="classId" value={selectedClassId || ''} />

              {/* Class selection */}
              {availableClasses.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <Label className="text-base font-semibold">{t('course:joinCourse.selectClass')}</Label>
                  </div>

                  <RadioGroup value={selectedClassId || ''} onValueChange={setSelectedClassId}>
                    <div className="space-y-3">
                      {availableClasses.map((cls) => {
                        const isFull = !!(cls.capacity && cls._count.enrollments >= cls.capacity);
                        const isSelected = selectedClassId === cls.id;

                        return (
                          <div
                            key={cls.id}
                            className={`relative flex items-start space-x-3 border-2 rounded-lg p-4 transition-all ${
                              isFull
                                ? 'opacity-60 bg-muted/50 cursor-not-allowed border-muted'
                                : isSelected
                                  ? 'border-primary bg-primary/5 shadow-md'
                                  : 'border-border hover:bg-accent/50 hover:border-accent cursor-pointer'
                            }`}
                          >
                            <RadioGroupItem value={cls.id} id={cls.id} disabled={isFull} className="mt-1" />
                            <Label
                              htmlFor={cls.id}
                              className={`flex-1 ${isFull ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              <div>
                                <div className="font-semibold text-base text-foreground mb-1">{cls.name}</div>

                                {cls.schedule && cls.schedule.weekday && cls.schedule.periodCode && (
                                  <div className="text-sm text-muted-foreground mt-2 flex items-center gap-2 flex-wrap">
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5" />
                                      <span>
                                        {formatScheduleDisplay(
                                          cls.schedule.weekday,
                                          cls.schedule.periodCode,
                                          currentLanguage
                                        )}
                                      </span>
                                    </div>
                                    {cls.schedule.room && (
                                      <>
                                        <span className="text-muted-foreground/50">•</span>
                                        <div className="flex items-center gap-1">
                                          <MapPin className="w-3.5 h-3.5" />
                                          <span>{cls.schedule.room}</span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}

                                <div className="flex items-center gap-2 mt-3">
                                  <Badge variant={isFull ? 'destructive' : 'secondary'} className="text-xs font-medium">
                                    <Users className="w-3 h-3 mr-1" />
                                    {cls._count.enrollments}
                                    {cls.capacity ? `/${cls.capacity}` : ''} {t('course:joinCourse.studentCount')}
                                  </Badge>
                                  {isFull && (
                                    <span className="text-xs text-destructive font-semibold">
                                      {t('course:joinCourse.classFull')}
                                    </span>
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
                    <Alert variant="warning">
                      <AlertTitle></AlertTitle>
                      <AlertDescription>{t('course:joinCourse.selectClassPrompt')}</AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : validation.invitationCode?.classId ? (
                <Alert className="border-primary/50 bg-primary/5">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <AlertDescription>{t('course:joinCourse.classSpecificInvitation')}</AlertDescription>
                </Alert>
              ) : null}

              {/* What happens next */}
              <div className="bg-muted/50 border rounded-lg p-5">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  {t('course:joinCourse.whatHappens')}
                </h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{t('course:joinCourse.benefits.enrolled')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{t('course:joinCourse.benefits.viewSubmit')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{t('course:joinCourse.benefits.aiGrading')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{t('course:joinCourse.benefits.codeUsed')}</span>
                  </li>
                </ul>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button asChild variant="outline" className="flex-1" size="lg">
                  <Link to={user.role === 'STUDENT' ? '/student' : '/teacher'}>{t('common:cancel')}</Link>
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  size="lg"
                  disabled={availableClasses.length > 0 && !selectedClassId}
                >
                  <Users className="h-4 w-4 mr-2" />
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
