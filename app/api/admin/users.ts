import type { LoaderFunctionArgs } from 'react-router';
import { requireAdmin } from '@/services/auth.server';
import { db } from '@/lib/db.server';
import logger from '@/utils/logger';

/**
 * GET /api/admin/users
 * Fetch all users with optional sorting
 * Query params: sortBy (createdAt, name, role), order (asc, desc)
 */
export async function loader({ request }: LoaderFunctionArgs) {
  await requireAdmin(request);

  const url = new URL(request.url);
  const sortBy = url.searchParams.get('sortBy') || 'createdAt';
  const order = url.searchParams.get('order') || 'desc';

  try {
    // Build orderBy object
    let orderBy: any = {};
    if (sortBy === 'createdAt') {
      orderBy = { createdAt: order };
    } else if (sortBy === 'name') {
      orderBy = { name: order };
    } else if (sortBy === 'role') {
      orderBy = { role: order };
    } else {
      orderBy = { createdAt: 'desc' };
    }

    // Fetch all users
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        picture: true,
        createdAt: true,
        hasSelectedRole: true,
        aiEnabled: true,
      },
      orderBy,
    });

    // Calculate statistics
    const stats = {
      total: users.length,
      students: users.filter((u) => u.role === 'STUDENT').length,
      teachers: users.filter((u) => u.role === 'TEACHER').length,
      admins: users.filter((u) => u.role === 'ADMIN').length,
    };

    logger.info({ sortBy, order, userCount: users.length }, 'Admin fetched user list');

    return Response.json({ users, stats });
  } catch (error) {
    logger.error({ error }, 'Error fetching users for admin');
    return Response.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
