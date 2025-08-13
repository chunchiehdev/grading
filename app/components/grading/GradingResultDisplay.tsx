import { cn } from '@/lib/utils';
import { Markdown } from '@/components/ui/markdown';
import { EmptyGradingState } from './EmptyGradingState';
import { StructuredFeedback } from './StructuredFeedback';
import { GradingResultData } from '@/types/grading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Updated to work with new grading result format from database - types now imported from @/types/grading

interface GradingResultDisplayProps {
  result?: GradingResultData;
  className?: string;
  onRetry?: () => void;
}

// Removed unused helper functions for cleaner code

// Removed ScoreCard; score info will be integrated in a simple header.

const CriteriaDetails = ({ breakdown }: { breakdown?: GradingResultData['breakdown'] }) => {
  if (!breakdown || breakdown.length === 0) return null;

  return (
    <div className="space-y-4 mt-4">
      {breakdown.map((criteria, index) => (
        <Card key={criteria.criteriaId || index}>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">
              {criteria.name || `評分項目 ${index + 1}`}
            </CardTitle>
            <Badge variant="secondary">{criteria.score} 分</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground leading-relaxed">
              <Markdown>{criteria.feedback}</Markdown>
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

  return (
    <div className={cn('space-y-6', className)}>
      {/* Score summary */}
      <div className="flex items-center gap-3">
        <span className="text-2xl font-semibold">{safeResult.totalScore}</span>
        <span className="text-sm text-muted-foreground">/ {safeResult.maxScore}</span>
        <Badge variant="secondary" className="ml-1">{percentage}%</Badge>
      </div>

      {/* Overall feedback */}
      <section>
        <h3 className="text-sm font-medium mb-2">整體評分回饋</h3>
        <div className="text-sm text-muted-foreground">
          <StructuredFeedback feedback={safeResult.overallFeedback} />
        </div>
      </section>

      {/* Detailed breakdown */}
      <section>
        <h3 className="text-sm font-medium mb-2">評分項目詳情</h3>
        <CriteriaDetails breakdown={safeResult.breakdown} />
        {safeResult.breakdown.length === 0 && (
          <div className="text-sm text-muted-foreground">無詳細評分項目</div>
        )}
      </section>
    </div>
  );
}
