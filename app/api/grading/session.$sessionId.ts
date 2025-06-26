import { getUserId } from '@/services/auth.server';
import {
  getGradingSession,
  getAnyGradingSession,
  startGradingSession,
  cancelGradingSession
} from '@/services/grading-session.server';

/**
 * GET: Get specific grading session
 * Query params:
 * - access: 'my' (default) for user's own session, 'any' for any user's session
 */
export async function loader({ 
  request, 
  params 
}: { 
  request: Request;
  params: { sessionId: string };
}) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const access = url.searchParams.get('access') || 'my';
    const { sessionId } = params;
    
    let result;
    
    if (access === 'any') {
      // Get any grading session (shared access)
      result = await getAnyGradingSession(sessionId);
    } else {
      // Get only user's own grading session (default behavior)
      result = await getGradingSession(sessionId, userId);
    }

    if (result.error) {
      return Response.json({ error: result.error }, { status: 404 });
    }

    return Response.json({
      success: true,
      session: result.session,
      access: access
    });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : 'Failed to get session'
    }, { status: 500 });
  }
}

/**
 * POST: Control grading session (start/cancel)
 */
export async function action({ 
  request, 
  params 
}: { 
  request: Request;
  params: { sessionId: string };
}) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = params;
    const formData = await request.formData();
    const action = formData.get('action') as string;

    switch (action) {
      case 'start': {
        const result = await startGradingSession(sessionId, userId);
        if (!result.success) {
          return Response.json({ error: result.error }, { status: 400 });
        }
        return Response.json({ success: true, action: 'started' });
      }

      case 'cancel': {
        const result = await cancelGradingSession(sessionId, userId);
        if (!result.success) {
          return Response.json({ error: result.error }, { status: 400 });
        }
        return Response.json({ success: true, action: 'cancelled' });
      }

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : 'Failed to update session'
    }, { status: 500 });
  }
}