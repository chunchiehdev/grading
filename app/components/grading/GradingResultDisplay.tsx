import React from 'react';
import { motion } from 'framer-motion';
import { Star, File, ArrowUpDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyGradingState } from './EmptyGradingState';
import { SmartContent, Markdown, PlainTextFallback } from '@/components/ui/markdown';
import type { GradingResultData } from '@/types/rubric';

interface GradingResultDisplayProps {
  result?: GradingResultData;
  className?: string;
  onRetry?: () => void;
}

const ensureArray = (items: string[] | string | undefined): string[] => {
  if (!items) return [];
  if (typeof items === 'string') return [items];
  return items;
};

const TagsList = ({ 
  items, 
  markdownItems, 
  variant 
}: { 
  items: string[] | string; 
  markdownItems?: string[] | string;
  variant: 'strength' | 'improvement';
}) => {
  const tagItems = ensureArray(items);
  const markdownTagItems = markdownItems ? ensureArray(markdownItems) : [];
  
  return (
    <ul className="space-y-2">
      {tagItems.map((item, index) => {
        const markdownItem = markdownTagItems[index];
        return (
          <li key={index} className="text-sm">
            <SmartContent
              markdown={markdownItem}
              plainText={item}
              className="prose-p:mb-0 prose-li:mb-0"
            />
          </li>
        );
      })}
    </ul>
  );
};

const ScoreCard = ({ score }: { score: number }) => (
  <Card className="mb-4">
    <CardContent className="pt-6 text-center">
      <div className="flex items-center justify-center mb-2">
        <Star className="w-8 h-8 text-yellow-500 fill-yellow-500 mr-2" />
        <span className="text-5xl font-bold">{score}</span>
        <span className="text-2xl text-muted-foreground ml-1">/100</span>
      </div>
      <p className="text-muted-foreground">
        {score >= 90 ? '優異' : score >= 80 ? '優良' : score >= 70 ? '良好' : score >= 60 ? '尚可' : '需要改進'}
      </p>
    </CardContent>
  </Card>
);

const CriteriaDetails = ({ criteriaScores }: { criteriaScores?: GradingResultData['criteriaScores'] }) => {
  if (!criteriaScores || criteriaScores.length === 0) return null;

  return (
    <div className="space-y-4 mt-4">
      {criteriaScores.map((criteria, index) => (
        <Card key={index} className="overflow-hidden">
          <CardHeader className="bg-slate-50 py-3">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-sm">{criteria.name}</h4>
              <Badge variant="outline" className="font-bold">
                {criteria.score} 分
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 text-sm">
            <SmartContent
              markdown={criteria.commentsMarkdown}
              plainText={criteria.comments}
              className="prose-p:mb-2"
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const AnalysisSection = ({ 
  analysis, 
  analysisMarkdown
}: { 
  analysis?: string; 
  analysisMarkdown?: string;
}) => {
  if (!analysis && !analysisMarkdown) return null;

  return (
    <div className="mt-4">
      <SmartContent
        markdown={analysisMarkdown}
        plainText={analysis || ''}
      />
    </div>
  );
};

export function GradingResultDisplay({ result, className, onRetry }: GradingResultDisplayProps) {
  

  if (!result) {
    return <EmptyGradingState onRetry={onRetry} />;
  }

  const safeResult = {
    score: result.score || 0,
    analysis: result.analysis || '',
    analysisMarkdown: result.analysisMarkdown,
    criteriaScores: result.criteriaScores || [],
    strengths: ensureArray(result.strengths),
    strengthsMarkdown: result.strengthsMarkdown,
    improvements: ensureArray(result.improvements),
    improvementsMarkdown: result.improvementsMarkdown,
    overallSuggestions: result.overallSuggestions,
    overallSuggestionsMarkdown: result.overallSuggestionsMarkdown,
    createdAt: result.createdAt || new Date(),
    gradingDuration: result.gradingDuration
  };

  const createdDate = typeof safeResult.createdAt === 'string' 
    ? new Date(safeResult.createdAt) 
    : safeResult.createdAt instanceof Date
      ? safeResult.createdAt 
      : new Date();

  const formattedDate = createdDate.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex justify-between items-center">
        <div>
          <div className="text-sm text-muted-foreground flex flex-col sm:flex-row sm:space-x-4">
            <span>評分時間: {formattedDate}</span>
            {safeResult.gradingDuration && <span>處理時間: {(safeResult.gradingDuration / 1000).toFixed(1)}秒</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <ScoreCard score={safeResult.score} />

          {/* 優點列表 */}
          {safeResult.strengths.length > 0 && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <File className="h-5 w-5 mr-2 text-green-600" />
                  優點
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TagsList 
                  items={safeResult.strengths} 
                  markdownItems={safeResult.strengthsMarkdown}
                  variant="strength" 
                />
              </CardContent>
            </Card>
          )}

          {/* 改進項目 */}
          {safeResult.improvements.length > 0 && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <ArrowUpDown className="h-5 w-5 mr-2 text-yellow-600" />
                  需要改進
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TagsList 
                  items={safeResult.improvements} 
                  markdownItems={safeResult.improvementsMarkdown}
                  variant="improvement" 
                />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="md:col-span-2">
          <Tabs defaultValue="analysis" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="analysis">詳細分析</TabsTrigger>
              <TabsTrigger value="criteria">評分標準</TabsTrigger>
            </TabsList>

            <TabsContent value="analysis" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>評分分析</CardTitle>
                </CardHeader>
                <CardContent>
                  <AnalysisSection 
                    analysis={safeResult.analysis} 
                    analysisMarkdown={safeResult.analysisMarkdown}
                  />

                  {/* 整體建議 */}
                  {(safeResult.overallSuggestions || safeResult.overallSuggestionsMarkdown) && (
                    <div className="mt-6 pt-6 border-t">
                      <h3 className="font-medium mb-2">整體建議</h3>
                      <SmartContent
                        markdown={safeResult.overallSuggestionsMarkdown}
                        plainText={safeResult.overallSuggestions || ''}
                        className="prose-p:mb-2"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="criteria" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>評分標準詳情</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* 顯示詳細評分項目 */}
                  <CriteriaDetails criteriaScores={safeResult.criteriaScores} />

                  {/* 如果沒有細項評分標準，顯示總分說明 */}
                  {(!safeResult.criteriaScores || safeResult.criteriaScores.length === 0) && (
                    <div className="text-center py-8">
                      <p className="text-lg text-muted-foreground">總評分: {safeResult.score} 分</p>
                      {(safeResult.overallSuggestions || safeResult.overallSuggestionsMarkdown) && (
                        <div className="mt-4 max-w-md mx-auto">
                          <SmartContent
                            markdown={safeResult.overallSuggestionsMarkdown}
                            plainText={safeResult.overallSuggestions || ''}
                            className="prose-p:mb-2"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
