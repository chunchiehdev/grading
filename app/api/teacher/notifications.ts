import type { LoaderFunctionArgs } from 'react-router';
import { requireTeacher } from '@/services/auth.server';
import { db } from '@/lib/db.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const teacher = await requireTeacher(request);

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);

  console.log('[API /api/teacher/notifications] 📥 GET request from teacher:', teacher.id, 'limit:', limit);

  try {
    // Get submission notifications for this teacher
    const notifications = await db.notification.findMany({
      where: {
        userId: teacher.id,
        type: 'SUBMISSION_GRADED', // This is used for submission notifications
      },
      include: {
        assignment: {
          select: {
            name: true,
            course: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    console.log('[API /api/teacher/notifications] 📊 Found', notifications.length, 'notifications');

    const formattedNotifications = notifications.map((notif) => {
      const data = notif.data as any;
      return {
        id: notif.id, // This is the notificationId (for mark-as-read)
        submissionId: data?.submissionId || '', // The actual submission ID
        assignmentId: notif.assignmentId || '',
        assignmentName: notif.assignment?.name || '',
        courseId: notif.assignment?.course?.id || '',
        courseName: notif.assignment?.course?.name || '',
        studentId: data?.studentId || '',
        studentName: notif.message.split(' ')[0], // Extract student name from message
        submittedAt: data?.submittedAt || notif.createdAt.toISOString(),
        status: 'PENDING' as const,
        isRead: notif.isRead,
        createdAt: notif.createdAt.toISOString(),
      };
    });

    // Calculate unread count
    const unreadCount = notifications.filter((n) => !n.isRead).length;

    console.log('[API /api/teacher/notifications] 📤 Sending response:', {
      total: formattedNotifications.length,
      unread: unreadCount,
      notifications: formattedNotifications.map(n => ({
        id: n.id,
        submissionId: n.submissionId,
        isRead: n.isRead,
        studentName: n.studentName
      }))
    });

    return Response.json({
      success: true,
      data: formattedNotifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return Response.json(
      {
        success: false,
        error: 'Failed to fetch notifications',
      },
      { status: 500 }
    );
  }
}
