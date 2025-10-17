/**
 * POST /api/assignments - Create new assignment
 * GET /api/assignments - List assignments (for a course)
 * Feature 004: Supports reference files and custom grading instructions
 */

import { requireTeacher } from '@/services/auth.server';
import { createAssignmentSchema } from '@/schemas/assignment';
import { createAssignmentArea, listAssignmentAreas } from '@/services/assignment-area.server';
import { validateReferenceFiles } from '@/services/assignment-area.server';
import { db } from '@/lib/db.server';
import { createSuccessResponse, createErrorResponse, ApiErrorCode } from '@/types/api';

/**
 * POST /api/assignments
 * Create a new assignment with optional reference files and custom instructions
 */
export async function action({ request }: { request: Request }) {
  try {
    const teacher = await requireTeacher(request);

    const body = await request.json();

    // Validate request body
    const validation = createAssignmentSchema.safeParse(body);
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
        return Response.json(
          createErrorResponse('Invalid reference files', ApiErrorCode.VALIDATION_ERROR, errors),
          { status: 400 }
        );
      }

      // Replace with only valid IDs
      data.referenceFileIds = validIds;
    }

    // Create assignment area
    const assignmentArea = await createAssignmentArea(teacher.id, data.courseId, {
      name: data.name,
      description: data.description,
      rubricId: data.rubricId,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      classId: data.classId,
    });

    // Feature 004: Update with reference files and custom instructions if provided
    if (data.referenceFileIds || data.customGradingPrompt) {
      const referenceFileIdsJson =
        data.referenceFileIds && data.referenceFileIds.length > 0
          ? JSON.stringify(data.referenceFileIds)
          : null;

      await db.assignmentArea.update({
        where: { id: assignmentArea.id },
        data: {
          referenceFileIds: referenceFileIdsJson,
          customGradingPrompt: data.customGradingPrompt || null,
        },
      });

      console.log(
        `✅ Assignment "${assignmentArea.name}" created with ${data.referenceFileIds?.length || 0} reference files`
      );
    }

    // Fetch the updated assignment with reference files
    const updatedAssignment = await db.assignmentArea.findUnique({
      where: { id: assignmentArea.id },
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

    // Parse reference file IDs and fetch file details
    let referenceFiles: any[] = [];
    if (updatedAssignment?.referenceFileIds) {
      try {
        const fileIds: string[] = JSON.parse(updatedAssignment.referenceFileIds);
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
        console.error('Failed to parse referenceFileIds:', error);
      }
    }

    return Response.json(
      createSuccessResponse({
        id: updatedAssignment!.id,
        name: updatedAssignment!.name,
        description: updatedAssignment!.description,
        courseId: updatedAssignment!.courseId,
        classId: updatedAssignment!.classId,
        rubricId: updatedAssignment!.rubricId,
        dueDate: updatedAssignment!.dueDate,
        referenceFileIds: data.referenceFileIds || [],
        customGradingPrompt: updatedAssignment!.customGradingPrompt,
        referenceFiles,
        rubric: updatedAssignment!.rubric,
        createdAt: updatedAssignment!.createdAt,
      })
    );
  } catch (error) {
    console.error('❌ Error creating assignment:', error);
    return Response.json(
      createErrorResponse(
        error instanceof Error ? error.message : 'Failed to create assignment',
        ApiErrorCode.INTERNAL_ERROR
      ),
      { status: 500 }
    );
  }
}

/**
 * GET /api/assignments?courseId=xxx
 * List assignments for a course
 */
export async function loader({ request }: { request: Request }) {
  try {
    const teacher = await requireTeacher(request);

    const url = new URL(request.url);
    const courseId = url.searchParams.get('courseId');

    if (!courseId) {
      return Response.json(
        createErrorResponse('courseId parameter required', ApiErrorCode.VALIDATION_ERROR),
        { status: 400 }
      );
    }

    const assignments = await listAssignmentAreas(courseId, teacher.id);

    return Response.json(createSuccessResponse({ assignments }));
  } catch (error) {
    console.error('❌ Error listing assignments:', error);
    return Response.json(
      createErrorResponse(
        error instanceof Error ? error.message : 'Failed to list assignments',
        ApiErrorCode.INTERNAL_ERROR
      ),
      { status: 500 }
    );
  }
}
