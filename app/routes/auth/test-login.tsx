import { useRouteError, isRouteErrorResponse, redirect } from 'react-router';
import { getSession, commitSession } from '@/sessions.server';
import { db as prisma } from '@/lib/db.server';
import { AUTH_COOKIE_NAME } from '@/constants/auth';
import { ErrorPage } from '@/components/errors/ErrorPage';

// This is a test-only route and should not be available in production.
export async function loader() {
  if (process.env.NODE_ENV === 'production') {
    // In production, this route should not exist.
    // Throwing a 404 is a good way to handle this.
    throw new Response('Not Found', { status: 404 });
  }

  // Find a test user to log in.
  // IMPORTANT: Make sure you have a user with this email in your test database.
  // You can create one using Prisma Studio or a seed script.
  const testUser = await prisma.user.findUnique({
    where: { email: 'test-user@example.com' },
  });

  if (!testUser) {
    // If the test user doesn't exist, we can't log in.
    // This will cause the authentication setup to fail, which is what we want.
    throw new Error(
      'Test user with email "test-user@example.com" not found in the database. Please create it for testing purposes.',
    );
  }

  // Create a session for the test user.
  const dummyRequest = new Request('http://localhost/auth/test-login');
  const session = await getSession(dummyRequest);
  
  session.set('userId', testUser.id);

  // Redirect to the dashboard with the session cookie.
  return redirect('/teacher', {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

// This route does not need a UI component.
export default function TestLoginRoute() {
  return null;
}
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 401) {
    return <ErrorPage statusCode={401} messageKey="errors.generic.message" returnTo="/" />;
  }

  return <ErrorPage statusCode="errors.generic.title" messageKey="errors.generic.message" returnTo="/" />;
}
