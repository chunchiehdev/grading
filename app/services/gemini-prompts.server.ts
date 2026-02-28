import type { GeminiGradingRequest, GeminiFileGradingRequest } from '@/types/gemini';
import logger from '@/utils/logger';

/**
 * Gemini 評分 Prompt 管理
 * 集中管理所有評分相關的提示詞和系統指令
 */
export class GeminiPrompts {
  static generateSystemInstruction(language: 'zh' | 'en' = 'en'): string {

    // Linus Principle: 一個 system instruction 應該清晰、簡潔、不重複
    // 由 JSON Schema 和 User Prompt 負責細節
    const instruction = language === 'zh'
      ? this.dedent(`
          你是一位專業教育評分員。你的工作是精確分析學生作品，提供建設性反饋。

          ## 核心要求

          1. **主題相關性檢核 (最重要)**：在評分前，**必須**先檢查學生內容是否針對本次作業主題及參考文件回答。
             - 若學生回答內容品質雖高但與「作業說明」或「參考文件」**完全無關**（例如：作業要求心得，學生卻在討論不相關的理論），**請直接給予該項目最低分 (0分或1分)**。
             - 在評語中明確指出：「內容離題，未針對本次作業主題 [題目名稱] 進行回答」。
          2. **基於標準**：在確認主題相關後，嚴格按照提供的評分標準評分
          3. **引用原文**：所有分析必須引用具體的學生原文（用「」標示）
          4. **具體反饋**：不要空泛評語，要有可執行的建議
          5. **有價值**：反饋應該幫助學生改進，而不只是指出問題
          6. **身分保密**：若被問及模型開發商或底層技術，請回答「我是專為教育評分設計的 AI 助手」，嚴禁透露如 Google, OpenAI, Tongyi Qianwen, 通義千問等模型廠商資訊。

          ## 重點

          - **必須使用繁體中文 (Traditional Chinese)** 回答
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
    const split = this.generateSplitGradingPrompt(request);
    return `${split.cachedContent}\n\n${split.userPrompt}`;
  }

  static generateSplitGradingPrompt(request: GeminiGradingRequest): {
    systemInstruction: string;
    cachedContent: string;
    userPrompt: string;
  } {
    const {
      content,
      criteria,
      fileName,
      rubricName,
      referenceDocuments,
      customInstructions,
      language = 'en',
      assignmentTitle,
      assignmentDescription,
    } = request;
    const isZh = language === 'zh';
    const maxScore = criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);
    const criteriaDescription = this.formatCriteriaDescription(criteria, language);

    // Feature 004: Format reference documents and custom instructions
    const referenceSection = referenceDocuments ? this.formatReferenceDocuments(referenceDocuments) : '';
    const instructionsSection = customInstructions ? this.formatCustomInstructions(customInstructions) : '';
    
    // Format Assignment Info
    const assignmentSection = assignmentTitle
      ? isZh
        ? `## 作業資訊\n標題：${assignmentTitle}\n說明：${assignmentDescription || '無'}\n`
        : `## Assignment Info\nTitle: ${assignmentTitle}\nDescription: ${assignmentDescription || 'N/A'}\n`
      : '';

    const systemInstruction = this.generateSystemInstruction(language);

    // Static Content (Cacheable)
    const cachedContent = this.dedent(
      isZh
        ? `
            **標準**：${rubricName}
            **滿分**：${maxScore} 分

            ${assignmentSection}

            ${referenceSection}

            ## 評分標準
            ${criteriaDescription}

            ${instructionsSection}

            ${referenceSection ? '如提供參考文件，請判斷答案的正確性和完整度。' : ''}

            ## 輸出格式
            ${this.getSimpleOutputFormat(language)}

            **語言**：繁體中文
          `
        : `
            **Rubric**: ${rubricName}
            **Max Score**: ${maxScore}

            ${assignmentSection}

            ${referenceSection}

            ## Grading Criteria
            ${criteriaDescription}

            ${instructionsSection}

            ${referenceSection ? 'If reference documents are provided, evaluate correctness and completeness against them.' : ''}

            ## Output Format
            ${this.getSimpleOutputFormat(language)}

            **Language**: English
          `
    );

    // Dynamic Content (Per Student)
    const userPrompt = this.dedent(
      isZh
        ? `
            **檔案**：${fileName}

            ## 要評分的內容
            ${content}

            ## 評分任務

            根據上述標準和參考資料評分此內容。

            **特別注意**：請優先檢查內容是否離題。若學生內容與「作業說明」或「參考文件」的主題無關（例如：回答了錯誤的題目），即使寫得很好，也**必須給予 0 分**，並在評語中說明「離題」。
          `
        : `
            **File**: ${fileName}

            ## Submission Content
            ${content}

            ## Grading Task

            Evaluate this content based on the rubric and reference materials above.

            **Important**: Check off-topic relevance first. If the content does not address the assignment instructions or reference-document topic (for example, answering a different prompt), you **must assign 0** even if the writing quality is high, and explicitly explain that it is off-topic.
          `
    );

    return {
      systemInstruction,
      cachedContent,
      userPrompt,
    };
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

  private static formatCriteriaDescription(criteria: any[], language: 'zh' | 'en' = 'en'): string {
    const isZh = language === 'zh';
    const criteriaList = criteria
      .map((criterion, index) => {
        const levelsText = criterion.levels
          ? criterion.levels
              .map((level: any) =>
                isZh ? `${level.score}分 - ${level.description}` : `${level.score} points - ${level.description}`
              )
              .join(isZh ? '；' : '; ')
          : '';

        return this.dedent(
          isZh
            ? `
                ${index + 1}. **${criterion.name}** (${criterion.maxScore || 0} 分)
                   ID: "${criterion.id}" ← 請在 JSON 中使用此 ID
                   名稱: "${criterion.name}" ← 請在 JSON 的 name 欄位中使用此名稱
                   說明：${criterion.description || '無說明'}
                   ${levelsText ? `評分等級：${levelsText}` : ''}
            `
            : `
                ${index + 1}. **${criterion.name}** (${criterion.maxScore || 0} points)
                   ID: "${criterion.id}" ← Use this exact ID in JSON
                   Name: "${criterion.name}" ← Use this exact name in JSON.name
                   Description: ${criterion.description || 'No description'}
                   ${levelsText ? `Scoring levels: ${levelsText}` : ''}
            `
        ).trim();
      })
      .join('\n\n');

    const criteriaIds = criteria.map((c) => `"${c.id}"`).join(', ');

    return isZh
      ? `${criteriaList}

**重要：** 在 JSON 回應中，"criteriaId" 必須完全匹配上述 ID：${criteriaIds}`
      : `${criteriaList}

**Important:** In the JSON response, "criteriaId" must exactly match one of these IDs: ${criteriaIds}`;
  }

  private static formatCategorizedCriteriaDescription(categories: any[], language: 'zh' | 'en' = 'en'): string {
    const isZh = language === 'zh';
    const allCriteriaIds: string[] = [];

    const categoriesList = categories
      .map((category, categoryIndex) => {
        const categoryNumber = categoryIndex + 1;

        const criteriaList = category.criteria
          .map((criterion: any, criterionIndex: number) => {
            const criterionNumber = `${categoryNumber}.${criterionIndex + 1}`;
            allCriteriaIds.push(criterion.id);

            const levelsText = criterion.levels
              ? criterion.levels
                  .map((level: any) =>
                    isZh ? `${level.score}分 - ${level.description}` : `${level.score} points - ${level.description}`
                  )
                  .join(isZh ? '；' : '; ')
              : '';

            return this.dedent(
              isZh
                ? `
                    ${criterionNumber} **${criterion.name}** (${criterion.maxScore || 0} 分)
                       ID: "${criterion.id}" ← 請在 JSON 中使用此 ID
                       名稱: "${criterion.name}" ← 請在 JSON 的 name 欄位中使用此名稱
                       說明：${criterion.description || '無說明'}
                       ${levelsText ? `評分等級：${levelsText}` : ''}
                `
                : `
                    ${criterionNumber} **${criterion.name}** (${criterion.maxScore || 0} points)
                       ID: "${criterion.id}" ← Use this exact ID in JSON
                       Name: "${criterion.name}" ← Use this exact name in JSON.name
                       Description: ${criterion.description || 'No description'}
                       ${levelsText ? `Scoring levels: ${levelsText}` : ''}
                `
            ).trim();
          })
          .join('\n\n   ');

        return this.dedent(
          isZh
            ? `
                ### ${categoryNumber}. ${category.name} 類別
                
                ${criteriaList}
            `
            : `
                ### ${categoryNumber}. ${category.name} Category

                ${criteriaList}
            `
        ).trim();
      })
      .join('\n\n');

    const criteriaIds = allCriteriaIds.map((id) => `"${id}"`).join(', ');

    return isZh
      ? `${categoriesList}

**重要：** 在 JSON 回應中，"criteriaId" 必須完全匹配上述 ID：${criteriaIds}

**評分要求：** 請按照類別結構理解評分標準的邏輯分組，這將有助於提供更有組織性的評分分析。`
      : `${categoriesList}

**Important:** In the JSON response, "criteriaId" must exactly match one of these IDs: ${criteriaIds}

**Scoring requirement:** Follow the category structure so your analysis stays well-organized.`;
  }


  private static getSimpleOutputFormat(language: 'zh' | 'en' = 'en'): string {
    // Linus Principle: Single Responsibility
    // The JSON Schema in gemini-simple.server.ts enforces structure (minItems, maxItems, required fields)
    // This prompt only guides content quality, not structure
    return this.dedent(language === 'zh'
      ? `
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

            5. **對練問題 (Sparring Questions)**
               - 針對學生表現最弱或最具爭議的 1-2 個評分標準
               - 提出一個具挑戰性的問題，引導學生反思自己的論點
               - 不要直接給出正確答案，而是指出邏輯漏洞或要求更多證據
               - Strategy 應選用：evidence_check (查證), logic_gap (邏輯跳躍), counter_argument (反方觀點) 等

            **確保事項：**
            - 所有字串用雙引號，內容引用用「」
            - 回應為有效的 JSON，可直接解析
            - 為每個評分項目提供詳細 feedback
            - 每個 breakdown 項目都包含完整的 criteriaId、name、score、feedback 四個欄位
        `
      : `
            ## Output Requirements

            Provide detailed grading feedback in valid JSON format. Each scoring item must include:

            **JSON Structure Requirements:**
            - Every item in the breakdown array must include: criteriaId, name, score, feedback
            - Ensure the name field exactly matches the rubric criterion name above

            **Feedback Content Requirements:**

            1. **Evidence and analysis** (roughly 150-200 words)
               - Cite 2-3 specific quotes from student text using quotation marks
               - Explain how each quote relates to the rubric

            2. **Strength explanation** (roughly 100-150 words)
               - Clearly identify what is done particularly well
               - Explain why that performance is strong

            3. **Improvement suggestions** (roughly 100-150 words)
               - Identify specific weak areas
               - Provide 1-2 actionable next steps

            4. **Scoring rationale** (roughly 50-100 words)
               - Summarize overall performance for the criterion
               - Explain why this score is appropriate

            5. **Sparring Questions**
               - Focus on the 1-2 weakest or most debatable criteria
               - Ask one challenging question that prompts reflection
               - Do not provide the direct answer; point out logic gaps or evidence weaknesses
               - Prefer strategies like evidence_check, logic_gap, counter_argument

            **Ensure the following:**
            - All strings use double quotes
            - Response is valid JSON and directly parseable
            - Provide detailed feedback for every criterion
            - Every breakdown item includes criteriaId, name, score, and feedback
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
