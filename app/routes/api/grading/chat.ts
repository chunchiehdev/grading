import { type ActionFunctionArgs } from 'react-router';
import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import logger from '@/utils/logger';
import { getKeyHealthTracker } from '@/services/gemini-key-health.server';
import { db } from '@/lib/db.server';

// Configure the Vercel AI SDK Google provider
const createProvider = (apiKey: string) => createGoogleGenerativeAI({ apiKey });

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
        fileId?: string;
        assignmentId?: string;
        gradingSessionId?: string;
      }
    };

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

    // 取得健康的 API Key
    const healthTracker = getKeyHealthTracker();
    const availableKeyIds = ['1'];
    if (process.env.GEMINI_API_KEY2) availableKeyIds.push('2');
    if (process.env.GEMINI_API_KEY3) availableKeyIds.push('3');

    const selectedKeyId = await healthTracker.selectBestKey(availableKeyIds);
    if (!selectedKeyId) {
      throw new Error('All Gemini API keys are currently throttled or unavailable');
    }

    const keyMap: Record<string, string | undefined> = {
      '1': process.env.GEMINI_API_KEY,
      '2': process.env.GEMINI_API_KEY2,
      '3': process.env.GEMINI_API_KEY3,
    };

    const apiKey = keyMap[selectedKeyId];
    if (!apiKey) throw new Error('Selected API key is missing');
    
    const google = createProvider(apiKey);
    const model = google('gemini-2.5-flash');

    // 提取背景與等級資訊
    const rubricCriterionName = context?.rubricCriterionName || '批判性反思';
    const rubricCriterionDesc = context?.rubricCriterionDesc || '';
    const rubricCriterionLevels = context?.rubricCriterionLevels || [
      { score: 4, description: "批判性地檢視既有知識，質疑假設，並因經驗而提出新觀點。" },
      { score: 3, description: "主動且謹慎地思考既有知識，並能把經驗轉化為對知識的新理解。" },
      { score: 2, description: "能使用既有知識，但未嘗試去評估/鑑定它；展現了理解，但沒有連結到個人其他經驗或反應。" },
      { score: 1, description: "自動/表面的回應，幾乎沒有意識/深思熟慮，或未參考既有知識；沒有嘗試去理解就直接回應。" }
    ];

    const levelsText = rubricCriterionLevels.map(l => `等級 ${l.score}：${l.description}`).join('\n');

    const gradedLevelRef = context?.currentKemberLevel
      ? `（系統初步評分參考：${context.currentKemberLevel.label}，但請你根據以下作業內容自行判斷）`
      : '';

    const kemberLevelHint = `
【你的任務：評估學生的 Kember Level】
請你仔細閱讀上方「學生完整作業內容」，根據「${rubricCriterionName} 的標準」中的四個等級描述，自行判斷學生目前的反思深度落在哪個等級 ${gradedLevelRef}。

評估時請注意：
- 學生有沒有只是「同意」課文觀點，而沒有說出「為什麼這樣想」？（L1 特徵）
- 學生有沒有提到自己的個人經驗，但只是描述發生了什麼，沒有連結到知識或理論？（L2 特徵）
- 學生有沒有把個人經驗與課本知識建立連結，說明「這個經驗讓我對 X 有了新的理解」？（L3 特徵）
- 學生有沒有質疑既有假設，提出為什麼舊觀點可能有問題，並說明自己觀點的轉變？（L4 特徵）

在 Stage 2 中，請明確告訴學生你評估他目前落在哪個 Level（例如「我覺得你現在大概是 L2 的思維...」），以及要往上一個 Level 需要的具體轉變。
`;


    const sparContext = context?.sparringQuestion ? `
【AI 原本的觀察】：${context.sparringQuestion.ai_hidden_reasoning}
【針對作業這句話】：${context.sparringQuestion.target_quote}
【最初提問】：${context.sparringQuestion.question}
` : '';

    // 取得學生完整作業內容（透過 fileId 查 UploadedFile.parsedContent）
    const MAX_CONTENT_LENGTH = 3000;
    let studentContentSection = '';
    if (context?.fileId) {
      try {
        const uploadedFile = await db.uploadedFile.findUnique({
          where: { id: context.fileId },
          select: { parsedContent: true },
        });
        if (uploadedFile?.parsedContent) {
          const truncated = uploadedFile.parsedContent.length > MAX_CONTENT_LENGTH;
          const content = truncated
            ? uploadedFile.parsedContent.substring(0, MAX_CONTENT_LENGTH) + '\n...（內容已截取）'
            : uploadedFile.parsedContent;
          studentContentSection = `\n【學生完整作業內容】\n${content}\n`;
          logger.info('[Chat API] Loaded student content', {
            fileId: context.fileId,
            contentLength: uploadedFile.parsedContent.length,
            truncated,
          });
        }
      } catch (err) {
        logger.warn('[Chat API] Failed to load student content', { fileId: context.fileId, error: String(err) });
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
            assignmentDescSection = `\n【老師指派的作業要求】\n作業名稱：${assignment.name}\n${assignment.description}\n`;
          }
          // 自訂評分指示
          if (assignment.customGradingPrompt) {
            assignmentDescSection += `\n【老師的額外指示】\n${assignment.customGradingPrompt}\n`;
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
                const refContents = refFiles
                  .filter(f => f.parsedContent)
                  .map(f => {
                    const content = f.parsedContent!.length > 5000
                      ? f.parsedContent!.substring(0, 5000) + '\n...（參考資料已截取）'
                      : f.parsedContent!;
                    return `[${f.fileName}]\n${content}`;
                  });
                if (refContents.length > 0) {
                  referenceSection = `\n【參考資料】\n${refContents.join('\n\n---\n\n')}\n`;
                  logger.info('[Chat API] Loaded reference materials', {
                    assignmentId: context.assignmentId,
                    refCount: refContents.length,
                  });
                }
              }
            } catch (parseErr) {
              logger.warn('[Chat API] Failed to parse referenceFileIds', { error: String(parseErr) });
            }
          }
        }
      } catch (err) {
        logger.warn('[Chat API] Failed to load assignment context', { assignmentId: context.assignmentId, error: String(err) });
      }
    }

    // ============================================================================
    // THE 3-STEP Socratic Guidance System Prompt
    // ============================================================================
    const systemPrompt = `
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
    logger.info('[Chat API] SYSTEM PROMPT:\n' + systemPrompt);
    logger.info('[Chat API] MESSAGES (' + messages.length + ' 條):\n' + JSON.stringify(messages, null, 2));
    logger.info('[Chat API] MODEL: gemini-2.5-flash | temperature: 0.7 | maxOutputTokens: 1024');
    logger.info('[Chat API] ===============================');

    // 啟動串流
    const result = await streamText({
      model,
      system: systemPrompt,
      messages: messages, // History of the conversation!
      temperature: 0.7,
      maxOutputTokens: 2048,
      onFinish: async (completion) => {
        logger.info('[Chat API] Stream finished', { 
            usage: completion.usage, 
            keyId: selectedKeyId
        });
        await healthTracker.recordSuccess(selectedKeyId, 100);
      }
    });

    return result.toTextStreamResponse();
  } catch (error) {
    logger.error('Chat endpoint error', error);
    return new Response(JSON.stringify({ error: String(error) }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
