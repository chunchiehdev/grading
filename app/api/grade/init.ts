import { GradingProgressService } from '@/services/grading-progress.server';

export async function action() {
  const gradingId = `grade-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  await GradingProgressService.initialize(gradingId);
  return Response.json({ gradingId });
} 