import { getUserId } from '@/services/auth.server';
import { 
  getSessionGradingResults,
  getGradingResult,
  updateGradingResult,
  failGradingResult 
} from '@/services/grading-result.server';

/**
 * GET: Get grading results for a session or specific result
 */
export async function loader({ request }: { request: Request }) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    const resultId = url.searchParams.get('resultId');

    if (resultId) {
      // Get specific result
      const result = await getGradingResult(resultId, userId);
      if (result.error) {
        return Response.json({ error: result.error }, { status: 404 });
      }
      return Response.json({ success: true, result: result.result });
    }

    if (sessionId) {
      // Get all results for session
      const result = await getSessionGradingResults(sessionId, userId);
      if (result.error) {
        return Response.json({ error: result.error }, { status: 500 });
      }
      return Response.json({ success: true, results: result.results });
    }

    return Response.json({ error: 'sessionId or resultId is required' }, { status: 400 });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : 'Failed to get results'
    }, { status: 500 });
  }
}

/**
 * POST: Update grading result
 */
export async function action({ request }: { request: Request }) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (request.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const formData = await request.formData();
    const resultId = formData.get('resultId') as string;
    const action = formData.get('action') as string;

    if (!resultId) {
      return Response.json({ error: 'Result ID is required' }, { status: 400 });
    }

    switch (action) {
      case 'complete': {
        const gradingDataStr = formData.get('gradingData') as string;
        const metadataStr = formData.get('metadata') as string;

        if (!gradingDataStr) {
          return Response.json({ error: 'Grading data is required' }, { status: 400 });
        }

        const gradingData = JSON.parse(gradingDataStr);
        const metadata = metadataStr ? JSON.parse(metadataStr) : undefined;

        const result = await updateGradingResult(resultId, gradingData, metadata);
        if (!result.success) {
          return Response.json({ error: result.error }, { status: 400 });
        }

        return Response.json({ success: true });
      }

      case 'fail': {
        const errorMessage = formData.get('errorMessage') as string;
        if (!errorMessage) {
          return Response.json({ error: 'Error message is required' }, { status: 400 });
        }

        const result = await failGradingResult(resultId, errorMessage);
        if (!result.success) {
          return Response.json({ error: result.error }, { status: 400 });
        }

        return Response.json({ success: true });
      }

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : 'Failed to update result'
    }, { status: 500 });
  }
}