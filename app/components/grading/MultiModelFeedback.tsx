/**
 * MultiModelFeedback — three-tab view of each provider's raw grading output (spec 020).
 *
 * Lives next to the aggregated USC-merged feedback. Lets teachers / students see
 * what Gemini, GPT and Claude individually said before consensus merging.
 *
 * Visual language matches MultiModelThinking (same tab strip, muted-foreground
 * typography, no extra icons).
 */

import { Markdown } from '@/components/ui/markdown';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { GradingResultData } from '@/types/grading';

export type ModelKey = 'gemini' | 'openai' | 'anthropic';

interface MultiModelFeedbackProps {
  /** Map provider → that model's raw GradingResultData. Missing keys are hidden. */
  results: Partial<Record<ModelKey, GradingResultData>>;
  labels?: { gemini?: string; openai?: string; anthropic?: string };
  className?: string;
}

/**
 * Strip a leading markdown h1/h2 heading so an old USC-merged feedback that still
 * starts with "# 整合後的回饋" doesn't double up against the section title above it.
 */
function stripLeadingHeading(text: string): string {
  return text.replace(/^\s*#{1,6}\s.*\n+/, '').trim();
}

const DEFAULT_LABELS = { gemini: 'Gemini', openai: 'GPT', anthropic: 'Claude' } as const;
const ORDER: ModelKey[] = ['gemini', 'openai', 'anthropic'];

export function MultiModelFeedback({ results, labels, className }: MultiModelFeedbackProps) {
  const L = { ...DEFAULT_LABELS, ...labels };
  const available = ORDER.filter((k) => !!results[k]);
  if (available.length === 0) return null;

  return (
    <Tabs defaultValue={available[0]} className={cn('w-full', className)}>
      <TabsList className="w-full sm:w-auto justify-start overflow-x-auto">
        {available.map((k) => {
          const r = results[k]!;
          return (
            <TabsTrigger key={k} value={k} className="gap-1.5">
              <span>{L[k]}</span>
              <span className="text-[10px] tabular-nums opacity-70">
                {r.totalScore}/{r.maxScore}
              </span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {available.map((k) => {
        const r = results[k]!;
        const rawOverall = typeof r.overallFeedback === 'string' ? r.overallFeedback : '';
        const overall = stripLeadingHeading(rawOverall);
        return (
          <TabsContent key={k} value={k}>
            <div className="space-y-4 pt-2">
              {/* Overall feedback section */}
              {overall.length > 0 && (
                <section className="space-y-1">
                  <h4 className="text-sm font-medium">整體建議</h4>
                  <div className="text-sm text-muted-foreground/90 leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                    <Markdown>{overall}</Markdown>
                  </div>
                </section>
              )}

              {/* Per-criterion breakdown — each provider's own scores + feedback */}
              {r.breakdown?.length ? (
                <section className="space-y-2">
                  <h4 className="text-sm font-medium">評分項目</h4>
                  <div className="space-y-3">
                    {r.breakdown.map((c, i) => (
                      <div
                        key={c.criteriaId || i}
                        className="rounded-lg p-2 space-y-1 border-b border-border/30 last:border-b-0"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{c.name}</span>
                          <Badge variant="secondary">{c.score}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                          <Markdown>{c.feedback}</Markdown>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
