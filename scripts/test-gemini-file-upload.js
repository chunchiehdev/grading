import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { getGeminiService } from '../app/services/gemini.server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testGeminiFileUpload() {
  console.log('🧪 測試 Gemini 文件上傳功能...\n');

  try {
    const geminiService = getGeminiService();
    
    // 創建一個測試 PDF 內容 (這裡用文字模擬)
    const testContent = `
這是一份測試學生作業：

## 論文題目：環保議題的重要性

### 引言
環保是當今世界面臨的重要議題。隨著工業化的發展，我們的環境正面臨前所未有的挑戰。

### 主要論點
1. **氣候變遷**：全球暖化導致極端天氣頻發
2. **海洋污染**：塑膠垃圾對海洋生態造成嚴重影響
3. **空氣品質**：工業排放導致空氣污染問題

### 結論
我們每個人都應該為環保盡一份力，從日常生活做起，減少對環境的負擔。

總字數：約200字
    `;

    // 將內容轉換為 Buffer (模擬 PDF 文件)
    const fileBuffer = Buffer.from(testContent, 'utf8');
    
    const testRequest = {
      fileBuffer,
      mimeType: 'text/plain', // 用 text/plain 代替 PDF 進行測試
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
      fileName: 'test-essay.txt',
      rubricName: '議論文評分標準'
    };

    console.log('📤 測試文件上傳評分...');
    const gradingResult = await geminiService.gradeDocumentWithFile(testRequest);

    if (gradingResult.success && gradingResult.result) {
      console.log('✅ 文件上傳評分測試成功!');
      console.log('\n📊 評分結果:');
      console.log(`   總分: ${gradingResult.result.totalScore}/${gradingResult.result.maxScore}`);
      console.log(`   百分比: ${Math.round((gradingResult.result.totalScore / gradingResult.result.maxScore) * 100)}%`);
      
      console.log('\n📝 詳細評分:');
      gradingResult.result.breakdown.forEach((item, index) => {
        const criteria = testRequest.criteria.find(c => c.id === item.criteriaId);
        console.log(`   ${index + 1}. ${criteria?.name || item.criteriaId}: ${item.score}分`);
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
      console.error('❌ 文件上傳評分測試失敗:', gradingResult.error);
      process.exit(1);
    }

    console.log('\n🎉 Gemini 文件上傳功能測試完成!');

  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error.message);
    process.exit(1);
  }
}

// 執行測試
testGeminiFileUpload().catch(console.error); 