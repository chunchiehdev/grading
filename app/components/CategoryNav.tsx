import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Folder, Trash2 } from "lucide-react";
import { InlineEdit } from "./InlineEdit";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  criteria: any[];
}

interface CategoryNavProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
  onAddCategory: (name?: string) => string;
  onUpdateCategory: (categoryId: string, name: string) => void;
  onDeleteCategory: (categoryId: string) => void;
}

export const CategoryNav = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory
}: CategoryNavProps) => {
  const handleAddCategory = () => {
    onAddCategory();
  };

  return (
    <Card className="h-fit">
      <CardContent className="p-0">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">評分類別</h3>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleAddCategory}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="p-6 text-center">
            <Folder className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">尚未新增類別</p>
            {/* <Button type="button" variant="outline" size="sm" onClick={handleAddCategory}>
              <Plus className="h-4 w-4 mr-2" />
              新增類別
            </Button> */}
          </div>
        ) : (
          <div className="p-2 max-h-96 overflow-y-auto">
            {categories.map((category) => {
              const isSelected = selectedCategoryId === category.id;
              const criteriaCount = category.criteria?.length || 0;
              
              return (
                <div
                  key={category.id}
                  className={cn(
                    "group flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer border-2 border-transparent mb-2",
                    isSelected 
                      ? "bg-primary text-primary-foreground border-primary" 
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => onSelectCategory(category.id)}
                >
                  <Folder className="h-4 w-4 flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="break-words">
                      <InlineEdit
                        value={category.name}
                        placeholder="類別名稱"
                        variant="body"
                        onSave={(name) => onUpdateCategory(category.id, name)}
                      />
                    </div>
                    <div className="text-xs opacity-70 mt-0.5">
                      {criteriaCount} 個標準
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity",
                        isSelected 
                          ? "text-primary-foreground hover:text-primary-foreground" 
                          : "text-destructive hover:text-destructive"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCategory(category.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 