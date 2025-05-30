import { Star, File } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyGradingState } from './EmptyGradingState';
// Updated to work with new grading result format from database
export interface GradingResultData {
  totalScore: number;
  maxScore: number;
  breakdown: Array<{
    criteriaId: string;
    score: number;
    feedback: string;
  }>;
  overallFeedback: string;
}

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
    <div className="space-y-4 mt-4">
      {breakdown.map((criteria, index) => (
        <Card key={criteria.criteriaId || index} className="overflow-hidden">
          <CardHeader className="bg-slate-50 py-3">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-sm">評分項目 {index + 1}</h4>
              <Badge variant="outline" className="font-bold">
                {criteria.score} 分
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 text-sm">
            <div className="prose prose-sm max-w-none">
              {criteria.feedback}
            </div>
          </CardContent>
        </Card>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <ScoreCard score={safeResult.totalScore} maxScore={safeResult.maxScore} />
          
          {/* Progress visualization */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <File className="h-5 w-5 mr-2 text-blue-600" />
                評分進度
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={percentage} className="mb-2" />
              <div className="text-sm text-muted-foreground text-center">
                {safeResult.totalScore} / {safeResult.maxScore} 分 ({percentage}%)
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Tabs defaultValue="feedback" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="feedback">整體回饋</TabsTrigger>
              <TabsTrigger value="breakdown">詳細評分</TabsTrigger>
            </TabsList>

            <TabsContent value="feedback" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>整體評分回饋</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    {safeResult.overallFeedback}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="breakdown" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>評分項目詳情</CardTitle>
                </CardHeader>
                <CardContent>
                  <CriteriaDetails breakdown={safeResult.breakdown} />

                  {safeResult.breakdown.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-lg text-muted-foreground">
                        總評分: {safeResult.totalScore} / {safeResult.maxScore} 分
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        無詳細評分項目
                      </p>
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
