import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { useLoaderData, useActionData, Form, useNavigation } from 'react-router';
import { GraduationCap, User } from 'lucide-react';

import { requireAuth, updateUserRole } from '@/services/auth.server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RoleCard } from '@/components/ui/role-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

interface LoaderData {
  user: { id: string; name: string, email: string; role: string };
}

interface ActionData {
  error?: string;
}

export async function loader({ request }: LoaderFunctionArgs): Promise<LoaderData> {
  const user = await requireAuth(request);

  // If user already has a role assigned (not default STUDENT), redirect them
  if (user.role && user.role !== 'STUDENT') {
    const redirectPath = user.role === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard';
    throw redirect(redirectPath);
  }

  return { user };
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireAuth(request);
  const formData = await request.formData();
  const selectedRole = formData.get('role') as string;

  if (!selectedRole || (selectedRole !== 'TEACHER' && selectedRole !== 'STUDENT')) {
    throw new Response(JSON.stringify({ error: 'Please select a valid role' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await updateUserRole(user.id, selectedRole as 'TEACHER' | 'STUDENT');
  } catch (error) {
    console.error('Error updating user role:', error);
    throw new Response(JSON.stringify({ error: 'Failed to update role. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Redirect to appropriate dashboard after successful role update
  const redirectPath = selectedRole === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard';
  throw redirect(redirectPath);
}

export interface SelectRoleProps {}

export function SelectRolePage(_: SelectRoleProps) {
  const { user } = useLoaderData<typeof loader>();
  const actionData = useActionData() as ActionData | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="flex flex-col h-full">
      
      <div className="flex-1 flex items-center justify-center">
        <main className="max-w-3xl px-4 pb-10 w-full">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Welcome! {user.name}, choose how you'll use the app.</CardTitle>
            </CardHeader>
            <CardContent>
              <Form method="post" className="space-y-6" aria-busy={isSubmitting}>
                <div className="space-y-4">
                  {isSubmitting ? (
                    <div className="space-y-4">
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  ) : (
                    <>
                      <RoleCard
                        title="Teacher"
                        description="Create courses, manage assignments, and grade student work"
                        icon={GraduationCap}
                        value="TEACHER"
                        name="role"
                        variant="teacher"
                      />

                      <RoleCard
                        title="Student"
                        description="Submit assignments and receive feedback from teachers"
                        icon={User}
                        value="STUDENT"
                        name="role"
                        variant="student"
                      />
                    </>
                  )}
                </div>

                {actionData?.error && (
                  <Alert variant="destructive">
                    <AlertDescription>{actionData.error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Continue'}
                </Button>
              </Form>

              <div className="mt-8 text-center">
                <p className="text-xs text-muted-foreground">You can change your role later in account settings</p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

export default SelectRolePage;
