import { ActionFunctionArgs } from 'react-router';

/**
 * 使用 AI 生成評分標準的主要函數
 * 目標：根據老師的自然語言描述，生成完整的評分標準
 */
async function generateRubricWithAI(message: string, conversationHistory: any[] = [], context?: any): Promise<string> {
  try {
    // 導入真正的 AI 服務
    const { generateRubricResponse } = await import('@/services/ai-rubric.server');

    console.log('🤖 調用 AI 服務生成評分標準', {
      message: message.substring(0, 100) + '...',
      hasHistory: conversationHistory.length > 0,
      hasContext: !!context,
    });

    // 調用真正的 AI 服務（Gemini 或 OpenAI）
    const response = await generateRubricResponse({
      message,
      conversationHistory,
      context,
    });

    console.log('✅ AI 服務回應成功');
    return response;
  } catch (error) {
    console.error('❌ AI 服務調用失敗:', error);

    // 當 AI 服務不可用時的友善回應
    return createFallbackResponse(message, error);
  }
}

/**
 * 當 AI 服務不可用時的備用回應
 */
function createFallbackResponse(message: string, error: any): string {
  const errorMessage = error?.message || '未知錯誤';

  return `抱歉，AI 服務暫時不可用（${errorMessage}）。

為了不影響您的使用，請您：

1. **詳細描述您的需求**，例如：
   - 這是什麼科目/類型的作業？
   - 要評估學生的哪些能力？
   - 有特殊的評分重點嗎？

2. **或者嘗試這些描述方式**：
   - "我需要一個數學微積分作業的評分標準，重點評估解題邏輯和計算準確性"
   - "請幫我設計英文作文的評分標準，包含文法、創意和結構"
   - "需要程式設計專案的評分標準，評估程式碼品質、功能實現和文檔"

3. **稍後再試**，AI 服務恢復後會為您生成完整的評分標準。

感謝您的耐心！🙏`;
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { message, context, conversationHistory = [] } = await request.json();

    if (!message || typeof message !== 'string') {
      return Response.json({ error: '請提供有效的訊息' }, { status: 400 });
    }

    const response = await generateRubricWithAI(message, conversationHistory, context);

    return Response.json({ response });
  } catch (error) {
    console.error('AI API Error:', error);
    return Response.json({ error: '生成評分標準時發生錯誤，請稍後再試' }, { status: 500 });
  }
}
