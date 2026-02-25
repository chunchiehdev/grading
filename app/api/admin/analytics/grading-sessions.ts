/**
 * Admin Analytics API: Grading Sessions List
 * 
 * Returns paginated list of grading results with filtering
 */

import type { LoaderFunctionArgs } from 'react-router';
import { db } from '@/lib/db.server';
import { getUserId } from '@/services/auth.server';
import logger from '@/utils/logger';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Authentication & Authorization
    const userId = await getUserId(request);
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return new Response('Forbidden', { status: 403 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const requiresReview = url.searchParams.get('requiresReview');
    const minConfidence = url.searchParams.get('minConfidence');
    const maxConfidence = url.searchParams.get('maxConfidence');
    const assignmentAreaId = url.searchParams.get('assignmentAreaId');
    const sortBy = url.searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // Build where clause
    const where: any = { status: 'COMPLETED' };
    if (requiresReview === 'true') where.requiresReview = true;
    else if (requiresReview === 'false') where.requiresReview = false;
    
    if (minConfidence || maxConfidence) {
      where.confidenceScore = {};
      if (minConfidence) where.confidenceScore.gte = parseFloat(minConfidence);
      if (maxConfidence) where.confidenceScore.lte = parseFloat(maxConfidence);
    }
    
    if (assignmentAreaId) where.assignmentAreaId = assignmentAreaId;

    logger.info({
      page,
      limit,
      requiresReview,
      minConfidence,
      maxConfidence,
      assignmentAreaId,
    }, '[Analytics API] Fetching grading sessions');

    // Query sessions
    const [sessions, total] = await Promise.all([
      db.gradingResult.findMany({
        where,
        include: {
          uploadedFile: {
            select: { 
              fileName: true, 
              userId: true,
              user: {
                select: {
                  name: true,
                  email: true,
                  picture: true,
                },
              },
            },
          },
          assignmentArea: {
            select: { name: true, courseId: true },
          },
          rubric: {
            select: { name: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.gradingResult.count({ where }),
    ]);

    const result = {
      sessions,
      total,
      page,
      limit,
      hasMore: total > page * limit,
    };

    logger.info({
      count: sessions.length,
      total,
    }, '[Analytics API] Grading sessions retrieved');

    return Response.json(result);
  } catch (error) {
    logger.error({ err: error }, '[Analytics API] Error fetching grading sessions');
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch grading sessions',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
