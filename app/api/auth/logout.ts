import { logout } from '@/services/auth.server';

export async function loader() {
  return Response.json({ success: true });
}

export async function action({ request }: { request: Request }) {
  const cookie = await logout(request);

  return Response.json(
    { success: true },
    {
      headers: {
        'Set-Cookie': cookie,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    }
  );
}
