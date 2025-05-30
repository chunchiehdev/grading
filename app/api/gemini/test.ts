import { getGeminiService } from '@/services/gemini.server';

export async function loader({ request }: { request: Request }) {
  try {
    // 測試 Gemini 連線
    const geminiService = getGeminiService();
    const testResult = await geminiService.testConnection();

    if (testResult.success) {
      return Response.json({
        success: true,
        message: 'Gemini 連線測試成功',
        geminiResponse: testResult.response,
        metadata: testResult.metadata,
        note: 'geminiResponse 包含 Markdown 格式，前端會自動解析為 HTML',
        timestamp: new Date().toISOString()
      });
    } else {
      return Response.json({
        success: false,
        error: testResult.error,
        message: 'Gemini 連線測試失敗'
      }, { status: 500 });
    }
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Gemini 測試過程中發生錯誤'
    }, { status: 500 });
  }
}

export async function action({ request }: { request: Request }) {
  return Response.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
} 