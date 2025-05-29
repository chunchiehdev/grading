import { getUserId } from '@/services/auth.server';
import { db } from '@/lib/db.server';
import { withErrorHandler, createApiResponse } from '@/middleware/api.server';

/**
 * API endpoint to update file's selected rubric
 * @param {Object} params - Route parameters  
 * @param {Request} params.request - HTTP request object
 * @returns {Promise<Response>} JSON response with update result
 */
export async function action({ request }: { request: Request }) {
  return withErrorHandler(async () => {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { fileId, rubricId } = await request.json();

    if (!fileId) {
      return Response.json({ success: false, error: 'File ID is required' }, { status: 400 });
    }

    // Verify file belongs to user
    const file = await db.uploadedFile.findFirst({
      where: {
        id: fileId,
        userId,
      },
    });

    if (!file) {
      return Response.json({ success: false, error: 'File not found or access denied' }, { status: 404 });
    }

    // Update the file's selected rubric
    const updatedFile = await db.uploadedFile.update({
      where: { id: fileId },
      data: { selectedRubricId: rubricId },
      include: {
        selectedRubric: {
          include: {
            criteria: true,
          },
        },
      },
    });

    return createApiResponse({ file: updatedFile });
  });
} 