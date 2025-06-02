import type { GeminiGradingRequest, GeminiFileGradingRequest } from './gemini.server';

/**
 * Gemini 評分 Prompt 管理
 * 集中管理所有評分相關的提示詞和系統指令
 */
export class GeminiPrompts {

    /**
     * 生成系統指令
     */
    static generateSystemInstruction(): string {
        return this.dedent(`
            你是一位專業評分員。你的任務是：

            1. **精確分析**：仔細閱讀文件，基於評分標準客觀評分
            2. **引用原文**：分析時必須引用具體的句子或段落作為證據
            3. **具體建議**：提供可執行的改進方向，避免空泛評語
            4. **建設性回饋**：重點幫助提升，而非只是指出問題

            **分析方法：**
            - 對每個評分項目，找出表現最好和需要改進的具體內容
            - 用引號標示你引用的原文片段
            - 說明為什麼這些內容表現好/需要改進
            - 提供具體的改進建議或方向

            **輸出要求：**
            - 所有回饋使用繁體中文
            - 必須引用原文作為分析依據
            - 提供可行動的具體建議
            - 嚴格遵循 JSON 格式
        `);
    }

    /**
     * 生成文件評分提示
     */
    static generateFileGradingPrompt(request: GeminiFileGradingRequest): string {
        const { criteria, fileName, rubricName } = request;
        const maxScore = criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);
        const criteriaDescription = this.formatCriteriaDescription(criteria);

        return this.dedent(`
            請對上傳的文件進行專業評分分析：

            **檔案名稱**：${fileName}
            **評分標準**：${rubricName}
            **總分**：${maxScore} 分

            ## 評分標準
            ${criteriaDescription}

            ## 評分要求

            **分析重點：**
            1. **引用分析** - 每個評分項目都要引用原文具體內容
            2. **證據支持** - 說明為什麼給這個分數，基於什麼證據
            3. **具體改進** - 指出可以如何改善，給出明確方向
            4. **實用導向** - 重點在於幫助提升，不是挑毛病

            **引用格式：**
            - 用引號標示原文：「原文內容」
            - 說明這段內容的表現如何
            - 提供具體的改進建議

            ## 輸出格式

            ${this.getDetailedOutputFormat(maxScore)}

            **評分原則：**
            - 必須基於評分標準客觀評分
            - 每個分析都要有原文引用支持
            - 建議要具體可執行，不要空泛
            - 重點幫助提升而非批評

            請開始分析：
        `);
    }

    /**
     * 生成文字內容評分提示
     */
    static generateTextGradingPrompt(request: GeminiGradingRequest): string {
        const { content, criteria, fileName, rubricName } = request;
        const maxScore = criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);
        const criteriaDescription = this.formatCriteriaDescription(criteria);

        return this.dedent(`
            請對以下內容進行專業評分：

            **檔案名稱**：${fileName}
            **評分標準**：${rubricName}
            **總分**：${maxScore} 分

            ## 評分標準
            ${criteriaDescription}

            ## 要評分的內容
            ${content}

            ## 評分要求

            請基於評分標準進行客觀分析，每個評分項目都要：
            - 引用具體內容作為分析依據
            - 說明表現好的地方及原因
            - 指出需要改進的地方及具體建議
            - 提供可執行的改進方向

            ## 輸出格式

            ${this.getSimpleOutputFormat(maxScore)}

            請確保：
            1. 所有分析都要引用原文
            2. 建議要具體可執行
            3. JSON 格式正確
            4. 使用繁體中文
        `);
    }

    /**
     * 格式化評分標準描述
     */
    private static formatCriteriaDescription(criteria: any[]): string {
        return criteria.map((criterion, index) => {
            const levelsText = criterion.levels 
                ? criterion.levels.map((level: any) => `${level.score}分 - ${level.description}`).join('；')
                : '';
            
            return this.dedent(`
                ${index + 1}. **${criterion.name}** (${criterion.maxScore || 0} 分)
                   說明：${criterion.description || '無說明'}
                   ${levelsText ? `評分等級：${levelsText}` : ''}
            `).trim();
        }).join('\n\n');
    }

    /**
     * 獲取詳細輸出格式（用於文件評分）
     */
    private static getDetailedOutputFormat(maxScore: number): string {
        return this.dedent(`
            \`\`\`json
            {
              "totalScore": 總分數字,
              "maxScore": ${maxScore},
              "breakdown": [
                {
                  "criteriaId": "評分項目ID",
                  "score": 該項目得分,
                  "evidence": {
                    "strengths": "表現好的原文引用「具體內容」及分析",
                    "weaknesses": "需改進的原文引用「具體內容」及分析"
                  },
                  "feedback": {
                    "whatWorked": "什麼地方做得好，為什麼好",
                    "whatNeedsWork": "什麼地方需要改進，具體問題是什麼",
                    "howToImprove": "具體改進建議，可以怎麼做得更好"
                  },
                  "scoreJustification": "為什麼給這個分數，要達到更高分需要什麼"
                }
              ],
              "overallFeedback": {
                "documentStrengths": [
                  "整體最突出的優點1（引用支持）",
                  "整體最突出的優點2（引用支持）"
                ],
                "keyImprovements": [
                  "最重要的改進點1（具體可執行）",
                  "最重要的改進點2（具體可執行）"
                ],
                "nextSteps": "基於這份文件，下一步應該重點改善什麼"
              }
            }
            \`\`\`
        `);
    }

    /**
     * 獲取簡單輸出格式（用於文字評分）
     */
    private static getSimpleOutputFormat(maxScore: number): string {
        return this.dedent(`
            \`\`\`json
            {
              "totalScore": 總分數字,
              "maxScore": ${maxScore},
              "breakdown": [
                {
                  "criteriaId": "評分項目ID",
                  "score": 該項目得分,
                  "feedback": "基於「原文引用」的具體分析，包括優點和改進建議"
                }
              ],
              "overallFeedback": "整體評價和綜合建議"
            }
            \`\`\`
        `);
    }

    /**
     * 移除字串前導空白的工具函數
     * 類似 Python 的 textwrap.dedent
     */
    private static dedent(text: string): string {
        const lines = text.split('\n');
        
        // 移除開頭和結尾的空行
        while (lines.length > 0 && lines[0].trim() === '') {
            lines.shift();
        }
        while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
            lines.pop();
        }
        
        if (lines.length === 0) return '';
        
        // 找出最小的前導空白數量（忽略空行）
        const nonEmptyLines = lines.filter(line => line.trim() !== '');
        if (nonEmptyLines.length === 0) return '';
        
        const minIndent = Math.min(...nonEmptyLines.map(line => {
            const match = line.match(/^(\s*)/);
            return match ? match[1].length : 0;
        }));
        
        // 移除共同的前導空白
        return lines.map(line => line.slice(minIndent)).join('\n');
    }
} 