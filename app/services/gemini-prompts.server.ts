import type { GeminiGradingRequest, GeminiFileGradingRequest } from '@/types/gemini';

/**
 * Gemini 評分 Prompt 管理
 * 集中管理所有評分相關的提示詞和系統指令
 */
export class GeminiPrompts {
  static generateSystemInstruction(language: 'zh' | 'en' = 'zh'): string {
    console.log(`🎯 [GeminiPrompts] Generating system instruction for language: ${language}`);
    const instruction = this.dedent(`
            你是一位專業評分員。你的任務是：

            1. **精確分析**：仔細閱讀文件，基於評分標準客觀評分
            2. **引用原文**：分析時必須引用具體的句子或段落作為證據
            3. **具體建議**：提供可執行的改進方向，避免空泛評語
            4. **建設性回饋**：重點幫助提升，而非只是指出問題

            **分析方法：**
            - 對每個評分項目，找出表現最好和需要改進的具體內容
            - 用「」或『』標示你引用的原文片段（不要使用雙引號""）
            - 說明為什麼這些內容表現好/需要改進
            - 提供具體的改進建議或方向

            **🔥 CRITICAL JSON 輸出規則：**
            - ${language === 'zh' ? '使用繁體中文撰寫所有內容' : 'Write all content in English'}
            - 僅回應有效的JSON格式，不要添加解釋或註釋
            - 所有屬性名和字串值必須用雙引號 " 包圍
            - 字串內容的引用請用「」或『』，避免使用雙引號
            - 確保所有括號 { } [ ] 正確配對
            - 數字不要加引號，布林值使用 true/false
            - 最後一個數組或對象項目後不要加逗號
            - 避免在字串內使用換行符，使用 \\n 代替

            **JSON格式檢查重點：**
            ✅ 雙引號包圍所有屬性名和字串值
            ✅ 引用內容使用「」而非""
            ✅ 所有括號必須正確閉合
            ✅ 語法完全有效，可直接解析
        `);
    console.log(
      `🔍 [GeminiPrompts] Generated system instruction (first 200 chars): ${instruction.substring(0, 200)}...`
    );
    return instruction;
  }

  static generateFileGradingPrompt(request: GeminiFileGradingRequest): string {
    const { criteria, categories, fileName, rubricName } = request;
    const maxScore = criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);
    const criteriaDescription = categories
      ? this.formatCategorizedCriteriaDescription(categories)
      : this.formatCriteriaDescription(criteria);

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

  static generateTextGradingPrompt(request: GeminiGradingRequest): string {
    const { content, criteria, categories, fileName, rubricName } = request;
    const maxScore = criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);
    const criteriaDescription = categories
      ? this.formatCategorizedCriteriaDescription(categories)
      : this.formatCriteriaDescription(criteria);

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

  private static formatCriteriaDescription(criteria: any[]): string {
    const criteriaList = criteria
      .map((criterion, index) => {
        const levelsText = criterion.levels
          ? criterion.levels.map((level: any) => `${level.score}分 - ${level.description}`).join('；')
          : '';

        return this.dedent(
          `
                ${index + 1}. **${criterion.name}** (${criterion.maxScore || 0} 分)
                   ID: "${criterion.id}" ← 請在 JSON 中使用此 ID
                   說明：${criterion.description || '無說明'}
                   ${levelsText ? `評分等級：${levelsText}` : ''}
            `
        ).trim();
      })
      .join('\n\n');

    const criteriaIds = criteria.map((c) => `"${c.id}"`).join(', ');

    return `${criteriaList}

**重要：** 在 JSON 回應中，"criteriaId" 必須完全匹配上述 ID：${criteriaIds}`;
  }

