/**
 * API Route: Compare two submission versions
 * Route: /api/submissions/compare?versionA=:id&versionB=:id
 */

import { type LoaderFunctionArgs } from 'react-router';
import { requireAuth } from '@/services/auth.server';
import { compareSubmissionVersions } from '@/services/version-management.server';
import { db } from '@/types/database';

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  const url = new URL(request.url);
  const versionAId = url.searchParams.get('versionA');
  const versionBId = url.searchParams.get('versionB');

  if (!versionAId || !versionBId) {
    return Response.json({ success: false, error: 'Both version IDs required' }, { status: 400 });
  }

  try {
    // Fetch both submissions to verify authorization
    const [submissionA, submissionB] = await Promise.all([
      db.submission.findUnique({
        where: { id: versionAId },
        select: {
          studentId: true,
          assignmentArea: {
            select: {
              course: {
                select: {
                  teacherId: true,
                },
              },
            },
          },
        },
      }),
      db.submission.findUnique({
        where: { id: versionBId },
        select: {
          studentId: true,
        },
      }),
    ]);

    if (!submissionA || !submissionB) {
      return Response.json({ success: false, error: 'One or both submissions not found' }, { status: 404 });
    }

    // Verify user is either the student or the teacher
    const isStudent = user.role === 'STUDENT' && submissionA.studentId === user.id;
    const isTeacher = user.role === 'TEACHER' && submissionA.assignmentArea.course.teacherId === user.id;

    if (!isStudent && !isTeacher) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Perform comparison
    const comparison = await compareSubmissionVersions(versionAId, versionBId);

    if (!comparison) {
      return Response.json({ success: false, error: 'Failed to compare versions' }, { status: 500 });
    }

    return Response.json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    console.error('Error comparing submission versions:', error);
    return Response.json({ success: false, error: 'Failed to compare versions' }, { status: 500 });
  }
}
