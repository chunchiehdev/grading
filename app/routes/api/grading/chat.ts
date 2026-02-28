import { type ActionFunctionArgs } from 'react-router';
import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import logger from '@/utils/logger';
import { getKeyHealthTracker } from '@/services/gemini-key-health.server';
import { db } from '@/lib/db.server';
import { getServerLocale } from '@/localization/i18n';

const VLLM_CONFIG = {
  baseURL: process.env.VLLM_BASE_URL || '',
  modelName: process.env.VLLM_MODEL_NAME || '',
  apiKey: process.env.VLLM_API_KEY || '',
  timeoutMs: 1500,
};

function parseEnvInt(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return fallback;
  if (parsed < min) return min;
  if (parsed > max) return max;
  return parsed;
}

const CHAT_CONTENT_LIMITS = {
  studentMaxChars: parseEnvInt('CHAT_STUDENT_CONTENT_MAX_CHARS', 3000, 500, 30000),
  referenceMaxCharsPerFile: parseEnvInt('CHAT_REFERENCE_CONTENT_MAX_CHARS', 5000, 500, 50000),
  referenceMaxFiles: parseEnvInt('CHAT_REFERENCE_FILES_MAX_COUNT', 5, 1, 30),
  referenceTotalMaxChars: parseEnvInt('CHAT_TOTAL_REFERENCE_MAX_CHARS', 15000, 1000, 100000),
};

