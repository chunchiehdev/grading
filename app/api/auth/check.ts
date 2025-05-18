import { getUser } from '@/services/auth.server';
import { withErrorHandler, createApiResponse } from '@/middleware/api.server';

export async function loader({ request }: { request: Request }) {
  return withErrorHandler(async () => {
    const user = await getUser(request);
    if (!user) {
      return Response.json(null, { status: 401 });
    }
    return createApiResponse({ user });
  });
}
