import { type LoaderFunctionArgs } from 'react-router';
import { requireAuthForApi } from '@/services/auth.server';
import { getStudentAssignments } from '@/services/submission.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuthForApi(request);

  if (!user) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role !== 'STUDENT') {
    return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const assignments = await getStudentAssignments(user.id);
    
    return Response.json({
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error('Failed to fetch student assignments:', error);
    return Response.json({ 
      success: false, 
      error: 'Failed to fetch assignments' 
    }, { status: 500 });
  }
}
