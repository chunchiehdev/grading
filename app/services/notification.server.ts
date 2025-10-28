import { db } from '@/lib/db.server';
import { redis } from '@/lib/redis';
import type { AssignmentArea } from '@/generated/prisma/client';
import type {
  AssignmentNotificationEvent,
  NotificationData,
  EnrollmentWithStudent,
  UnreadNotification,
} from '@/types/notification';

export async function createNotifications(notifications: NotificationData[]): Promise<void> {
  if (notifications.length === 0) return;

  await db.notification.createMany({
    data: notifications.map((notif) => ({
      type: notif.type,
      userId: notif.userId,
      courseId: notif.courseId,
      assignmentId: notif.assignmentId,
      title: notif.title,
      message: notif.message,
      data: notif.data || undefined,
    })),
  });
}

export async function publishAssignmentCreatedNotification(
  assignment: AssignmentArea & {
    course: {
      name: string;
      teacher: { id: string; name: string; email: string };
    };
  }
): Promise<void> {
  console.log('🔍 查找課程學生 - courseId:', assignment.courseId);

  const courseStudents = await db.enrollment.findMany({
    where: { class: { courseId: assignment.courseId } },
    include: { student: true },
  });

  console.log(
    '📋 課程學生名單:',
    courseStudents.map((e: EnrollmentWithStudent) => ({
      studentId: e.studentId,
      studentName: e.student.name,
      studentEmail: e.student.email,
    }))
  );

  if (courseStudents.length === 0) {
    console.log('⚠️ 沒有找到課程學生');
    return;
  }

  const studentIds = courseStudents.map((enrollment: EnrollmentWithStudent) => enrollment.studentId);
  console.log('📤 將發送通知給學生IDs:', studentIds);

  const notifications: NotificationData[] = courseStudents.map((enrollment: EnrollmentWithStudent) => ({
    type: 'ASSIGNMENT_CREATED',
    userId: enrollment.studentId,
    courseId: assignment.courseId,
    assignmentId: assignment.id,
    title: `新作業：${assignment.name}`,
    message: `課程「${assignment.course.name}」有新作業${assignment.dueDate ? `，截止日期：${assignment.dueDate.toLocaleDateString('zh-TW')}` : ''}`,
    data: {
      courseName: assignment.course.name,
      teacherName: assignment.course.teacher.name,
      dueDate: assignment.dueDate?.toISOString(),
    },
  }));

  await createNotifications(notifications);

  const event: AssignmentNotificationEvent = {
    type: 'ASSIGNMENT_CREATED',
    courseId: assignment.courseId,
    assignmentId: assignment.id,
    assignmentName: assignment.name,
    dueDate: assignment.dueDate,
    studentIds,
    teacherName: assignment.course.teacher.name,
  };

  await redis.publish('notifications:assignment', JSON.stringify(event));
}

export async function getUnreadNotifications(userId: string): Promise<UnreadNotification[]> {
  return db.notification.findMany({
    where: {
      userId,
      isRead: false,
    },
    include: {
      course: { select: { name: true } },
      assignment: { select: { name: true, dueDate: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  }) as Promise<UnreadNotification[]>;
}

export async function markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
  await db.notification.updateMany({
    where: {
      id: notificationId,
      userId,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  await db.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}
