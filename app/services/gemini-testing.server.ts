import { GoogleGenAI } from "@google/genai";
import logger from '@/utils/logger';
import type { GeminiFileGradingRequest } from './gemini.server';
import { GeminiPrompts } from './gemini-prompts.server';

/**
 * Gemini 測試和分析工具
 * 包含連線測試、token 分析等開發和除錯功能
 */
export class GeminiTesting {
    private client: GoogleGenAI;
    private model: string;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY environment variable is required');
        }

        this.client = new GoogleGenAI({ apiKey });
        this.model = "gemini-2.0-flash";
    }

    /**
     * 測試 Gemini API 連線
     */
    async testConnection(): Promise<{ 
        success: boolean; 
        response?: string; 
        error?: string; 
        metadata?: any 
    }> {
        try {
            const response = await this.retryWithBackoff(async () => {
                return await this.client.models.generateContent({
                    model: this.model,
                    contents: "請告訴我目前世界首富是誰？請用繁體中文回答，並簡單說明原因。",
                    config: {
                        maxOutputTokens: 200,
                        temperature: 0.3,
                    },
                });
            }, 2, 1000);

            if (response.text) {
                logger.info('Gemini connection test successful');
                return {
                    success: true,
                    response: response.text,
                    metadata: {
                        model: this.model,
                        tokens: this.estimateTokens(response.text),
                        timestamp: new Date().toISOString()
                    }
                };
            } else {
                return { success: false, error: 'Empty response from Gemini' };
            }
        } catch (error) {
            logger.error('Gemini connection test failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Connection test failed'
            };
        }
    }

    /**
     * 獲取模型限制資訊
     */
    async getModelLimits(): Promise<{ 
        inputLimit: number; 
        outputLimit: number; 
        model: string 
    }> {
        try {
            const modelInfo = await this.retryWithBackoff(async () => {
                return await this.client.models.get({ model: this.model });
            }, 2, 1000);
            
            return {
                model: this.model,
                inputLimit: modelInfo.inputTokenLimit || 0,
                outputLimit: modelInfo.outputTokenLimit || 0
            };
        } catch (error) {
            logger.error('Failed to get model limits:', error);
            return {
                model: this.model,
                inputLimit: 0,
                outputLimit: 0
            };
        }
    }

    /**
     * 計算文字的 token 數量
     */
    async countTokens(text: string): Promise<{ 
        tokenCount: number; 
        error?: string 
    }> {
        try {
            const result = await this.retryWithBackoff(async () => {
                return await this.client.models.countTokens({
                    model: this.model,
                    contents: [{ parts: [{ text }] }]
                });
            }, 2, 1000);
            
            return { tokenCount: result.totalTokens || 0 };
        } catch (error) {
            logger.error('Failed to count tokens:', error);
            return { 
                tokenCount: this.estimateTokens(text),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * 分析評分 prompt 的 token 使用量
     */
    async analyzePromptTokenUsage(request: GeminiFileGradingRequest): Promise<{
        promptTokens: number;
        estimatedOutputTokens: number;
        modelLimits: { inputLimit: number; outputLimit: number; model: string };
        recommendations: string[];
        promptPreview: string;
    }> {
        try {
            const prompt = GeminiPrompts.generateFileGradingPrompt(request);
            const limits = await this.getModelLimits();
            const promptCount = await this.countTokens(prompt);
            
            // 估算輸出 tokens（基於詳細程度要求）
            const criteriaCount = request.criteria.length;
            const estimatedOutputTokens = criteriaCount * 700 + 800; // 每項目約700 tokens + 整體分析
            
            const recommendations = [];
            
            if (promptCount.tokenCount > limits.inputLimit * 0.8) {
                recommendations.push('⚠️ Prompt 接近輸入限制，考慮簡化要求');
            }
            
            if (estimatedOutputTokens > limits.outputLimit) {
                recommendations.push(`⚠️ 預估輸出 ${estimatedOutputTokens} tokens 超出限制 ${limits.outputLimit}`);
                recommendations.push('建議：減少評分項目或簡化分析要求');
            }
            
            if (estimatedOutputTokens > limits.outputLimit * 0.9) {
                recommendations.push('⚠️ 預估輸出接近限制，建議調整 maxOutputTokens');
            }
            
            if (recommendations.length === 0) {
                recommendations.push('✅ Token 使用量在合理範圍內');
            }
            
            return {
                promptTokens: promptCount.tokenCount,
                estimatedOutputTokens,
                modelLimits: limits,
                recommendations,
                promptPreview: prompt.substring(0, 500) + '...'
            };
        } catch (error) {
            logger.error('Failed to analyze prompt token usage:', error);
            return {
                promptTokens: 0,
                estimatedOutputTokens: 0,
                modelLimits: { inputLimit: 0, outputLimit: 0, model: this.model },
                recommendations: ['❌ 無法分析 token 使用量'],
                promptPreview: 'Error generating prompt'
            };
        }
    }

    /**
     * 估算 token 數量 (簡單估算法)
     */
    private estimateTokens(text: string): number {
        // 英文 4 字元/token，中文 2-3 字元/token
        return Math.ceil(text.length / 3);
    }

    /**
     * 指數退避重試機制
     */
    private async retryWithBackoff<T>(
        operation: () => Promise<T>,
        maxRetries: number = 3,
        baseDelay: number = 1000
    ): Promise<T> {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error: any) {
                const isRetryableError = this.isRetryableError(error);
                const isLastAttempt = attempt === maxRetries;
                
                if (!isRetryableError || isLastAttempt) {
                    throw error;
                }
                
                const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
                logger.warn(`Gemini API attempt ${attempt} failed, retrying in ${delay.toFixed(0)}ms...`, {
                    error: error.message,
                    attempt,
                    maxRetries
                });
                
                await this.sleep(delay);
            }
        }
        throw new Error('Max retries exceeded');
    }

    /**
     * 判斷是否為可重試的錯誤
     */
    private isRetryableError(error: any): boolean {
        if (!error) return false;
        
        const errorMessage = error.message || '';
        const statusCode = error.status || error.code;
        
        // 503 Service Unavailable - 服務過載
        if (statusCode === 503 || errorMessage.includes('503')) return true;
        
        // 429 Too Many Requests - 請求過於頻繁
        if (statusCode === 429 || errorMessage.includes('429')) return true;
        
        // 500 Internal Server Error - 內部錯誤
        if (statusCode === 500 || errorMessage.includes('500')) return true;
        
        // 特定錯誤訊息
        const retryableMessages = [
            'overloaded',
            'unavailable', 
            'timeout',
            'rate limit',
            'quota exceeded',
            'too many requests'
        ];
        
        return retryableMessages.some(msg => 
            errorMessage.toLowerCase().includes(msg)
        );
    }

    /**
     * 睡眠函數
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

let geminiTesting: GeminiTesting | null = null;

export function getGeminiTesting(): GeminiTesting {
    if (!geminiTesting) {
        geminiTesting = new GeminiTesting();
    }
    return geminiTesting;
} 