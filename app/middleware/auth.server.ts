import { redirect } from 'react-router';
import { getUser } from '@/services/auth.server';

export async function requireAuth(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname;

  const user = await getUser(request);
  if (!user) {
    const searchParams = new URLSearchParams([['redirectTo', path]]);
    throw redirect(`/auth/login?${searchParams}`);
  }

  return user;
}
