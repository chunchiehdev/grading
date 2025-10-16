import { requireStudent } from '@/services/auth.server';
import { createSubmissionAndLinkGradingResult } from '@/services/submission.server';
import { createErrorResponse } from '@/types/api';

export async function action({ request }: { request: Request }) {
  try {
    const student = await requireStudent(request);
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      const assignmentId = body.assignmentId ?? null;
      const fileToken = body.filePath ?? body.uploadedFileId ?? null;
      const sessionId = body.sessionId ?? null;
      if (!assignmentId || !fileToken) {
        return Response.json(createErrorResponse('assignmentId and filePath/uploadedFileId are required'), {
          status: 400,
        });
      }
      const result = await createSubmissionAndLinkGradingResult(student.id, assignmentId, fileToken, sessionId);
      return Response.json({ success: true, ...result });
    } else {
      const formData = await request.formData();
      const assignmentId = (formData.get('assignmentId') as string) || null;
      const sessionId = formData.get('sessionId') as string;
      const fileToken = (formData.get('filePath') as string) || (formData.get('uploadedFileId') as string) || null;

      if (!assignmentId || !fileToken) {
        return Response.json(createErrorResponse('assignmentId and filePath/uploadedFileId are required'), {
          status: 400,
        });
      }
      const result = await createSubmissionAndLinkGradingResult(student.id, assignmentId, fileToken, sessionId);
      return Response.json({ success: true, ...result });
    }
  } catch (error) {
    console.error('Failed to handle student submission:', error);
    return Response.json(createErrorResponse('Failed to submit assignment'), { status: 500 });
  }
}

export async function loader() {
  return Response.json(createErrorResponse('Method Not Allowed'), { status: 405 });
}
