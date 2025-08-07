import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { useLoaderData, useActionData, Form } from 'react-router';
import { GraduationCap, UserCheck } from 'lucide-react';

import { requireAuth, updateUserRole } from '@/services/auth.server';
import { Button } from '@/components/ui/button';
import { RoleCard } from '@/components/ui/role-card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LoaderData {
  user: { id: string; email: string; role: string };
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
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    await updateUserRole(user.id, selectedRole as 'TEACHER' | 'STUDENT');
  } catch (error) {
    console.error('Error updating user role:', error);
    throw new Response(JSON.stringify({ error: 'Failed to update role. Please try again.' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Redirect to appropriate dashboard after successful role update
  const redirectPath = selectedRole === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard';
  throw redirect(redirectPath);
}

export default function SelectRole() {
  const { user } = useLoaderData<typeof loader>();
  const actionData = useActionData() as ActionData | undefined;

  return (
    <div className="h-full flex items-center justify-center">
      <div className="w-full max-w-md bg-stone-50 rounded-lg border border-stone-200 p-8 m-6 overflow-y-auto max-h-[calc(100%-3rem)]">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-medium text-stone-800 mb-3">Welcome!</h1>
          <p className="text-stone-600 leading-relaxed">
            Hi {user.email.split('@')[0]}, please select your role to get started.
          </p>
        </div>

        <Form method="post" className="space-y-6">
          <div className="space-y-4">
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
              icon={UserCheck}
              value="STUDENT"
              name="role"
              variant="student"
            />
          </div>

          {actionData?.error && (
            <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
              <AlertDescription className="text-red-700">{actionData.error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-700 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200"
            size="lg"
          >
            Continue
          </Button>
        </Form>

        <div className="mt-8 text-center">
          <p className="text-xs text-stone-500">
            You can change your role later in account settings
          </p>
        </div>
      </div>
    </div>
  );
} 