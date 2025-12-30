import { cn } from '@/lib/utils';
import { Markdown } from '@/components/ui/markdown';
import { EmptyGradingState } from './EmptyGradingState';
import { LoadingAnalysisIcon } from './LoadingAnalysisIcon';
import { CompactStructuredFeedback } from './StructuredFeedback';
import { GradingResultData } from '@/types/grading';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';



const Typewriter = ({ text, minSpeed = 5, maxSpeed = 30 }: { text: string; minSpeed?: number; maxSpeed?: number }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    // 1. Handle Reset / New Content
    if (!text) {
      setDisplayedText('');
      return;
    }

    // If text is shorter than what we displayed, or doesn't match the prefix, it's a new stream
    if (text.length < displayedText.length || !text.startsWith(displayedText)) {
      setDisplayedText('');
      return;
    }

    // 2. Handle Completion
    if (displayedText.length === text.length) return;

    // 3. Calculate Next Chunk (Token Simulation)
    const remaining = text.slice(displayedText.length);
    
    // Heuristic for token size:
    // - CJK: 1-3 characters
    // - Latin: 2-8 characters (roughly a word or part of word)
    // - Punctuation/Newlines: usually end a token
    
    let chunkSize = 1;
    const nextChar = remaining[0];
    const isCJK = /[\u4e00-\u9fa5]/.test(nextChar);

    if (isCJK) {
      // Chinese: often 1-2 chars per token
      chunkSize = Math.floor(Math.random() * 2) + 1; // 1 or 2
    } else {
      // English: try to find next word boundary
      const spaceIndex = remaining.search(/\s/);
      if (spaceIndex > 0 && spaceIndex <= 6) {
        chunkSize = spaceIndex + 1; // Include the space
      } else {
        chunkSize = Math.floor(Math.random() * 4) + 2; // 2-5 chars
      }
    }

    // Ensure we don't overshoot
    chunkSize = Math.min(chunkSize, remaining.length);
    const nextChunk = remaining.slice(0, chunkSize);

    // 4. Calculate Delay (Simulate Inference Time)
    // Base delay
    let delay = Math.random() * (maxSpeed - minSpeed) + minSpeed;
    
    // Add "thinking" pauses for punctuation
    if (/[,.!?;，。！？；：]/.test(nextChunk)) {
      delay += 30; 
    }
    if (/\n/.test(nextChunk)) {
      delay += 150; // Paragraph break pause
    }
    
    // Occasional random "thinking" pause (1% chance)
    if (Math.random() < 0.01) {
      delay += 300;
    }

    const timeoutId = setTimeout(() => {
      setDisplayedText(prev => prev + nextChunk);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [text, displayedText, minSpeed, maxSpeed]);

  return <Markdown>{displayedText}</Markdown>;
};

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

// Removed unused helper functions for cleaner code

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
                <span>{isLoading ? "AI 正在思考..." : "查看思考過程"}</span>
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
                        <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-purple-500/50 animate-pulse" />
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
