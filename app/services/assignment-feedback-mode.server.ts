import { db, type Prisma } from '@/types/database';
import { DEFAULT_AI_FEEDBACK_MODE, parseAiFeedbackMode, type AiFeedbackMode } from '@/types/feedback-mode';
import logger from '@/utils/logger';

export type AssignmentFeedbackModeChoice = AiFeedbackMode | 'DEFAULT';

export interface AssignmentFeedbackStudent {
  id: string;
  name: string;
  email: string;
  picture: string | null;
  classId: string;
  className: string;
  effectiveMode: AiFeedbackMode;
  overrideMode: AiFeedbackMode | null;
}

export interface AssignmentFeedbackModeSetup {
  defaultMode: AiFeedbackMode;
  students: AssignmentFeedbackStudent[];
}

export interface AssignmentFeedbackModeOverrideInput {
  studentId: string;
  mode: AssignmentFeedbackModeChoice;
}

interface AssignmentScope {
  id: string;
  courseId: string;
  classId: string | null;
  aiFeedbackMode: unknown;
}

async function getAuthorizedAssignmentScope(
  assignmentAreaId: string,
  teacherId: string
): Promise<AssignmentScope | null> {
  return db.assignmentArea.findFirst({
    where: {
      id: assignmentAreaId,
      course: {
        teacherId,
      },
    },
    select: {
      id: true,
      courseId: true,
      classId: true,
      aiFeedbackMode: true,
    },
  });
}

async function getEligibleStudentIds(scope: Pick<AssignmentScope, 'courseId' | 'classId'>): Promise<Set<string>> {
  const enrollments = await db.enrollment.findMany({
    where: scope.classId
      ? {
          classId: scope.classId,
        }
      : {
          class: {
            courseId: scope.courseId,
          },
        },
    select: {
      studentId: true,
    },
  });

  return new Set(enrollments.map((enrollment) => enrollment.studentId));
}

export async function getEffectiveAiFeedbackModeForStudent(
  assignmentAreaId: string,
  studentId: string
): Promise<AiFeedbackMode> {
  try {
    const assignment = await db.assignmentArea.findUnique({
      where: { id: assignmentAreaId },
      select: {
        aiFeedbackMode: true,
        feedbackModeOverrides: {
          where: { studentId },
          select: { mode: true },
          take: 1,
        },
      },
    });

    if (!assignment) return DEFAULT_AI_FEEDBACK_MODE;

    return parseAiFeedbackMode(
      assignment.feedbackModeOverrides[0]?.mode,
      parseAiFeedbackMode(assignment.aiFeedbackMode)
    );
  } catch (error) {
    logger.error({ err: error, assignmentAreaId, studentId }, 'Failed to resolve AI feedback mode:');
    return DEFAULT_AI_FEEDBACK_MODE;
  }
}

export async function getAssignmentFeedbackModeSetup(
  assignmentAreaId: string,
  teacherId: string
): Promise<AssignmentFeedbackModeSetup | null> {
  try {
    const scope = await getAuthorizedAssignmentScope(assignmentAreaId, teacherId);
    if (!scope) return null;

    const [enrollments, overrides] = await Promise.all([
      db.enrollment.findMany({
        where: scope.classId
          ? {
              classId: scope.classId,
            }
          : {
              class: {
                courseId: scope.courseId,
              },
            },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              picture: true,
            },
          },
          class: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ class: { name: 'asc' } }, { student: { name: 'asc' } }],
      }),
      db.assignmentFeedbackModeOverride.findMany({
        where: { assignmentAreaId },
        select: {
          studentId: true,
          mode: true,
        },
      }),
    ]);

    const defaultMode = parseAiFeedbackMode(scope.aiFeedbackMode);
    const overrideByStudent = new Map(
      overrides.map((override) => [override.studentId, parseAiFeedbackMode(override.mode)] as const)
    );
    const seenStudentIds = new Set<string>();
    const students: AssignmentFeedbackStudent[] = [];

    for (const enrollment of enrollments) {
      if (seenStudentIds.has(enrollment.student.id)) continue;
      seenStudentIds.add(enrollment.student.id);

      const overrideMode = overrideByStudent.get(enrollment.student.id) ?? null;
      students.push({
        id: enrollment.student.id,
        name: enrollment.student.name,
        email: enrollment.student.email,
        picture: enrollment.student.picture || null,
        classId: enrollment.class.id,
        className: enrollment.class.name,
        effectiveMode: overrideMode ?? defaultMode,
        overrideMode,
      });
    }

    return {
      defaultMode,
      students,
    };
  } catch (error) {
    logger.error({ err: error, assignmentAreaId }, 'Failed to load assignment feedback mode setup:');
    return null;
  }
}

export async function saveAssignmentFeedbackModeOverrides(
  assignmentAreaId: string,
  teacherId: string,
  overrides: AssignmentFeedbackModeOverrideInput[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const scope = await getAuthorizedAssignmentScope(assignmentAreaId, teacherId);
    if (!scope) {
      return { success: false, error: 'Assignment not found or unauthorized' };
    }

    const eligibleStudentIds = await getEligibleStudentIds(scope);
    const dedupedOverrides = new Map<string, AssignmentFeedbackModeChoice>();

    for (const override of overrides) {
      if (!eligibleStudentIds.has(override.studentId)) {
        return { success: false, error: 'One or more students are not eligible for this assignment' };
      }
      dedupedOverrides.set(override.studentId, override.mode);
    }

    const operations: Prisma.PrismaPromise<unknown>[] = [];
    for (const [studentId, mode] of dedupedOverrides.entries()) {
      if (mode === 'DEFAULT') {
        operations.push(
          db.assignmentFeedbackModeOverride.deleteMany({
            where: {
              assignmentAreaId,
              studentId,
            },
          })
        );
        continue;
      }

      operations.push(
        db.assignmentFeedbackModeOverride.upsert({
          where: {
            assignmentAreaId_studentId: {
              assignmentAreaId,
              studentId,
            },
          },
          update: {
            mode,
            assignedById: teacherId,
          },
          create: {
            assignmentAreaId,
            studentId,
            mode,
            assignedById: teacherId,
          },
        })
      );
    }

    if (operations.length > 0) {
      await db.$transaction(operations);
    }

    return { success: true };
  } catch (error) {
    logger.error({ err: error, assignmentAreaId, teacherId }, 'Failed to save AI feedback mode overrides:');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save feedback mode overrides',
    };
  }
}
