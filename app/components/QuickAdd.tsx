import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, FolderPlus, FileText, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QuickAddProps {
  onAddCategory: (name?: string) => string;
  onAddCriterion: (name?: string) => string;
  canAddCriterion: boolean;
  selectedCategoryName?: string;
}

const CATEGORY_TEMPLATES = [
  { 
    name: "思維探究", 
    criteria: ["論點形成", "邏輯推理", "證據運用", "批判思考"] 
  },
  { 
    name: "溝通表達", 
    criteria: ["表達清晰", "內容組織", "語言運用", "互動回應"] 
  },
  { 
    name: "創意創新", 
    criteria: ["創意發想", "原創性", "實用性", "創新應用"] 
  },
  { 
    name: "團隊合作", 
    criteria: ["協作參與", "溝通協調", "責任分工", "成果整合"] 
  }
];

const CRITERION_TEMPLATES = [
  "內容完整性", "邏輯條理", "表達流暢", "創意表現",
  "實用價值", "技術水準", "美觀程度", "可行性"
];

export const QuickAdd = ({ 
  onAddCategory,
  onAddCriterion,
  canAddCriterion,
  selectedCategoryName 
}: QuickAddProps) => {
  const [categoryName, setCategoryName] = useState("");
  const [criterionName, setCriterionName] = useState("");

  const handleAddCategory = () => {
    if (categoryName.trim()) {
      onAddCategory(categoryName.trim());
      setCategoryName("");
    }
  };

  const handleAddCriterion = () => {
    if (criterionName.trim()) {
      onAddCriterion(criterionName.trim());
      setCriterionName("");
    }
  };

  const handleTemplateCategory = (template: typeof CATEGORY_TEMPLATES[0]) => {
    onAddCategory(template.name);
  };

  const handleQuickCriterion = (criterionName: string) => {
    if (canAddCriterion) {
      onAddCriterion(criterionName);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Plus className="h-4 w-4" />
          快速添加
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FolderPlus className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">新增類別</span>
          </div>
          
          <div className="space-y-2">
            <Input
              placeholder="輸入類別名稱..."
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && categoryName.trim()) {
                  handleAddCategory();
                }
              }}
              className="h-9"
            />
            <Button 
              type="button"
              size="sm" 
              disabled={!categoryName.trim()}
              className="w-full"
              onClick={handleAddCategory}
            >
              新增類別
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">新增標準</span>
          </div>
          
          {canAddCriterion ? (
            <>
              <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                添加到：<span className="font-medium">{selectedCategoryName}</span>
              </div>
              
              <div className="space-y-2">
                <Input
                  placeholder="輸入標準名稱..."
                  value={criterionName}
                  onChange={(e) => setCriterionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && criterionName.trim()) {
                      handleAddCriterion();
                    }
                  }}
                  className="h-9"
                />
                <Button 
                  type="button"
                  size="sm" 
                  disabled={!criterionName.trim()}
                  className="w-full"
                  onClick={handleAddCriterion}
                >
                  新增標準
                </Button>
              </div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground italic text-center py-3 bg-muted/30 rounded border-dashed border">
              請先選擇或新增一個類別
            </div>
          )}
        </div>

        {canAddCriterion && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">快速標準</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {CRITERION_TEMPLATES.slice(0, 4).map((template) => (
                <Button
                  key={template}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 justify-start"
                  onClick={() => handleQuickCriterion(template)}
                >
                  {template}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* 類別模板 */}
        <div className="space-y-3 pt-3 border-t">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium">類別模板</span>
          </div>
          
          <div className="space-y-2">
            {CATEGORY_TEMPLATES.map((template) => (
              <Button
                key={template.name}
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-8"
                onClick={() => handleTemplateCategory(template)}
              >
                <span className="truncate">{template.name}</span>
                <span className="ml-auto text-muted-foreground">
                  {template.criteria.length}項
                </span>
              </Button>
            ))}
          </div>
          
          <div className="text-xs text-muted-foreground">
            💡 使用模板快速建立類別，然後手動添加需要的標準
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 