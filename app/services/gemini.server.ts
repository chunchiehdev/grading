import { GoogleGenAI } from "@google/genai";
import logger from '@/utils/logger';

// Gemini 評分請求介面
export interface GeminiGradingRequest {
    content: string;
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
     * 主要評分函式
     */
    async gradeDocument(request: GeminiGradingRequest): Promise<GeminiGradingResponse> {
        const startTime = Date.now();

        try {
            logger.info(`Starting Gemini grading for file: ${request.fileName}`);

            // 生成評分提示
            const prompt = this.generateGradingPrompt(request);

            // 設定系統指令
            const systemInstruction = this.generateSystemInstruction();

            // 呼叫 Gemini API
            const response = await this.client.models.generateContent({
                model: this.model,
                contents: prompt,
                config: {
                    systemInstruction,
                    maxOutputTokens: 4000,
                    temperature: 0.1, // 低溫度確保評分一致性
                },
            });

            if (!response.text) {
                throw new Error('Gemini API returned empty response');
            }

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
            logger.error(`Gemini grading failed for ${request.fileName}:`, error);

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Gemini grading failed',
                metadata: {
                    model: this.model,
                    tokens: 0,
                    duration
                }
            };
        }
    }

    /**
     * 生成系統指令
     */
    private generateSystemInstruction(): string {
        return `你是一位專業的學術評分員，具有豐富的評分經驗。你的任務是：

1. **客觀評分**：根據提供的評分標準進行客觀、公正的評分
2. **詳細回饋**：為每個評分項目提供具體、建設性的回饋
3. **結構化輸出**：嚴格按照指定的 JSON 格式輸出結果
4. **中文回饋**：所有回饋都必須使用繁體中文

評分原則：
- 仔細閱讀並理解學生作業的內容
- 對照評分標準的每個項目進行評分
- 提供具體的改進建議
- 保持評分的一致性和公平性

輸出必須是有效的 JSON 格式，包含 totalScore、maxScore、breakdown 和 overallFeedback 四個欄位。`;
    }

    /**
     * 生成評分提示
     */
    private generateGradingPrompt(request: GeminiGradingRequest): string {
        const { content, criteria, fileName, rubricName } = request;

        // 計算總分
        const maxScore = criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);

        // 生成評分標準描述
        const criteriaDescription = criteria.map((criterion, index) =>
            `${index + 1}. **${criterion.name}** (最高 ${criterion.maxScore || 0} 分)
   - 說明: ${criterion.description || '無說明'}
   - 評分等級: ${criterion.levels ? criterion.levels.map((level: any) =>
                `${level.score}分 - ${level.description}`).join('; ') : '無詳細等級'}`
        ).join('\n\n');

        return `請評分以下學生作業:

**檔案名稱**: ${fileName}
**評分標準**: ${rubricName}
**總分**: ${maxScore} 分

## 評分標準
${criteriaDescription}

## 學生作業內容
${content}

## 評分要求
請根據上述評分標準，對這份作業進行詳細評分，並以以下 JSON 格式輸出結果：

\`\`\`json
{
  "totalScore": 總分數字,
  "maxScore": ${maxScore},
  "breakdown": [
    {
      "criteriaId": "評分項目ID",
      "score": 該項目得分,
      "feedback": "針對該項目的詳細中文回饋，包括表現好的地方和改進建議"
    }
  ],
  "overallFeedback": "整體評價和建議的詳細中文回饋"
}
\`\`\`

注意：
1. 所有回饋都必須使用繁體中文
2. 評分要客觀公正，基於作業實際表現
3. 提供具體、建設性的改進建議
4. 確保 JSON 格式正確有效`;
    }

    /**
     * 解析 Gemini 回應
     */
    private parseGradingResponse(responseText: string, criteria: any[]): GradingResultData {
        try {
            // 移除可能的 markdown 標記
            const cleanedText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

            // 解析 JSON
            const parsed = JSON.parse(cleanedText);

            // 驗證必要欄位
            if (!parsed.totalScore && parsed.totalScore !== 0) {
                throw new Error('Missing totalScore in response');
            }
            if (!parsed.maxScore && parsed.maxScore !== 0) {
                throw new Error('Missing maxScore in response');
            }
            if (!parsed.breakdown || !Array.isArray(parsed.breakdown)) {
                throw new Error('Missing or invalid breakdown in response');
            }
            if (!parsed.overallFeedback) {
                throw new Error('Missing overallFeedback in response');
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
                        feedback: found ? found.feedback : '無評分回饋'
                    };
                }),
                overallFeedback: parsed.overallFeedback
            };

            return result;

        } catch (error) {
            logger.error('Failed to parse Gemini response:', { responseText, error });

            // 返回預設結果
            const maxScore = criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);
            return {
                totalScore: 0,
                maxScore,
                breakdown: criteria.map(criterion => ({
                    criteriaId: criterion.id,
                    score: 0,
                    feedback: '評分回應解析失敗，請重新評分'
                })),
                overallFeedback: '評分回應格式錯誤，無法正確解析評分結果。請聯繫系統管理員。'
            };
        }
    }

    /**
     * 計算 token
     */
    private estimateTokens(text: string): number {
        // 英文 4 字元/token，中文 2-3 字元/token
        return Math.ceil(text.length / 3);
    }

    /**
     * 測試連線
     */
    async testConnection(): Promise<{ success: boolean; response?: string; error?: string; metadata?: any }> {
        try {
            const response = await this.client.models.generateContent({
                model: this.model,
                contents: "請告訴我目前世界首富是誰？請用繁體中文回答，並簡單說明原因。",
                config: {
                    maxOutputTokens: 200,
                    temperature: 0.3,
                },
            });

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
}

// 單例模式
let geminiService: GeminiService | null = null;

export function getGeminiService(): GeminiService {
    if (!geminiService) {
        geminiService = new GeminiService();
    }
    return geminiService;
}

export default GeminiService; 