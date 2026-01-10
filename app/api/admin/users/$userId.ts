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

  // Handle PATCH - Update user role or aiEnabled
  if (request.method === 'PATCH') {
    try {
      const body = await request.json();
      const { role, aiEnabled } = body;

      // Validate that at least one field is being updated
      const hasRoleUpdate = role !== undefined;
      const hasAIEnabledUpdate = typeof aiEnabled === 'boolean';

      if (!hasRoleUpdate && !hasAIEnabledUpdate) {
        return Response.json({ 
          error: 'Invalid request. Must provide role or aiEnabled field.' 
        }, { status: 400 });
      }

      // Validate role if provided
      if (hasRoleUpdate && !['STUDENT', 'TEACHER', 'ADMIN'].includes(role)) {
        return Response.json({ 
          error: 'Invalid role. Must be STUDENT, TEACHER, or ADMIN' 
        }, { status: 400 });
      }

      // Check if user exists
      const existingUser = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, role: true, aiEnabled: true },
      });

      if (!existingUser) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }

      // Prevent self-role change to avoid accidental admin lockout
      if (hasRoleUpdate && userId === admin.id) {
        return Response.json({ 
          error: 'Cannot change your own role. Use another admin account to modify your role.' 
        }, { status: 403 });
      }

      // Build update data
      const updateData: { role?: string; aiEnabled?: boolean } = {};
      if (hasRoleUpdate) updateData.role = role;
      if (hasAIEnabledUpdate) updateData.aiEnabled = aiEnabled;

      // Update the user
      let updatedUser;
      if (hasRoleUpdate) {
        // Use auth service for role updates (may have additional logic)
        updatedUser = await updateUserRoleAsAdmin(userId, role);
        if (hasAIEnabledUpdate) {
          // Also update aiEnabled
          updatedUser = await db.user.update({
            where: { id: userId },
            data: { aiEnabled },
          });
        }
      } else {
        // Only aiEnabled update
        updatedUser = await db.user.update({
          where: { id: userId },
          data: { aiEnabled },
        });
      }

      logger.info(
        {
          adminId: admin.id,
          adminEmail: admin.email,
          targetUserId: userId,
          targetUserEmail: existingUser.email,
          ...(hasRoleUpdate && { oldRole: existingUser.role, newRole: role }),
          ...(hasAIEnabledUpdate && { oldAIEnabled: existingUser.aiEnabled, newAIEnabled: aiEnabled }),
        },
        'Admin updated user'
      );

      return Response.json({ success: true, user: updatedUser });
    } catch (error) {
      logger.error({ error, userId, adminId: admin.id }, 'Error updating user');
      return Response.json({ error: 'Failed to update user' }, { status: 500 });
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