  private static formatCategorizedCriteriaDescription(categories: any[]): string {
    const allCriteriaIds: string[] = [];

    const categoriesList = categories
      .map((category, categoryIndex) => {
        const categoryNumber = categoryIndex + 1;

        const criteriaList = category.criteria
          .map((criterion: any, criterionIndex: number) => {
            const criterionNumber = `${categoryNumber}.${criterionIndex + 1}`;
            allCriteriaIds.push(criterion.id);

            const levelsText = criterion.levels
              ? criterion.levels.map((level: any) => `${level.score}分 - ${level.description}`).join('；')
              : '';

            return this.dedent(
              `
                    ${criterionNumber} **${criterion.name}** (${criterion.maxScore || 0} 分)
                       ID: "${criterion.id}" ← 請在 JSON 中使用此 ID
                       說明：${criterion.description || '無說明'}
                       ${levelsText ? `評分等級：${levelsText}` : ''}
                `
            ).trim();
          })
          .join('\n\n   ');

        return this.dedent(
          `
                ### ${categoryNumber}. ${category.name} 類別
                
                ${criteriaList}
            `
        ).trim();
      })
      .join('\n\n');

    const criteriaIds = allCriteriaIds.map((id) => `"${id}"`).join(', ');

    return `${categoriesList}

**重要：** 在 JSON 回應中，"criteriaId" 必須完全匹配上述 ID：${criteriaIds}

**評分要求：** 請按照類別結構理解評分標準的邏輯分組，這將有助於提供更有組織性的評分分析。`;
  }

  private static getDetailedOutputFormat(maxScore: number): string {
    return this.dedent(`
            **🚨 CRITICAL: 嚴格JSON格式要求**
            - 必須使用雙引號，不可使用單引號
            - 字串內的引號請用「」或『』替代
            - 確保所有 { } [ ] 正確配對並閉合
            - 不要在JSON前後添加任何解釋文字
            - 數字類型不要加引號
            - 避免在字串內使用換行符，用\\n代替

            **請僅回應以下JSON格式，不要添加其他內容：**

            \`\`\`json
            {
              "totalScore": 總分數字,
              "maxScore": ${maxScore},
              "breakdown": [
                {
                  "criteriaId": "評分項目的真實ID（見下方列表）",
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

            **⚠️ JSON 驗證要點：**
            1. 字串值用雙引號包圍
            2. 內容引用使用「」而非""
            3. 所有括號必須配對
            4. 最後一項不加逗號
            5. 僅回應JSON，無其他說明
        `);
  }

  private static getSimpleOutputFormat(maxScore: number): string {
    return this.dedent(`
            **⚠️ 重要：嚴格遵循JSON格式**
            - 所有字串必須用雙引號包圍
            - 不要在字串內使用未轉義的雙引號
            - 確保所有括號正確配對
            - 不要在JSON外添加額外文字或解釋

            請回應以下**精確的JSON格式**（不要添加任何其他內容）：

            \`\`\`json
            {
              "totalScore": 總分數字,
              "maxScore": ${maxScore},
              "breakdown": [
                {
                  "criteriaId": "評分項目的真實ID（見下方列表）",
                  "score": 該項目得分,
                  "feedback": "基於「原文引用」的具體分析，包括優點和改進建議"
                }
              ],
              "overallFeedback": "整體評價和綜合建議"
            }
            \`\`\`

            **JSON格式檢查清單：**
            ✅ 使用雙引號，不要單引號
            ✅ 字串內容如有引號請使用「」或『』
            ✅ 確保所有 { } [ ] 正確配對
            ✅ 數字不要加引號
            ✅ 最後一個項目後面不要逗號
        `);
  }

  private static dedent(text: string): string {
    const lines = text.split('\n');

    while (lines.length > 0 && lines[0].trim() === '') {
      lines.shift();
    }
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
      lines.pop();
    }

    if (lines.length === 0) return '';

    const nonEmptyLines = lines.filter((line) => line.trim() !== '');
    if (nonEmptyLines.length === 0) return '';

    const minIndent = Math.min(
      ...nonEmptyLines.map((line) => {
        const match = line.match(/^(\s*)/);
        return match ? match[1].length : 0;
      })
    );

    return lines.map((line) => line.slice(minIndent)).join('\n');
  }
}
