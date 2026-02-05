import { redis } from '@/lib/redis';
import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import logger from '@/utils/logger';

// Default TTL: 60 minutes
// Gemini caches are billed by duration. 1 hour is a reasonable default for an active grading session.
const CACHE_TTL_SECONDS = 60 * 60;

export class GeminiCacheManager {
  /**
   * Calculate SHA256 hash of content to use as cache key
   */
  static hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Ensure a cache exists for the given content hash + keyId
   * Returns the cache name if successful, or null if failed/expired.
   */
  static async ensureCache(
    apiKey: string,
    keyId: string,
    contentHash: string,
    content: string,
    systemInstruction?: string,
    model: string = 'gemini-2.5-flash' // Default model for caching
  ): Promise<string | null> {
    const redisKey = `gemini:cache:${keyId}:${contentHash}:${model}`;
    
    // 1. Check Redis for existing cache
    const cachedName = await redis.get(redisKey);
    if (cachedName) {
      logger.debug('Gemini cache hit (Redis)', { keyId, contentHash, cacheName: cachedName });
      return cachedName;
    }

    // 2. Create new cache using @google/genai
    try {
      const client = new GoogleGenAI({ apiKey });
      
      logger.info('Creating new Gemini Context Cache', { keyId, model, contentHash });
      
      const createConfig: any = {
        model, 
        config: {
          ttl: `${CACHE_TTL_SECONDS}s`,
          contents: [{
            role: 'user',
            parts: [{ text: content }]
          }]
        }
      };

      if (systemInstruction) {
        createConfig.config.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      const cachedContent = await client.caches.create(createConfig);
      
      const cacheName = cachedContent.name; // e.g. "cachedContents/xyz"
      
      if (!cacheName) {
        throw new Error('Cache creation returned no name');
      }

      // 3. Store in Redis
      // Expire 1 minute before Gemini expires to avoid valid-in-redis but invalid-in-gemini race condition
      await redis.set(redisKey, cacheName, 'EX', CACHE_TTL_SECONDS - 60); 
      
      logger.info('Created Gemini Context Cache successfully', { keyId, contentHash, cacheName });
      return cacheName;
      
    } catch (error: any) {
      logger.error('Failed to create Gemini cache', { 
        keyId, 
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        errorDetails: JSON.stringify(error),
      });
      console.error('Gemini Cache Creation Error:', error); // Force stderr output
      return null;
    }
  }
}
