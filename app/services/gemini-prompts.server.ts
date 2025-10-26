import type { GeminiGradingRequest, GeminiFileGradingRequest } from '@/types/gemini';

/**
 * Gemini 評分 Prompt 管理
 * 集中管理所有評分相關的提示詞和系統指令
 */
export class GeminiPrompts {
  static generateSystemInstruction(language: 'zh' | 'en' = 'zh'): string {
    console.log(`🎯 [GeminiPrompts] Generating system instruction for language: ${language}`);

    // Linus Principle: 一個 system instruction 應該清晰、簡潔、不重複
    // 由 JSON Schema 和 User Prompt 負責細節
    const instruction = language === 'zh'
      ? this.dedent(`
          你是一位專業教育評分員。你的工作是精確分析學生作品，提供建設性反饋。

          ## 核心要求

          1. **基於標準**：嚴格按照提供的評分標準評分
          2. **引用原文**：所有分析必須引用具體的學生原文（用「」標示）
          3. **具體反饋**：不要空泛評語，要有可執行的建議
          4. **有價值**：反饋應該幫助學生改進，而不只是指出問題

          ## 重點

          - ${language === 'zh' ? '使用繁體中文' : 'Use English'}
          - 遵循 JSON Schema 的結構要求
          - 提供的分數和反饋必須相符
        `)
      : this.dedent(`
          You are a professional educator and evaluator. Your job is to analyze student work precisely and provide constructive feedback.

          ## Core Requirements

          1. **Standards-based**: Score strictly according to the provided rubric
          2. **Evidence-based**: All analysis must cite specific student text (mark with quotation marks)
          3. **Actionable**: Provide concrete, executable suggestions, not vague comments
          4. **Valuable**: Feedback should help students improve, not just identify problems

          ## Key Points

          - Use English for all feedback
          - Follow the JSON schema structure provided
          - Ensure scores and feedback are consistent
        `);

    console.log(
      `🔍 [GeminiPrompts] Generated system instruction (${instruction.length} chars)`
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
    const {
      content,
      criteria,
      categories,
      fileName,
      rubricName,
      referenceDocuments,
      customInstructions,
      language = 'zh',
    } = request;
    const maxScore = criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);
    const criteriaDescription = categories
      ? this.formatCategorizedCriteriaDescription(categories)
      : this.formatCriteriaDescription(criteria);

    // Feature 004: Format reference documents and custom instructions
    const referenceSection = referenceDocuments ? this.formatReferenceDocuments(referenceDocuments) : '';
    const instructionsSection = customInstructions ? this.formatCustomInstructions(customInstructions) : '';

    return this.dedent(`
            **檔案**：${fileName}
            **標準**：${rubricName}
            **滿分**：${maxScore} 分

            ${referenceSection}

            ## 評分標準
            ${criteriaDescription}

            ${instructionsSection}

            ## 要評分的內容
            ${content}

            ## 評分任務

            根據標準評分此內容。每個評分項目提供詳細反饋，包括：
            - 引用具體原文作為證據
            - 說明優點和改進方向
            - 解釋分數理由

            ${referenceSection ? '如提供參考文件，請判斷答案的正確性和完整度。' : ''}

            ## 輸出格式

            ${this.getSimpleOutputFormat(maxScore)}

            **語言**：${language === 'zh' ? '繁體中文' : 'English'}
        `);
  }

  // Feature 004: Format reference documents for AI prompt
  static formatReferenceDocuments(
    documents: Array<{ fileId: string; fileName: string; content: string; wasTruncated: boolean }>
  ): string {
    if (!documents || documents.length === 0) {
      return '';
    }

    const documentSections = documents
      .map((doc, index) => {
        const truncationNote = doc.wasTruncated ? '\n\n[注意：此文件內容已截斷至8000字元]' : '';
        return this.dedent(`
          ### 參考文件 ${index + 1}: ${doc.fileName}

          ${doc.content}${truncationNote}
        `);
      })
      .join('\n\n');

    return this.dedent(`
      ## 參考知識庫 (Reference Knowledge Base)

      以下是與此作業相關的參考資料，請在評分時參考這些內容來判斷學生答案的正確性和完整性：

      ${documentSections}

      **使用指引：**
      - 比對學生答案與參考資料的一致性
      - 識別學生理解的正確與錯誤之處
      - 判斷答案的完整度（是否涵蓋關鍵概念）
      - 在反饋中明確指出與參考資料的對應關係
    `);
  }

  // Feature 004: Format custom grading instructions for AI prompt
  static formatCustomInstructions(instructions: string): string {
    if (!instructions || instructions.trim() === '') {
      return '';
    }

    return this.dedent(`
      ## 特殊評分指示 (Special Grading Instructions)

      **教師特別要求：**
      ${instructions}

      **重要：** 請在評分時特別注意上述指示，這些是針對此作業的特定要求。
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
            ## 輸出格式

            回應遵循此 JSON 結構。每個 feedback 應包含：
            1. 原文引用和分析（引用具體內容）
            2. 優點說明
            3. 改進建議
            4. 總評和分數理由

            \`\`\`json
            {
              "totalScore": 數字,
              "maxScore": ${maxScore},
              "breakdown": [
                {
                  "criteriaId": "評分項目真實ID",
                  "score": 該項目得分,
                  "feedback": "詳細反饋"
                }
              ],
              "overallFeedback": "整體評價"
            }
            \`\`\`

            **重點：**
            - 回應僅包含 JSON，無其他文字
            - 每個 breakdown 項目必須有 feedback
            - 字串引用用「」而非 ""
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
