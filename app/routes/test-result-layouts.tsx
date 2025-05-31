import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ResultAccordion } from '@/components/grading/ResultAccordion';
import { ResultSidebar } from '@/components/grading/ResultSidebar';
import { ResultCardList } from '@/components/grading/ResultCardList';
import { GradingResultData } from '@/components/grading/GradingResultDisplay';

// Mock data for testing
const mockResults = [
  {
    id: '1',
    title: '作業1',
    fileName: '學生報告_張小明.pdf',
    rubricName: '學術寫作評分標準',
    result: {
      totalScore: 85,
      maxScore: 100,
      breakdown: [
        { criteriaId: '1', score: 20, feedback: '**論點清晰**：論述結構完整，邏輯清楚。\n\n優點：\n- 引言明確\n- 結論有力\n\n改進建議：\n- 可增加更多例證' },
        { criteriaId: '2', score: 18, feedback: '**內容充實**：資料豐富但組織需要改善。' },
        { criteriaId: '3', score: 22, feedback: '**格式規範**：引用格式正確，版面整潔。' },
        { criteriaId: '4', score: 25, feedback: '**創新思考**：提出了新穎的觀點和見解。' }
      ],
      overallFeedback: '## 總體評價\n\n這是一份**優秀的報告**，展現了紮實的學術功底。\n\n### 主要優點\n- 論述邏輯清晰\n- 資料蒐集完整\n- 格式規範標準\n\n### 改進方向\n> 建議在論證部分增加更多實例支撐，會讓論點更加有說服力。'
    }
  },
  {
    id: '2',
    title: '作業2',
    fileName: '研究報告_李小華.pdf',
    rubricName: '研究方法評分標準',
    result: {
      totalScore: 72,
      maxScore: 100,
      breakdown: [
        { criteriaId: '1', score: 15, feedback: '**研究設計**：方法選擇合適但執行上有改進空間。' },
        { criteriaId: '2', score: 18, feedback: '**數據分析**：分析方法正確，結果解釋清楚。' },
        { criteriaId: '3', score: 16, feedback: '**文獻回顧**：相關文獻覆蓋面廣，但批判性分析不足。' },
        { criteriaId: '4', score: 23, feedback: '**結論建議**：結論合理，實務建議具體可行。' }
      ],
      overallFeedback: '## 評分總結\n\n報告整體水準**良好**，但在某些方面還有提升空間。\n\n**主要強項**：\n1. 研究問題明確\n2. 數據收集完整\n3. 結論建議實用\n\n**改進建議**：\n- 加強文獻的批判性分析\n- 研究限制討論可以更深入'
    }
  },
  {
    id: '3',
    title: '作業3',
    fileName: '期末專案_王小美.pdf',
    rubricName: '專案評分標準',
    result: {
      totalScore: 94,
      maxScore: 100,
      breakdown: [
        { criteriaId: '1', score: 24, feedback: '**創意構思**：想法新穎，具有創新性和實用價值。' },
        { criteriaId: '2', score: 23, feedback: '**技術實現**：技術運用熟練，解決方案完整。' },
        { criteriaId: '3', score: 24, feedback: '**簡報呈現**：簡報設計精美，表達清晰有力。' },
        { criteriaId: '4', score: 23, feedback: '**團隊合作**：分工明確，配合默契，成果豐碩。' }
      ],
      overallFeedback: '## 🌟 優異表現\n\n這是一份**傑出的專案報告**！\n\n### 突出亮點\n\n- **🎯 創新思維**：提出的解決方案極具創意\n- **⚡ 技術深度**：技術實現水準很高\n- **🎨 呈現品質**：簡報製作專業美觀\n- **🤝 團隊精神**：展現優秀的協作能力\n\n### 未來發展建議\n\n> 建議可以考慮將此專案進一步發展，有很大的商業化潛力。\n\n**恭喜你們的優秀表現！** 🎉'
    }
  }
];

type LayoutType = 'accordion' | 'sidebar' | 'cardlist';

export default function TestResultLayoutsPage() {
  const [selectedLayout, setSelectedLayout] = useState<LayoutType>('accordion');

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">評分結果佈局設計</h1>
          <p className="text-muted-foreground mb-8">
            三種不同的設計方案，點擊切換體驗不同的使用體驗
          </p>
        </div>

        {/* 佈局選擇器 */}
        <Card>
          <CardHeader>
            <CardTitle>選擇佈局方案</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant={selectedLayout === 'accordion' ? 'default' : 'outline'}
                className="h-auto p-4 flex flex-col space-y-2"
                onClick={() => setSelectedLayout('accordion')}
              >
                <div className="font-semibold">手風琴式</div>
                <div className="text-xs text-center">
                  節省空間，快速概覽
                </div>
                {selectedLayout === 'accordion' && <Badge className="text-xs">目前選擇</Badge>}
              </Button>

              <Button
                variant={selectedLayout === 'sidebar' ? 'default' : 'outline'}
                className="h-auto p-4 flex flex-col space-y-2"
                onClick={() => setSelectedLayout('sidebar')}
              >
                <div className="font-semibold">側邊欄式</div>
                <div className="text-xs text-center">
                  檔案管理器風格
                </div>
                {selectedLayout === 'sidebar' && <Badge className="text-xs">目前選擇</Badge>}
              </Button>

              <Button
                variant={selectedLayout === 'cardlist' ? 'default' : 'outline'}
                className="h-auto p-4 flex flex-col space-y-2"
                onClick={() => setSelectedLayout('cardlist')}
              >
                <div className="font-semibold">卡片列表</div>
                <div className="text-xs text-center">
                  簡潔直觀，統計完整
                </div>
                {selectedLayout === 'cardlist' && <Badge className="text-xs">目前選擇</Badge>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 顯示選擇的佈局 */}
        <div className="min-h-[600px]">
          {selectedLayout === 'accordion' && <ResultAccordion results={mockResults} />}
          {selectedLayout === 'sidebar' && <ResultSidebar results={mockResults} />}
          {selectedLayout === 'cardlist' && <ResultCardList results={mockResults} />}
        </div>

        {/* 設計說明 */}
        <Card>
          <CardHeader>
            <CardTitle>設計特色比較</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-green-600">手風琴式 ✨</h3>
                <div className="text-sm space-y-1">
                  <p>✅ 節省垂直空間</p>
                  <p>✅ 一次可看多個概覽</p>
                  <p>✅ 支援多選展開</p>
                  <p>✅ 適合檔案數量多</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-blue-600">側邊欄式 🗂️</h3>
                <div className="text-sm space-y-1">
                  <p>✅ 類似檔案管理器</p>
                  <p>✅ 專注單一檔案詳情</p>
                  <p>✅ 切換方便快速</p>
                  <p>✅ 適合深度檢視</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-purple-600">卡片列表 📊</h3>
                <div className="text-sm space-y-1">
                  <p>✅ 統計資訊豐富</p>
                  <p>✅ 批量操作方便</p>
                  <p>✅ 總覽數據清楚</p>
                  <p>✅ 適合教師總結</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 