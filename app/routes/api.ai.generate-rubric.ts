import { ActionFunctionArgs } from 'react-router';

// 模擬 Gemini API 回應的函數，實際應該接入真正的 Gemini API
async function generateRubricWithAI(message: string, context?: any): Promise<string> {
  // 這裡應該接入真正的 Gemini API
  // 暫時使用模擬數據來展示功能
  
  const prompt = `
你是一個專業的教育評分標準生成助手。請根據用戶的需求，生成詳細的評分標準。

用戶需求：${message}

${context ? `現有評分標準內容：${JSON.stringify(context, null, 2)}` : ''}

請按照以下格式生成評分標準，並將結果以 JSON 格式包裝在 \`\`\`json 和 \`\`\` 之間：

{
  "name": "評分標準名稱",
  "description": "評分標準的詳細描述",
  "categories": [
    {
      "name": "類別名稱",
      "criteria": [
        {
          "name": "評分項目名稱",
          "description": "評分項目描述",
          "levels": [
            {
              "score": 4,
              "description": "優秀等級的詳細描述"
            },
            {
              "score": 3,
              "description": "良好等級的詳細描述"
            },
            {
              "score": 2,
              "description": "及格等級的詳細描述"
            },
            {
              "score": 1,
              "description": "需改進等級的詳細描述"
            }
          ]
        }
      ]
    }
  ]
}

請確保：
1. 每個等級都有具體、可操作的描述
2. 評分標準要符合教育評估的專業性
3. 描述要清晰明確，避免模糊用詞
4. 適合實際教學場景使用
`;

  // 模擬不同類型的評分標準生成
  if (message.includes('個人簡述') || message.includes('自我介紹')) {
    return `我為您生成了一個個人簡述的評分標準，包含內容完整性、表達清晰度和創意性三個維度：

\`\`\`json
{
  "name": "個人簡述評分標準",
  "description": "用於評估學生個人簡述作業的質量，包含內容、表達和創意等多個維度的評分標準。",
  "categories": [
    {
      "name": "內容品質",
      "criteria": [
        {
          "name": "資訊完整性",
          "description": "個人基本資訊、學習背景和目標的完整程度",
          "levels": [
            {
              "score": 4,
              "description": "包含完整的個人資訊（姓名、背景、興趣、目標等），資訊豐富且相關性高"
            },
            {
              "score": 3,
              "description": "包含大部分重要個人資訊，內容較為完整"
            },
            {
              "score": 2,
              "description": "包含基本個人資訊，但缺少一些重要內容"
            },
            {
              "score": 1,
              "description": "個人資訊不完整，內容過於簡略"
            }
          ]
        },
        {
          "name": "真實性與原創性",
          "description": "內容的真實程度和個人特色展現",
          "levels": [
            {
              "score": 4,
              "description": "內容真實可信，充分展現個人特色，具有獨特性"
            },
            {
              "score": 3,
              "description": "內容真實，有一定的個人特色"
            },
            {
              "score": 2,
              "description": "內容基本真實，但個人特色不夠明顯"
            },
            {
              "score": 1,
              "description": "內容真實性存疑或過於模板化"
            }
          ]
        }
      ]
    },
    {
      "name": "表達品質",
      "criteria": [
        {
          "name": "語言表達",
          "description": "文字表達的清晰度、流暢度和專業度",
          "levels": [
            {
              "score": 4,
              "description": "語言表達清晰流暢，用詞準確，句式豐富，語法正確"
            },
            {
              "score": 3,
              "description": "語言表達較為清晰，用詞恰當，有少量語法錯誤"
            },
            {
              "score": 2,
              "description": "語言表達基本清楚，但有一些用詞或語法問題"
            },
            {
              "score": 1,
              "description": "語言表達不夠清晰，用詞不當或語法錯誤較多"
            }
          ]
        },
        {
          "name": "結構組織",
          "description": "內容的邏輯結構和組織方式",
          "levels": [
            {
              "score": 4,
              "description": "結構清晰有序，邏輯性強，段落安排合理"
            },
            {
              "score": 3,
              "description": "結構較為清晰，邏輯基本合理"
            },
            {
              "score": 2,
              "description": "結構基本清楚，但邏輯性有待加強"
            },
            {
              "score": 1,
              "description": "結構混亂，缺乏邏輯性"
            }
          ]
        }
      ]
    },
    {
      "name": "創意與表現",
      "criteria": [
        {
          "name": "創意表現",
          "description": "在介紹方式和內容呈現上的創新程度",
          "levels": [
            {
              "score": 4,
              "description": "展現出色的創意，介紹方式新穎獨特，令人印象深刻"
            },
            {
              "score": 3,
              "description": "有一定創意，介紹方式有所創新"
            },
            {
              "score": 2,
              "description": "創意一般，介紹方式較為常規"
            },
            {
              "score": 1,
              "description": "缺乏創意，介紹方式過於平淡"
            }
          ]
        }
      ]
    }
  ]
}
\`\`\`

這個評分標準涵蓋了個人簡述的核心要素，可以幫助您更客觀地評估學生的表現。您可以直接套用這個標準，或者根據具體需求進行調整。`;
  }

  if (message.includes('程式設計') || message.includes('程式') || message.includes('編程')) {
    return `我為您生成了一個程式設計作業的評分標準，涵蓋代碼品質、功能實現和文檔等方面：

\`\`\`json
{
  "name": "程式設計作業評分標準",
  "description": "用於評估程式設計作業的綜合評分標準，包含代碼品質、功能實現、設計思維等多個維度。",
  "categories": [
    {
      "name": "功能實現",
      "criteria": [
        {
          "name": "需求完成度",
          "description": "程式是否完整實現了所有要求的功能",
          "levels": [
            {
              "score": 4,
              "description": "完整實現所有需求，功能運行正確，無Bug"
            },
            {
              "score": 3,
              "description": "實現大部分需求，功能基本正確，有少量小問題"
            },
            {
              "score": 2,
              "description": "實現部分需求，有一些功能缺陷或錯誤"
            },
            {
              "score": 1,
              "description": "只實現少部分需求，存在明顯功能問題"
            }
          ]
        },
        {
          "name": "程式正確性",
          "description": "程式運行的穩定性和結果的正確性",
          "levels": [
            {
              "score": 4,
              "description": "程式運行穩定，輸出結果完全正確，能處理各種邊界情況"
            },
            {
              "score": 3,
              "description": "程式運行基本穩定，輸出結果大部分正確"
            },
            {
              "score": 2,
              "description": "程式能運行，但有一些錯誤或異常情況處理不當"
            },
            {
              "score": 1,
              "description": "程式運行不穩定，經常出錯或無法正常執行"
            }
          ]
        }
      ]
    },
    {
      "name": "代碼品質",
      "criteria": [
        {
          "name": "代碼可讀性",
          "description": "代碼的命名、註釋和格式化品質",
          "levels": [
            {
              "score": 4,
              "description": "變數命名清晰，註釋完整合理，代碼格式規範，易於理解"
            },
            {
              "score": 3,
              "description": "命名較為清晰，有必要的註釋，格式基本規範"
            },
            {
              "score": 2,
              "description": "命名基本合理，註釋不夠充分，格式有待改善"
            },
            {
              "score": 1,
              "description": "命名不當，缺乏註釋，代碼格式混亂"
            }
          ]
        },
        {
          "name": "代碼結構",
          "description": "代碼的組織結構和模組化程度",
          "levels": [
            {
              "score": 4,
              "description": "結構清晰，函數劃分合理，遵循良好的設計原則"
            },
            {
              "score": 3,
              "description": "結構較為清晰，有適當的函數劃分"
            },
            {
              "score": 2,
              "description": "結構基本合理，但可以進一步優化"
            },
            {
              "score": 1,
              "description": "結構混亂，缺乏合理的組織"
            }
          ]
        }
      ]
    },
    {
      "name": "技術能力",
      "criteria": [
        {
          "name": "演算法效率",
          "description": "解決問題的方法和演算法效率",
          "levels": [
            {
              "score": 4,
              "description": "使用高效的演算法，時間和空間複雜度優秀"
            },
            {
              "score": 3,
              "description": "演算法較為合理，效率良好"
            },
            {
              "score": 2,
              "description": "演算法基本正確，但效率有待提升"
            },
            {
              "score": 1,
              "description": "演算法效率低下或不合理"
            }
          ]
        }
      ]
    }
  ]
}
\`\`\`

這個評分標準專為程式設計作業設計，可以全面評估學生的編程能力和代碼品質。`;
  }

  // 通用回應
  return `根據您的需求，我為您生成了一個評分標準框架。請提供更具體的需求，我可以為您生成更詳細的評分標準。

比如您可以告訴我：
- 是什麼類型的作業或評估
- 主要評估哪些能力
- 是否有特定的要求或重點

這樣我就能為您生成更精確的評分標準。`;
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { message, context } = await request.json();
    
    if (!message || typeof message !== 'string') {
      return Response.json({ error: '請提供有效的訊息' }, { status: 400 });
    }
    
    const response = await generateRubricWithAI(message, context);
    
    return Response.json({ response });
  } catch (error) {
    console.error('AI API Error:', error);
    return Response.json(
      { error: '生成評分標準時發生錯誤，請稍後再試' }, 
      { status: 500 }
    );
  }
} 