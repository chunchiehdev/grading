import type { GeminiGradingRequest, GeminiFileGradingRequest } from '@/types/gemini';
import logger from '@/utils/logger';

/**
 * Gemini 評分 Prompt 管理
 * 集中管理所有評分相關的提示詞和系統指令
 */
export class GeminiPrompts {
  static generateSystemInstruction(language: 'zh' | 'en' = 'zh'): string {

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

    logger.debug(
      `🔍 [GeminiPrompts] Generated system instruction (${instruction.length} chars)`
    );
    return instruction;
  }


  static generateTextGradingPrompt(request: GeminiGradingRequest): string {
    const {
      content,
      criteria,
      fileName,
      rubricName,
      referenceDocuments,
      customInstructions,
      language = 'zh',
    } = request;
    const maxScore = criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);
    const criteriaDescription = this.formatCriteriaDescription(criteria);

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
                   名稱: "${criterion.name}" ← 請在 JSON 的 name 欄位中使用此名稱
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
                       名稱: "${criterion.name}" ← 請在 JSON 的 name 欄位中使用此名稱
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


  private static getSimpleOutputFormat(_maxScore: number): string {
    // Linus Principle: Single Responsibility
    // The JSON Schema in gemini-simple.server.ts enforces structure (minItems, maxItems, required fields)
    // This prompt only guides content quality, not structure
    return this.dedent(`
            ## 輸出要求

            提供詳細的 JSON 格式評分反饋。每個評分項目必須包含：

            **JSON 結構要求：**
            - breakdown 陣列中的每個項目必須包含：criteriaId（評分標準ID）、name（評分標準名稱）、score（分數）、feedback（反饋）
            - 請確保 name 欄位完全匹配上方提供的評分標準名稱

            **Feedback 內容要求：**

            1. **原文引用和分析**（150-200字）
               - 引用 2-3 處具體的學生原文，用「」標示
               - 說明這些內容如何體現評分標準

            2. **優點說明**（100-150字）
               - 明確指出做得特別好的地方
               - 解釋為什麼這是優秀的表現

            3. **改進建議**（100-150字）
               - 識別可以改進的具體領域
               - 提供 1-2 個可執行的改進步驟

            4. **分數理由**（50-100字）
               - 綜合評價該項目的表現
               - 解釋這個分數的根據

            **確保事項：**
            - 所有字串用雙引號，內容引用用「」
            - 回應為有效的 JSON，可直接解析
            - 為每個評分項目提供詳細 feedback
            - 每個 breakdown 項目都包含完整的 criteriaId、name、score、feedback 四個欄位
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
