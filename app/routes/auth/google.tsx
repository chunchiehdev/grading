import { googleLogin } from '@/services/auth.server';
import { getSession, commitSession } from '@/sessions.server';
import { getSafeRedirectPath } from '@/utils/redirect.server';

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
