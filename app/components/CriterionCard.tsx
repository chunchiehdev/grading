import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, GripVertical } from "lucide-react";
import { InlineEdit } from "./InlineEdit";
import { cn } from "@/lib/utils";

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

const LEVEL_COLORS = {
  4: "bg-emerald-500",
  3: "bg-blue-500", 
  2: "bg-amber-500",
  1: "bg-red-500"
};

const LEVEL_LABELS = {
  4: "優秀",
  3: "良好", 
  2: "及格",
  1: "需改進"
};

export const CriterionCard = ({
  criterion,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onUpdateLevel
}: CriterionCardProps) => {
  const completedLevels = criterion.levels.filter(l => l.description.trim()).length;
  const completionRate = Math.round((completedLevels / 4) * 100);

  return (
    <Card 
      className={cn(
        "group hover:shadow-md transition-all duration-200 cursor-pointer",
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
                placeholder="標準名稱"
                variant="subtitle"
                onSave={(name) => onUpdate({ name })}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* <Badge 
              variant={completionRate === 100 ? "default" : "secondary"}
              className="text-xs"
            >
              {completionRate}%
            </Badge> */}
            <Button
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
          placeholder="點擊添加標準描述..."
          multiline
          className="mt-2"
          onSave={(description) => onUpdate({ description })}
        />
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground">等級標準</h4>
            <div className="text-xs text-muted-foreground">
              {completedLevels}/4 已完成
            </div>
          </div>
          
          {/* Level Progress Bar */}
          <div className="grid grid-cols-4 gap-1 h-2 rounded-full overflow-hidden bg-muted">
            {[4, 3, 2, 1].map((score) => {
              const level = criterion.levels.find(l => l.score === score);
              const isCompleted = level?.description.trim();
              return (
                <div
                  key={score}
                  className={cn(
                    "transition-all duration-300",
                    isCompleted ? LEVEL_COLORS[score as keyof typeof LEVEL_COLORS] : "bg-muted"
                  )}
                />
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
                    <div 
                      className={cn(
                        "w-3 h-3 rounded-full flex-shrink-0",
                        description ? LEVEL_COLORS[score as keyof typeof LEVEL_COLORS] : "bg-muted"
                      )}
                    />
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      {score} - {LEVEL_LABELS[score as keyof typeof LEVEL_LABELS]}
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
        </div>
      </CardContent>
    </Card>
  );
}; 