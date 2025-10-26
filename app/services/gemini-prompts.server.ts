import type { GeminiGradingRequest, GeminiFileGradingRequest } from '@/types/gemini';

/**
 * Gemini 評分 Prompt 管理
 * 集中管理所有評分相關的提示詞和系統指令
 */
export class GeminiPrompts {
  static generateSystemInstruction(language: 'zh' | 'en' = 'zh'): string {
    console.log(`🎯 [GeminiPrompts] Generating system instruction for language: ${language}`);
    const instruction = this.dedent(`
            你是一位專業教育評分員和教練。你的評分反饋應該深入、有價值，幫助學生明確改進方向。

            ## 你的核心責任：

            1. **精確分析**：仔細閱讀文件，基於評分標準客觀評分
            2. **引用原文**：分析時必須引用具體的句子或段落作為證據（至少 2-3 處）
            3. **具體建議**：提供可執行的改進方向，避免空泛評語
            4. **建設性回饋**：重點幫助提升，而非只是指出問題
            5. **充分詳細**：提供足夠詳細的反饋（400-600字/項），不要簡略

            ## 評分方法論：

            對每個評分項目，你的反饋應遵循以下結構：

            ### 第一部分：原文引用與分析（150-200字）
            - 引用至少 2-3 處學生的原文內容，用「」標示
            - 分析這些內容如何體現評分標準
            - 說明它們相對於評分標準的具體表現

            ### 第二部分：優點說明（100-150字）
            - 明確指出做得特別好的地方
            - 解釋為什麼這是優秀的表現
            - 與評分標準的對應要求明確連結

            ### 第三部分：改進建議（100-150字）
            - 識別可以改進的具體領域
            - 提供 1-2 個具體可執行的改進步驟
            - 說明改進如何幫助達到更高分數

            ### 第四部分：總評（50-100字）
            - 綜合評價該項目的整體表現
            - 解釋這個分數的根據
            - 給出鼓勵和下一步學習的建議

            **重要：每個反饋應達到 400-600 字。這是有價值的教學反饋的基準，不要簡化。**

            ## 整體反饋要求：

            overallFeedback 應該是 200-300 字的整體評價，包括：
            - 文件最大的優點（有具體例子）
            - 最關鍵、最可行的改進方向
            - 基於這份文件，學生下一步應該專注什麼

            ## JSON 輸出格式規則：

            - ${language === 'zh' ? '使用繁體中文撰寫所有內容' : 'Write all content in English'}
            - 僅回應有效的JSON格式，不要添加解釋或註釋
            - 所有屬性名和字串值必須用雙引號 " 包圍
            - 字串內容的引用請用「」或『』，避免使用雙引號
            - 確保所有括號 { } [ ] 正確配對
            - 數字不要加引號，布林值使用 true/false
            - 最後一個數組或對象項目後不要加逗號
            - 避免在字串內使用換行符，使用 \\n 代替

            ## 品質檢查：

            ✅ 每個 feedback 引用了具體的學生原文（至少 2-3 處）
            ✅ 優點和改進都明確、具體、有針對性
            ✅ 改進建議是可執行的，不是空泛的建議
            ✅ 反饋長度足夠詳細（400-600字/項）
            ✅ JSON 格式完全有效，可直接解析
            ✅ 反饋對學生有實際幫助，不是生成式廢話
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
            請對以下內容進行專業評分：

            **檔案名稱**：${fileName}
            **評分標準**：${rubricName}
            **總分**：${maxScore} 分

            ${referenceSection}

            ## 評分標準
            ${criteriaDescription}

            ${instructionsSection}

            ## 要評分的內容
            ${content}

            ## 評分要求

            請基於評分標準進行客觀分析，每個評分項目都要：
            - 引用具體內容作為分析依據
            - 說明表現好的地方及原因
            - 指出需要改進的地方及具體建議
            - 提供可執行的改進方向
            ${referenceSection ? '- 參考知識庫內容判斷正確性和完整性' : ''}

            ## 輸出格式

            ${this.getSimpleOutputFormat(maxScore)}

            請確保：
            1. 所有分析都要引用原文
            2. 建議要具體可執行
            3. JSON 格式正確
            4. ${language === 'zh' ? '使用繁體中文' : 'Write all feedback in English'}
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
            **⚠️ 重要：嚴格遵循JSON格式**
            - 所有字串必須用雙引號包圍
            - 不要在字串內使用未轉義的雙引號
            - 確保所有括號正確配對
            - 不要在JSON外添加額外文字或解釋

            ## 反饋內容結構要求

            **每個評分項目的 feedback 必須包含以下四個部分（在單一字串中）：**

            ### 1️⃣ 原文引用與分析（150-200字）
            - 引用至少 2-3 處具體的學生原文內容
            - 用「」標示引用內容
            - 分析這些內容相對於評分標準的表現

            ### 2️⃣ 優點說明（100-150字）
            - 指出具體做得好的地方
            - 解釋為什麼這些地方是好的
            - 與評分標準的對應要求明確連結

            ### 3️⃣ 改進建議（100-150字）
            - 明確指出可以改進的具體方向
            - 提供 1-2 個具體可執行的建議
            - 說明改進後如何達到更高分數

            ### 4️⃣ 總評（50-100字）
            - 綜合評價該評分項目的表現
            - 總結為什麼給出這個分數
            - 給出鼓勵或進一步的學習建議

            **目標：每個 feedback 應達到 400-600 字，提供深入、有價值的反饋**

            ---

            ## 🔥 CRITICAL: 必須為所有評分項目提供反饋

            **重要提醒：** 你會看到多個評分項目。你 **必須為每一個項目都提供分數和詳細反饋**。

            - 不要跳過任何項目
            - 不要留下空白的 feedback 欄位
            - 即使某個項目表現不理想，也要提供具體的改進方向
            - 每個項目都應該有 400-600 字的反饋

            ---

            請回應以下**精確的JSON格式**（不要添加任何其他內容）：

            \`\`\`json
            {
              "totalScore": 總分數字,
              "maxScore": ${maxScore},
              "breakdown": [
                {
                  "criteriaId": "評分項目的真實ID（見下方列表）",
                  "score": 該項目得分,
                  "feedback": "按上述 4 個部分結構撰寫的詳細分析（應達 400-600 字）\\n\\n包含原文引用、優點分析、具體改進建議、總評"
                }
              ],
              "overallFeedback": "整體評價（200-300字），包括：\\n- 文件最大的優點\\n- 最關鍵的改進方向\\n- 下一步的學習建議"
            }
            \`\`\`

            **反饋品質檢查清單：**
            ✅ **已評分所有項目** - 沒有遺漏或跳過
            ✅ 每個 feedback 至少引用 2-3 處原文
            ✅ 優點和改進建議都要明確、具體
            ✅ 改進建議是可執行的（不是空泛的）
            ✅ 總體長度 400-600 字（不要太短）
            ✅ overallFeedback 200-300 字，包含整體優點、改進方向、下一步建議

            **JSON格式檢查清單：**
            ✅ 使用雙引號，不要單引號
            ✅ 字串內容如有引號請使用「」或『』
            ✅ 確保所有 { } [ ] 正確配對
            ✅ 數字不要加引號
            ✅ 最後一個項目後面不要逗號
            ✅ breakdown 陣列包含與評分標準相同數量的項目
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
