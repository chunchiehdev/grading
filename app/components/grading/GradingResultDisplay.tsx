import { cn } from '@/lib/utils';
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

// Removed ScoreCard; score info will be integrated in a simple header.

const CriteriaDetails = ({ breakdown }: { breakdown?: GradingResultData['breakdown'] }) => {
  if (!breakdown || breakdown.length === 0) return null;

  return (
    <div className="space-y-6 mt-4">
      {breakdown.map((criteria, index) => (
        <div key={criteria.criteriaId || index} className="border border-black rounded-md p-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-slate-900">{criteria.name || `評分項目 ${index + 1}`}</h4>
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

  return (
    <div className={cn('space-y-6', className)}>
      {/* Integrated score header */}
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold">{safeResult.totalScore}</span>
        <span className="text-lg text-muted-foreground">/ {safeResult.maxScore}</span>
        <span className="ml-3 text-sm text-muted-foreground">{percentage}%</span>
      </div>

      {/* Overall feedback */}
      <section>
        <h3 className="text-lg font-semibold mb-2">整體評分回饋</h3>
        <div className="prose prose-sm max-w-none">
          <StructuredFeedback feedback={safeResult.overallFeedback} />
        </div>
      </section>

      {/* Detailed breakdown */}
      <section>
        <h3 className="text-lg font-semibold mb-2">評分項目詳情</h3>
        <CriteriaDetails breakdown={safeResult.breakdown} />
        {safeResult.breakdown.length === 0 && (
          <div className="text-sm text-muted-foreground">無詳細評分項目</div>
        )}
      </section>
    </div>
  );
}
