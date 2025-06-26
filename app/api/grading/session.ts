import { getUserId } from '@/services/auth.server';
import {
  createGradingSession,
  getGradingSession,
  listGradingSessions,
  listAllGradingSessions,
  startGradingSession,
  cancelGradingSession
} from '@/services/grading-session.server';

/**
 * GET: List grading sessions - supports both user-scoped and shared views
 * Query params:
 * - view: 'my' (default) for user's own sessions, 'all' for all users' sessions  
 * - limit: pagination limit
 * - offset: pagination offset
 */
export async function loader({ request }: { request: Request }) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const view = url.searchParams.get('view') || 'my';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let result;
    
    if (view === 'all') {
      // List all grading sessions from all users
      result = await listAllGradingSessions(limit, offset);
    } else {
      // List only current user's grading sessions (default behavior)
      result = await listGradingSessions(userId, limit, offset);
    }

    if (result.error) {
      return Response.json({ error: result.error }, { status: 500 });
    }

    return Response.json({
      success: true,
      sessions: result.sessions,
      total: result.total,
      view: view
    });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : 'Failed to list sessions'
    }, { status: 500 });
  }
}

/**
 * POST: Create new grading session
 */
export async function action({ request }: { request: Request }) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const method = request.method;

    if (method === 'POST') {
      const formData = await request.formData();
      const fileIds = JSON.parse(formData.get('fileIds') as string || '[]');
      const rubricIds = JSON.parse(formData.get('rubricIds') as string || '[]');

      if (!Array.isArray(fileIds) || fileIds.length === 0) {
        return Response.json({
          error: 'At least one file is required'
        }, { status: 400 });
      }

      if (!Array.isArray(rubricIds) || rubricIds.length === 0) {
        return Response.json({
          error: 'At least one rubric is required'
        }, { status: 400 });
      }

      // Validate that fileIds and rubricIds have the same length for one-to-one pairing
      if (fileIds.length !== rubricIds.length) {
        return Response.json({
          error: 'File and rubric arrays must have the same length for one-to-one pairing'
        }, { status: 400 });
      }

      // Create file-rubric pairs
      const filePairs = fileIds.map((fileId: string, index: number) => ({
        fileId,
        rubricId: rubricIds[index]
      }));

      const result = await createGradingSession({
        userId,
        filePairs
      });

      if (!result.success) {
        return Response.json({
          error: result.error
        }, { status: 400 });
      }

      return Response.json({
        success: true,
        sessionId: result.sessionId
      });
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : 'Failed to create session'
    }, { status: 500 });
  }
}