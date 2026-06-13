import fs from 'fs';
import path from 'path';
import logger from '@/utils/logger';

/**
 * Structured logging system for grading sessions
 * Each grading session gets a complete JSON log file with all input/output data
 * 每個 grading session 都有一個完整的 JSON 日誌文件，記錄所有輸入輸出數據
 */

interface GradingLogEntry {
  sessionId: string;
  resultId: string;
  timestamp: string;
  durationMs?: number;
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
  assignment?: {
    id: string;
    name: string;
    courseId?: string;
  };
  files?: Array<{
    fileId: string;
    fileName: string;
    filePath: string;
  }>;
  rubric?: {
    id: string;
    name: string;
    totalPoints?: number;
  };
  context?: {
    referenceDocuments: Array<{
      fileId: string;
      fileName: string;
      contentLength: number;
      wasTruncated: boolean;
    }>;
    customInstructions?: {
      used: boolean;
      length?: number;
    };
  };
  prompt?: {
    full: string;
    estimatedTokens: number;
    language: string;
  };
  aiResponse?: {
    provider: string;
    model?: string;
    // Only store rawResponse (parsed result is in "result" field)
    // Avoid duplication - rawResponse shows what Gemini actually returned
    rawResponse: any;
    actualTokens?: number;
    duration?: number;
  };
  result?: {
    totalScore?: number;
    maxScore?: number;
    normalizedScore?: number;
    feedback?: string;
    breakdown?: any[];
  };
  errors?: Array<{
    step: string;
    error: string;
    timestamp: string;
  }>;
  metadata?: {
    version: string;
    environment: string;
  };
}

class GradingLogger {
  private logsDir: string;
  private sessionLogs: Map<string, Partial<GradingLogEntry>> = new Map();

  constructor() {
    this.logsDir = path.join(process.cwd(), 'logs');
    this.ensureLogsDirectory();
  }

