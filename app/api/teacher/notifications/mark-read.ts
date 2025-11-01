import type { ActionFunctionArgs } from 'react-router';
import { requireTeacher } from '@/services/auth.server';
import { db } from '@/lib/db.server';

export async function action({ request }: ActionFunctionArgs) {
  const teacher = await requireTeacher(request);

  try {
    const body = await request.json();
    const { notificationIds, markAll } = body;

    if (markAll) {
      // Mark all notifications as read
      const result = await db.notification.updateMany({
        where: {
          userId: teacher.id,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      const result = await db.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: teacher.id,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    } else {
      console.error('[API /api/teacher/notifications/mark-read] ❌ Invalid request body');
      return Response.json(
        {
          success: false,
          error: 'Either notificationIds or markAll must be provided',
        },
        { status: 400 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[API /api/teacher/notifications/mark-read] ❌ Error:', error);
    return Response.json(
      {
        success: false,
        error: 'Failed to mark notifications as read',
      },
      { status: 500 }
    );
  }
}