function normalizeLanguage(language?: string): 'zh' | 'en' {
  if (!language) return 'zh';
  return language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { messages: rawMessages, context } = await request.json() as { 
      messages: any[],
      context?: {
        rubricCriterionName?: string;
        rubricCriterionDesc?: string;
        rubricCriterionLevels?: Array<{ score: number; description: string }>;
        sparringQuestion?: {
          ai_hidden_reasoning: string;
          question: string;
          target_quote: string;
        };
        currentKemberLevel?: {
          level: number;
          label: string;
          desc: string;
        } | null;
        language?: string;
        fileId?: string;
        assignmentId?: string;
        gradingSessionId?: string;
      }
    };

    const requestLocale = getServerLocale(request);
    const uiLanguage = normalizeLanguage(context?.language || requestLocale);

    // Convert UIMessage format (parts) to CoreMessage format (content) for streamText
    const messages = rawMessages.map((msg: any) => {
      // If message already has content as string, use it directly
      if (typeof msg.content === 'string') {
        return { role: msg.role, content: msg.content };
      }
      // If message has parts (UIMessage format from DefaultChatTransport), extract text
      if (msg.parts && Array.isArray(msg.parts)) {
        const textContent = msg.parts
          .filter((p: any) => p.type === 'text')
          .map((p: any) => p.text)
          .join('');
        return { role: msg.role, content: textContent };
      }
      // Fallback
      return { role: msg.role, content: String(msg.content || '') };
    });

    let model: ReturnType<ReturnType<typeof createOpenAI>['chat']> | ReturnType<ReturnType<typeof createGoogleGenerativeAI>> | null = null;
    let provider: 'vllm' | 'gemini' = 'vllm';
    let selectedKeyId: string | null = null;
    let selectedModelName = VLLM_CONFIG.modelName;

    const selectGeminiModel = async () => {
      const healthTracker = getKeyHealthTracker();
      const availableKeyIds = ['1'];
      if (process.env.GEMINI_API_KEY2) availableKeyIds.push('2');
      if (process.env.GEMINI_API_KEY3) availableKeyIds.push('3');

      const keyId = await healthTracker.selectBestKey(availableKeyIds);
      if (!keyId) {
        throw new Error('vLLM unavailable and all Gemini API keys are currently throttled or unavailable');
      }

      const keyMap: Record<string, string | undefined> = {
        '1': process.env.GEMINI_API_KEY,
        '2': process.env.GEMINI_API_KEY2,
        '3': process.env.GEMINI_API_KEY3,
      };

      const apiKey = keyMap[keyId];
      if (!apiKey) {
        throw new Error(`Gemini API key ${keyId} is missing`);
      }

      const google = createGoogleGenerativeAI({ apiKey });
      provider = 'gemini';
      selectedKeyId = keyId;
      selectedModelName = 'gemini-2.5-flash';
      model = google('gemini-2.5-flash');
    };

    if (VLLM_CONFIG.baseURL && VLLM_CONFIG.modelName) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), VLLM_CONFIG.timeoutMs);
        const healthResponse = await fetch(`${VLLM_CONFIG.baseURL}/models`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${VLLM_CONFIG.apiKey}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (healthResponse.ok) {
          const openai = createOpenAI({
            baseURL: VLLM_CONFIG.baseURL,
            apiKey: VLLM_CONFIG.apiKey,
          });
          model = openai.chat(VLLM_CONFIG.modelName);
          provider = 'vllm';
        } else {
          logger.warn(
            {
              status: healthResponse.status,
            },
            '[Chat API] vLLM health check failed, fallback to Gemini',
          );
          await selectGeminiModel();
        }
      } catch (error) {
        logger.warn(
          {
            error: error instanceof Error ? error.message : String(error),
          },
          '[Chat API] vLLM unavailable, fallback to Gemini',
        );
        await selectGeminiModel();
      }
    } else {
      logger.warn('[Chat API] Missing VLLM_BASE_URL or VLLM_MODEL_NAME, using Gemini fallback');
      await selectGeminiModel();
    }

    if (!model) {
      throw new Error('No available model provider for chat');
    }

    // 提取背景與等級資訊
    const rubricCriterionName = context?.rubricCriterionName || '批判性反思';
    const rubricCriterionDesc = context?.rubricCriterionDesc || '';
    const rubricCriterionLevels = context?.rubricCriterionLevels || [
      { score: 4, description: "批判性地檢視既有知識，質疑假設，並因經驗而提出新觀點。" },
      { score: 3, description: "主動且謹慎地思考既有知識，並能把經驗轉化為對知識的新理解。" },
      { score: 2, description: "能使用既有知識，但未嘗試去評估/鑑定它；展現了理解，但沒有連結到個人其他經驗或反應。" },
      { score: 1, description: "自動/表面的回應，幾乎沒有意識/深思熟慮，或未參考既有知識；沒有嘗試去理解就直接回應。" }
    ];

    const levelsText = rubricCriterionLevels
      .map((l) => `${uiLanguage === 'zh' ? '等級' : 'Level'} ${l.score}: ${l.description}`)
      .join('\n');

    const gradedLevelRef = context?.currentKemberLevel
      ? uiLanguage === 'zh'
        ? `（系統初步評分參考：${context.currentKemberLevel.label}，但請你根據以下作業內容自行判斷）`
        : ` (Initial system estimate: ${context.currentKemberLevel.label}. You should still judge independently from the assignment content below.)`
      : '';

    const responseLanguageInstruction = uiLanguage === 'zh'
      ? '【回覆語言】你必須全程使用繁體中文回覆學生。不要切換到英文。'
      : '[Response language] You must reply in English for the entire conversation. Do not switch to Chinese.';

    const kemberLevelHint = uiLanguage === 'zh'
      ? `
【你的任務：評估學生的 Kember Level】
請你仔細閱讀上方「學生完整作業內容」，根據「${rubricCriterionName} 的標準」中的四個等級描述，自行判斷學生目前的反思深度落在哪個等級 ${gradedLevelRef}。

評估時請注意：
- 學生有沒有只是「同意」課文觀點，而沒有說出「為什麼這樣想」？（L1 特徵）
- 學生有沒有提到自己的個人經驗，但只是描述發生了什麼，沒有連結到知識或理論？（L2 特徵）
- 學生有沒有把個人經驗與課本知識建立連結，說明「這個經驗讓我對 X 有了新的理解」？（L3 特徵）
- 學生有沒有質疑既有假設，提出為什麼舊觀點可能有問題，並說明自己觀點的轉變？（L4 特徵）

在 Stage 2 中，請明確告訴學生你評估他目前落在哪個 Level（例如「我覺得你現在大概是 L2 的思維...」），以及要往上一個 Level 需要的具體轉變。
`
      : `
[Your task: assess the student's Kember Level]
Read the student's full assignment content above and determine the current reflection level using the four level descriptions in "${rubricCriterionName}".${gradedLevelRef}

When assessing, pay attention to:
- Is the student only agreeing with ideas without explaining why? (L1)
- Does the student only describe personal experience without linking to concepts or theory? (L2)
- Does the student connect personal experience with course knowledge to form new understanding? (L3)
- Does the student challenge assumptions and explain a shift in perspective? (L4)

In Stage 2, explicitly tell the student which level they are currently showing (for example, "I think you're currently around L2...") and what concrete change is needed to move up one level.
`;


    const sparContext = context?.sparringQuestion
      ? uiLanguage === 'zh'
        ? `
【AI 原本的觀察】：${context.sparringQuestion.ai_hidden_reasoning}
【針對作業這句話】：${context.sparringQuestion.target_quote}
【最初提問】：${context.sparringQuestion.question}
`
        : `
[AI initial observation]: ${context.sparringQuestion.ai_hidden_reasoning}
[Target quote from assignment]: ${context.sparringQuestion.target_quote}
[Opening question]: ${context.sparringQuestion.question}
`
      : '';

    logger.info({
      studentMaxChars: CHAT_CONTENT_LIMITS.studentMaxChars,
      referenceMaxCharsPerFile: CHAT_CONTENT_LIMITS.referenceMaxCharsPerFile,
      referenceMaxFiles: CHAT_CONTENT_LIMITS.referenceMaxFiles,
      referenceTotalMaxChars: CHAT_CONTENT_LIMITS.referenceTotalMaxChars,
    }, '[Chat API] Using chat content limits');

    // 取得學生完整作業內容（透過 fileId 查 UploadedFile.parsedContent）
    let studentContentSection = '';
    if (context?.fileId) {
      try {
        const uploadedFile = await db.uploadedFile.findUnique({
          where: { id: context.fileId },
          select: { parsedContent: true },
        });
        if (uploadedFile?.parsedContent) {
          const truncated = uploadedFile.parsedContent.length > CHAT_CONTENT_LIMITS.studentMaxChars;
          const content = truncated
            ? uploadedFile.parsedContent.substring(0, CHAT_CONTENT_LIMITS.studentMaxChars) + (uiLanguage === 'zh' ? '\n...（內容已截取）' : '\n...(content truncated)')
            : uploadedFile.parsedContent;
          studentContentSection = uiLanguage === 'zh'
            ? `\n【學生完整作業內容】\n${content}\n`
            : `\n[Student full assignment content]\n${content}\n`;
          logger.info(
            {
              fileId: context.fileId,
              contentLength: uploadedFile.parsedContent.length,
              truncated,
            },
            '[Chat API] Loaded student content',
          );
        }
      } catch (err) {
        logger.warn({ fileId: context.fileId, error: String(err) }, '[Chat API] Failed to load student content');
      }
    }

    // 取得作業要求與參考資料（透過 assignmentId 查 AssignmentArea）
    let assignmentDescSection = '';
    let referenceSection = '';
    if (context?.assignmentId) {
      try {
        const assignment = await db.assignmentArea.findUnique({
          where: { id: context.assignmentId },
          select: {
            name: true,
            description: true,
            referenceFileIds: true,
            customGradingPrompt: true,
          },
        });
        if (assignment) {
          // 作業描述
          if (assignment.description) {
            assignmentDescSection = uiLanguage === 'zh'
              ? `\n【老師指派的作業要求】\n作業名稱：${assignment.name}\n${assignment.description}\n`
              : `\n[Teacher assignment requirements]\nAssignment: ${assignment.name}\n${assignment.description}\n`;
          }
          // 自訂評分指示
          if (assignment.customGradingPrompt) {
            assignmentDescSection += uiLanguage === 'zh'
              ? `\n【老師的額外指示】\n${assignment.customGradingPrompt}\n`
              : `\n[Teacher additional instructions]\n${assignment.customGradingPrompt}\n`;
          }
          // 參考資料
          if (assignment.referenceFileIds) {
            try {
              const refFileIds: string[] = JSON.parse(assignment.referenceFileIds);
              if (refFileIds.length > 0) {
                const refFiles = await db.uploadedFile.findMany({
                  where: { id: { in: refFileIds } },
                  select: { fileName: true, parsedContent: true },
                });
                const limitedRefFiles = refFiles
                  .filter(f => f.parsedContent)
                  .slice(0, CHAT_CONTENT_LIMITS.referenceMaxFiles);

                let totalReferenceChars = 0;
                let truncatedByTotalCount = 0;
                const refContents = limitedRefFiles
                  .map(f => {
                    const raw = f.parsedContent!;
                    const remainingBudget = CHAT_CONTENT_LIMITS.referenceTotalMaxChars - totalReferenceChars;

                    if (remainingBudget <= 0) {
                      truncatedByTotalCount += 1;
                      return null;
                    }

                    const perFileBudget = Math.min(
                      CHAT_CONTENT_LIMITS.referenceMaxCharsPerFile,
                      remainingBudget,
                    );
                    const truncated = raw.length > perFileBudget;
                    const content = truncated
                      ? raw.substring(0, perFileBudget) + (uiLanguage === 'zh' ? '\n...（參考資料已截取）' : '\n...(reference truncated)')
                      : raw;

                    totalReferenceChars += content.length;
                    return `[${f.fileName}]\n${content}`;
                  })
                  .filter((v): v is string => Boolean(v));
                if (refContents.length > 0) {
                  referenceSection = uiLanguage === 'zh'
                    ? `\n【參考資料】\n${refContents.join('\n\n---\n\n')}\n`
                    : `\n[Reference materials]\n${refContents.join('\n\n---\n\n')}\n`;
                  logger.info(
                    {
                      assignmentId: context.assignmentId,
                      totalReferenceFiles: refFileIds.length,
                      loadedReferenceFiles: limitedRefFiles.length,
                      refCount: refContents.length,
                      truncatedByFileLimit: Math.max(0, refFileIds.length - limitedRefFiles.length),
                      truncatedByTotalLimit: truncatedByTotalCount,
                      totalReferenceChars,
                    },
                    '[Chat API] Loaded reference materials',
                  );
                }
              }
            } catch (parseErr) {
              logger.warn({ error: String(parseErr) }, '[Chat API] Failed to parse referenceFileIds');
            }
          }
        }
      } catch (err) {
        logger.warn(
          { assignmentId: context.assignmentId, error: String(err) },
          '[Chat API] Failed to load assignment context',
        );
      }
    }

    // ============================================================================
    // THE 3-STEP Socratic Guidance System Prompt
    // ============================================================================
    const systemPrompt = `
    ${responseLanguageInstruction}

    你是一位採用蘇格拉底「認知師徒制」方法的教學助理。
    你的目標是透過「多輪對話」，引導學生完成「${rubricCriterionName}」這項能力的自我反思與成長。
      
    【作業背景與最初意圖】
    ${sparContext}
    ${assignmentDescSection}
    ${studentContentSection}
    ${referenceSection}
      
    【評分維度：${rubricCriterionName} 的標準】
    ${rubricCriterionDesc ? `${rubricCriterionDesc}\n` : ''}${levelsText}
    ${kemberLevelHint}
      
    【你的對話指導原則：三步引導法 (3-Stage Guidance)】
    為了避免一次給出太多資訊或直接給答案，你必須按照以下階段來引導對話。
    請根據上面的 \`messages\` 歷史紀錄來判斷我們現在處於哪個階段，並執行對應策略：
      
    ---
    ### 🔵 Stage 1: 確認目標 (Goal Confirmation)
    **觸發時機：** 這是第一輪或是前幾輪對話，學生還不太懂你的問題，或者回答離題。
    **你的行動：**
    1. 澄清題意：「其實我想問的是...」
    2. 分解問題：把大問題拆成具體小問題，例如「你提到的 X，跟你過去的經驗有什麼關係？」
    3. **千萬不要：** 直接告訴他正確層級或完美答案。
      
    ---
    ### 🟡 Stage 2: 評估現狀 (Assess Current State)
    **觸發時機：** 學生已經針對問題給出了具體的想法或反思內容。
    **你的行動：**
    1. 根據上方的「評分標準」，在內心判斷他現在落在哪一個「等級」。
    2. 直接指出他做得好的地方：「我看到你已經能把經驗和課本理論連結起來了（展現等級 3 的行為）...」
    3. 溫和指出瓶頸：「不過在『挑戰既有假設』這部分，你的描述還停留在...」
    4. **千萬不要：** 直接改寫他的句子。
      
    ---
    ### 🟢 Stage 3: 下一步行動建議 (Suggest Next Step / Scaffolding)
    **觸發時機：** 學生已經知道自己的不足，或者主動詢問「那我該怎麼改」。
    **你的行動：**
    1. 給予「鷹架 (Scaffolding)」：提供具體的思考方向或「修改前 vs 預期修改後」的比較範例。
    2. 開放性結尾：「如果把重點放在 XXX，你覺得這句可以怎麼重寫會更深入？」
    3. 鼓勵學生自己動手試試看。
    ---
      
    【語言與語氣設定】
    1. **口語化、溫暖、有同理心**。不要像機器人，像一個用心指導的學長姐。
    2. 每次回覆 **最多 3-5 句話**。對話要簡潔，留空間給學生輸入。
    3. 絕對 **不要** 輸出「我判斷現在是 Stage 2」這種內心思考，直接對學生講話。
    `;

    // ── Debug: 輸出完整傳給模型的內容 ──────────────────────────────────
    logger.info('[Chat API] ===== FULL PAYLOAD TO MODEL =====');
    logger.info(`[Chat API] UI language: ${uiLanguage}`);
    logger.info('[Chat API] SYSTEM PROMPT:\n' + systemPrompt);
    logger.info('[Chat API] MESSAGES (' + messages.length + ' 條):\n' + JSON.stringify(messages, null, 2));
    logger.info(`[Chat API] MODEL: ${selectedModelName} | provider: ${provider} | temperature: 0.7 | maxOutputTokens: 2048`);
    logger.info('[Chat API] ===============================');

    // 啟動串流
    const result = await streamText({
      model,
      system: systemPrompt,
      messages: messages, // History of the conversation!
      temperature: 0.7,
      maxOutputTokens: 2048,
      onFinish: async (completion) => {
        logger.info(
          {
            usage: completion.usage,
            model: selectedModelName,
            provider,
            keyId: selectedKeyId,
          },
          '[Chat API] Stream finished',
        );
        if (provider === 'gemini' && selectedKeyId) {
          const healthTracker = getKeyHealthTracker();
          await healthTracker.recordSuccess(selectedKeyId, 100);
        }
      }
    });

    return result.toTextStreamResponse();
  } catch (error) {
    logger.error({ error: String(error) }, 'Chat endpoint error');
    return new Response(JSON.stringify({ error: String(error) }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
