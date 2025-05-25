import { GradingProgressService } from './grading-progress.server';
import type { Rubric, RubricCriteria } from '@/types/grading';
import type { ProcessedDocument } from '@/types/files';

/**
 * MCP Server Configuration for Grading System
 */
interface MCPServerConfig {
  serverUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * MCP Request Types for Grading
 */
interface MCPGradingRequest {
  method: 'grade_document';
  params: {
    document: {
      content: string;
      fileName: string;
      contentType: string;
    };
    rubric: {
      id: string;
      name: string;
      description: string;
      criteria: Array<{
        name: string;
        description: string;
        levels: Array<{
          score: number;
          description: string;
        }>;
      }>;
    };
    gradingId?: string;
  };
}

interface MCPAnalyzeDocumentRequest {
  method: 'analyze_document';
  params: {
    document: {
      fileName: string;
      contentType: string;
      buffer: Uint8Array;
    };
  };
}

interface MCPResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * MCP Client for Grading System
 * Handles communication with MCP servers for AI-powered grading
 */
export class MCPGradingClient {
  private config: MCPServerConfig;

  constructor(config: MCPServerConfig) {
    this.config = {
      timeout: 120000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MCP_AUTH_TOKEN}`,
      },
      ...config,
    };
  }

  /**
   * Grades a document using MCP server
   * @param document Processed document content
   * @param rubric Grading rubric
   * @param gradingId Optional grading session ID
   * @returns Grading results
   */
  async gradeDocument(
    document: ProcessedDocument,
    rubric: Rubric,
    gradingId?: string
  ): Promise<MCPResponse> {
    try {
      if (gradingId) {
        await GradingProgressService.updateProgress(gradingId, {
          phase: 'grade',
          progress: 30,
          message: '正在連接 MCP 評分服務...'
        });
      }

      const request: MCPGradingRequest = {
        method: 'grade_document',
        params: {
          document: {
            content: document.content,
            fileName: document.fileName,
            contentType: document.contentType,
          },
          rubric: {
            id: rubric.id,
            name: rubric.name,
            description: rubric.description,
            criteria: rubric.criteria.map(criteria => ({
              name: criteria.name,
              description: criteria.description,
              levels: criteria.levels as Array<{
                score: number;
                description: string;
              }>,
            })),
          },
          gradingId,
        },
      };

      if (gradingId) {
        await GradingProgressService.updateProgress(gradingId, {
          phase: 'grade',
          progress: 50,
          message: '正在進行 AI 評分分析...'
        });
      }

      const response = await this.makeRequest(request);

      if (gradingId) {
        await GradingProgressService.updateProgress(gradingId, {
          phase: 'grade',
          progress: 80,
          message: '正在處理評分結果...'
        });
      }

      return response;
    } catch (error) {
      console.error('MCP grading error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'MCP 評分服務錯誤',
      };
    }
  }

  /**
   * Analyzes document content using MCP server
   * @param fileName File name
   * @param contentType MIME type
   * @param buffer File buffer
   * @returns Analyzed document content
   */
  async analyzeDocument(
    fileName: string,
    contentType: string,
    buffer: Uint8Array
  ): Promise<MCPResponse> {
    try {
      const request: MCPAnalyzeDocumentRequest = {
        method: 'analyze_document',
        params: {
          document: {
            fileName,
            contentType,
            buffer,
          },
        },
      };

      return await this.makeRequest(request);
    } catch (error) {
      console.error('MCP document analysis error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'MCP 文件分析服務錯誤',
      };
    }
  }

  /**
   * Makes HTTP request to MCP server
   * @private
   */
  private async makeRequest(data: any): Promise<MCPResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(this.config.serverUrl, {
        method: 'POST',
        headers: this.config.headers,
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`MCP Server responded with status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Checks MCP server health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.serverUrl}/health`, {
        method: 'GET',
        headers: { Authorization: this.config.headers?.Authorization || '' },
        signal: AbortSignal.timeout(5000),
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Factory function to create MCP client with environment configuration
 */
export function createMCPGradingClient(): MCPGradingClient {
  const serverUrl = process.env.MCP_SERVER_URL || 'http://localhost:3001/mcp';
  
  return new MCPGradingClient({
    serverUrl,
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.MCP_AUTH_TOKEN && {
        'Authorization': `Bearer ${process.env.MCP_AUTH_TOKEN}`,
      }),
    },
  });
}

/**
 * Legacy compatibility function - converts MCP response to old format
 */
export function convertMCPResponseToLegacyFormat(mcpResponse: MCPResponse): any {
  if (!mcpResponse.success || !mcpResponse.data) {
    throw new Error(mcpResponse.error || 'MCP response error');
  }

  const data = mcpResponse.data;
  
  return {
    score: data.overallScore || data.score || 0,
    analysis: data.analysis || data.overallAnalysis || '',
    criteriaScores: data.criteriaScores || [],
    strengths: data.strengths || [],
    improvements: data.improvements || data.areasForImprovement || [],
    overallSuggestions: data.overallSuggestions || data.suggestions,
    createdAt: new Date().toISOString(),
    gradingDuration: data.processingTime || 0,
    imageUnderstanding: data.imageUnderstanding,
  };
} 