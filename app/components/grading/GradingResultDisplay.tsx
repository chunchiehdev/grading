import { cn } from '@/lib/utils';
import { Markdown } from '@/components/ui/markdown';
import { EmptyGradingState } from './EmptyGradingState';
import { CompactStructuredFeedback } from './StructuredFeedback';
import { GradingResultData } from '@/types/grading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

// Updated to work with new grading result format from database - types now imported from @/types/grading

interface GradingResultDisplayProps {
  result?: GradingResultData;
  normalizedScore?: number | null;
  className?: string;
  onRetry?: () => void;
}

// Removed unused helper functions for cleaner code

// Removed ScoreCard; score info will be integrated in a simple header.

const CriteriaDetails = ({ breakdown }: { breakdown?: GradingResultData['breakdown'] }) => {
  const { t } = useTranslation('grading');
  if (!breakdown || breakdown.length === 0) return null;

  return (
    <div className="space-y-4 mt-4">
      {breakdown.map((criteria, index) => (
        <Card key={criteria.criteriaId || index}>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">
              {criteria.name || t('result.criteriaItem', { index: index + 1 })}
            </CardTitle>
            <Badge variant="secondary">{t('result.scorePoints', { score: criteria.score })}</Badge>
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

export function GradingResultDisplay({ result, normalizedScore, className, onRetry }: GradingResultDisplayProps) {
  const { t } = useTranslation('grading');

  if (!result) {
    return <EmptyGradingState onRetry={onRetry} />;
  }

  const safeResult = {
    totalScore: result.totalScore || 0,
    maxScore: result.maxScore || 100,
    breakdown: result.breakdown || [],
    overallFeedback: result.overallFeedback || t('result.noFeedback')
  };

  // Use normalized score (100-point scale) if available, otherwise fallback to old calculation
  const displayScore = normalizedScore ?? Math.round((safeResult.totalScore / safeResult.maxScore) * 100);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Compact score header - 100-point scale */}
      <div className="flex items-center gap-3 h-10">
        <span className="text-2xl font-semibold leading-none">{displayScore.toFixed(1)}</span>
        <span className="text-sm text-muted-foreground">/ 100</span>
        <Badge variant="secondary" className="ml-1">{displayScore.toFixed(0)}%</Badge>
      </div>

      {/* Feedback (compact) */}
      <section className="space-y-2">
        <h3 className="text-sm font-medium">{t('result.overallFeedback')}</h3>
        <div className="text-sm text-muted-foreground">
          <CompactStructuredFeedback feedback={safeResult.overallFeedback} />
        </div>
      </section>

      {/* Detailed criteria: direct stack */}
      <section>
        <h3 className="text-sm font-medium mb-2">{t('result.criteriaDetails')}</h3>
        <div className="space-y-3 overflow-auto pr-1">
          <CriteriaDetails breakdown={safeResult.breakdown} />
          {safeResult.breakdown.length === 0 && (
            <div className="text-sm text-muted-foreground">{t('result.noCriteria')}</div>
          )}
        </div>
      </section>
    </div>
  );
}
