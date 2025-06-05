import { Star, File } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Markdown } from '@/components/ui/markdown';
import { EmptyGradingState } from './EmptyGradingState';
import { StructuredFeedback } from './StructuredFeedback';
import { GradingResultData } from '@/types/grading';

// Updated to work with new grading result format from database - types now imported from @/types/grading

interface GradingResultDisplayProps {
  result?: GradingResultData;
  className?: string;
  onRetry?: () => void;
}

// Removed unused helper functions for cleaner code

const ScoreCard = ({ score, maxScore }: { score: number; maxScore: number }) => {
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  
  return (
    <Card className="mb-4">
      <CardContent className="pt-6 text-center">
        <div className="flex items-center justify-center mb-2">
          <Star className="w-8 h-8 text-yellow-500 fill-yellow-500 mr-2" />
          <span className="text-5xl font-bold">{score}</span>
          <span className="text-2xl text-muted-foreground ml-1">/{maxScore}</span>
        </div>
        <div className="text-sm text-muted-foreground mb-2">
          得分率: {percentage}%
        </div>
        <p className="text-muted-foreground">
          {percentage >= 90 ? '優異' : percentage >= 80 ? '優良' : percentage >= 70 ? '良好' : percentage >= 60 ? '尚可' : '需要改進'}
        </p>
      </CardContent>
    </Card>
  );
};

const CriteriaDetails = ({ breakdown }: { breakdown?: GradingResultData['breakdown'] }) => {
  if (!breakdown || breakdown.length === 0) return null;

  return (
    <div className="space-y-6 mt-4">
      {breakdown.map((criteria, index) => (
        <div key={criteria.criteriaId || index} className="border-l-4 border-slate-200 pl-4 py-3">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-slate-900">評分項目 {index + 1}</h4>
            <span className="text-lg font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
              {criteria.score} 分
            </span>
          </div>
          <div className="text-sm text-slate-600 leading-relaxed">
            <Markdown>{criteria.feedback}</Markdown>
          </div>
        </div>
      ))}
    </div>
  );
};

// Removed unused AnalysisSection component

export function GradingResultDisplay({ result, className, onRetry }: GradingResultDisplayProps) {
  if (!result) {
    return <EmptyGradingState onRetry={onRetry} />;
  }

  const safeResult = {
    totalScore: result.totalScore || 0,
    maxScore: result.maxScore || 100,
    breakdown: result.breakdown || [],
    overallFeedback: result.overallFeedback || '無額外回饋'
  };

  const percentage = safeResult.maxScore > 0 ? Math.round((safeResult.totalScore / safeResult.maxScore) * 100) : 0;
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('zh-TW', {
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
          <div className="text-sm text-muted-foreground">
            <span>評分時間: {formattedDate}</span>
          </div>
        </div>
      </div>

      <div>
        <div className="md:col-span-2">
          <Tabs defaultValue="feedback" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="feedback">整體回饋</TabsTrigger>
              <TabsTrigger value="breakdown">詳細評分</TabsTrigger>
            </TabsList>

            <TabsContent value="feedback" className="mt-4">
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">整體評分回饋</h3>
                <div className="prose prose-sm max-w-none">
                  <StructuredFeedback feedback={safeResult.overallFeedback} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="breakdown" className="mt-4">
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">評分項目詳情</h3>
                
                <CriteriaDetails breakdown={safeResult.breakdown} />

                {safeResult.breakdown.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-xl text-slate-700 mb-2">
                      總評分: {safeResult.totalScore} / {safeResult.maxScore} 分
                    </p>
                    <p className="text-sm text-slate-500">
                      無詳細評分項目
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
