import OpenAI from 'openai';
import logger from '@/utils/logger';

// OpenAI 評分請求介面 - 文字內容方式
export interface OpenAIGradingRequest {
    content: string;
    criteria: any[];
    fileName: string;
    rubricName: string;
}

// OpenAI 檔案評分請求介面 - 直接檔案上傳方式
export interface OpenAIFileGradingRequest {
    fileBuffer: Buffer;
    mimeType: string;
    criteria: any[];
    fileName: string;
    rubricName: string;
}

// OpenAI 評分回應介面
export interface OpenAIGradingResponse {
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
        assistantId?: string;
        threadId?: string;
    };
}

// 評分結果資料結構（與 Gemini 一致）
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

class OpenAIService {
    private client: OpenAI;
    private model: string;
    private requestCount: number = 0;
    private lastRequestTime: number = 0;
    private consecutiveErrors: number = 0;
    private lastErrorTime: number = 0;
    private readonly MIN_REQUEST_INTERVAL = 1000; // 1 秒間隔
    private readonly OVERLOAD_BACKOFF_TIME = 30000; // 30 秒退避時間
    private readonly MAX_CONSECUTIVE_ERRORS = 3;

    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY environment variable is required');
        }

        this.client = new OpenAI({ apiKey });
        this.model = "gpt-4o-mini"; // 使用多模態模型
        
        logger.info(`🤖 Initialized OpenAIService with model: ${this.model}`);
    }

    /**
     * 智能 rate limiting
     */
    private async enforceRateLimit(): Promise<void> {
        const now = Date.now();
        
        // 檢查是否在過載恢復期
        if (this.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
            const timeSinceLastError = now - this.lastErrorTime;
            if (timeSinceLastError < this.OVERLOAD_BACKOFF_TIME) {
                const remainingWait = this.OVERLOAD_BACKOFF_TIME - timeSinceLastError;
                logger.warn(`🚫 OpenAI overload detected, waiting ${Math.round(remainingWait/1000)}s before retry...`);
                await this.sleep(remainingWait);
                this.consecutiveErrors = 0;
            }
        }
        
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        // 基本間隔控制
        if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
            const delay = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
            logger.info(`⏳ OpenAI rate limiting: waiting ${delay}ms`);
            await this.sleep(delay);
        }
        
        this.lastRequestTime = Date.now();
        this.requestCount++;
    }

    /**
     * 主要評分函式 - 文字內容評分
     */
    async gradeDocument(request: OpenAIGradingRequest): Promise<OpenAIGradingResponse> {
        const startTime = Date.now();

        try {
            await this.enforceRateLimit();
            
            logger.info(`Starting OpenAI grading for file: ${request.fileName}`);

            // 生成評分提示
            const prompt = this.generateTextGradingPrompt(request);

            // 調用 OpenAI API
            const response = await this.retryWithBackoff(async () => {
                return await this.client.chat.completions.create({
                    model: this.model,
                    messages: [
                        {
                            role: "system",
                            content: this.generateSystemInstruction()
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    max_tokens: 4000,
                    temperature: 0.1,
                    response_format: { type: "json_object" }
                });
            }, 3, 2000);

            if (!response.choices[0]?.message?.content) {
                throw new Error('OpenAI API returned empty response');
            }

            // 記錄成功
            this.recordApiSuccess();

            // 解析回應
            const gradingResult = this.parseGradingResponse(response.choices[0].message.content, request.criteria);
            const duration = Date.now() - startTime;

            logger.info(`OpenAI grading completed for ${request.fileName} in ${duration}ms`);

            return {
                success: true,
                result: gradingResult,
                metadata: {
                    model: this.model,
                    tokens: response.usage?.total_tokens || 0,
                    duration
                }
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            
            // 記錄錯誤
            this.recordApiError(error);
            
            const errorInfo = this.analyzeError(error);
            logger.error(`OpenAI grading failed for ${request.fileName}:`, error);

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
     * 主要評分函式 - 檔案上傳評分（使用 Assistants API）
     */
    async gradeDocumentWithFile(request: OpenAIFileGradingRequest): Promise<OpenAIGradingResponse> {
        const startTime = Date.now();
        let uploadedFile: OpenAI.Files.FileObject | null = null;
        let assistant: OpenAI.Beta.Assistants.Assistant | null = null;
        let thread: OpenAI.Beta.Threads.Thread | null = null;

        try {
            await this.enforceRateLimit();
            
            logger.info(`Starting OpenAI file grading for: ${request.fileName}`);

            // 階段1：上傳文件
            uploadedFile = await this.retryWithBackoff(async () => {
                const blob = new Blob([request.fileBuffer], { type: request.mimeType });
                const file = new File([blob], request.fileName, { type: request.mimeType });
                
                return await this.client.files.create({
                    file: file,
                    purpose: 'assistants'
                });
            }, 2, 1000);

            logger.info(`📁 File uploaded successfully: ${uploadedFile.id}`);

            // 階段2：創建專用 Assistant
            assistant = await this.retryWithBackoff(async () => {
                return await this.client.beta.assistants.create({
                    name: "Document Grader",
                    model: this.model,
                    instructions: this.generateAssistantInstructions(request),
                    tools: [{ type: "file_search" }]
                });
            }, 2, 1000);

            logger.info(`🤖 Assistant created: ${assistant.id}`);

            // 階段3：創建 Thread 並發送評分請求
            thread = await this.client.beta.threads.create();

            const message = await this.client.beta.threads.messages.create(thread.id, {
                role: "user",
                content: this.generateFileGradingPrompt(request),
                attachments: [
                    {
                        file_id: uploadedFile.id,
                        tools: [{ type: "file_search" }]
                    }
                ]
            });

            // 階段4：運行 Assistant
            const run = await this.client.beta.threads.runs.create(thread.id, {
                assistant_id: assistant.id
            });

            // 階段5：等待完成
            const response = await this.waitForRunCompletion(thread.id, run.id);

            if (!response) {
                throw new Error('OpenAI Assistant returned empty response');
            }

            // 記錄成功
            this.recordApiSuccess();

            // 解析回應
            const gradingResult = this.parseGradingResponse(response, request.criteria);
            const duration = Date.now() - startTime;

            // 階段6：清理資源
            await this.cleanupResources(uploadedFile, assistant, thread);

            logger.info(`OpenAI file grading completed for ${request.fileName} in ${duration}ms`);

            return {
                success: true,
                result: gradingResult,
                metadata: {
                    model: this.model,
                    tokens: this.estimateTokens(response),
                    duration,
                    assistantId: assistant.id,
                    threadId: thread.id
                }
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            
            // 記錄錯誤
            this.recordApiError(error);
            
            // 緊急清理資源
            if (uploadedFile || assistant || thread) {
                await this.emergencyCleanup(uploadedFile, assistant, thread);
            }
            
            const errorInfo = this.analyzeError(error);
            logger.error(`OpenAI file grading failed for ${request.fileName}:`, error);

            return {
                success: false,
                error: errorInfo.userMessage,
                metadata: {
                    model: this.model,
                    tokens: 0,
                    duration,
                    errorType: errorInfo.type,
                    retryable: errorInfo.retryable,
                    fileProcessed: !!uploadedFile
                }
            };
        }
    }

    /**
     * 生成文字評分提示
     */
    private generateTextGradingPrompt(request: OpenAIGradingRequest): string {
        const criteriaText = this.formatCriteriaDescription(request.criteria);

        return `請根據以下評分標準為文件"${request.fileName}"進行詳細評分：

評分標準「${request.rubricName}」：
${criteriaText}

## 評分要求
請對每個評分項目提供：
1. **引用分析** - 必須引用具體的原文內容作為證據
2. **優點分析** - 指出表現好的地方及原因
3. **改進建議** - 提供具體可執行的改進方向
4. **評分理由** - 說明為什麼給這個分數

**引用格式**：用「原文內容」標示引用部分

## 文件內容
${request.content}

請以JSON格式回應，格式如下：
{
  "totalScore": 總分數字,
  "maxScore": 滿分數字,
  "breakdown": [
    {
      "criteriaId": "使用上方列出的真實ID",
      "score": 得分,
      "feedback": "基於「原文引用」的詳細分析，包括：\\n\\n**表現優點：** 引用原文說明好的地方\\n\\n**需要改進：** 引用原文指出問題\\n\\n**改進建議：** 具體可執行的建議\\n\\n**評分理由：** 為什麼給這個分數"
    }
  ],
  "overallFeedback": "整體評價，包含最重要的優點和改進建議，要引用原文支持"
}`;
    }

    /**
     * 生成檔案評分提示
     */
    private generateFileGradingPrompt(request: OpenAIFileGradingRequest): string {
        const criteriaText = this.formatCriteriaDescription(request.criteria);

        return `請仔細分析上傳的文件並根據以下評分標準進行詳細評分：

檔案名稱：${request.fileName}
評分標準「${request.rubricName}」：
${criteriaText}

## 評分要求
請詳細閱讀文件內容，針對每個評分項目提供：
1. **精確引用** - 必須引用文件中的具體內容作為分析依據
2. **證據分析** - 說明引用內容為什麼表現好或需要改進
3. **具體建議** - 提供可執行的改進方向
4. **評分說明** - 解釋為什麼給這個分數

**重要指引：**
- 每項分析都要引用原文，用「原文內容」格式標示
- 優點分析要指出具體好在哪裡
- 改進建議要具體可行，不要空泛
- 如果無法從文件中找到相關內容，請明確說明

請以JSON格式回應，格式如下：
{
  "totalScore": 總分數字,
  "maxScore": 滿分數字,
  "breakdown": [
    {
      "criteriaId": "使用上方列出的真實ID",
      "score": 得分,
      "feedback": "詳細分析內容，格式如下：\\n\\n**引用與分析：** 「文件中的具體內容」- 這部分表現如何\\n\\n**表現優點：** 好的地方及原因\\n\\n**改進空間：** 需要改善的地方\\n\\n**具體建議：** 如何改進，要可執行\\n\\n**評分依據：** 為什麼給這個分數"
    }
  ],
  "overallFeedback": "整體評價和建議，要包含：\\n1. 最突出的優點（引用支持）\\n2. 最需要改進的地方（引用支持）\\n3. 具體的下一步建議"
}

如果無法從文件中提取相關資訊，請說明原因。`;
    }

    /**
     * 格式化評分標準描述
     */
    private formatCriteriaDescription(criteria: any[]): string {
        const criteriaList = criteria.map((criterion, index) => {
            const levelsText = criterion.levels 
                ? criterion.levels.map((level: any) => `${level.score}分 - ${level.description}`).join('；')
                : '';
            
            return `${index + 1}. **${criterion.name}** (${criterion.maxScore}分)
   ID: "${criterion.id}" ← 請在 JSON 中使用此 ID
   說明：${criterion.description || ''}
   ${levelsText ? `評分等級：${levelsText}` : ''}`;
        }).join('\n\n');

        const criteriaIds = criteria.map(c => `"${c.id}"`).join(', ');
        
        return `${criteriaList}

**重要：** 在 JSON 回應中，"criteriaId" 必須完全匹配上述 ID：${criteriaIds}`;
    }

    /**
     * 生成系統指令
     */
    private generateSystemInstruction(): string {
        return `你是一個專業的文件評分專家。請遵循以下原則：

1. 客觀公正地評分，基於明確的證據
2. 提供建設性的回饋和具體改進建議
3. 使用正面鼓勵的語言，但指出需要改進的地方
4. 確保評分與標準一致
5. 回應必須是有效的JSON格式
6. 如果文件內容不足以評分，請說明原因`;
    }

    /**
     * 生成 Assistant 指令
     */
    private generateAssistantInstructions(request: OpenAIFileGradingRequest): string {
        return `你是一個專業的文件評分助手。你的任務是：

1. 仔細分析用戶上傳的文件
2. 根據提供的評分標準進行客觀評分
3. 為每個評分項目提供詳細回饋
4. 給出整體評價和改進建議
5. 以JSON格式回應

檔案類型：${request.mimeType}
評分標準：${request.rubricName}

請確保：
- 評分基於文件實際內容
- 回饋具體且有建設性
- JSON格式正確且完整
- 如果文件無法讀取，請說明原因`;
    }

    /**
     * 等待 Assistant 運行完成
     */
    private async waitForRunCompletion(threadId: string, runId: string, maxWaitTime: number = 300000): Promise<string | null> {
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
            const run = await this.client.beta.threads.runs.retrieve(threadId, runId);
            
            if (run.status === 'completed') {
                // 獲取回應
                const messages = await this.client.beta.threads.messages.list(threadId);
                const lastMessage = messages.data[0];
                
                if (lastMessage.role === 'assistant' && lastMessage.content[0].type === 'text') {
                    return lastMessage.content[0].text.value;
                }
                return null;
            } else if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
                throw new Error(`Assistant run ${run.status}: ${run.last_error?.message || 'Unknown error'}`);
            }
            
            // 等待 2 秒後再檢查
            await this.sleep(2000);
        }
        
        throw new Error('Assistant run timed out');
    }

    /**
     * 解析評分回應
     */
    private parseGradingResponse(responseText: string, criteria: any[]): GradingResultData {
        try {
            // 移除可能的 markdown 標記
            const cleanedText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            const parsed = JSON.parse(cleanedText);
            
            // 驗證和構建結果
            return this.buildResultFromParsed(parsed, criteria);

        } catch (error) {
            logger.error('Failed to parse OpenAI response:', { responseText: responseText.substring(0, 500) + '...', error });

            // 返回預設結果
            const maxScore = criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);
            return {
                totalScore: 0,
                maxScore,
                breakdown: criteria.map(criterion => ({
                    criteriaId: criterion.id,
                    score: 0,
                    feedback: '**評分失敗 - JSON 解析錯誤**\n\n可能原因：OpenAI 回應格式錯誤或內容被截斷。\n\n請重試或聯繫技術支援。'
                })),
                overallFeedback: '**系統錯誤 - 無法完成評分**\n\nOpenAI 服務回應解析失敗，請重試或聯繫技術支援。'
            };
        }
    }

    /**
     * 從解析的 JSON 構建結果
     */
    private buildResultFromParsed(parsed: any, criteria: any[]): GradingResultData {
        // 驗證必要欄位
        if (!parsed.totalScore && parsed.totalScore !== 0) {
            parsed.totalScore = 0;
        }
        if (!parsed.maxScore && parsed.maxScore !== 0) {
            parsed.maxScore = criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);
        }
        if (!parsed.breakdown || !Array.isArray(parsed.breakdown)) {
            parsed.breakdown = [];
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
                    feedback: found ? found.feedback : '無詳細分析'
                };
            }),
            overallFeedback: parsed.overallFeedback || '無綜合評價'
        };

        return result;
    }

    /**
     * 計算 token（簡單估算）
     */
    private estimateTokens(text: string): number {
        return Math.ceil(text.length / 4);
    }

    /**
     * 指數退避重試機制
     */
    private async retryWithBackoff<T>(
        operation: () => Promise<T>,
        maxRetries: number = 3,
        baseDelay: number = 1000
    ): Promise<T> {
        let lastError: any;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                logger.info(`🔑 Attempting OpenAI API call (attempt ${attempt}/${maxRetries})`);
                return await operation();
            } catch (error: any) {
                lastError = error;
                const isRetryableError = this.isRetryableError(error);
                const isLastAttempt = attempt === maxRetries;
                
                logger.warn(`❌ OpenAI API call failed:`, {
                    error: error.message,
                    status: error.status,
                    attempt,
                    maxRetries,
                    isRetryable: isRetryableError
                });
                
                if (!isRetryableError || isLastAttempt) {
                    throw error;
                }
                
                // 計算延遲時間
                const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
                logger.warn(`⏳ Retrying in ${delay.toFixed(0)}ms...`);
                await this.sleep(delay);
            }
        }
        
        throw lastError || new Error('Max retries exceeded');
    }

    /**
     * 判斷是否為可重試的錯誤
     */
    private isRetryableError(error: any): boolean {
        if (!error) return false;
        
        const errorMessage = error.message || '';
        const statusCode = error.status || error.code;
        
        // 429 Too Many Requests
        if (statusCode === 429) return true;
        
        // 500+ Server Errors
        if (statusCode >= 500) return true;
        
        // 特定錯誤訊息
        const retryableMessages = [
            'timeout',
            'rate limit',
            'overloaded',
            'unavailable',
            'internal error'
        ];
        
        return retryableMessages.some(msg => 
            errorMessage.toLowerCase().includes(msg)
        );
    }

    /**
     * 記錄 API 錯誤
     */
    private recordApiError(error: any): void {
        this.consecutiveErrors++;
        this.lastErrorTime = Date.now();
        logger.warn(`📈 Consecutive OpenAI API errors: ${this.consecutiveErrors}/${this.MAX_CONSECUTIVE_ERRORS}`);
    }

    /**
     * 記錄 API 成功
     */
    private recordApiSuccess(): void {
        this.consecutiveErrors = 0;
        logger.info(`✅ OpenAI API call successful`);
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
        }

        // 針對 OpenAI 特定錯誤提供友善訊息
        if (error.status === 429) {
            errorInfo.userMessage = '🚦 OpenAI 服務請求過於頻繁，請稍後再試。';
        } else if (error.status >= 500) {
            errorInfo.userMessage = '🔧 OpenAI 服務暫時不可用，請稍後再試。';
        } else if (error.message?.includes('file')) {
            errorInfo.userMessage = '📁 檔案處理失敗，請檢查檔案格式是否正確。';
        }

        return errorInfo;
    }

    /**
     * 清理資源
     */
    private async cleanupResources(
        file: OpenAI.Files.FileObject | null,
        assistant: OpenAI.Beta.Assistants.Assistant | null,
        thread: OpenAI.Beta.Threads.Thread | null
    ): Promise<void> {
        try {
            // 清理檔案
            if (file) {
                await this.client.files.del(file.id);
                logger.info(`🧹 Cleaned up file: ${file.id}`);
            }
            
            // 清理 Assistant
            if (assistant) {
                await this.client.beta.assistants.del(assistant.id);
                logger.info(`🧹 Cleaned up assistant: ${assistant.id}`);
            }
            
            // Thread 會自動清理，不需要手動刪除
        } catch (cleanupError) {
            logger.warn(`⚠️ Failed to cleanup OpenAI resources:`, cleanupError);
        }
    }

    /**
     * 緊急清理
     */
    private async emergencyCleanup(
        file: OpenAI.Files.FileObject | null,
        assistant: OpenAI.Beta.Assistants.Assistant | null,
        thread: OpenAI.Beta.Threads.Thread | null
    ): Promise<void> {
        logger.info(`🚨 Emergency cleanup of OpenAI resources`);
        await this.cleanupResources(file, assistant, thread);
    }

    /**
     * 睡眠函數
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

let openaiService: OpenAIService | null = null;

export function getOpenAIService(): OpenAIService {
    if (!openaiService) {
        openaiService = new OpenAIService();
    }
    return openaiService;
}

export default OpenAIService; 