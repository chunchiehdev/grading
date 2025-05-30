import * as React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { GradingResultDisplay, type GradingResultData } from './GradingResultDisplay'
import { FileText, Star, Clock } from 'lucide-react'

interface ResultAccordionItem {
  id: string;
  title: string;
  fileName: string;
  rubricName: string;
  result: GradingResultData;
}

interface ResultAccordionProps {
  results: ResultAccordionItem[];
}

export function ResultAccordion({ results }: ResultAccordionProps) {
  if (!results || results.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>沒有評分結果</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">評分結果</h2>
        <Badge variant="outline" className="text-sm">
          {results.length} 個檔案
        </Badge>
      </div>

      <Accordion type="multiple" className="space-y-4">
        {results.map((resultItem, index) => {
          const percentage = resultItem.result.maxScore > 0 
            ? Math.round((resultItem.result.totalScore / resultItem.result.maxScore) * 100) 
            : 0;

          return (
            <AccordionItem 
              key={resultItem.id} 
              value={resultItem.id}
              className="border rounded-lg overflow-hidden bg-card"
            >
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50">
                <div className="flex items-center justify-between w-full mr-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                      <span className="text-sm font-bold text-primary">{index + 1}</span>
                    </div>
                    
                    <div className="text-left">
                      <h3 className="font-semibold text-base">{resultItem.fileName}</h3>
                      <p className="text-sm text-muted-foreground">
                        評分標準: {resultItem.rubricName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    {/* 分數顯示 */}
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-lg font-bold">
                          {resultItem.result.totalScore}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          /{resultItem.result.maxScore}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {percentage}%
                      </div>
                    </div>

                    {/* 進度條 */}
                    <div className="w-24">
                      <Progress value={percentage} className="h-2" />
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
                  </div>
                </div>
              </AccordionTrigger>
              
              <AccordionContent className="px-6 pb-6 pt-0">
                <div className="border-t pt-6">
                  <GradingResultDisplay 
                    result={resultItem.result} 
                    className="bg-background"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  )
} 