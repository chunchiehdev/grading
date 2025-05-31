import { googleLogin } from '@/services/auth.server';
import { getUser } from '@/services/auth.server';

export async function loader({ request }: { request: Request }) {
  const user = await getUser(request);
  if (user) {
    const url = new URL(request.url);
    const redirectTo = url.searchParams.get('redirectTo') || '/dashboard';
    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectTo,
      },
    });
  }

  return googleLogin();
}
