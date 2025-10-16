import { type LoaderFunctionArgs } from 'react-router';
import { requireStudent } from '@/services/auth.server';
import { getStudentAssignments } from '@/services/submission.server';

/**
 * GET /api/student/assignments
 * Get all assignments for student - unified data source
 * This ensures consistent data structure across all pages and WebSocket updates
 */
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const student = await requireStudent(request);

    const assignments = await getStudentAssignments(student.id);

    // Format dates consistently
    const formattedAssignments = assignments.map((assignment) => ({
      ...assignment,
      formattedDueDate: assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString('en-CA') : undefined,
    }));

    return Response.json({
      success: true,
      data: formattedAssignments,
    });
  } catch (error) {
    console.error('Failed to fetch student assignments:', error);
    return Response.json(
      {
        success: false,
        error: 'Failed to fetch assignments',
      },
      { status: 500 }
    );
  }
}
