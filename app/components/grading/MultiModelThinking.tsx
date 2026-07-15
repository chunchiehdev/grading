/**
 * MultiModelThinking — three-tab live thinking view (spec 020)
 *
 * Shows the thinking process for Gemini / GPT / Claude side-by-side via tabs.
 * Used when the multi-model judge is on. Reuses the existing tabs primitive,
 * Markdown renderer and muted-foreground typography from GradingResultDisplay
 * so the visual language stays identical.
 *
 * Mobile: tabs are inline-flex inside an inline-block wrapper, so they stay on
 * one row up to ~360px before the trigger labels collapse. The labels are 2-3
 * chars each (Gemini / GPT / Claude) which fits even on the narrowest phones.
 */

import { Markdown } from '@/components/ui/markdown';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export type ModelKey = 'gemini' | 'openai' | 'anthropic';

interface MultiModelThinkingProps {
  /** Map provider → accumulated markdown text. Missing keys are treated as empty. */
  streams: Partial<Record<ModelKey, string>>;
  /** Which providers are still in-flight (animated indicator). */
  inflight?: Partial<Record<ModelKey, boolean>>;
  /** Localised i18n strings, kept simple to avoid a new namespace. */
  labels?: {
    gemini?: string;
    openai?: string;
    anthropic?: string;
    waiting?: string;
  };
  className?: string;
}

const DEFAULT_LABELS = {
  gemini: 'Gemini',
  openai: 'GPT',
  anthropic: 'Claude',
  waiting: '等待中…',
} as const;

const ORDER: ModelKey[] = ['gemini', 'openai', 'anthropic'];

export function MultiModelThinking({ streams, inflight, labels, className }: MultiModelThinkingProps) {
  const L = { ...DEFAULT_LABELS, ...labels };

  // Pick the first provider with content for the default tab; fall back to gemini.
  const defaultValue: ModelKey = ORDER.find((k) => (streams[k]?.length ?? 0) > 0) ?? 'gemini';

  return (
    <Tabs defaultValue={defaultValue} className={cn('w-full', className)}>
      <TabsList className="w-full sm:w-auto justify-start overflow-x-auto">
        {ORDER.map((k) => (
          <TabsTrigger key={k} value={k} className="gap-1.5">
            <span>{L[k]}</span>
            {inflight?.[k] ? <Dot /> : null}
          </TabsTrigger>
        ))}
      </TabsList>

      {ORDER.map((k) => {
        const text = streams[k] ?? '';
        return (
          <TabsContent key={k} value={k}>
            <div className="relative pl-6">
              <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
              <div className="text-sm text-muted-foreground/90 leading-relaxed">
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1">
                  {text.length === 0 ? <p className="italic">{L.waiting}</p> : <Markdown>{text}</Markdown>}
                </div>
              </div>
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

function Dot() {
  return <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#E07A5F] animate-pulse" aria-hidden />;
}
