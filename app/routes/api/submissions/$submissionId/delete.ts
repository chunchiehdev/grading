import { type ActionFunctionArgs } from 'react-router';
import { requireTeacher } from '@/services/auth.server';
import { deleteSubmissionByTeacher } from '@/services/submission.server';

export async function action({ request, params }: ActionFunctionArgs) {
  // Verify teacher authentication
  const teacher = await requireTeacher(request);
  const submissionId = params.submissionId as string;

  if (!submissionId) {
    return Response.json({ success: false, error: 'Submission ID is required' }, { status: 400 });
  }

  // Only allow DELETE method
  if (request.method !== 'DELETE') {
    return Response.json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  try {
    // Call the deletion service
    const result = await deleteSubmissionByTeacher(submissionId, teacher.id);

    if (!result.success) {
      return Response.json(result, { status: result.error?.includes('not found') ? 404 : 403 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting submission:', error);
    return Response.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete submission' 
      },
      { status: 500 }
    );
  }
}
