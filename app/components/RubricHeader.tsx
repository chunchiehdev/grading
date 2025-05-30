import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RubricHeaderProps {
  onBack: () => void;
  onSave: () => void;
  onPreview: () => void;
  progress: {
    categories: number;
    criteria: number;
    completed: number;
  };
  rubricName?: string;
  isEditing?: boolean;
}

export const RubricHeader = ({ 
  onBack, 
  onSave, 
  onPreview, 
  progress, 
  rubricName,
  isEditing = false
}: RubricHeaderProps) => {
  const completionRate = progress.completed > 0 
    ? Math.round((progress.completed / (progress.categories * progress.criteria)) * 100)
    : 0;

  return (
    <div className="border-b bg-background/95 backdrop-blur-sm z-40">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack} type="button">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="text-xl font-semibold">
                {isEditing ? `編輯 - ${rubricName || '評分標準'}` : (rubricName || '新評分標準')}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {progress.categories} 類別
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {progress.criteria} 標準
                </Badge>
                {completionRate > 0 && (
                  <Badge 
                    variant={completionRate === 100 ? "default" : "secondary"} 
                    className="text-xs"
                  >
                    {completionRate}% 完成
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onPreview} type="button">
              <Eye className="w-4 h-4 mr-2" />
              預覽
            </Button>
            <Button size="sm" onClick={onSave} type="button">
              <Save className="w-4 h-4 mr-2" />
              {isEditing ? '更新' : '儲存'}
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        {completionRate > 0 && (
          <div className="mt-3">
            <div className="w-full bg-muted rounded-full h-1.5">
              <div 
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 