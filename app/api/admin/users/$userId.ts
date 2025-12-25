import type { ActionFunctionArgs } from 'react-router';
import { requireAdmin, updateUserRoleAsAdmin } from '@/services/auth.server';
import { db } from '@/lib/db.server';
import logger from '@/utils/logger';

/**
 * PATCH /api/admin/users/:userId
 * Update a user's role (admin only, with restrictions)
 * 
 * DELETE /api/admin/users/:userId
 * Delete a user (admin only, cannot delete self)
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const admin = await requireAdmin(request);
  const { userId } = params;

  if (!userId) {
    return Response.json({ error: 'User ID is required' }, { status: 400 });
  }

  // Handle PATCH - Update user role
  if (request.method === 'PATCH') {
    try {
      const body = await request.json();
      const { role } = body;

      if (!role || !['STUDENT', 'TEACHER', 'ADMIN'].includes(role)) {
        return Response.json({ error: 'Invalid role. Must be STUDENT, TEACHER, or ADMIN' }, { status: 400 });
      }

      // Check if user exists
      const existingUser = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, role: true },
      });

      if (!existingUser) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }

      // Prevent self-role change to avoid accidental admin lockout
      if (userId === admin.id) {
        return Response.json({ 
          error: 'Cannot change your own role. Use another admin account to modify your role.' 
        }, { status: 403 });
      }

      // Update the user role
      const updatedUser = await updateUserRoleAsAdmin(userId, role);

      logger.info(
        {
          adminId: admin.id,
          adminEmail: admin.email,
          targetUserId: userId,
          targetUserEmail: updatedUser.email,
          oldRole: existingUser.role,
          newRole: role,
        },
        'Admin updated user role'
      );

      return Response.json({ success: true, user: updatedUser });
    } catch (error) {
      logger.error({ error, userId, adminId: admin.id }, 'Error updating user role');
      return Response.json({ error: 'Failed to update user role' }, { status: 500 });
    }
  }

  // Handle DELETE - Delete user
  if (request.method === 'DELETE') {
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

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
