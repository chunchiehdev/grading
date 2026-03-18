import { type ActionFunctionArgs } from 'react-router';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { db } from '@/lib/db.server';
import logger from '@/utils/logger';
import { getKeyHealthTracker } from '@/services/gemini-key-health.server';
import { getServerLocale } from '@/localization/i18n';

interface ConvergeContext {
  rubricCriterionName?: string;
  rubricCriterionDesc?: string;
  rubricCriterionLevels?: Array<{ score: number; description: string }>;
  sparringQuestion?: {
    ai_hidden_reasoning?: string;
    question?: string;
    target_quote?: string;
  };
  language?: string;
  fileId?: string;
  assignmentId?: string;
  gradingSessionId?: string;
}

interface ConvergeMessage {
  role?: string;
  content?: string;
  parts?: Array<{ type?: string; text?: string }>;
}

function normalizeLanguage(language?: string): 'zh' | 'en' {
  if (!language) return 'zh';
  return language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

function extractMessageText(message: ConvergeMessage): string {
  if (typeof message.content === 'string' && message.content.length > 0) {
    return message.content;
  }

  if (!Array.isArray(message.parts)) return '';

  return message.parts
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text || '')
    .join('');
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = (await request.json()) as {
      messages?: ConvergeMessage[];
      context?: ConvergeContext;
    };

    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const context = body.context || {};
    const requestLocale = getServerLocale(request);
    const uiLanguage = normalizeLanguage(context.language || requestLocale);

    const messages = rawMessages
      .map((msg) => ({ role: msg.role || 'user', content: extractMessageText(msg).trim() }))
      .filter((msg) => msg.content.length > 0);

    const transcript = messages
      .map((msg) => `${msg.role === 'assistant' ? 'AI' : 'Student'}: ${msg.content}`)
      .join('\n\n');

    let studentContentSection = '';
    if (context.fileId) {
      const uploadedFile = await db.uploadedFile.findUnique({
        where: { id: context.fileId },
        select: { parsedContent: true },
      });
      if (uploadedFile?.parsedContent) {
        const maxChars = 6000;
        const content = uploadedFile.parsedContent.length > maxChars
          ? `${uploadedFile.parsedContent.substring(0, maxChars)}\n...`
          : uploadedFile.parsedContent;
        studentContentSection = uiLanguage === 'zh'
          ? `【學生原始作業】\n${content}`
          : `[Student original assignment]\n${content}`;
      }
    }

    let assignmentSection = '';
    if (context.assignmentId) {
      const assignment = await db.assignmentArea.findUnique({
        where: { id: context.assignmentId },
        select: { name: true, description: true, customGradingPrompt: true },
      });
      if (assignment) {
        assignmentSection = uiLanguage === 'zh'
          ? `【作業要求】\n作業名稱：${assignment.name}\n${assignment.description || ''}\n${assignment.customGradingPrompt || ''}`
          : `[Assignment requirements]\nTitle: ${assignment.name}\n${assignment.description || ''}\n${assignment.customGradingPrompt || ''}`;
      }
    }

    const rubricLevels = (context.rubricCriterionLevels || [])
      .map((level) => `${uiLanguage === 'zh' ? '等級' : 'Level'} ${level.score}: ${level.description}`)
      .join('\n');

    const rubricSection = uiLanguage === 'zh'
      ? `【評分向度】\n名稱：${context.rubricCriterionName || '批判性反思'}\n${context.rubricCriterionDesc || ''}\n${rubricLevels}`
      : `[Rubric criterion]\nName: ${context.rubricCriterionName || 'Critical Reflection'}\n${context.rubricCriterionDesc || ''}\n${rubricLevels}`;

    const sparringSection = uiLanguage === 'zh'
      ? `【對練題目】\n${context.sparringQuestion?.question || ''}\n【目標引文】\n${context.sparringQuestion?.target_quote || ''}`
      : `[Sparring prompt]\n${context.sparringQuestion?.question || ''}\n[Target quote]\n${context.sparringQuestion?.target_quote || ''}`;

    const systemPrompt = uiLanguage === 'zh'
      ? `你是反思教練。你的任務是輸出一份「可執行修改建議」，幫學生知道原文哪句要改，以及可參考的改寫句。

必須遵守：
1) 一定要引用學生原始作業中的原文句子，不可只講抽象建議。
2) 一定要提供「主建議 + 次建議」：
   - 文章較短時至少 2 組建議，長文時給 3 組建議。
   - 每組建議都要有：原文片段（可短引文）、問題點、建議改寫句、為什麼更好。
3) 【建議改寫方向】段落請用清楚編號：
   - 建議 1（主建議）
   - 建議 2（次建議）
   - 建議 3（可選，長文時）
4) 每組建議避免一句帶過，至少 3-5 句，內容要具體可直接修改。
5) 一定要問學生是否採納，並提醒學生可在介面上用按鈕選擇採納或保留。
6) 只輸出下面四段，標題文字必須完全一致：
【最優先修改句子】
【為什麼要改】
【建議改寫方向】
【你要不要改】`
      : `You are a reflection coach. Output an actionable revision note that tells the student exactly which sentence to revise and a concrete suggested revision sentence.

Rules:
1) You must quote text from the student's original assignment.
2) You must provide "primary + secondary" suggestions:
   - At least 2 suggestion sets for short texts; 3 for longer texts.
   - Each set must include: quoted fragment, diagnosed issue, a suggested revised sentence, and why it improves quality.
3) In [Suggested revision direction], use numbered blocks:
   - Suggestion 1 (primary)
   - Suggestion 2 (secondary)
   - Suggestion 3 (optional for long text)
4) Do not be brief: each suggestion set should be 3-5 sentences and actionable.
5) You must ask whether the student adopts the revision and remind that they can choose via UI buttons.
6) Output exactly these four sections with exact headings:
[Priority sentence to revise]
[Why revise]
[Suggested revision direction]
[Do you want to revise?]`;

    const userPrompt = [studentContentSection, assignmentSection, rubricSection, sparringSection,
      uiLanguage === 'zh' ? `【對話紀錄】\n${transcript}` : `[Conversation history]\n${transcript}`,
    ].filter(Boolean).join('\n\n');

    const healthTracker = getKeyHealthTracker();
    const availableKeyIds = ['1'];
    if (process.env.GEMINI_API_KEY2) availableKeyIds.push('2');
    if (process.env.GEMINI_API_KEY3) availableKeyIds.push('3');

    const keyId = await healthTracker.selectBestKey(availableKeyIds);
    if (!keyId) {
      throw new Error('No available Gemini key for convergence step');
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
    const generation = await generateText({
      model: google('gemini-3.1-flash-lite-preview'),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.2,
      maxOutputTokens: 2200,
    });
    const text = generation.text;
    const totalTokens = generation.usage?.totalTokens ?? 0;

    await healthTracker.recordSuccess(keyId, 100);

    const targetSessionId = context.gradingSessionId;
    const targetFileId = context.fileId;
    if (targetSessionId && targetFileId) {
      try {
        const gradingResult = await db.gradingResult.findFirst({
          where: {
            gradingSessionId: targetSessionId,
            uploadedFileId: targetFileId,
          },
          select: {
            id: true,
            sparringTokens: true,
            result: true,
          },
        });

        if (gradingResult) {
          const currentTokens = gradingResult.sparringTokens ?? 0;
          const nextTokens = currentTokens + totalTokens;

          const rawResult = gradingResult.result;
          const resultObject = rawResult && typeof rawResult === 'object'
            ? { ...(rawResult as Record<string, unknown>) }
            : {};

          const rawMeta = resultObject._convergenceMeta;
          const metaObject = rawMeta && typeof rawMeta === 'object'
            ? { ...(rawMeta as Record<string, unknown>) }
            : {};

          const currentCalls = typeof metaObject.geminiCalls === 'number' ? metaObject.geminiCalls : 0;
          const currentGeminiTokens = typeof metaObject.geminiTokens === 'number' ? metaObject.geminiTokens : 0;

          resultObject._convergenceMeta = {
            ...metaObject,
            geminiCalls: currentCalls + 1,
            geminiTokens: currentGeminiTokens + totalTokens,
            lastModel: 'gemini-3.1-flash-lite-preview',
            lastCalledAt: new Date().toISOString(),
          };

          await db.gradingResult.update({
            where: { id: gradingResult.id },
            data: {
              sparringTokens: nextTokens,
              result: resultObject as any,
            },
          });
        }
      } catch (tokenError) {
        logger.error({ err: tokenError }, '[Converge API] Failed to update convergence token usage');
      }
    }

    return Response.json({
      success: true,
      suggestion: text,
      usage: {
        totalTokens,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '[Converge API] Failed to generate convergence suggestion');
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate convergence suggestion',
      },
      { status: 500 }
    );
  }
}
