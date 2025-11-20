import { db, type AssignmentArea } from '@/types/database';
import { redis } from '@/lib/redis';
import logger from '@/utils/logger';
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
      data: notif.data as any || undefined,
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
  logger.info('🔍 查找課程學生 - courseId:', assignment.courseId);

  const courseStudents = await db.enrollment.findMany({
    where: { class: { courseId: assignment.courseId } },
    include: { student: true },
  });

  logger.info(
    '📋 課程學生名單:',
    courseStudents.map((e: EnrollmentWithStudent) => ({
      studentId: e.studentId,
      studentName: e.student.name,
      studentEmail: e.student.email,
    }))
  );

  if (courseStudents.length === 0) {
    logger.warn('⚠️ 沒有找到課程學生');
    return;
  }

  const studentIds = courseStudents.map((enrollment: EnrollmentWithStudent) => enrollment.studentId);
  logger.info('📤 將發送通知給學生IDs:', studentIds);

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

export async function publishSubmissionCreatedNotification(submissionData: {
  submissionId: string;
  assignmentId: string;
  assignmentName: string;
  courseId: string;
  courseName: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  submittedAt: Date;
}): Promise<void> {
  logger.info('📤 Publishing submission notification for teacher:', submissionData.teacherId);

  // Create notification record in database
  let notificationId: string | null = null;
  try {
    const notification = await db.notification.create({
      data: {
        type: 'SUBMISSION_GRADED', // Use existing enum value (we'll treat it as submission created)
        userId: submissionData.teacherId,
        courseId: submissionData.courseId,
        assignmentId: submissionData.assignmentId,
        title: '新作業提交',
        message: `${submissionData.studentName} 已提交 ${submissionData.assignmentName}`,
        isRead: false,
        data: {
          submissionId: submissionData.submissionId,
          studentId: submissionData.studentId,
          submittedAt: submissionData.submittedAt.toISOString(),
        },
      },
    });
    notificationId = notification.id;
    logger.info('  Created notification record in database:', notificationId);
  } catch (error) {
    logger.error('⚠️ Failed to create notification record:', error);
  }

  // Publish WebSocket event with notification ID
  const event = {
    type: 'SUBMISSION_CREATED' as const,
    notificationId, // Include notification ID for mark-as-read
    submissionId: submissionData.submissionId,
    assignmentId: submissionData.assignmentId,
    assignmentName: submissionData.assignmentName,
    courseId: submissionData.courseId,
    courseName: submissionData.courseName,
    studentId: submissionData.studentId,
    studentName: submissionData.studentName,
    teacherId: submissionData.teacherId,
    submittedAt: submissionData.submittedAt.toISOString(),
  };

  await redis.publish('notifications:submission', JSON.stringify(event));
  logger.info('  Submission notification published');
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

/**
 * Get recent notifications for a teacher (both read and unread)
 * This is used for initial page load to populate the notification center
 */
export async function getRecentNotifications(userId: string, limit: number = 50): Promise<UnreadNotification[]> {
  return db.notification.findMany({
    where: {
      userId,
      type: 'SUBMISSION_GRADED', // This is used for submission notifications
    },
    include: {
      course: { select: { name: true } },
      assignment: { select: { name: true, dueDate: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
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
