import { GoogleGenAI, createUserContent, createPartFromUri } from "@google/genai";
import logger from '@/utils/logger';
import { GeminiPrompts } from './gemini-prompts.server';

// Gemini 評分請求介面 - 原有的文字內容方式
export interface GeminiGradingRequest {
    content: string;
    criteria: any[];
    fileName: string;
    rubricName: string;
}

// Gemini 檔案評分請求介面 - 新的直接檔案上傳方式
export interface GeminiFileGradingRequest {
    fileBuffer: Buffer;
    mimeType: string;
    criteria: any[];
    fileName: string;
    rubricName: string;
}

// Gemini 評分回應介面
export interface GeminiGradingResponse {
    success: boolean;
    result?: GradingResultData;
    error?: string;
    metadata?: {
        model: string;
        tokens: number;
        duration: number;
        errorType?: string;
        retryable?: boolean;
        fileProcessed?: boolean;
        keysAttempted?: number[];
    };
}

// 評分結果資料結構
export interface GradingResultData {
    totalScore: number;
    maxScore: number;
    breakdown: Array<{
        criteriaId: string;
        score: number;
        feedback: string;
    }>;
    overallFeedback: string;
}

class GeminiService {
    private clients: GoogleGenAI[];
    private apiKeys: string[];
    private currentClientIndex: number = 0;
    private model: string;
    private requestCount: number = 0;
    private lastRequestTime: number = 0;
    private consecutiveErrors: number = 0;
    private lastErrorTime: number = 0;
    private readonly MIN_REQUEST_INTERVAL = 2000; // 增加到 2 秒
    private readonly OVERLOAD_BACKOFF_TIME = 30000; // 30 秒退避時間
    private readonly MAX_CONSECUTIVE_ERRORS = 3;
    private keyFailureCounts: number[] = [0, 0, 0]; // 追蹤每個 key 的失敗次數（支援3個key）
    private keyLastFailureTime: number[] = [0, 0, 0]; // 追蹤每個 key 的最後失敗時間（支援3個key）

    constructor() {
        const apiKey1 = process.env.GEMINI_API_KEY;
        const apiKey2 = process.env.GEMINI_API_KEY2;
        const apiKey3 = process.env.GEMINI_API_KEY3;
        
        if (!apiKey1 && !apiKey2 && !apiKey3) {
            throw new Error('At least one of GEMINI_API_KEY, GEMINI_API_KEY2, or GEMINI_API_KEY3 environment variables is required');
        }

        this.apiKeys = [];
        this.clients = [];

        // 初始化可用的 API keys 和 clients
        if (apiKey1) {
            this.apiKeys.push(apiKey1);
            this.clients.push(new GoogleGenAI({ apiKey: apiKey1 }));
        }
        if (apiKey2) {
            this.apiKeys.push(apiKey2);
            this.clients.push(new GoogleGenAI({ apiKey: apiKey2 }));
        }
        if (apiKey3) {
            this.apiKeys.push(apiKey3);
            this.clients.push(new GoogleGenAI({ apiKey: apiKey3 }));
        }

        // 調整失敗計數數組大小
        this.keyFailureCounts = new Array(this.clients.length).fill(0);
        this.keyLastFailureTime = new Array(this.clients.length).fill(0);

        this.model = "gemini-2.0-flash";
        
        logger.info(`🔑 Initialized GeminiService with ${this.clients.length} API key(s)`);
    }

    /**
     * 獲取當前可用的 client
     */
    private getCurrentClient(): GoogleGenAI {
        return this.clients[this.currentClientIndex];
    }

    /**
     * 切換到下一個可用的 API key
     */
    private switchToNextApiKey(): boolean {
        if (this.clients.length <= 1) {
            logger.warn('⚠️ Only one API key available, cannot switch');
            return false;
        }

        const previousIndex = this.currentClientIndex;
        this.currentClientIndex = (this.currentClientIndex + 1) % this.clients.length;
        
        logger.warn(`🔄 Switching from API key ${previousIndex + 1} to API key ${this.currentClientIndex + 1}`);
        
        // 重置錯誤計數（因為切換了 key）
        this.consecutiveErrors = 0;
        
        return true;
    }

    /**
     * 檢查當前 API key 是否應該被跳過（基於失敗歷史） - 調整為更寬鬆
     */
    private shouldSkipCurrentKey(): boolean {
        const now = Date.now();
        const currentKeyFailures = this.keyFailureCounts[this.currentClientIndex];
        const lastFailureTime = this.keyLastFailureTime[this.currentClientIndex];
        
        // 如果這個 key 最近失敗太多次，暫時跳過
        // 降低失敗次數門檻，因為我們有3個key可以輪換
        if (currentKeyFailures >= 3 && (now - lastFailureTime) < 30000) { // 30秒冷卻，更積極切換
            logger.warn(`🚫 Skipping API key ${this.currentClientIndex + 1} due to recent failures (${currentKeyFailures} failures)`);
            return true;
        }
        
        return false;
    }

