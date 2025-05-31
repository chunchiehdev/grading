import { googleLogin } from '@/services/auth.server';

export async function loader({ request }: { request: Request }) {
  // Don't check auth here - let user go through OAuth flow
  return googleLogin();
}
