import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getGeminiService } from '../app/services/gemini.server.js';

const __filename = fileURLToPath(import.meta.url);

async function testTokenAnalysis() {
    console.log('🔍 測試 Gemini Token 分析...\n');

    try {
        const geminiService = getGeminiService();
        
        // 1. 檢查模型限制
        console.log('📊 檢查模型限制...');
        const limits = await geminiService.getModelLimits();
        console.log(`模型: ${limits.model}`);
        console.log(`輸入限制: ${limits.inputLimit.toLocaleString()} tokens`);
        console.log(`輸出限制: ${limits.outputLimit.toLocaleString()} tokens\n`);
        
        // 2. 創建測試請求
        const testRequest = {
            fileBuffer: Buffer.from('測試文件內容'),
            mimeType: 'application/pdf',
            criteria: [
                {
                    id: 'informationCompleteness',
                    name: '資訊完整性',
                    description: '包含個人資訊、學習背景和目標',
                    maxScore: 4
                },
                {
                    id: 'authenticityAndOriginality',
                    name: '真實性與原創性',
                    description: '內容真實可信，展現個人特色',
                    maxScore: 4
                },
                {
                    id: 'languageExpression',
                    name: '語言表達',
                    description: '語言清晰流暢，用詞準確',
                    maxScore: 4
                },
                {
                    id: 'structureOrganization',
                    name: '結構組織',
                    description: '結構清晰有序，邏輯性強',
                    maxScore: 4
                },
                {
                    id: 'creativityExpression',
                    name: '創意表現',
                    description: '介紹方式有創意，有個人特色',
                    maxScore: 4
                }
            ],
            fileName: '測試文件.pdf',
            rubricName: '個人陳述評分標準'
        };
        
        // 3. 分析 prompt token 使用量
        console.log('🧮 分析 Prompt Token 使用量...');
        const analysis = await geminiService.analyzePromptTokenUsage(testRequest);
        
        console.log(`Prompt Tokens: ${analysis.promptTokens.toLocaleString()}`);
        console.log(`預估輸出 Tokens: ${analysis.estimatedOutputTokens.toLocaleString()}`);
        console.log(`總預估 Tokens: ${(analysis.promptTokens + analysis.estimatedOutputTokens).toLocaleString()}\n`);
        
        // 4. 顯示建議
        console.log('💡 建議:');
        analysis.recommendations.forEach(rec => console.log(`  ${rec}`));
        console.log();
        
        // 5. 計算使用率
        const inputUsage = (analysis.promptTokens / limits.inputLimit * 100).toFixed(1);
        const outputUsage = (analysis.estimatedOutputTokens / limits.outputLimit * 100).toFixed(1);
        
        console.log('📈 使用率分析:');
        console.log(`  輸入使用率: ${inputUsage}% (${analysis.promptTokens}/${limits.inputLimit})`);
        console.log(`  輸出使用率: ${outputUsage}% (${analysis.estimatedOutputTokens}/${limits.outputLimit})`);
        
        // 6. 建議最佳 maxOutputTokens 設定
        const optimalMaxTokens = Math.min(
            analysis.estimatedOutputTokens + 1000, // 加上buffer
            limits.outputLimit
        );
        console.log(`\n🎯 建議 maxOutputTokens 設定: ${optimalMaxTokens.toLocaleString()}`);
        
        // 7. 測試簡單 token 計算
        console.log('\n🧪 測試 Token 計算:');
        const testTexts = [
            'Hello world',
            '你好世界',
            '這是一個測試中文 token 計算的句子，包含英文 English 和數字 123。'
        ];
        
        for (const text of testTexts) {
            const result = await geminiService.countTokens(text);
            const estimated = geminiService.estimateTokens(text);
            console.log(`  "${text}"`);
            console.log(`    實際: ${result.tokenCount} tokens`);
            console.log(`    估算: ${estimated} tokens`);
            console.log(`    字符: ${text.length} chars`);
            console.log(`    比率: ${(text.length / result.tokenCount).toFixed(2)} chars/token\n`);
        }

    } catch (error) {
        console.error('❌ 測試失敗:', error);
    }
}

// 執行測試
testTokenAnalysis().catch(console.error); 