    /**
     * 記錄 API key 失敗
     */
    private recordKeyFailure(): void {
        this.keyFailureCounts[this.currentClientIndex]++;
        this.keyLastFailureTime[this.currentClientIndex] = Date.now();
        logger.warn(`📊 API key ${this.currentClientIndex + 1} failure count: ${this.keyFailureCounts[this.currentClientIndex]}`);
    }

    /**
     * 記錄 API key 成功
     */
    private recordKeySuccess(): void {
        // 成功時重置該 key 的失敗計數
        this.keyFailureCounts[this.currentClientIndex] = 0;
        this.consecutiveErrors = 0;
    }

    /**
     * 智能 rate limiting - 增強版
     */
    private async enforceRateLimit(): Promise<void> {
        const now = Date.now();
        
        // 檢查是否在過載恢復期
        if (this.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
            const timeSinceLastError = now - this.lastErrorTime;
            if (timeSinceLastError < this.OVERLOAD_BACKOFF_TIME) {
                const remainingWait = this.OVERLOAD_BACKOFF_TIME - timeSinceLastError;
                logger.warn(`🚫 API overload detected, waiting ${Math.round(remainingWait/1000)}s before retry...`);
                await this.sleep(remainingWait);
                this.consecutiveErrors = 0; // 重置錯誤計數
            }
        }
        
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        // 基本間隔控制
        if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
            const delay = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
            logger.info(`⏳ Rate limiting: waiting ${delay}ms`);
            await this.sleep(delay);
        }
        
        this.lastRequestTime = Date.now();
        this.requestCount++;
        
