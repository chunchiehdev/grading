import { v4 as uuidv4 } from 'uuid';
import type { UIRubricData, UICategory } from '@/utils/rubric-transform';

export const getKemberRubricTemplate = (): UIRubricData => {
  return {
    name: 'Kember (2008) 批判性反思範本',
    description: '基於 Kember et al. (2008) 的 Critical Reflection Rubric，專為反思日誌與心得報告設計的多維度評估與 AI 對練框架。',
    categories: [
      {
        id: uuidv4(),
        name: '批判性反思維度',
        criteria: [
          {
            id: uuidv4(),
            name: "對既有知識的反思 (Reflection on Existing Knowledge)",
            description: "評估學生如何運用並反思既有知識與經驗。",
            levels: [
              { score: 4, description: "批判性地檢視既有知識，質疑假設，並因經驗而提出新觀點。" },
              { score: 3, description: "主動且謹慎地思考既有知識，並能把經驗轉化為對知識的新理解。" },
              { score: 2, description: "能使用既有知識，但未嘗試去評估/鑑定它；展現了理解，但沒有連結到個人其他經驗或反應。" },
              { score: 1, description: "自動/表面的回應，幾乎沒有意識/深思熟慮，或未參考既有知識；沒有嘗試去理解就直接回應。" }
            ]
          },
          {
            id: uuidv4(),
            name: "與學術概念的連結 (Connection to Academic Concepts)",
            description: "評估經驗與課堂理論/文獻的連結程度。",
            levels: [
              { score: 4, description: "在「經驗」與「課堂內容(理論/文獻)」之間展現卓越的連結；且有應用理論與重建觀點的證據。" },
              { score: 3, description: "在「經驗」與「課堂內容」之間展現清晰的連結；有應用理論的證據。" },
              { score: 2, description: "將經驗與課堂內容連結，但仍停留在表面或過於抽象。" },
              { score: 1, description: "沒有在「經驗」與「課堂內容或文獻」之間建立連結。" }
            ]
          },
          {
            id: uuidv4(),
            name: "發展與成長的證據 (Evidence of Development)",
            description: "評估學生是否展現出個人的轉化與成長洞察。",
            levels: [
              { score: 4, description: "清楚說明因為這次經驗，自己對於「自我」或「特定議題/概念」的觀點發生了轉變。" },
              { score: 3, description: "清楚說明因為這次經驗，對「自我」或「特定概念」產生了新的理解或洞察。" },
              { score: 2, description: "對於「自我」或「特定概念」只有有限或表面的洞察。" },
              { score: 1, description: "沒有證據顯示對「自我」或「特定概念」有任何洞察或成長。" }
            ]
          }
        ]
      }
    ]
  };
};
