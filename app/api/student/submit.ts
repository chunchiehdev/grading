import { requireStudent } from '@/services/auth.server';
import { createSubmissionAndGrade } from '@/services/submission.server';
import { createErrorResponse } from '@/types/api';

export async function action({ request }: { request: Request }) {
  try {
    const student = await requireStudent(request);
    const contentType = request.headers.get('content-type') || '';

    let assignmentId: string | null = null;
    let fileToken: string | null = null;

    if (contentType.includes('application/json')) {
      const body = await request.json();
      assignmentId = body.assignmentId ?? null;
      fileToken = body.filePath ?? body.uploadedFileId ?? null;
    } else {
      const formData = await request.formData();
      assignmentId = (formData.get('assignmentId') as string) || null;
      fileToken = (formData.get('filePath') as string) || (formData.get('uploadedFileId') as string) || null;
    }

    if (!assignmentId || !fileToken) {
      return Response.json(
        createErrorResponse('assignmentId and filePath/uploadedFileId are required'),
        { status: 400 }
      );
    }

    const result = await createSubmissionAndGrade(student.id, assignmentId, fileToken);

    return Response.json({ success: true, ...result });
  } catch (error) {
    console.error('Failed to handle student submission:', error);
    return Response.json(createErrorResponse('Failed to submit assignment'), { status: 500 });
  }
}

export async function loader() {
  return Response.json(createErrorResponse('Method Not Allowed'), { status: 405 });
}

