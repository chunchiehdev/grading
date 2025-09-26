import { createHash, randomBytes } from 'crypto';

/**
 * Generate a secure API key
 * @returns {string} Generated API key
 */
export function generateApiKey(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Hash API key for secure storage
 * @param {string} apiKey - The plain API key
 * @returns {string} Hashed API key
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Validate API key from request
 * @param {Request} request - The HTTP request
 * @returns {boolean} True if API key is valid
 */
export function validateApiKey(request: Request): boolean {
  const apiKey = request.headers.get('x-api-key');
  
  if (!apiKey) {
    console.log('No API key provided in request');
    return false;
  }

  // Get expected API key from environment
  const expectedApiKey = process.env.INTERNAL_API_KEY;
  
  if (!expectedApiKey) {
    console.warn('INTERNAL_API_KEY not configured in environment');
    return false;
  }

  // Direct string comparison (API keys should be random enough)
  const isValid = apiKey === expectedApiKey;
  console.log('API Key validation:', { 
    provided: apiKey.substring(0, 8) + '...', 
    expected: expectedApiKey.substring(0, 8) + '...', 
    isValid 
  });
  
  return isValid;
}

/**
 * Middleware to check API key for internal services
 * @param {Request} request - The HTTP request
 * @returns {Response|null} Error response if unauthorized, null if authorized
 */
export function requireApiKey(request: Request): Response | null {
  if (!validateApiKey(request)) {
    return Response.json(
      { success: false, error: 'Invalid or missing API key' }, 
      { status: 401 }
    );
  }
  return null;
}