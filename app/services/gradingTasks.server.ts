// utils/grading.ts
import { v4 as uuidv4 } from 'uuid';
import { redirect } from 'react-router';
import { db } from '@/lib/db.server';
import { getUserId } from '@/services/auth.server';

interface CreateGradingOptions {
  source?: string;
  request: Request;
}

export const createNewGrading = async ({ request, source = 'unknown' }: CreateGradingOptions) => {
  const userId = await getUserId(request);

  if (!userId) {
    throw redirect('/auth/login');
  }

  try {
    const task = await db.gradingTask.create({
      data: {
        id: uuidv4(),
        authorId: userId,
        status: 'created',
        metadata: {
          source,
          createdAt: new Date().toISOString(),
        },
      },
    });

    return task;
  } catch (error) {
    console.error('Error creating grading task:', error);
    throw new Error('無法創建評分任務');
  }
};
