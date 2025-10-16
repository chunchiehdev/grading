import { GradingProgressService } from '@/services/grading-progress.server';
import { createSuccessResponse } from '@/types/api';

/**
 * API endpoint to initialize a new grading session
 * @returns {Promise<Response>} JSON response with unique grading ID
 */
export async function action() {
  const gradingId = `grade-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  await GradingProgressService.initialize(gradingId);
  return Response.json(createSuccessResponse({ gradingId }));
}
