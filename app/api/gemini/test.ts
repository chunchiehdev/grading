// import { getGeminiService } from '@/services/gemini.server';

// export async function loader({ request }: { request: Request }) {
//   const url = new URL(request.url);
//   const testType = url.searchParams.get('type') || 'connection';

//   try {
//     const geminiService = getGeminiService();

//     if (testType === 'tokens') {
//       // Token 分析測試
//       const limits = await geminiService.getModelLimits();
      
//       const testRequest = {
//         fileBuffer: Buffer.from('測試文件內容'),
//         mimeType: 'application/pdf',
//         criteria: [
//           { id: 'informationCompleteness', name: '資訊完整性', description: '包含個人資訊、學習背景和目標', maxScore: 4 },
//           { id: 'authenticityAndOriginality', name: '真實性與原創性', description: '內容真實可信，展現個人特色', maxScore: 4 },
//           { id: 'languageExpression', name: '語言表達', description: '語言清晰流暢，用詞準確', maxScore: 4 },
//           { id: 'structureOrganization', name: '結構組織', description: '結構清晰有序，邏輯性強', maxScore: 4 },
//           { id: 'creativityExpression', name: '創意表現', description: '介紹方式有創意，有個人特色', maxScore: 4 }
//         ],
//         fileName: '測試文件.pdf',
//         rubricName: '個人陳述評分標準'
//       };

//       const analysis = await geminiService.analyzePromptTokenUsage(testRequest);
//       const inputUsage = limits.inputLimit > 0 ? (analysis.promptTokens / limits.inputLimit * 100).toFixed(1) : 0;
//       const outputUsage = limits.outputLimit > 0 ? (analysis.estimatedOutputTokens / limits.outputLimit * 100).toFixed(1) : 0;
//       const optimalMaxTokens = Math.min(analysis.estimatedOutputTokens + 1000, limits.outputLimit);

//       return Response.json({
//         success: true,
//         message: 'Token 分析完成',
//         data: {
//           modelLimits: limits,
//           tokenAnalysis: analysis,
//           usage: {
//             inputUsage: `${inputUsage}%`,
//             outputUsage: `${outputUsage}%`,
//             totalEstimated: analysis.promptTokens + analysis.estimatedOutputTokens
//           },
//           recommendations: {
//             optimalMaxTokens,
//             currentMaxTokens: 8000,
//             shouldIncrease: optimalMaxTokens > 8000,
//             shouldDecrease: optimalMaxTokens < 6000
//           }
//         },
//         timestamp: new Date().toISOString()
//       });
//     } else {
//       // 原有的連線測試
//       const testResult = await geminiService.testConnection();

//       if (testResult.success) {
//         return Response.json({
//           success: true,
//           message: 'Gemini 連線測試成功',
//           geminiResponse: testResult.response,
//           metadata: testResult.metadata,
//           note: 'geminiResponse 包含 Markdown 格式，前端會自動解析為 HTML',
//           timestamp: new Date().toISOString()
//         });
//       } else {
//         return Response.json({
//           success: false,
//           error: testResult.error,
//           message: 'Gemini 連線測試失敗'
//         }, { status: 500 });
//       }
//     }
//   } catch (error) {
//     return Response.json({
//       success: false,
//       error: error instanceof Error ? error.message : 'Unknown error',
//       message: testType === 'tokens' ? 'Token 分析過程中發生錯誤' : 'Gemini 測試過程中發生錯誤'
//     }, { status: 500 });
//   }
// }

// export async function action({ request }: { request: Request }) {
//   return Response.json(
//     { error: 'Method not allowed' },
//     { status: 405 }
//   );
// } 