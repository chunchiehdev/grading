import { Markdown } from '@/components/ui/markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestMarkdownPage() {
  const testMarkdown = `截至2024年5月15日，世界首富是 **貝爾納·阿爾諾 (Bernard Arnault)**。

## 原因

貝爾納·阿爾諾是法國奢侈品集團LVMH（路威酩軒集團）的董事長兼首席執行官。LVMH旗下擁有眾多知名品牌，例如：

- **路易威登（Louis Vuitton）**
- **迪奧（Dior）**  
- **酩悅香檳（Moët & Chandon）**

由於奢侈品市場的強勁表現，以及LVMH股價的持續上漲，使得阿爾諾的財富超越了其他富豪，成為世界首富。

### 重點特色
1. 強調文字使用 **粗體**
2. 列表項目清楚呈現
3. 段落分隔適當

> 這是一個引用範例，展示 Markdown 的豐富功能。`;

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Markdown 渲染測試</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 原始 Markdown */}
        <Card>
          <CardHeader>
            <CardTitle>原始 Markdown 文字</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
              {testMarkdown}
            </pre>
          </CardContent>
        </Card>

        {/* 渲染後的結果 */}
        <Card>
          <CardHeader>
            <CardTitle>渲染後的結果</CardTitle>
          </CardHeader>
          <CardContent>
            <Markdown>{testMarkdown}</Markdown>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>測試說明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>✅ <strong>粗體文字</strong>：**文字** 會變成粗體</p>
            <p>✅ <strong>標題</strong>：## 和 ### 會變成不同大小的標題</p>
            <p>✅ <strong>列表</strong>：- 會變成項目符號列表</p>
            <p>✅ <strong>有序列表</strong>：1. 會變成數字列表</p>
            <p>✅ <strong>引用</strong>：{'>'} 會變成引用區塊</p>
            <p>✅ <strong>換行</strong>：\n 會正確處理段落分隔</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 