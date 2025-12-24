import type { ActionFunctionArgs } from 'react-router';
import { requireAdmin } from '@/services/auth.server';
import { db } from '@/lib/db.server';
import logger from '@/utils/logger';

/**
 * DELETE /api/admin/users/:userId
 * Delete a user (admin only, cannot delete self)
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const admin = await requireAdmin(request);
  const { userId } = params;

  if (!userId) {
    return Response.json({ error: 'User ID is required' }, { status: 400 });
  }

  // Prevent self-deletion
  if (userId === admin.id) {
    return Response.json({ error: 'Cannot delete your own account' }, { status: 403 });
  }

  try {
    // Check if user exists
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete user (cascade will handle related records)
    await db.user.delete({
      where: { id: userId },
    });

    logger.info(
      {
        adminId: admin.id,
        adminEmail: admin.email,
        deletedUserId: userId,
        deletedUserEmail: user.email,
        deletedUserRole: user.role,
      },
      'Admin deleted user'
    );

    return Response.json({ success: true, deletedUser: user });
  } catch (error) {
    logger.error({ error, userId, adminId: admin.id }, 'Error deleting user');
    return Response.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
