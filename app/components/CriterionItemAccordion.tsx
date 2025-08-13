import { AccordionItem, AccordionContent } from '@/components/ui/accordion';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Trash2, ChevronDown } from 'lucide-react';
import { InlineEdit } from './InlineEdit';
import { cn } from '@/lib/utils';

interface Level {
  score: number;
  description: string;
}

interface Criterion {
  id: string;
  name: string;
  description: string;
  levels: Level[];
}

interface CriterionItemAccordionProps {
  criterion: Criterion;
  isSelected?: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<Criterion>) => void;
  onDelete: () => void;
  onUpdateLevel: (score: number, description: string) => void;
}

const LEVEL_LABELS: Record<number, string> = {
  4: '優秀',
  3: '良好',
  2: '及格',
  1: '需改進',
};

export function CriterionItemAccordion({
  criterion,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onUpdateLevel,
}: CriterionItemAccordionProps) {
  const completedLevels = criterion.levels.filter((l) => l.description.trim()).length;

  return (
    <AccordionItem value={criterion.id} className={cn('border-border', isSelected && 'bg-accent/30')}>
      <AccordionPrimitive.Header className="flex items-center">
        <AccordionPrimitive.Trigger
          onClick={onSelect}
          className={cn(
            'group flex-1 grid grid-cols-[1fr_auto] items-center gap-3 px-4 sm:px-6 py-4 text-left text-sm font-medium transition-all hover:underline',
          )}
        >
          <div className="min-w-0">
            <InlineEdit
              value={criterion.name}
              placeholder="標準名稱"
              variant="subtitle"
              onSave={(name) => onUpdate({ name })}
              className="truncate"
            />
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-xs whitespace-nowrap">
              {completedLevels}/4 等級
            </Badge>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </div>
        </AccordionPrimitive.Trigger>
        <div className="pr-2 sm:pr-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete()}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </AccordionPrimitive.Header>
      <AccordionContent>
        <div className="px-4 sm:px-6 pb-2">
          <InlineEdit
            value={criterion.description}
            placeholder="點擊添加標準描述..."
            multiline
            onSave={(description) => onUpdate({ description })}
            className="mt-1.5"
          />
        </div>
        <Separator className="mx-4 sm:mx-6" />
        <div className="px-4 sm:px-6 pt-3 divide-y divide-border">
          {[4, 3, 2, 1].map((score) => {
            const level = criterion.levels.find((l) => l.score === score);
            const description = level?.description || '';
            const completed = Boolean(description.trim());
            return (
              <div key={score} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2 w-40 shrink-0">
                  {/* <div className={cn('w-2.5 h-2.5 rounded-full', completed ? 'bg-primary' : 'bg-muted')} /> */}
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    {score} - {LEVEL_LABELS[score]}
                  </Badge>
                </div>
                <div className="flex-1 min-w-0">
                  <InlineEdit
                    value={description}
                    placeholder={`描述 Level ${score} 的表現標準...`}
                    multiline
                    onSave={(desc) => onUpdateLevel(score, desc)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
