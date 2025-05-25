import { GradingProgressService } from '@/services/grading-progress.server';
import { gradeDocument } from '@/services/rubric.server';

/**
 * API endpoint to grade a document using a specific rubric
 * @param {Object} params - Route parameters
 * @param {Request} params.request - HTTP request with form data containing fileKey, rubricId, and gradingId
 * @returns {Promise<Response>} JSON response with grading results or error
 */
export async function action({ request }: { request: Request }) {
  try {
    const formData = await request.formData();
    const fileKey = formData.get('fileKey') as string;
    const rubricId = formData.get('rubricId') as string;
    const gradingId = formData.get('gradingId') as string;

    if (!fileKey || !rubricId || !gradingId) {
      return Response.json({ 
        success: false, 
        error: '缺少必要參數' 
      }, { status: 400 });
    }

    const result = await gradeDocument(fileKey, rubricId, gradingId);

    if (result.success && result.gradingResult) {
      await GradingProgressService.complete(gradingId, result.gradingResult);
      return Response.json({ 
        success: true, 
        gradingId,
        data: result.gradingResult 
      });
    } else {
      await GradingProgressService.error(gradingId, result.error || '評分失敗');
      return Response.json({ 
        success: false, 
        error: result.error 
      }, { status: 500 });
    }
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : '評分過程中發生錯誤' 
    }, { status: 500 });
  }
} 