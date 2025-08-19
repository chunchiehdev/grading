import { requireStudent } from '@/services/auth.server';
import { getDraftSubmission, saveDraftSubmission } from '@/services/submission.server';
import { createErrorResponse } from '@/types/api';

/**
 * GET /api/student/assignments/[assignmentId]/draft
 * Retrieves existing draft submission data for the student
 */
export async function loader({ request, params }: { request: Request; params: any }) {
  try {
    const student = await requireStudent(request);
    const { assignmentId } = params;

    if (!assignmentId) {
      return Response.json(createErrorResponse('Assignment ID is required'), { status: 400 });
    }

    const draftSubmission = await getDraftSubmission(assignmentId, student.id);
    
    return Response.json({
      success: true,
      data: draftSubmission,
    });
  } catch (error) {
    console.error('Failed to get draft submission:', error);
    return Response.json(createErrorResponse('Failed to get draft submission'), { status: 500 });
  }
}

/**
 * POST /api/student/assignments/[assignmentId]/draft
 * Saves/updates draft submission data
 */
export async function action({ request, params }: { request: Request; params: any }) {
  try {
    const student = await requireStudent(request);
    const { assignmentId } = params;

    if (!assignmentId) {
      return Response.json(createErrorResponse('Assignment ID is required'), { status: 400 });
    }

    const contentType = request.headers.get('content-type') || '';
    let body: any;

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
      
      // Parse JSON fields if they exist
      if (body.fileMetadata && typeof body.fileMetadata === 'string') {
        try {
          body.fileMetadata = JSON.parse(body.fileMetadata);
        } catch (e) {
          console.warn('Could not parse fileMetadata JSON:', e);
        }
      }
      if (body.aiAnalysisResult && typeof body.aiAnalysisResult === 'string') {
        try {
          body.aiAnalysisResult = JSON.parse(body.aiAnalysisResult);
        } catch (e) {
          console.warn('Could not parse aiAnalysisResult JSON:', e);
        }
      }
    }

    const draftData = {
      assignmentAreaId: assignmentId,
      studentId: student.id,
      fileMetadata: body.fileMetadata || null,
      sessionId: body.sessionId || null,
      aiAnalysisResult: body.aiAnalysisResult || null,
      lastState: body.lastState || 'idle',
    };

    const savedDraft = await saveDraftSubmission(draftData);
    
    if (!savedDraft) {
      return Response.json(createErrorResponse('Could not save draft submission'), { status: 500 });
    }

    return Response.json({
      success: true,
      data: savedDraft,
    });
  } catch (error) {
    console.error('Failed to save draft submission:', error);
    return Response.json(createErrorResponse('Failed to save draft submission'), { status: 500 });
  }
}