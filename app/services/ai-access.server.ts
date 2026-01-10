/**
 * AI Access Control Service
 *
 * Unified access check for Gemini API usage.
 * Admin-controlled: New users default to aiEnabled=false.
 */

import { db } from '@/lib/db.server';
import logger from '@/utils/logger';

export interface AIAccessResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if a user is allowed to use AI (Gemini) features.
 *
 * @param userId - The user ID to check
 * @returns AIAccessResult with allowed status and optional denial reason
 */
export async function checkAIAccess(userId: string | undefined): Promise<AIAccessResult> {
  if (!userId) {
    return { allowed: false, reason: 'User ID not provided' };
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { aiEnabled: true, role: true },
    });

    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    // ADMIN always has AI access
    if (user.role === 'ADMIN') {
      return { allowed: true };
    }

    // Check aiEnabled flag for STUDENT and TEACHER
    if (!user.aiEnabled) {
      logger.info({ userId, role: user.role }, '[AIAccess] Access denied - not enabled by admin');
      return {
        allowed: false,
        reason: 'AI 功能尚未開啟。請聯繫管理員啟用您的 AI 存取權限。',
      };
    }

    return { allowed: true };
  } catch (error) {
    logger.error({ userId, error }, '[AIAccess] Error checking access');
    return { allowed: false, reason: 'Error checking AI access' };
  }
}

/**
 * Error class for AI access denial
 */
export class AIAccessDeniedError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'AIAccessDeniedError';
  }
}
