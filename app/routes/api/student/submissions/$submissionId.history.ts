/**
 * API Route: Get submission version history for a student
 * Route: /api/student/submissions/:submissionId/history
 */

import { type LoaderFunctionArgs } from 'react-router';
import { requireStudent } from '@/services/auth.server';
import { getSubmissionHistory } from '@/services/version-management.server';
import { db } from '@/types/database';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const student = await requireStudent(request);
  const { submissionId } = params;

  if (!submissionId) {
    return Response.json({ success: false, error: 'Submission ID required' }, { status: 400 });
  }

  try {
    // First, get the submission to extract assignmentAreaId
    const submission = await db.submission.findUnique({
      where: { id: submissionId },
      select: {
        assignmentAreaId: true,
        studentId: true,
      },
    });

    if (!submission) {
      return Response.json({ success: false, error: 'Submission not found' }, { status: 404 });
    }

    // Verify student owns this submission
    if (submission.studentId !== student.id) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Get all versions for this assignment
    const history = await getSubmissionHistory(submission.assignmentAreaId, student.id);

    return Response.json({
      success: true,
      data: {
        history,
        totalVersions: history.length,
      },
    });
  } catch (error) {
    console.error('Error fetching submission history:', error);
    return Response.json({ success: false, error: 'Failed to fetch submission history' }, { status: 500 });
  }
}
