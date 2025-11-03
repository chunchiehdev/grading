/**
 * GET /api/assignments/:assignmentId - Get assignment details
 * PATCH /api/assignments/:assignmentId - Update assignment
 * Feature 004: Returns reference files and custom instructions
 */

import { requireTeacher } from '@/services/auth.server';
import { updateAssignmentSchema } from '@/schemas/assignment';
import { getAssignmentAreaById, updateAssignmentArea, validateReferenceFiles } from '@/services/assignment-area.server';
import { db } from '@/lib/db.server';
import { createSuccessResponse, createErrorResponse, ApiErrorCode } from '@/types/api';
import logger from '@/utils/logger';

interface RouteParams {
  assignmentId?: string;
}

/**
 * GET /api/assignments/:assignmentId
 * Get assignment details with reference files
 */
export async function loader({ request, params }: { request: Request; params: RouteParams }) {
  try {
    const teacher = await requireTeacher(request);
    const { assignmentId } = params;

    if (!assignmentId) {
      return Response.json(createErrorResponse('Assignment ID required', ApiErrorCode.VALIDATION_ERROR), {
        status: 400,
      });
    }

    const assignment = await getAssignmentAreaById(assignmentId, teacher.id);

    if (!assignment) {
      return Response.json(createErrorResponse('Assignment not found', ApiErrorCode.NOT_FOUND), { status: 404 });
    }

    // Feature 004: Parse and fetch reference files
    interface ReferenceFile {
      id: string;
      originalFileName: string;
      fileSize: number;
      parseStatus: string | null;
      parseError: string | null;
      createdAt: Date;
    }

    let referenceFiles: ReferenceFile[] = [];

    // Check if assignment has referenceFileIds field
    if (assignment.referenceFileIds && typeof assignment.referenceFileIds === 'string') {
      try {
        const fileIds: string[] = JSON.parse(assignment.referenceFileIds);
        if (fileIds.length > 0) {
          referenceFiles = await db.uploadedFile.findMany({
            where: {
              id: { in: fileIds },
              isDeleted: false,
            },
            select: {
              id: true,
              originalFileName: true,
              fileSize: true,
              parseStatus: true,
              parseError: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          });
        }
      } catch (error) {
        logger.error('Failed to parse referenceFileIds:', error);
      }
    }

    return Response.json(
      createSuccessResponse({
        ...assignment,
        referenceFiles,
      })
    );
  } catch (error) {
    logger.error('Error fetching assignment:', error);
    return Response.json(
      createErrorResponse(
        error instanceof Error ? error.message : 'Failed to fetch assignment',
        ApiErrorCode.INTERNAL_ERROR
      ),
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/assignments/:assignmentId
 * Update assignment including reference files and custom instructions
 */
export async function action({ request, params }: { request: Request; params: RouteParams }) {
  try {
    const teacher = await requireTeacher(request);
    const { assignmentId } = params;

    if (!assignmentId) {
      return Response.json(createErrorResponse('Assignment ID required', ApiErrorCode.VALIDATION_ERROR), {
        status: 400,
      });
    }

    const body = await request.json();

    // Validate request body
    const validation = updateAssignmentSchema.safeParse(body);
    if (!validation.success) {
      return Response.json(
        createErrorResponse('Validation failed', ApiErrorCode.VALIDATION_ERROR, validation.error.errors),
        { status: 400 }
      );
    }

    const data = validation.data;

    // Feature 004: Validate reference files if provided
    if (data.referenceFileIds && data.referenceFileIds.length > 0) {
      const { validIds, errors } = await validateReferenceFiles(data.referenceFileIds);

      if (errors.length > 0) {
        return Response.json(createErrorResponse('Invalid reference files', ApiErrorCode.VALIDATION_ERROR, errors), {
          status: 400,
        });
      }

      // Replace with only valid IDs
      data.referenceFileIds = validIds;
    }

    // Update assignment
    const updatedAssignment = await updateAssignmentArea(assignmentId, teacher.id, {
      name: data.name,
      description: data.description ?? undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    });

    if (!updatedAssignment) {
      return Response.json(createErrorResponse('Assignment not found or unauthorized', ApiErrorCode.NOT_FOUND), {
        status: 404,
      });
    }

    // Feature 004: Update reference files and custom instructions if provided
    if (data.referenceFileIds !== undefined || data.customGradingPrompt !== undefined) {
      const referenceFileIdsJson =
        data.referenceFileIds !== undefined
          ? data.referenceFileIds && data.referenceFileIds.length > 0
            ? JSON.stringify(data.referenceFileIds)
            : null
          : undefined;

      const updateData: Record<string, string | null> = {};
      if (referenceFileIdsJson !== undefined) {
        updateData.referenceFileIds = referenceFileIdsJson;
      }
      if (data.customGradingPrompt !== undefined) {
        updateData.customGradingPrompt = data.customGradingPrompt;
      }

      await db.assignmentArea.update({
        where: { id: assignmentId },
        data: updateData,
      });

      logger.info(`Assignment "${updatedAssignment.name}" updated`);
    }

    // Fetch the updated assignment with reference files
    const finalAssignment = await db.assignmentArea.findUnique({
      where: { id: assignmentId },
      include: {
        rubric: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    // Parse and fetch reference files
    interface ReferenceFile {
      id: string;
      originalFileName: string;
      fileSize: number;
      parseStatus: string | null;
      parseError: string | null;
      createdAt: Date;
    }

    let referenceFiles: ReferenceFile[] = [];
    if (finalAssignment?.referenceFileIds && typeof finalAssignment.referenceFileIds === 'string') {
      try {
        const fileIds: string[] = JSON.parse(finalAssignment.referenceFileIds);
        referenceFiles = await db.uploadedFile.findMany({
          where: {
            id: { in: fileIds },
            isDeleted: false,
          },
          select: {
            id: true,
            originalFileName: true,
            fileSize: true,
            parseStatus: true,
            parseError: true,
            createdAt: true,
          },
        });
      } catch (error) {
        logger.error('Failed to parse referenceFileIds:', error);
      }
    }

    return Response.json(
      createSuccessResponse({
        ...finalAssignment,
        referenceFiles,
        updatedAt: new Date().toISOString(),
      })
    );
  } catch (error) {
    logger.error('Error updating assignment:', error);
    return Response.json(
      createErrorResponse(
        error instanceof Error ? error.message : 'Failed to update assignment',
        ApiErrorCode.INTERNAL_ERROR
      ),
      { status: 500 }
    );
  }
}
