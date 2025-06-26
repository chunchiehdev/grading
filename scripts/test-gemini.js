/**
 * Gemini 整合測試腳本
 * 用於測試 Gemini API 連線和基本評分功能
 */

import { getGeminiService } from '../app/services/gemini.server.js';

async function testGeminiConnection() {
  console.log('🧪 開始測試 Gemini 整合...\n');

  try {
    // 檢查環境變數
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ 錯誤: 請先設定 GEMINI_API_KEY 環境變數');
      console.log('   設定方式: export GEMINI_API_KEY="your_api_key_here"');
      process.exit(1);
    }

    console.log('✅ GEMINI_API_KEY 已設定');

    // 測試連線
    console.log('🔄 測試 Gemini 連線...');
    const geminiService = getGeminiService();
    const connectionTest = await geminiService.testConnection();

    if (connectionTest.success) {
      console.log('✅ Gemini 連線測試成功!');
      console.log('\n🤖 Gemini 回應:');
      console.log(`   ${connectionTest.response}`);
      
      if (connectionTest.metadata) {
        console.log('\n📈 連線測試元數據:');
        console.log(`   模型: ${connectionTest.metadata.model}`);
        console.log(`   Token 數: ${connectionTest.metadata.tokens}`);
        console.log(`   時間: ${connectionTest.metadata.timestamp}`);
      }
    } else {
      console.error('❌ Gemini 連線測試失敗:', connectionTest.error);
      process.exit(1);
    }

    // 測試評分功能
    console.log('\n🔄 測試評分功能...');
    const testRequest = {
      content: `這是一份測試學生作業。

        ## 作業主題：環境保護的重要性

        環境保護是當今世界面臨的重要議題。隨著工業化的發展，我們的環境正面臨著前所未有的挑戰。

        ### 主要環境問題
        1. **空氣污染**：工廠排放和汽車廢氣造成空氣品質惡化
        2. **水資源污染**：工業廢水和生活污水對水源造成污染
        3. **土壤污染**：化學農藥和工業廢料對土壤造成傷害

        ### 解決方案
        我們可以從以下幾個方面著手：
        - 使用再生能源，減少化石燃料依賴
        - 推廣垃圾分類和回收利用
        - 發展環保科技，減少污染排放
        - 提高公眾環保意識

        ### 結論
        環境保護需要全社會的共同努力，每個人都應該從日常生活做起，為保護地球環境貢獻自己的力量。`,
      
      criteria: [
        {
          id: 'content-quality',
          name: '內容品質',
          description: '論述是否清晰、邏輯是否完整',
          maxScore: 40,
          levels: [
            { score: 40, description: '內容非常完整，論述清晰有條理' },
            { score: 30, description: '內容完整，論述大致清楚' },
            { score: 20, description: '內容基本完整，但論述不夠清晰' },
            { score: 10, description: '內容不完整，論述混亂' }
          ]
        },
        {
          id: 'organization',
          name: '結構組織',
          description: '文章結構是否合理、段落是否清楚',
          maxScore: 30,
          levels: [
            { score: 30, description: '結構非常合理，段落層次清楚' },
            { score: 20, description: '結構合理，段落大致清楚' },
            { score: 10, description: '結構基本合理，但段落不夠清楚' },
            { score: 5, description: '結構混亂，段落不清' }
          ]
        },
        {
          id: 'language-expression',
          name: '語言表達',
          description: '用詞是否準確、句式是否流暢',
          maxScore: 30,
          levels: [
            { score: 30, description: '用詞準確，句式流暢自然' },
            { score: 20, description: '用詞大致準確，句式較為流暢' },
            { score: 10, description: '用詞基本準確，但句式不夠流暢' },
            { score: 5, description: '用詞不準確，句式生硬' }
          ]
        }
      ],
      fileName: 'test-essay.pdf',
      rubricName: '議論文評分標準'
    };

    const gradingResult = await geminiService.gradeDocument(testRequest);

    if (gradingResult.success && gradingResult.result) {
      console.log('✅ 評分測試成功!');
      console.log('\n📊 評分結果:');
      console.log(`   總分: ${gradingResult.result.totalScore}/${gradingResult.result.maxScore}`);
      console.log(`   百分比: ${Math.round((gradingResult.result.totalScore / gradingResult.result.maxScore) * 100)}%`);
      
      console.log('\n📝 詳細評分:');
      gradingResult.result.breakdown.forEach((item, index) => {
        console.log(`   ${index + 1}. ${testRequest.criteria.find(c => c.id === item.criteriaId)?.name || item.criteriaId}: ${item.score}分`);
        console.log(`      回饋: ${item.feedback}`);
      });

      console.log('\n💬 整體回饋:');
      console.log(`   ${gradingResult.result.overallFeedback}`);

      if (gradingResult.metadata) {
        console.log('\n📈 元數據:');
        console.log(`   模型: ${gradingResult.metadata.model}`);
        console.log(`   Token 數: ${gradingResult.metadata.tokens}`);
        console.log(`   耗時: ${gradingResult.metadata.duration}ms`);
      }

    } else {
      console.error('❌ 評分測試失敗:', gradingResult.error);
      process.exit(1);
    }

    console.log('\n🎉 所有測試完成，Gemini 整合正常運作!');

  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error.message);
    process.exit(1);
  }
}

// 執行測試
testGeminiConnection().catch(console.error); 