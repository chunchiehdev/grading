import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { GradingResultDisplay, type GradingResultData } from './GradingResultDisplay'
import { FileText, Star, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ResultSidebarItem {
  id: string;
  title: string;
  fileName: string;
  rubricName: string;
  result: GradingResultData;
}

interface ResultSidebarProps {
  results: ResultSidebarItem[];
}

export function ResultSidebar({ results }: ResultSidebarProps) {
  const [selectedId, setSelectedId] = React.useState<string | null>(
    results.length > 0 ? results[0].id : null
  );

  const selectedResult = results.find(r => r.id === selectedId);

  if (!results || results.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>沒有評分結果</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">評分結果</h2>
        <Badge variant="outline" className="text-sm">
          {results.length} 個檔案
        </Badge>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[800px]">
        {/* 側邊欄 - 檔案列表 */}
        <div className="col-span-4">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">檔案列表</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[700px]">
                <div className="space-y-2 p-4 pt-0">
                  {results.map((resultItem, index) => {
                    const percentage = resultItem.result.maxScore > 0 
                      ? Math.round((resultItem.result.totalScore / resultItem.result.maxScore) * 100) 
                      : 0;
                    const isSelected = selectedId === resultItem.id;

                    return (
                      <Button
                        key={resultItem.id}
                        variant={isSelected ? "default" : "ghost"}
                        className={cn(
                          "w-full h-auto p-4 justify-start text-left",
                          !isSelected && "hover:bg-muted"
                        )}
                        onClick={() => setSelectedId(resultItem.id)}
                      >
                        <div className="flex items-center space-x-3 w-full">
                          <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full flex-shrink-0">
                            <span className="text-sm font-bold text-primary">{index + 1}</span>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-sm truncate">{resultItem.fileName}</h3>
                              {isSelected && <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                            </div>
                            
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {resultItem.rubricName}
                            </p>
                            
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center space-x-1">
                                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                <span className="text-xs font-medium">
                                  {resultItem.result.totalScore}/{resultItem.result.maxScore}
                                </span>
                              </div>
                              
                              <Badge 
                                variant={percentage >= 90 ? "default" : 
                                        percentage >= 80 ? "secondary" : 
                                        percentage >= 70 ? "outline" : "destructive"}
                                className="text-xs"
                              >
                                {percentage}%
                              </Badge>
                            </div>
                            
                            <Progress value={percentage} className="h-1 mt-2" />
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* 主要內容區域 - 詳細結果 */}
        <div className="col-span-8">
          {selectedResult ? (
            <Card className="h-full">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{selectedResult.fileName}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      評分標準: {selectedResult.rubricName}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                      <span className="text-2xl font-bold">
                        {selectedResult.result.totalScore}
                      </span>
                      <span className="text-lg text-muted-foreground">
                        /{selectedResult.result.maxScore}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <GradingResultDisplay result={selectedResult.result} />
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">請選擇一個檔案查看詳細結果</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
} 