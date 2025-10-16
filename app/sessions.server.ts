import { createCookieSessionStorage } from 'react-router';
import { AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE } from '@/constants/auth';

// Auth session storage
export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: AUTH_COOKIE_NAME,
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secrets: [process.env.AUTH_SECRET || 'default-dev-secret-change-in-production'],
    secure: process.env.NODE_ENV === 'production',
    maxAge: AUTH_COOKIE_MAX_AGE,
    domain: process.env.COOKIE_DOMAIN || undefined,
  },
});

// Helper to get auth session
export async function getSession(request: Request) {
  const cookie = request.headers.get('Cookie');
  const session = await sessionStorage.getSession(cookie);
  return session;
}

export async function commitSession(session: any) {
  console.error('💾 Committing session with userId:', session.get('userId'));
  const cookieHeader = await sessionStorage.commitSession(session, {
    expires: new Date(Date.now() + AUTH_COOKIE_MAX_AGE * 1000),
  });
  return cookieHeader;
}

export async function destroySession(session: any) {
  return sessionStorage.destroySession(session, {
    expires: new Date(0),
    maxAge: 0,
  });
}
