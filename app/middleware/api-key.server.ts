import logger from '~/utils/logger';

/**
 * Validate API key from request
 * @param {Request} request - The HTTP request
 * @returns {boolean} True if API key is valid
 */
export function validateApiKey(request: Request): boolean {
  const apiKey = request.headers.get('x-api-key');

  if (!apiKey) {
    logger.warn('No API key provided in request');
    return false;
  }

  // Get expected API key from environment
  const expectedApiKey = process.env.INTERNAL_API_KEY;

  if (!expectedApiKey) {
    logger.warn('INTERNAL_API_KEY not configured in environment');
    return false;
  }

  // Direct string comparison (API keys should be random enough)
  const isValid = apiKey === expectedApiKey;
  logger.debug(
    {
      provided: apiKey.substring(0, 8) + '...',
      expected: expectedApiKey.substring(0, 8) + '...',
      isValid,
    },
    'API Key validation'
  );

  return isValid;
}
