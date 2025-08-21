import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, GripVertical } from "lucide-react";
import { InlineEdit } from "./InlineEdit";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

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

interface CriterionCardProps {
  criterion: Criterion;
  isSelected?: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<Criterion>) => void;
  onDelete: () => void;
  onUpdateLevel: (score: number, description: string) => void;
}



export const CriterionCard = ({
  criterion,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onUpdateLevel
}: CriterionCardProps) => {
  const { t } = useTranslation('rubric');
  const completedLevels = criterion.levels.filter(l => l.description.trim()).length;
  
  return (
    <Card
      className={cn(
        "group hover:shadow-md transition-all duration-200 cursor-pointer bg-card text-card-foreground border",
        isSelected && "ring-2 ring-primary shadow-md"
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1">
            <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex-1">
              <InlineEdit
                value={criterion.name}
                placeholder={t('criterionCard.criterionNamePlaceholder')}
                variant="subtitle"
                onSave={(name) => onUpdate({ name })}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <InlineEdit
          value={criterion.description}
          placeholder={t('criterionCard.criterionDescriptionPlaceholder')}
          multiline
          className="mt-2"
          onSave={(description) => onUpdate({ description })}
        />
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground">{t('criterionCard.levelStandards')}</h4>
            <div className="text-xs text-muted-foreground">
              {t('criterionCard.completedStatus', { completed: completedLevels })}
            </div>
          </div>
          
          {/* Level Progress Bar */}
          <div className="grid grid-cols-4 gap-1 h-2 rounded-full overflow-hidden bg-muted">
            {[4, 3, 2, 1].map((score) => {
              const level = criterion.levels.find((l) => l.score === score);
              const isCompleted = Boolean(level?.description.trim());
              return (
                <div key={score} className={cn("transition-all duration-300", isCompleted ? "bg-primary" : "bg-muted")} />
              );
            })}
          </div>

          {/* Level Details */}
          <div className="space-y-2">
            {[4, 3, 2, 1].map((score) => {
              const level = criterion.levels.find(l => l.score === score);
              const description = level?.description || '';
              
              return (
                <div key={score} className="flex items-start gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn("w-3 h-3 rounded-full flex-shrink-0", description ? "bg-primary" : "bg-muted")} />
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      {score} - {t(`levelLabels.${score}`)}
                    </Badge>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <InlineEdit
                      value={description}
                      placeholder={t('criterionCard.levelDescriptionPlaceholder', { score })}
                      multiline
                      onSave={(desc) => onUpdateLevel(score, desc)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
