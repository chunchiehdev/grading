/**
 * Token Counter Service
 * 
 * Estimates token count for content to prevent excessive API costs
 * Uses heuristic estimation (no API calls required)
 */

import logger from '@/utils/logger';

// Configuration
const MAX_INPUT_TOKENS = parseInt(process.env.MAX_INPUT_TOKENS || '1000000'); // 1M default for Gemini Flash
const CHARS_PER_TOKEN_CHINESE = 2;  // Chinese: ~2 chars per token
const CHARS_PER_TOKEN_OTHER = 4;    // English/Other: ~4 chars per token

/**
 * Estimate token count using heuristic rules
 * This is fast and free (no API calls)
 */
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) return 0;
  
  // Count Chinese characters (Unicode range for CJK)
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  
  // Chinese is more token-dense
  const estimatedTokens = Math.ceil(
    chineseChars / CHARS_PER_TOKEN_CHINESE + 
    otherChars / CHARS_PER_TOKEN_OTHER
  );
  
  return estimatedTokens;
}

/**
 * Check if content exceeds token limit
 */
export function checkTokenLimit(
  tokens: number,
  context: string = 'content'
): {
  allowed: boolean;
  tokens: number;
  limit: number;
  exceededBy: number;
  message?: string;
} {
  const exceededBy = tokens - MAX_INPUT_TOKENS;
  
  if (exceededBy > 0) {
    logger.warn(`❌ Token limit exceeded in ${context}`, {
      tokens,
      limit: MAX_INPUT_TOKENS,
      exceededBy,
      percentage: ((tokens / MAX_INPUT_TOKENS) * 100).toFixed(1) + '%',
    });
    
    return {
      allowed: false,
      tokens,
      limit: MAX_INPUT_TOKENS,
      exceededBy,
      message: `Content too large: ${tokens.toLocaleString()} tokens (limit: ${MAX_INPUT_TOKENS.toLocaleString()}, exceeded by ${exceededBy.toLocaleString()})`,
    };
  }
  
  logger.info(`✅ Token check passed for ${context}`, {
    tokens,
    limit: MAX_INPUT_TOKENS,
    utilization: ((tokens / MAX_INPUT_TOKENS) * 100).toFixed(1) + '%',
  });
  
  return {
    allowed: true,
    tokens,
    limit: MAX_INPUT_TOKENS,
    exceededBy: 0,
  };
}

/**
 * Estimate tokens for multiple texts and return total
 */
export function estimateMultipleTokens(texts: string[]): {
  total: number;
  breakdown: Array<{ index: number; tokens: number }>;
} {
  const breakdown = texts.map((text, index) => ({
    index,
    tokens: estimateTokens(text),
  }));
  
  const total = breakdown.reduce((sum, item) => sum + item.tokens, 0);
  
  return { total, breakdown };
}

/**
 * Get token limit configuration
 */
export function getTokenLimits() {
  return {
    maxInputTokens: MAX_INPUT_TOKENS,
    charsPerTokenChinese: CHARS_PER_TOKEN_CHINESE,
    charsPerTokenOther: CHARS_PER_TOKEN_OTHER,
  };
}
