import { GoogleGenAI } from "@google/genai";
import logger from '@/utils/logger';
import { GradingResultData } from '@/types/grading';
import { GeminiPrompts } from './gemini-prompts.server';

// Simple, focused interfaces - no overengineering
export interface GeminiGradingRequest {
  content: string;
  criteria: any[];
  fileName: string;
  rubricName: string;
}

export interface GeminiGradingResponse {
  success: boolean;
  result?: GradingResultData;
  error?: string;
  metadata?: {
    model: string;
    tokens: number;
    duration: number;
  };
}

/**
 * Simple, reliable Gemini service following Linus principles:
 * - No special cases
 * - One API key, one client
 * - Fail fast, fail clearly
 * - Let the user decide what to do with failures
 */
class SimpleGeminiService {
  private client: GoogleGenAI;
  private model: string = "gemini-2.0-flash";

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    
    this.client = new GoogleGenAI({ apiKey });
    logger.info(`🔮 Simple Gemini service initialized with ${this.model}`);
  }

  /**
   * Grade a document - simple and direct
   */
  async gradeDocument(request: GeminiGradingRequest): Promise<GeminiGradingResponse> {
    const startTime = Date.now();

    try {
      logger.info(`🎯 Grading ${request.fileName} with Gemini`);

      const prompt = GeminiPrompts.generateTextGradingPrompt(request);
      const systemInstruction = GeminiPrompts.generateSystemInstruction();

      const response = await this.client.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          systemInstruction,
          maxOutputTokens: 4000,
          temperature: 0.1,
        },
      });

      if (!response.text) {
        throw new Error('Empty response from Gemini API');
      }

      const result = this.parseResponse(response.text, request.criteria);
      const duration = Date.now() - startTime;

      logger.info(`✅ Gemini grading completed in ${duration}ms`);
      
      return {
        success: true,
        result,
        metadata: {
          model: this.model,
          tokens: Math.ceil(response.text.length / 3), // Simple token estimate
          duration
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error(`❌ Gemini grading failed: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        metadata: {
          model: this.model,
          tokens: 0,
          duration
        }
      };
    }
  }

  /**
   * Parse Gemini response - simple and robust
   */
  private parseResponse(responseText: string, criteria: any[]): GradingResultData {
    try {
      const cleanedText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleanedText);
      
      return {
        totalScore: Math.round(parsed.totalScore || 0),
        maxScore: Math.round(parsed.maxScore || criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0)),
        breakdown: criteria.map(criterion => ({
          criteriaId: criterion.id,
          name: criterion.name,
          score: Math.round(parsed.breakdown?.find((item: any) => 
            item.criteriaId === criterion.id || item.criteriaId === criterion.name
          )?.score || 0),
          feedback: parsed.breakdown?.find((item: any) => 
            item.criteriaId === criterion.id || item.criteriaId === criterion.name
          )?.feedback || 'No feedback available'
        })),
        overallFeedback: parsed.overallFeedback || 'No overall feedback provided'
      };
      
    } catch (error) {
      // Simple fallback - no complex repair logic
      const maxScore = criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);
      
      return {
        totalScore: 0,
        maxScore,
        breakdown: criteria.map(criterion => ({
          criteriaId: criterion.id,
          name: criterion.name,
          score: 0,
          feedback: `Grading failed due to response parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
        })),
        overallFeedback: 'Grading failed. Please try again or contact support.'
      };
    }
  }
}

// Singleton instance
let geminiService: SimpleGeminiService | null = null;

export function getSimpleGeminiService(): SimpleGeminiService {
  if (!geminiService) {
    geminiService = new SimpleGeminiService();
  }
  return geminiService;
}

export default SimpleGeminiService;