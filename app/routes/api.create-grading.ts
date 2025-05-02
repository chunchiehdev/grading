import { createNewGrading } from '@/services/gradingTasks.server';

export const action = async ({ request }: { request: Request }) => {
  try {
    const body = await request.json();
    const result = await createNewGrading({
      request,
      source: body.source || 'unknown',
    });

    return Response.json({ id: result.id });
  } catch (error) {
    return Response.json({ error: 'Failed to create grading task' }, { status: 500 });
  }
};
