/**
 * GET /api/grading/judge-attempts/:sessionId
 *
 * Returns per-provider thinking + raw GradingResultData for the multi-model judge run.
 * Frontend hits this after the parallel grading stream finishes so the
 * "三家原始評分" / "查看思考過程" tabs are populated without a full page reload.
 */

import { type LoaderFunctionArgs } from 'react-router';
import { getUserId } from '@/services/auth.server';
import { getGradingSession } from '@/services/grading-session.server';
import { getJudgeAttemptsForSession } from '@/services/judge-attempts.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const sessionId = params.sessionId;
  if (!sessionId) return new Response('Missing sessionId', { status: 400 });

  // Reuse the session ownership check that bridge.ts already trusts.
  const sessionResult = await getGradingSession(sessionId, userId);
  if (!sessionResult.session) return new Response('Forbidden', { status: 403 });

  const bundle = await getJudgeAttemptsForSession(sessionId);
  return Response.json(bundle);
}
