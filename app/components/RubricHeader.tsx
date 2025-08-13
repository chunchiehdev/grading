import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Eye } from "lucide-react";

interface RubricHeaderProps {
  onBack: () => void;
  onSave: () => void;
  onPreview: () => void;
  rubricName?: string;
  isEditing?: boolean;
}

export const RubricHeader = ({
  onBack,
  onSave,
  onPreview,
  rubricName,
  isEditing = false,
}: RubricHeaderProps) => {
  return (
    <div className="border-b bg-background/95 backdrop-blur-sm z-40">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack} type="button">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-xl font-semibold">
              {isEditing ? `編輯 - ${rubricName || '評分標準'}` : rubricName || '新評分標準'}
            </h1>
          </div>
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
      </div>
    </div>
  );
};
