import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { GradingResultDisplay, type GradingResultData } from './GradingResultDisplay'
import { FileText, Star, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ResultCardItem {
  id: string;
  title: string;
  fileName: string;
  rubricName: string;
  result: GradingResultData;
}

interface ResultCardListProps {
  results: ResultCardItem[];
}

export function ResultCardList({ results }: ResultCardListProps) {
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newExpandedIds = new Set(expandedIds);
    if (expandedIds.has(id)) {
      newExpandedIds.delete(id);
    } else {
      newExpandedIds.add(id);
    }
    setExpandedIds(newExpandedIds);
  };

  const expandAll = () => {
    setExpandedIds(new Set(results.map(r => r.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  if (!results || results.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>沒有評分結果</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            展開全部
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            摺疊全部
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {results.map((resultItem, index) => {
          const percentage = resultItem.result.maxScore > 0 
            ? Math.round((resultItem.result.totalScore / resultItem.result.maxScore) * 100) 
            : 0;
          const isExpanded = expandedIds.has(resultItem.id);

          return (
            <Card key={resultItem.id} className="overflow-hidden">
              {/* 概覽標題 */}
              <CardHeader 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleExpand(resultItem.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                      <span className="text-sm font-bold text-primary">{index + 1}</span>
                    </div>
                    
                    <div>
                      <CardTitle className="text-lg">{resultItem.fileName}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        評分標準: {resultItem.rubricName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    {/* 分數和進度 */}
                    <div className="text-right min-w-[120px]">
                      <div className="flex items-center justify-end space-x-2 mb-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-xl font-bold">
                          {resultItem.result.totalScore}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          /{resultItem.result.maxScore}
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2 w-24 ml-auto" />
                      <div className="text-xs text-muted-foreground mt-1">
                        {percentage}%
                      </div>
                    </div>

                    {/* 等級徽章 */}
                    <Badge 
                      variant={percentage >= 90 ? "default" : 
                              percentage >= 80 ? "secondary" : 
                              percentage >= 70 ? "outline" : "destructive"}
                      className="min-w-16 justify-center"
                    >
                      {percentage >= 90 ? '優異' : 
                       percentage >= 80 ? '優良' : 
                       percentage >= 70 ? '良好' : 
                       percentage >= 60 ? '尚可' : '需改進'}
                    </Badge>

                    {/* 展開/摺疊按鈕 */}
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* 詳細內容 */}
              {isExpanded && (
                <CardContent className="border-t bg-muted/20 pt-6">
                  <GradingResultDisplay result={resultItem.result} />
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  )
} 