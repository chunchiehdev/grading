import { cn } from '@/lib/utils';
import { Markdown } from '@/components/ui/markdown';
import { EmptyGradingState } from './EmptyGradingState';
import { CompactStructuredFeedback } from './StructuredFeedback';
import { GradingResultData } from '@/types/grading';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

// Updated to work with new grading result format from database - types now imported from @/types/grading

interface GradingResultDisplayProps {
  result?: GradingResultData;
  normalizedScore?: number | null;
  thoughtSummary?: string | null;
  thinkingProcess?: string | null; // Feature 012
  gradingRationale?: string | null; // Feature 012
  className?: string;
  onRetry?: () => void;
  isLoading?: boolean;
}


// Removed ScoreCard; score info will be integrated in a simple header.

const CriteriaDetails = ({ breakdown }: { breakdown?: GradingResultData['breakdown'] }) => {
  const { t } = useTranslation('grading');
  if (!breakdown || breakdown.length === 0) return null;

  return (
    <div className="space-y-3 mt-4">
      {breakdown.map((criteria, index) => (
        <div
          key={criteria.criteriaId || index}
          className="rounded-lg p-2 space-y-2 border-b border-border/30 last:border-b-0"
        >
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-base font-semibold">
              {criteria.name || t('result.criteriaItem', { index: index + 1 })}
            </h4>
            <Badge variant="secondary">{t('result.scorePoints', { score: criteria.score })}</Badge>
          </div>
          <div className="text-sm text-muted-foreground leading-relaxed">
            <Markdown>{criteria.feedback}</Markdown>
          </div>
        </div>
      ))}
    </div>
  );
};

// Removed unused AnalysisSection component

export function GradingResultDisplay({
  result,
  normalizedScore,
  thoughtSummary,
  thinkingProcess,
  gradingRationale,
  className,
  onRetry,
  isLoading,
}: GradingResultDisplayProps) {
  const { t } = useTranslation('grading');

  // 1. Streaming/Thinking Area (Always visible if there is content or loading)
  // Use thinkingProcess if available.
  // Fallback to thoughtSummary ONLY if it's likely an old record (not just a duplicate of gradingRationale)
  let activeThinkingProcess = thinkingProcess;
  if (!activeThinkingProcess && thoughtSummary && thoughtSummary !== gradingRationale) {
    activeThinkingProcess = thoughtSummary;
  }
  
  const showThinkingArea = isLoading || (activeThinkingProcess && activeThinkingProcess.length > 0);

  const safeResult = result ? {
    totalScore: result.totalScore || 0,
    maxScore: result.maxScore || 100,
    breakdown: result.breakdown || [],
    overallFeedback: result.overallFeedback || t('result.noFeedback'),
  } : null;

  // Use normalized score (100-point scale) if available, otherwise calculate from result
  const displayScore = safeResult 
    ? (normalizedScore ?? ((safeResult.totalScore / safeResult.maxScore) * 100))
    : 0;

  return (
    <div className={cn('space-y-6 pb-6', className)}>
      
      {/* Top: Streaming Thinking Process */}
      {showThinkingArea && (
        <Collapsible 
          open={isLoading ? true : undefined}
          defaultOpen={isLoading} 
          className="animate-in fade-in duration-500 mb-6 group"
        >
           <div className="flex items-center py-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 p-0 h-auto hover:bg-transparent text-sm font-medium text-muted-foreground">
                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                {isLoading ? (
                  <span className="flex items-center gap-1 text-[#E07A5F] animate-pulse">
                    <span>正在思考</span>
                    <span className="flex gap-[2px] pt-[6px]">
                      <span className="w-1 h-1 bg-current rounded-full animate-dot" />
                      <span className="w-1 h-1 bg-current rounded-full animate-dot" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 bg-current rounded-full animate-dot" style={{ animationDelay: '300ms' }} />
                    </span>
                  </span>
                ) : (
                  <span>{t('thinkingProcess.viewProcess')}</span>
                )}
              </Button>
            </CollapsibleTrigger>
           </div>
           
           <CollapsibleContent>
            <div className="pb-4 pt-2">
              {/* Vertical Timeline Container */}
              <div className="relative pl-6">
                {/* Vertical Line - 左側貫穿的灰色線條，對齊上方的下拉按鈕 */}
                <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
                
                {/* Content */}
                <div className="text-sm text-muted-foreground/90 leading-relaxed">
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1">
                    {isLoading ? (
                      <>
                        <Markdown>{activeThinkingProcess || ''}</Markdown>
                      </>
                    ) : (
                      <Markdown>{activeThinkingProcess || ''}</Markdown>
                    )}
                  </div>
                </div>
              </div>
            </div>
           </CollapsibleContent>
        </Collapsible>
      )}

      {/* Middle: Result Content (Only if result exists) */}
      {safeResult ? (
        <>
          {/* Compact score header - 100-point scale */}
          <div className="p-2 flex items-center gap-3 h-10">
            <span className="text-2xl font-semibold leading-none">{displayScore.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>

          {/* Overall Feedback (compact) */}
          <section className="p-2 space-y-2">
            <h3 className="text-sm font-medium">{t('result.overallFeedback')}</h3>
            <div className="text-sm text-muted-foreground">
              <CompactStructuredFeedback feedback={safeResult.overallFeedback} />
            </div>
          </section>

          {/* Detailed criteria: direct stack */}
          <section>
            <h3 className="p-2 text-sm font-medium mb-2">{t('result.criteriaDetails')}</h3>
            <div className="space-y-3 overflow-auto pr-1">
              <CriteriaDetails breakdown={safeResult.breakdown} />
              {safeResult.breakdown.length === 0 && (
                <div className="text-sm text-muted-foreground">{t('result.noCriteria')}</div>
              )}
            </div>
          </section>
        </>
      ) : (
        /* Empty State if not loading and no result */
        !isLoading && <EmptyGradingState onRetry={onRetry} />
      )}

      {/* Bottom: Collapsible Summary REMOVED */}
    </div>
  );
}
