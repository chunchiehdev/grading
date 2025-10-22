import OpenAI from 'openai';
import logger from '@/utils/logger';
import { GradingResultData } from '@/types/grading';

// Simple, focused interfaces
export interface OpenAIGradingRequest {
  content: string;
  criteria: any[];
  fileName: string;
  rubricName: string;
  language?: string; // Feature 004: Language for context awareness
}

export interface OpenAIGradingResponse {
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
 * Simple, reliable OpenAI service - no over-engineering
 */
class SimpleOpenAIService {
  private client: OpenAI;
  private model: string = 'gpt-4o-mini';

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.client = new OpenAI({ apiKey });
    logger.info(`🤖 Simple OpenAI service initialized with ${this.model}`);
  }

  /**
   * Grade a document - simple and direct
   */
  async gradeDocument(request: OpenAIGradingRequest, userLanguage: 'zh' | 'en' = 'zh'): Promise<OpenAIGradingResponse> {
    const startTime = Date.now();

    try {
      logger.info(`🎯 Grading ${request.fileName} with OpenAI`);

      const prompt = this.generatePrompt(request);

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a grading assistant. Always respond with valid JSON format. ${userLanguage === 'zh' ? 'Please write all content in Traditional Chinese.' : 'Please write all content in English.'}`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 4000,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI API');
      }

      const result = this.parseResponse(content, request.criteria);
      const duration = Date.now() - startTime;

      logger.info(`✅ OpenAI grading completed in ${duration}ms`);

      return {
        success: true,
        result,
        metadata: {
          model: this.model,
          tokens: response.usage?.total_tokens || 0,
          duration,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error(`❌ OpenAI grading failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        metadata: {
          model: this.model,
          tokens: 0,
          duration,
        },
      };
    }
  }

  /**
   * Generate grading prompt
   */
  private generatePrompt(request: OpenAIGradingRequest): string {
    return `Grade the following document based on the provided criteria.

Document: ${request.fileName}
Rubric: ${request.rubricName}

Content:
${request.content}

Grading Criteria:
${JSON.stringify(request.criteria, null, 2)}

Please provide your grading in the following JSON format:
{
  "totalScore": <total score>,
  "maxScore": <maximum possible score>,
  "breakdown": [
    {
      "criteriaId": "<criteria id>",
      "score": <score for this criteria>,
      "feedback": "<detailed feedback for this criteria>"
    }
  ],
  "overallFeedback": "<overall feedback for the document>"
}`;
  }

  /**
   * Parse OpenAI response - simple and robust
   */
  private parseResponse(responseText: string, criteria: any[]): GradingResultData {
    try {
      const parsed = JSON.parse(responseText);

      return {
        totalScore: Math.round(parsed.totalScore || 0),
        maxScore: Math.round(parsed.maxScore || criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0)),
        breakdown: criteria.map((criterion) => ({
          criteriaId: criterion.id,
          name: criterion.name,
          score: Math.round(
            parsed.breakdown?.find(
              (item: any) => item.criteriaId === criterion.id || item.criteriaId === criterion.name
            )?.score || 0
          ),
          feedback:
            parsed.breakdown?.find(
              (item: any) => item.criteriaId === criterion.id || item.criteriaId === criterion.name
            )?.feedback || 'No feedback available',
        })),
        overallFeedback: parsed.overallFeedback || 'No overall feedback provided',
      };
    } catch (error) {
      // Simple fallback - no complex repair logic
      const maxScore = criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);

      return {
        totalScore: 0,
        maxScore,
        breakdown: criteria.map((criterion) => ({
          criteriaId: criterion.id,
          name: criterion.name,
          score: 0,
          feedback: `Grading failed due to response parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })),
        overallFeedback: 'Grading failed. Please try again or contact support.',
      };
    }
  }
}

// Singleton instance
let openaiService: SimpleOpenAIService | null = null;

export function getSimpleOpenAIService(): SimpleOpenAIService {
  if (!openaiService) {
    openaiService = new SimpleOpenAIService();
  }
  return openaiService;
}

export default SimpleOpenAIService;