        // 根據請求數量增加延遲
        if (this.requestCount % 10 === 0) {
            const extraDelay = Math.min(this.requestCount * 100, 5000); // 最多 5 秒
            logger.info(`🔄 Heavy usage detected, adding ${extraDelay}ms delay after ${this.requestCount} requests`);
            await this.sleep(extraDelay);
        }
    }

    /**
     * 記錄 API 錯誤
     */
    private recordApiError(error: any): void {
        const isOverloadError = this.isOverloadError(error);
        
        // 記錄當前 key 的失敗
        this.recordKeyFailure();
        
        if (isOverloadError) {
            this.consecutiveErrors++;
            this.lastErrorTime = Date.now();
            logger.warn(`📈 Consecutive API errors: ${this.consecutiveErrors}/${this.MAX_CONSECUTIVE_ERRORS} (API key ${this.currentClientIndex + 1})`);
        } else {
            this.consecutiveErrors = 0; // 非過載錯誤重置計數
        }
    }

    /**
     * 記錄 API 成功
     */
    private recordApiSuccess(): void {
        this.recordKeySuccess();
        logger.info(`✅ API call successful with key ${this.currentClientIndex + 1}`);
    }

    /**
     * 檢查是否為過載錯誤
     */
    private isOverloadError(error: any): boolean {
        if (!error) return false;
        
        const errorMessage = error.message || '';
        const statusCode = error.status || error.code;
        
        return statusCode === 503 || 
               statusCode === 429 ||
               errorMessage.includes('503') ||
               errorMessage.includes('429') ||
               errorMessage.includes('overloaded') ||
               errorMessage.includes('rate limit');
    }

    /**
     * 主要評分函式 - 文字內容評分
     */
    async gradeDocument(request: GeminiGradingRequest): Promise<GeminiGradingResponse> {
        const startTime = Date.now();

        try {
            await this.enforceRateLimit();
            
            logger.info(`Starting Gemini grading for file: ${request.fileName}`);

            // 生成評分提示
            const prompt = GeminiPrompts.generateTextGradingPrompt(request);

            // 設定系統指令
            const systemInstruction = GeminiPrompts.generateSystemInstruction();

            // 呼叫 Gemini API - 使用重試機制
            const response = await this.retryWithBackoff(async () => {
                return await this.getCurrentClient().models.generateContent({
                    model: this.model,
                    contents: prompt,
                    config: {
                        systemInstruction,
                        maxOutputTokens: 4000,
                        temperature: 0.1,
                    },
                });
            }, 3, 2000, true);

            if (!response.text) {
                throw new Error('Gemini API returned empty response');
            }

            // 記錄成功
            this.recordApiSuccess();

            // 解析回應
            const gradingResult = this.parseGradingResponse(response.text, request.criteria);
            const duration = Date.now() - startTime;

            logger.info(`Gemini grading completed for ${request.fileName} in ${duration}ms`);

            return {
                success: true,
                result: gradingResult,
                metadata: {
                    model: this.model,
                    tokens: this.estimateTokens(prompt + response.text),
                    duration
                }
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            
            // 記錄錯誤
            this.recordApiError(error);
            
            const errorInfo = this.analyzeError(error);
            logger.error(`Gemini grading failed for ${request.fileName}:`, error);

            return {
                success: false,
                error: errorInfo.userMessage,
                metadata: {
                    model: this.model,
                    tokens: 0,
                    duration,
                    errorType: errorInfo.type,
                    retryable: errorInfo.retryable
                }
            };
        }
    }

    /**
     * 主要評分函式 - 檔案上傳評分（增強的 503 錯誤處理）
     */
    async gradeDocumentWithFile(request: GeminiFileGradingRequest): Promise<GeminiGradingResponse> {
        const startTime = Date.now();
        let uploadedFile: any = null;
        let successfulKeyIndex: number | null = null;
        let attemptedKeys = new Set<number>(); // 追蹤已嘗試的 keys

        try {
            await this.enforceRateLimit();
            
            logger.info(`Starting Gemini file grading for: ${request.fileName} with initial key ${this.currentClientIndex + 1}`);

            // 階段1：上傳文件 - 允許切換 key 尋找可用的服務
            uploadedFile = await this.retryWithBackoff(async () => {
                const fileBlob = new Blob([request.fileBuffer], { type: request.mimeType });
                return await this.getCurrentClient().files.upload({
                    file: fileBlob
                });
            }, 2, 1000, true);

            // 記錄文件上傳成功的 key，後續操作必須使用同一個 key
            successfulKeyIndex = this.currentClientIndex;
            attemptedKeys.add(successfulKeyIndex);
            logger.info(`🔒 File uploaded successfully using key ${successfulKeyIndex + 1}. Locking to this key for remaining operations.`);

            // 生成評分提示
            const prompt = GeminiPrompts.generateFileGradingPrompt(request);
            const systemInstruction = GeminiPrompts.generateSystemInstruction();

            // 階段2：文件評分 - 增強的重試機制，處理 503 錯誤
            const response = await this.retryFileOperationWithFallback(
                async () => {
                    // 不再強制切換 key，使用當前文件所在的 key
                    logger.info(`🔍 Using key ${this.currentClientIndex + 1} for file evaluation (file uploaded to this key)`);
                    
                    return await this.getCurrentClient().models.generateContent({
                        model: this.model,
                        contents: [
                            createUserContent([
                                prompt,
                                createPartFromUri(uploadedFile.uri || '', uploadedFile.mimeType || request.mimeType),
                            ]),
                        ],
                        config: {
                            systemInstruction,
                            maxOutputTokens: 6000,
                            temperature: 0.1,
                        },
                    });
                },
                uploadedFile,
                request,
                successfulKeyIndex,
                attemptedKeys
            );

            logger.info(`Gemini API returned response for file using key ${this.currentClientIndex + 1}`);

            if (!response.text) {
                throw new Error('Gemini API returned empty response');
            }

            // 記錄成功
            this.recordApiSuccess();

            // 增強的 JSON 解析，更好的錯誤處理
            const gradingResult = this.parseGradingResponseEnhanced(response.text, request.criteria, request.fileName);
            const duration = Date.now() - startTime;

            // 階段3：清理文件 - 必須使用同一個 key
            await this.cleanupUploadedFile(uploadedFile, this.currentClientIndex);

            logger.info(`Gemini file grading completed for ${request.fileName} in ${duration}ms using key ${this.currentClientIndex + 1}`);

            return {
                success: true,
                result: gradingResult,
                metadata: {
                    model: this.model,
                    tokens: this.estimateTokens(prompt + response.text),
                    duration
                }
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            
            // 記錄錯誤
            this.recordApiError(error);
            
            // 緊急清理上傳的文件
            if (uploadedFile && uploadedFile.name) {
                await this.emergencyCleanupFile(uploadedFile, successfulKeyIndex, attemptedKeys);
            }
            
            const errorInfo = this.analyzeError(error);
            
            // 為 403 錯誤提供更具體的錯誤訊息
            if ((error as any)?.status === 403 && (error as any)?.message?.includes('permission')) {
                errorInfo.userMessage = `文件訪問權限錯誤：由於服務器過載導致的 API key 切換問題。

**檔案：** ${request.fileName}
**錯誤代碼：** 403 Forbidden
**原因：** 文件上傳和評分使用了不同的 API key

**建議解決方案：**
1. 重新上傳此文件進行評分
2. 系統將自動優化 API key 使用策略
3. 如問題持續，請聯繫技術支援

**技術細節：** 文件 ID ${(error as any)?.message?.match(/File (\w+)/)?.[1] || 'unknown'}`;
                
                logger.error(`🚫 403 Permission error - API key mismatch detected for file: ${request.fileName}`);
            }
            
            // 確保錯誤訊息不會太長（避免 UI 問題）
            if (errorInfo.userMessage.length > 1000) {
                errorInfo.userMessage = errorInfo.userMessage.substring(0, 997) + '...';
            }
            
            logger.error(`Gemini file grading failed for ${request.fileName}:`, {
                error: (error as any)?.message || error,
                status: (error as any)?.status,
                duration,
                fileId: uploadedFile?.name
            });

            // 確保總是返回有效的錯誤回應（避免 UI 卡住）
            return {
                success: false,
                error: errorInfo.userMessage,
                metadata: {
                    model: this.model,
                    tokens: 0,
                    duration,
                    errorType: errorInfo.type,
                    retryable: errorInfo.retryable,
                    fileProcessed: !!uploadedFile,
                    keysAttempted: Array.from(attemptedKeys).map(i => i + 1)
                }
            };
        }
    }

    /**
     * 解析 Gemini 回應
     */
    private parseGradingResponse(responseText: string, criteria: any[]): GradingResultData {
        try {
            // 移除可能的 markdown 標記
            const cleanedText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

            // 檢查 JSON 是否被截斷
            const openBraces = (cleanedText.match(/\{/g) || []).length;
            const closeBraces = (cleanedText.match(/\}/g) || []).length;
            
            if (openBraces !== closeBraces) {
                logger.warn('JSON response appears to be truncated', { 
                    openBraces, 
                    closeBraces, 
                    textLength: cleanedText.length 
                });
                
                // 嘗試修復簡單的截斷問題
                let fixedText = cleanedText;
                const missingBraces = openBraces - closeBraces;
                for (let i = 0; i < missingBraces; i++) {
                    fixedText += '}';
                }
                
                try {
                    const parsed = JSON.parse(fixedText);
                    logger.info('Successfully fixed truncated JSON');
                    return this.buildResultFromParsed(parsed, criteria);
                } catch (fixError) {
                    logger.error('Failed to fix truncated JSON', fixError);
                    throw new Error('Response was truncated and could not be repaired');
                }
            }

            // 解析 JSON
            const parsed = JSON.parse(cleanedText);
            return this.buildResultFromParsed(parsed, criteria);

        } catch (error) {
            logger.error('Failed to parse Gemini response:', { responseText: responseText.substring(0, 500) + '...', error });

            // 返回預設結果
            const maxScore = criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);
            return {
                totalScore: 0,
                maxScore,
                breakdown: criteria.map(criterion => ({
                    criteriaId: criterion.id,
                    score: 0,
                    feedback: '**評分失敗 - JSON 解析錯誤**\n\n可能原因：\n1. ✂️ AI 回應被截斷（內容太長）\n2. 🔧 JSON 格式錯誤\n3. 📁 文件讀取問題\n\n**建議解決方案：**\n1. 重新上傳文件\n2. 檢查文件大小和格式\n3. 如問題持續請聯繫技術支援\n\n**錯誤詳情：** ' + (error instanceof Error ? error.message : '未知錯誤')
                })),
                overallFeedback: '**系統錯誤 - 無法完成評分**\n\n評分系統遇到 JSON 解析問題，可能是回應內容過長導致截斷。\n\n**自動診斷：**\n- 📊 要求詳細度：超高\n- 🔧 輸出格式：複雜 JSON\n- ⚠️ 可能原因：回應超出長度限制\n\n請重試或聯繫管理員調整系統參數。'
            };
        }
    }

    /**
     * 從解析的 JSON 構建結果
     */
    private buildResultFromParsed(parsed: any, criteria: any[]): GradingResultData {
        // 驗證必要欄位
        if (!parsed.totalScore && parsed.totalScore !== 0) {
            logger.warn('Missing totalScore in response, using 0');
            parsed.totalScore = 0;
        }
        if (!parsed.maxScore && parsed.maxScore !== 0) {
            logger.warn('Missing maxScore in response, calculating from criteria');
            parsed.maxScore = criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);
        }
        if (!parsed.breakdown || !Array.isArray(parsed.breakdown)) {
            logger.warn('Missing or invalid breakdown in response, creating empty breakdown');
            parsed.breakdown = [];
        }

        // 構建實用的回饋格式
        const buildFeedback = (item: any) => {
            let feedback = '';
            
            // 處理新格式的詳細回饋
            if (item.evidence && item.feedback) {
                // 優點分析
                if (item.evidence.strengths) {
                    feedback += `**✨ 表現優點：**\n${item.evidence.strengths}\n\n`;
                }
                
                // 改進分析  
                if (item.evidence.weaknesses) {
                    feedback += `**⚠️ 改進空間：**\n${item.evidence.weaknesses}\n\n`;
                }
                
                // 具體回饋
                if (item.feedback.whatWorked) {
                    feedback += `**👍 成功之處：**\n${item.feedback.whatWorked}\n\n`;
                }
                
                if (item.feedback.whatNeedsWork) {
                    feedback += `**🔧 需要改進：**\n${item.feedback.whatNeedsWork}\n\n`;
                }
                
                if (item.feedback.howToImprove) {
                    feedback += `**💡 改進建議：**\n${item.feedback.howToImprove}\n\n`;
                }
                
                // 評分理由
                if (item.scoreJustification) {
                    feedback += `**📊 評分理由：**\n${item.scoreJustification}`;
                }
            }
            // 處理簡化格式或舊格式
            else if (item.feedback) {
                feedback = item.feedback;
            }
            // 向後兼容更舊的格式
            else {
                if (item.strengths) {
                    feedback += `**✨ 表現優點：**\n${item.strengths}\n\n`;
                }
                if (item.improvements) {
                    feedback += `**🔧 改進建議：**\n`;
                    if (typeof item.improvements === 'string') {
                        feedback += `${item.improvements}\n\n`;
                    } else {
                        if (item.improvements.specificIssues) {
                            feedback += `需改進：${item.improvements.specificIssues}\n`;
                        }
                        if (item.improvements.actionableSuggestions) {
                            feedback += `建議：${item.improvements.actionableSuggestions}\n`;
                        }
                        feedback += '\n';
                    }
                }
                if (item.scoreRationale || item.scoreReason) {
                    feedback += `**📊 評分理由：**\n${item.scoreRationale || item.scoreReason}`;
                }
            }
            
            return feedback || '無詳細分析';
        };

        // 構建整體回饋
        let overallFeedback = '';
        
        if (parsed.overallFeedback && typeof parsed.overallFeedback === 'object') {
            const overall = parsed.overallFeedback;
            
            // 整體優點
            if (overall.documentStrengths && Array.isArray(overall.documentStrengths)) {
                overallFeedback += '**🌟 整體優點：**\n';
                overall.documentStrengths.forEach((strength: string, index: number) => {
                    overallFeedback += `${index + 1}. ${strength}\n`;
                });
                overallFeedback += '\n';
            }
            
            // 關鍵改進
            if (overall.keyImprovements && Array.isArray(overall.keyImprovements)) {
                overallFeedback += '**🎯 重點改進：**\n';
                overall.keyImprovements.forEach((improvement: string, index: number) => {
                    overallFeedback += `${index + 1}. ${improvement}\n`;
                });
                overallFeedback += '\n';
            }
            
            // 下一步建議
            if (overall.nextSteps) {
                overallFeedback += `**📋 下一步：**\n${overall.nextSteps}`;
            }
        } else if (parsed.overallFeedback) {
            overallFeedback = parsed.overallFeedback;
        }

        // 確保 breakdown 包含所有評分項目
        const result: GradingResultData = {
            totalScore: Math.round(parsed.totalScore),
            maxScore: Math.round(parsed.maxScore),
            breakdown: criteria.map(criterion => {
                const found = parsed.breakdown.find((item: any) =>
                    item.criteriaId === criterion.id || item.criteriaId === criterion.name
                );

                return {
                    criteriaId: criterion.id,
                    score: found ? Math.round(found.score) : 0,
                    feedback: found ? buildFeedback(found) : '無詳細分析'
                };
            }),
            overallFeedback: overallFeedback || '無綜合評價'
        };

        return result;
    }

    /**
     * 計算 token（簡單估算）
     */
    private estimateTokens(text: string): number {
        // 英文 4 字元/token，中文 2-3 字元/token
        return Math.ceil(text.length / 3);
    }

    /**
     * 指數退避重試機制 - 增強版支援 API key 切換，針對 503 優化
     */
    private async retryWithBackoff<T>(
        operation: () => Promise<T>,
        maxRetries: number = 3,
        baseDelay: number = 1000,
        allowSwitch: boolean = false,
        lockedKeyIndex?: number
    ): Promise<T> {
        let lastError: any;
        const startingKeyIndex = this.currentClientIndex;
        let hasTriedAllKeys = false;
        let keysTriedInThisOperation = new Set<number>();
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            // 檢查是否應該跳過當前 key
            if (this.shouldSkipCurrentKey() && this.clients.length > 1) {
                this.switchToNextApiKey();
            }
            
            keysTriedInThisOperation.add(this.currentClientIndex);
            
            try {
                logger.info(`🔑 Attempting API call with key ${this.currentClientIndex + 1} (attempt ${attempt}/${maxRetries})`);
                return await operation();
            } catch (error: any) {
                lastError = error;
                const isRetryableError = this.isRetryableError(error);
                const isLastAttempt = attempt === maxRetries;
                const isOverload = this.isOverloadError(error);
                const is503Error = error.status === 503 || (error.message && error.message.includes('503'));
                
                logger.warn(`❌ API call failed with key ${this.currentClientIndex + 1}:`, {
                    error: error.message,
                    status: error.status,
                    attempt,
                    maxRetries,
                    isRetryable: isRetryableError,
                    isOverload,
                    is503: is503Error
                });
                
                // 對於 503 錯誤，立即嘗試切換到下一個可用的 key
                if (is503Error && this.clients.length > 1 && allowSwitch) {
                    let switchedToUntriedKey = false;
                    const originalIndex = this.currentClientIndex;
                    
                    // 嘗試找到這次操作還沒試過的 key
                    for (let i = 0; i < this.clients.length; i++) {
                        this.switchToNextApiKey();
                        if (!keysTriedInThisOperation.has(this.currentClientIndex)) {
                            switchedToUntriedKey = true;
                            logger.info(`🔄 503 error: switched to untried key ${this.currentClientIndex + 1}`);
                            break;
                        }
                        // 避免無限循環
                        if (this.currentClientIndex === originalIndex) {
                            break;
                        }
                    }
                    
                    // 如果找到未試過的 key，給它一個立即機會（不等待）
                    if (switchedToUntriedKey) {
                        continue; // 立即重試，不增加 attempt
                    } else {
                        hasTriedAllKeys = true;
                        logger.warn('🔄 503 error: All keys tried for this operation');
                    }
                }
                // 對於其他錯誤，使用標準切換邏輯
                else if (this.shouldSwitchApiKey(error) && this.clients.length > 1 && allowSwitch) {
                    const switched = this.switchToNextApiKey();
                    
                    if (switched) {
                        // 切換成功，檢查是否已經試過所有 keys
                        if (this.currentClientIndex === startingKeyIndex) {
                            hasTriedAllKeys = true;
                            logger.warn('🔄 Tried all available API keys');
                        }
                        
                        // 如果還沒試過所有 keys，重置嘗試次數給新 key 一個機會
                        if (!hasTriedAllKeys && attempt > 1) {
                            attempt = 1; // 重置嘗試次數
                            logger.info('🆕 Reset attempt count for new API key');
                        }
                    }
                }
                
                // 如果不可重試、最後一次嘗試，或已試過所有 keys，拋出錯誤
                if (!isRetryableError || isLastAttempt || hasTriedAllKeys) {
                    throw error;
                }
                
                // 計算延遲時間 - 對 503 錯誤使用較短延遲
                let delay: number;
                if (is503Error) {
                    // 503 錯誤使用較短延遲，因為我們要快速切換
                    delay = 1000 + Math.random() * 1000; // 1-2秒
                    logger.warn(`🚫 503 overload, using short delay: ${Math.round(delay/1000)}s...`);
                } else if (isOverload) {
                    // 其他過載錯誤使用標準延遲
                    delay = (3000 + baseDelay * Math.pow(2, attempt - 1)) + Math.random() * 1000;
                    logger.warn(`🚫 API overload (${error.status || 'unknown'}), using backoff: ${Math.round(delay/1000)}s...`);
                } else {
                    // 其他錯誤使用標準退避
                    delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
                }
                
                logger.warn(`⏳ Retrying in ${delay.toFixed(0)}ms...`);
                await this.sleep(delay);
            }
        }
        
        throw lastError || new Error('Max retries exceeded');
    }

    /**
     * 判斷是否應該切換 API key - 針對 503 錯誤優化
     */
    private shouldSwitchApiKey(error: any): boolean {
        if (!error) return false;
        
        const errorMessage = error.message || '';
        const statusCode = error.status || error.code;
        
        // 503 Service Unavailable - 立即切換（主要問題）
        if (statusCode === 503 || errorMessage.includes('503') || errorMessage.includes('overloaded')) {
            logger.warn(`🚫 503 Service overload detected, switching API key immediately`);
            return true;
        }
        
        // 429 Too Many Requests - 立即切換
        if (statusCode === 429 || errorMessage.includes('429') || errorMessage.includes('rate limit')) {
            logger.warn(`⏸️ Rate limit hit, switching API key`);
            return true;
        }
        
        // API key 相關錯誤
        if (statusCode === 401 || statusCode === 403) return true;
        if (errorMessage.includes('401') || errorMessage.includes('403')) return true;
        if (errorMessage.includes('invalid api key') || errorMessage.includes('unauthorized')) return true;
        
        // 500 Internal Server Error - 也可以嘗試切換
        if (statusCode === 500 || errorMessage.includes('500')) {
            logger.warn(`🔧 500 Internal error, trying different API key`);
            return true;
        }
        
        // 配額相關錯誤
        if (errorMessage.includes('quota')) return true;
        
        // 服務不可用相關錯誤
        if (errorMessage.includes('unavailable') || errorMessage.includes('timeout')) {
            return true;
        }
        
        return false;
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

    /**
     * 錯誤分析
     */
    private analyzeError(error: any): { userMessage: string; type: string; retryable: boolean } {
        const errorInfo = {
            userMessage: '發生未知錯誤，請稍後再試或聯繫技術支援。',
            type: 'Unknown',
            retryable: false
        };

        if (error instanceof Error) {
            errorInfo.userMessage = error.message;
            errorInfo.type = error.name;
            errorInfo.retryable = this.isRetryableError(error);
        } else if (typeof error === 'string') {
            errorInfo.userMessage = error;
            errorInfo.type = 'GeneralError';
            errorInfo.retryable = false;
        } else if (error instanceof Object && error.message) {
            errorInfo.userMessage = error.message;
            errorInfo.type = 'GeneralError';
            errorInfo.retryable = false;
        }

        return errorInfo;
    }

    /**
     * 文件操作專用重試機制 - 修復 key 一致性邏輯
     */
    private async retryFileOperationWithFallback<T>(
        operation: () => Promise<T>,
        uploadedFile: any,
        request: GeminiFileGradingRequest,
        originalKeyIndex: number,
        attemptedKeys: Set<number>,
        maxRetries: number = 3
    ): Promise<T> {
        let currentFileKeyIndex = originalKeyIndex; // 追蹤當前文件所在的 key
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                logger.info(`🔑 File operation attempt ${attempt}/${maxRetries} with key ${this.currentClientIndex + 1}`);
                return await operation();
            } catch (error: any) {
                const is503Error = error.status === 503 || (error.message && error.message.includes('503'));
                const isLastAttempt = attempt === maxRetries;
                
                logger.warn(`❌ File operation failed with key ${this.currentClientIndex + 1}:`, {
                    error: error.message,
                    status: error.status,
                    attempt,
                    maxRetries,
                    is503: is503Error
                });
                
                // 對於 503 錯誤，嘗試重新上傳到不同的 key 並重試
                if (is503Error && !isLastAttempt && this.clients.length > 1) {
                    const newKeyIndex = await this.handleFileOperation503Error(
                        uploadedFile, 
                        request, 
                        currentFileKeyIndex, 
                        attemptedKeys
                    );
                    
                    if (newKeyIndex !== null) {
                        // 成功重新上傳，更新文件所在的 key
                        currentFileKeyIndex = newKeyIndex;
                        logger.info(`🔄 File now available on key ${currentFileKeyIndex + 1}, continuing with this key`);
                        continue;
                    }
                }
                
                // 如果是最後一次嘗試或非503錯誤，拋出錯誤
                if (isLastAttempt) {
                    throw error;
                }
                
                // 其他錯誤，等待後重試
                const delay = 2000 + Math.random() * 2000; // 2-4秒
                logger.warn(`⏳ Retrying in ${delay.toFixed(0)}ms...`);
                await this.sleep(delay);
            }
        }
        
        throw new Error('File operation max retries exceeded');
    }

    /**
     * 處理文件操作的 503 錯誤 - 重新上傳文件到不同的 key（修復版）
     */
    private async handleFileOperation503Error(
        uploadedFile: any,
        request: GeminiFileGradingRequest,
        currentFileKeyIndex: number,
        attemptedKeys: Set<number>
    ): Promise<number | null> {
        try {
            // 先清理當前文件
            await this.cleanupUploadedFileQuiet(uploadedFile, currentFileKeyIndex);
            
            // 尋找未嘗試過的 key
            let foundUntriedKey = false;
            for (let i = 0; i < this.clients.length; i++) {
                this.switchToNextApiKey();
                if (!attemptedKeys.has(this.currentClientIndex)) {
                    foundUntriedKey = true;
                    break;
                }
            }
            
            if (!foundUntriedKey) {
                logger.warn(`🚫 No untried keys available for file re-upload`);
                return null;
            }
            
            attemptedKeys.add(this.currentClientIndex);
            logger.info(`🔄 503 fallback: re-uploading file to key ${this.currentClientIndex + 1}`);
            
            // 重新上傳文件
            const fileBlob = new Blob([request.fileBuffer], { type: request.mimeType });
            const newUploadedFile = await this.getCurrentClient().files.upload({
                file: fileBlob
            });
            
            // 更新 uploadedFile 參考
            uploadedFile.name = newUploadedFile.name;
            uploadedFile.uri = newUploadedFile.uri;
            uploadedFile.mimeType = newUploadedFile.mimeType;
            
            logger.info(`✅ File re-uploaded successfully to key ${this.currentClientIndex + 1}: ${newUploadedFile.name}`);
            
            // 返回新的 key index
            return this.currentClientIndex;
            
        } catch (reUploadError) {
            logger.error(`❌ Failed to re-upload file to key ${this.currentClientIndex + 1}:`, reUploadError);
            return null;
        }
    }

    /**
     * 增強的 JSON 解析，更好的錯誤處理和恢復機制
     */
    private parseGradingResponseEnhanced(responseText: string, criteria: any[], fileName: string): GradingResultData {
        try {
            // 記錄原始回應用於調試
            logger.info(`Raw response length: ${responseText.length} chars`);
            
            return this.parseGradingResponse(responseText, criteria);
            
        } catch (error) {
            logger.error(`JSON parsing failed for ${fileName}:`, { 
                error: error instanceof Error ? error.message : String(error),
                responseLength: responseText.length,
                responseStart: responseText.substring(0, 200),
                responseEnd: responseText.substring(Math.max(0, responseText.length - 200))
            });

            // 嘗試更激進的修復策略
            try {
                const fixedResult = this.attemptResponseRepair(responseText, criteria);
                if (fixedResult) {
                    logger.info(`✅ Successfully repaired truncated response for ${fileName}`);
                    return fixedResult;
                }
            } catch (repairError) {
                logger.warn(`Failed to repair response:`, repairError);
            }

            // 返回增強的預設結果，包含更詳細的錯誤分析
            const maxScore = criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);
            return {
                totalScore: 0,
                maxScore,
                breakdown: criteria.map(criterion => ({
                    criteriaId: criterion.id,
                    score: 0,
                    feedback: this.generateEnhancedErrorFeedback(error, responseText, fileName)
                })),
                overallFeedback: this.generateEnhancedErrorOverallFeedback(error, responseText, fileName)
            };
        }
    }

    /**
     * 嘗試修復截斷的 JSON 回應
     */
    private attemptResponseRepair(responseText: string, criteria: any[]): GradingResultData | null {
        try {
            // 移除可能的 markdown 標記
            let cleanedText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            
            // 嘗試找到最後一個完整的物件
            const lastCloseBrace = cleanedText.lastIndexOf('}');
            if (lastCloseBrace > 0) {
                cleanedText = cleanedText.substring(0, lastCloseBrace + 1);
            }
            
            // 檢查並修復 JSON 結構
            const openBraces = (cleanedText.match(/\{/g) || []).length;
            const closeBraces = (cleanedText.match(/\}/g) || []).length;
            
            if (openBraces > closeBraces) {
                const missingBraces = openBraces - closeBraces;
                for (let i = 0; i < missingBraces; i++) {
                    cleanedText += '}';
                }
            }
            
            // 嘗試解析修復後的 JSON
            const parsed = JSON.parse(cleanedText);
            return this.buildResultFromParsed(parsed, criteria);
            
        } catch (repairError) {
            logger.warn(`JSON repair attempt failed:`, repairError);
            return null;
        }
    }

    /**
     * 生成增強的錯誤回饋
     */
    private generateEnhancedErrorFeedback(error: any, responseText: string, fileName: string): string {
        const errorMsg = error instanceof Error ? error.message : String(error);
        
        let feedback = '**⚠️ 系統評分錯誤**\n\n';
        
        // 根據回應長度判斷問題類型
        if (responseText.length > 5000) {
            feedback += '**問題診斷：** 回應內容過長導致截斷\n';
            feedback += '**可能原因：** 評分要求過於詳細或文件內容複雜\n';
            feedback += '**建議：** 考慮簡化評分標準或分段處理\n\n';
        } else if (responseText.length < 100) {
            feedback += '**問題診斷：** 回應內容過短或無效\n';
            feedback += '**可能原因：** API 服務異常或請求被拒絕\n';
            feedback += '**建議：** 檢查網路連接或稍後重試\n\n';
        } else {
            feedback += '**問題診斷：** JSON 格式錯誤\n';
            feedback += '**可能原因：** AI 輸出格式不符合預期\n';
            feedback += '**建議：** 系統將自動優化提示格式\n\n';
        }
        
        feedback += `**檔案：** ${fileName}\n`;
        feedback += `**錯誤詳情：** ${errorMsg}\n`;
        feedback += `**回應長度：** ${responseText.length} 字元`;
        
        return feedback;
    }

    /**
     * 生成增強的整體錯誤回饋
     */
    private generateEnhancedErrorOverallFeedback(error: any, responseText: string, fileName: string): string {
        return `**🚨 自動評分系統遇到技術問題**

**檔案：** ${fileName}
**時間：** ${new Date().toLocaleString('zh-TW')}
**問題類型：** JSON 解析錯誤

**自動診斷結果：**
- 回應長度：${responseText.length} 字元
- 錯誤類型：${error instanceof Error ? error.name : 'Unknown'}
- 錯誤訊息：${error instanceof Error ? error.message : String(error)}

**系統狀態：**
✅ 文件上傳成功
✅ AI 處理完成  
❌ 結果解析失敗

**下一步建議：**
1. 手動檢查文件格式和內容
2. 如問題持續，請聯繫技術支援
3. 系統將持續優化解析邏輯

**技術支援：** 請提供此錯誤訊息以協助問題追蹤`;
    }

    /**
     * 清理上傳的文件
     */
    private async cleanupUploadedFile(uploadedFile: any, keyIndex: number): Promise<void> {
        try {
            if (uploadedFile && uploadedFile.name) {
                // 確保使用正確的 key
                if (this.currentClientIndex !== keyIndex) {
                    this.currentClientIndex = keyIndex;
                }
                
                await this.getCurrentClient().files.delete({ name: uploadedFile.name });
                logger.info(`✅ File cleanup successful using key ${keyIndex + 1}: ${uploadedFile.name}`);
            }
        } catch (cleanupError) {
            logger.warn(`⚠️ Failed to cleanup uploaded file: ${uploadedFile.name}`, cleanupError);
        }
    }

    /**
     * 靜默清理文件（不記錄錯誤）
     */
    private async cleanupUploadedFileQuiet(uploadedFile: any, keyIndex: number): Promise<void> {
        try {
            if (uploadedFile && uploadedFile.name) {
                if (this.currentClientIndex !== keyIndex) {
                    this.currentClientIndex = keyIndex;
                }
                await this.getCurrentClient().files.delete({ name: uploadedFile.name });
            }
        } catch {
            // 靜默忽略錯誤
        }
    }

    /**
     * 緊急清理文件 - 嘗試所有可能的 key
     */
    private async emergencyCleanupFile(uploadedFile: any, preferredKeyIndex: number | null, attemptedKeys: Set<number>): Promise<void> {
        if (!uploadedFile || !uploadedFile.name) return;
        
        // 首先嘗試偏好的 key
        if (preferredKeyIndex !== null) {
            try {
                const currentIndex = this.currentClientIndex;
                this.currentClientIndex = preferredKeyIndex;
                await this.getCurrentClient().files.delete({ name: uploadedFile.name });
                logger.info(`🧹 Emergency cleanup successful using preferred key ${preferredKeyIndex + 1}`);
                this.currentClientIndex = currentIndex;
                return;
            } catch {
                // 繼續嘗試其他 key
            }
        }
        
        // 嘗試所有使用過的 key
        for (const keyIndex of attemptedKeys) {
            try {
                const currentIndex = this.currentClientIndex;
                this.currentClientIndex = keyIndex;
                await this.getCurrentClient().files.delete({ name: uploadedFile.name });
                logger.info(`🧹 Emergency cleanup successful using key ${keyIndex + 1}`);
                this.currentClientIndex = currentIndex;
                return;
            } catch {
                // 繼續嘗試下一個
            }
        }
        
        logger.error(`❌ Emergency cleanup failed for all attempted keys: ${uploadedFile.name}`);
    }
}

let geminiService: GeminiService | null = null;

export function getGeminiService(): GeminiService {
    if (!geminiService) {
        geminiService = new GeminiService();
    }
    return geminiService;
}

export default GeminiService;