  private ensureLogsDirectory(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
      logger.info(`📁 Created logs directory: ${this.logsDir}`);
    }
  }

  /**
   * 初始化一個新的 grading session 日誌
   * 在創建 GradingSession 時調用
   */
  public initializeSessionLog(sessionId: string, resultId: string): void {
    this.sessionLogs.set(sessionId, {
      sessionId,
      resultId,
      timestamp: new Date().toISOString(),
      errors: [],
      metadata: {
        version: '1.0',
        environment: process.env.NODE_ENV || 'development',
      },
    });
    logger.info(`📝 Initialized log for session: ${sessionId}`);
  }

  /**
   * 添加用戶信息到日誌
   * Add user information to log
   */
  public addUserInfo(sessionId: string, userId: string, email?: string, role?: string): void {
    const log = this.sessionLogs.get(sessionId);
    if (log) {
      log.user = { id: userId, email, role };
    }
  }

  /**
   * 添加作業信息到日誌
   * Add assignment information to log
   */
  public addAssignmentInfo(sessionId: string, assignmentId: string, assignmentName: string, courseId?: string): void {
    const log = this.sessionLogs.get(sessionId);
    if (log) {
      log.assignment = { id: assignmentId, name: assignmentName, courseId };
    }
  }

  /**
   * 添加文件信息到日誌
   * Add file information to log
   */
  public addFileInfo(sessionId: string, fileId: string, fileName: string, filePath: string): void {
    const log = this.sessionLogs.get(sessionId);
    if (log) {
      if (!log.files) log.files = [];
      log.files.push({ fileId, fileName, filePath });
    }
  }

  /**
   * 添加評分標準信息到日誌
   * Add rubric information to log
   */
  public addRubricInfo(sessionId: string, rubricId: string, rubricName: string, totalPoints?: number): void {
    const log = this.sessionLogs.get(sessionId);
    if (log) {
      log.rubric = { id: rubricId, name: rubricName, totalPoints };
    }
  }

  /**
   * 添加上下文信息到日誌（參考文件、自定義指示）
   * Add context information to log
   */
  public addContextInfo(
    sessionId: string,
    referenceDocuments: Array<{
      fileId: string;
      fileName: string;
      contentLength: number;
      wasTruncated: boolean;
    }>,
    customInstructionsUsed: boolean,
    customInstructionsLength?: number
  ): void {
    const log = this.sessionLogs.get(sessionId);
    if (log) {
      log.context = {
        referenceDocuments,
        customInstructions: {
          used: customInstructionsUsed,
          length: customInstructionsLength,
        },
      };
    }
  }

  /**
   * 添加完整的 prompt 到日誌
   * Add complete prompt to log
   */
  public addPromptInfo(sessionId: string, prompt: string, estimatedTokens: number, language: string = 'en'): void {
    const log = this.sessionLogs.get(sessionId);
    if (log) {
      log.prompt = {
        full: prompt,
        estimatedTokens,
        language,
      };
    }
  }

  /**
   * 添加 AI API 響應信息到日誌
   * Add AI API response to log
   * Note: Only store rawResponse to avoid duplication with "result" field
   */
  public addAIResponse(
    sessionId: string,
    provider: string,
    rawResponse: any,
    actualTokens?: number,
    duration?: number,
    model?: string
  ): void {
    const log = this.sessionLogs.get(sessionId);
    if (log) {
      log.aiResponse = {
        provider,
        model,
        rawResponse,
        actualTokens,
        duration,
      };
    }
  }

  /**
   * 添加評分結果到日誌
   * Add grading result to log
   */
  public addResult(
    sessionId: string,
    totalScore?: number,
    maxScore?: number,
    normalizedScore?: number,
    feedback?: string,
    breakdown?: any[]
  ): void {
    const log = this.sessionLogs.get(sessionId);
    if (log) {
      log.result = {
        totalScore,
        maxScore,
        normalizedScore,
        feedback,
        breakdown,
      };
    }
  }

  /**
   * 記錄錯誤信息
   * Log error information
   */
  public addError(sessionId: string, step: string, error: string | Error): void {
    const log = this.sessionLogs.get(sessionId);
    if (log) {
      if (!log.errors) log.errors = [];
      log.errors.push({
        step,
        error: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString(),
      });
      logger.error({ err: error }, `❌ Error in ${step} for session ${sessionId}:`);
    }
  }

  /**
   * 完成日誌記錄並保存到文件
   * Complete logging and save to file
   */
  public async finalize(sessionId: string, startTime?: number): Promise<void> {
    const log = this.sessionLogs.get(sessionId);
    if (!log) {
      logger.warn(`⚠️ No log found for session: ${sessionId}`);
      return;
    }

    // 計算總耗時
    if (startTime) {
      log.durationMs = Date.now() - startTime;
    }

    try {
      // 保存到文件
      const fileName = `${sessionId}-${new Date().getTime()}.json`;
      const filePath = path.join(this.logsDir, fileName);

      fs.writeFileSync(filePath, JSON.stringify(log, null, 2), 'utf-8');
      logger.info(`  Saved grading log: ${filePath}`);

      // 清除內存中的日誌
      this.sessionLogs.delete(sessionId);
    } catch (error) {
      logger.error({ err: error }, `❌ Failed to save grading log for session ${sessionId}:`);
    }
  }

  /**
   * 獲取日誌文件列表
   * Get list of log files
   */
  public getLogFiles(limit: number = 50): string[] {
    try {
      const files = fs.readdirSync(this.logsDir);
      return files
        .filter((f) => f.endsWith('.json'))
        .sort()
        .reverse()
        .slice(0, limit);
    } catch (error) {
      logger.error({ err: error }, 'Failed to read log files:');
      return [];
    }
  }

  /**
   * 讀取特定的日誌文件
   * Read a specific log file
   */
  public readLogFile(fileName: string): GradingLogEntry | null {
    try {
      const filePath = path.join(this.logsDir, fileName);
      if (!fs.existsSync(filePath)) {
        logger.warn(`Log file not found: ${filePath}`);
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.error({ err: error }, `Failed to read log file ${fileName}:`);
      return null;
    }
  }

  /**
   * 清理舊的日誌文件（超過 N 天）
   * Clean up old log files (older than N days)
   */
  public cleanupOldLogs(daysToKeep: number = 30): void {
    try {
      const now = Date.now();
      const maxAge = daysToKeep * 24 * 60 * 60 * 1000; // Convert days to ms

      const files = fs.readdirSync(this.logsDir);
      files.forEach((file) => {
        if (!file.endsWith('.json')) return;

        const filePath = path.join(this.logsDir, file);
        const stat = fs.statSync(filePath);

        if (now - stat.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          logger.info(`🗑️ Deleted old log file: ${file}`);
        }
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to cleanup old logs:');
    }
  }
}

// Singleton instance
let gradingLoggerInstance: GradingLogger | null = null;

export function getGradingLogger(): GradingLogger {
  if (!gradingLoggerInstance) {
    gradingLoggerInstance = new GradingLogger();
  }
  return gradingLoggerInstance;
}
