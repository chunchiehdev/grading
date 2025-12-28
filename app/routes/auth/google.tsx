import { useRouteError, isRouteErrorResponse } from 'react-router';
import { googleLogin } from '@/services/auth.server';
import { getSession, commitSession } from '@/sessions.server';
import { getSafeRedirectPath } from '@/utils/redirect.server';
import { ErrorPage } from '@/components/errors/ErrorPage';

export async function loader({ request }: { request: Request }) {
  // Save redirectTo to session before OAuth flow
  const redirectTo = getSafeRedirectPath(request);

  if (redirectTo) {
    const session = await getSession(request);
    session.set('redirectTo', redirectTo);
    const setCookieHeader = await commitSession(session);

    // Perform OAuth login with session cookie set
    const response = await googleLogin();
    response.headers.append('Set-Cookie', setCookieHeader);
    return response;
  }

  // No redirectTo, proceed with normal OAuth flow
  return googleLogin();
}
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 401) {
    return <ErrorPage statusCode={401} messageKey="errors.generic.message" returnTo="/" />;
  }

  return <ErrorPage statusCode="errors.generic.title" messageKey="errors.generic.message" returnTo="/" />;
}
