import { db } from '@/lib/db.server';
import { publishAssignmentCreatedNotification } from '@/services/notification.server';
import logger from '@/utils/logger';

export interface AssignmentAreaInfo {
  id: string;
  name: string;
  description: string | null;
  courseId: string;
  rubricId: string;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  referenceFileIds?: string | null; // Feature 004: JSON string of file IDs
  customGradingPrompt?: string | null; // Feature 004: Custom instructions
  course?: {
    id: string;
    name: string;
    teacher: {
      id: string;
      email: string;
      name: string;
    };
  };
  rubric?: {
    id: string;
    name: string;
    description: string;
  };
  _count?: {
    submissions: number;
  };
}

export interface CreateAssignmentAreaData {
  name: string;
  description?: string;
  rubricId: string;
  dueDate?: Date;
  classId?: string | null;
}

export interface UpdateAssignmentAreaData {
  name?: string;
  description?: string;
  rubricId?: string;
  dueDate?: Date;
}

/**
 * Creates a new assignment area for a course
 * @param teacherId - Teacher's user ID for authorization
 * @param courseId - Course ID
 * @param data - Assignment area creation data
 * @returns Created assignment area information
 */
export async function createAssignmentArea(
  teacherId: string,
  courseId: string,
  data: CreateAssignmentAreaData
): Promise<AssignmentAreaInfo> {
  try {
    // Verify teacher owns the course
    const course = await db.course.findFirst({
      where: {
        id: courseId,
        teacherId,
      },
    });

    if (!course) {
      throw new Error('Course not found or unauthorized');
    }

    // Verify rubric exists and teacher has access
    const rubric = await db.rubric.findFirst({
      where: {
        id: data.rubricId,
        OR: [{ userId: teacherId }, { teacherId: teacherId }, { isTemplate: true }],
      },
    });

    if (!rubric) {
      throw new Error('Rubric not found or unauthorized');
    }

    const assignmentArea = await db.assignmentArea.create({
      data: {
        name: data.name,
        description: data.description || null,
        courseId,
        rubricId: data.rubricId,
        dueDate: data.dueDate || null,
        classId: data.classId || null,
      },
      include: {
        course: {
          include: {
            teacher: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        rubric: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    logger.info('  Created assignment area:', assignmentArea.name, 'for course:', courseId);

    // 發布作業通知事件
    try {
      await publishAssignmentCreatedNotification(assignmentArea);
      logger.info('  Assignment notification published for:', assignmentArea.name);
    } catch (notificationError) {
      logger.error('⚠️ Failed to publish assignment notification:', notificationError);
      // 不阻斷作業建立流程，僅記錄錯誤
    }

    return assignmentArea;
  } catch (error) {
    logger.error('❌ Error creating assignment area:', error);
    throw error;
  }
}

/**
 * Gets an assignment area by ID with teacher authorization
 * @param assignmentId - Assignment area ID
 * @param teacherId - Teacher's user ID for authorization
 * @returns Assignment area information or null if not found/unauthorized
 */
export async function getAssignmentAreaById(
  assignmentId: string,
  teacherId: string
): Promise<AssignmentAreaInfo | null> {
  try {
    const assignmentArea = await db.assignmentArea.findFirst({
      where: {
        id: assignmentId,
        course: {
          teacherId,
        },
      },
      include: {
        course: {
          include: {
            teacher: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        rubric: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    return assignmentArea;
  } catch (error) {
    logger.error('❌ Error fetching assignment area:', error);
    return null;
  }
}

/**
 * Lists assignment areas for a course with teacher authorization
 * @param courseId - Course ID
 * @param teacherId - Teacher's user ID for authorization
 * @returns List of assignment areas with submission counts
 */
export async function listAssignmentAreas(courseId: string, teacherId: string): Promise<AssignmentAreaInfo[]> {
  try {
    // Verify teacher owns the course
    const course = await db.course.findFirst({
      where: {
        id: courseId,
        teacherId,
      },
    });

    if (!course) {
      throw new Error('Course not found or unauthorized');
    }

    const assignmentAreas = await db.assignmentArea.findMany({
      where: { courseId },
      include: {
        rubric: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    return assignmentAreas;
  } catch (error) {
    logger.error('❌ Error fetching assignment areas:', error);
    return [];
  }
}

/**
 * Updates an assignment area with teacher authorization
 * @param assignmentId - Assignment area ID
 * @param teacherId - Teacher's user ID for authorization
 * @param data - Update data
 * @returns Updated assignment area or null if not found/unauthorized
 */
export async function updateAssignmentArea(
  assignmentId: string,
  teacherId: string,
  data: UpdateAssignmentAreaData
): Promise<AssignmentAreaInfo | null> {
  try {
    // Verify teacher owns the assignment area through course
    const existingArea = await getAssignmentAreaById(assignmentId, teacherId);
    if (!existingArea) {
      return null;
    }

    // If rubric is being changed, verify access
    if (data.rubricId && data.rubricId !== existingArea.rubricId) {
      const rubric = await db.rubric.findFirst({
        where: {
          id: data.rubricId,
          OR: [{ userId: teacherId }, { teacherId: teacherId }, { isTemplate: true }],
        },
      });

      if (!rubric) {
        throw new Error('Rubric not found or unauthorized');
      }
    }

    const updatedArea = await db.assignmentArea.update({
      where: { id: assignmentId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.rubricId && { rubricId: data.rubricId }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
      },
      include: {
        course: {
          include: {
            teacher: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        rubric: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    logger.info('  Updated assignment area:', updatedArea.name);
    return updatedArea;
  } catch (error) {
    logger.error('❌ Error updating assignment area:', error);
    throw error;
  }
}

/**
 * Deletes an assignment area with teacher authorization
 * @param assignmentId - Assignment area ID
 * @param teacherId - Teacher's user ID for authorization
 * @returns True if deleted successfully
 */
export async function deleteAssignmentArea(assignmentId: string, teacherId: string): Promise<boolean> {
  try {
    // Verify teacher owns the assignment area through course
    const existingArea = await getAssignmentAreaById(assignmentId, teacherId);
    if (!existingArea) {
      return false;
    }

    // Use transaction to ensure all related data is deleted properly
    await db.$transaction(async (tx) => {
      // 1. Delete all submissions related to this assignment area
      await tx.submission.deleteMany({
        where: { assignmentAreaId: assignmentId },
      });

      // 2. Update grading results to set assignmentAreaId to null (SetNull cascade)
      await tx.gradingResult.updateMany({
        where: { assignmentAreaId: assignmentId },
        data: { assignmentAreaId: null },
      });

      // 3. Finally delete the assignment area itself
      await tx.assignmentArea.delete({
        where: { id: assignmentId },
      });
    });

    logger.info('  Deleted assignment area and all related data:', assignmentId);
    return true;
  } catch (error) {
    logger.error('❌ Error deleting assignment area:', error);
    return false;
  }
}

/**
 * Gets assignment area statistics for teacher dashboard
 * @param teacherId - Teacher's user ID
 * @returns Assignment area statistics
 */
export async function getTeacherAssignmentStats(teacherId: string) {
  try {
    const stats = await db.assignmentArea.aggregate({
      where: {
        course: {
          teacherId,
        },
      },
      _count: true,
    });

    const submissionStats = await db.submission.aggregate({
      where: {
        assignmentArea: {
          course: {
            teacherId,
          },
        },
      },
      _count: true,
    });

    const recentAreas = await db.assignmentArea.findMany({
      where: {
        course: {
          teacherId,
        },
      },
      include: {
        course: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      totalAssignmentAreas: stats._count,
      totalSubmissions: submissionStats._count,
      recentAreas,
    };
  } catch (error) {
    logger.error('❌ Error fetching teacher assignment stats:', error);
    return {
      totalAssignmentAreas: 0,
      totalSubmissions: 0,
      recentAreas: [],
    };
  }
}

// ============================================================================
// Feature 004: AI Grading with Knowledge Base Context
// ============================================================================

/**
 * Load reference documents for grading context
 * Fetches parsed content from UploadedFile records with 8000 char truncation
 *
 * @param assignmentAreaId - The assignment area ID
 * @returns Array of reference documents with parsed content
 */
export async function loadReferenceDocuments(
  assignmentAreaId: string
): Promise<Array<{ fileId: string; fileName: string; content: string; wasTruncated: boolean }>> {
  try {
    const assignmentArea = await db.assignmentArea.findUnique({
      where: { id: assignmentAreaId },
      select: { referenceFileIds: true },
    });

    if (!assignmentArea || !assignmentArea.referenceFileIds) {
      return [];
    }

    let fileIds: string[];
    try {
      fileIds = JSON.parse(assignmentArea.referenceFileIds);
    } catch (error) {
      logger.error('❌ Failed to parse referenceFileIds:', error);
      return [];
    }

    if (fileIds.length === 0) {
      return [];
    }

    const referenceFiles = await db.uploadedFile.findMany({
      where: {
        id: { in: fileIds },
        isDeleted: false,
        parseStatus: 'COMPLETED',
      },
      select: {
        id: true,
        originalFileName: true,
        parsedContent: true,
      },
    });

    // Apply 8000 character truncation per file (Feature 004 requirement)
    const MAX_CHARS_PER_FILE = 8000;

    return referenceFiles
      .filter((file) => file.parsedContent) // Only include files with content
      .map((file) => {
        const content = file.parsedContent!;
        const wasTruncated = content.length > MAX_CHARS_PER_FILE;

        let truncatedContent = content;
        if (wasTruncated) {
          truncatedContent = content.substring(0, MAX_CHARS_PER_FILE);
          truncatedContent += '\n\n[Note: Content truncated at 8,000 characters]';
          logger.warn(
            `⚠️ Reference file "${file.originalFileName}" truncated from ${content.length} to ${MAX_CHARS_PER_FILE} characters`
          );
        }

        return {
          fileId: file.id,
          fileName: file.originalFileName,
          content: truncatedContent,
          wasTruncated,
        };
      });
  } catch (error) {
    logger.error('❌ Error loading reference documents:', error);
    return [];
  }
}

/**
 * Get custom grading instructions for an assignment
 *
 * @param assignmentAreaId - Assignment area ID
 * @returns Custom grading prompt or null
 */
export async function getCustomGradingInstructions(assignmentAreaId: string): Promise<string | null> {
  try {
    const assignmentArea = await db.assignmentArea.findUnique({
      where: { id: assignmentAreaId },
      select: { customGradingPrompt: true },
    });

    return assignmentArea?.customGradingPrompt || null;
  } catch (error) {
    logger.error('❌ Error fetching custom grading instructions:', error);
    return null;
  }
}

/**
 * Validate reference file IDs exist and are parsed
 * Returns array of valid file IDs and array of errors
 *
 * @param fileIds - Array of file IDs to validate
 * @returns Object with validIds and errors arrays
 */
export async function validateReferenceFiles(fileIds: string[]): Promise<{ validIds: string[]; errors: string[] }> {
  if (fileIds.length === 0) {
    return { validIds: [], errors: [] };
  }

  if (fileIds.length > 5) {
    return {
      validIds: [],
      errors: ['Maximum 5 reference files allowed'],
    };
  }

  try {
    const files = await db.uploadedFile.findMany({
      where: {
        id: { in: fileIds },
        isDeleted: false,
      },
      select: {
        id: true,
        parseStatus: true,
        originalFileName: true,
      },
    });

    const validIds: string[] = [];
    const errors: string[] = [];

    for (const fileId of fileIds) {
      const file = files.find((f) => f.id === fileId);

      if (!file) {
        errors.push(`Reference file ${fileId} not found`);
      } else if (file.parseStatus !== 'COMPLETED') {
        errors.push(`Reference file "${file.originalFileName}" is not fully parsed (status: ${file.parseStatus})`);
      } else {
        validIds.push(fileId);
      }
    }

    return { validIds, errors };
  } catch (error) {
    logger.error('❌ Error validating reference files:', error);
    return { validIds: [], errors: ['Failed to validate reference files'] };
  }
}
