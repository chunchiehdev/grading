import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Eye, Download, FileText } from "lucide-react";

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

interface Category {
  id: string;
  name: string;
  criteria: Criterion[];
}

interface RubricData {
  name: string;
  description: string;
  categories: Category[];
}

interface RubricPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  rubricData: RubricData;
}

const LEVEL_COLORS = {
  4: "bg-emerald-100 text-emerald-800 border-emerald-200",
  3: "bg-blue-100 text-blue-800 border-blue-200", 
  2: "bg-amber-100 text-amber-800 border-amber-200",
  1: "bg-red-100 text-red-800 border-red-200"
};

const LEVEL_LABELS = {
  4: "優秀",
  3: "良好", 
  2: "及格",
  1: "需改進"
};

export const RubricPreview = ({ isOpen, onClose, rubricData }: RubricPreviewProps) => {
  const totalCriteria = rubricData.categories.reduce((acc, cat) => acc + cat.criteria.length, 0);
  const completedCriteria = rubricData.categories.reduce((acc, cat) => 
    acc + cat.criteria.filter(crit => 
      crit.levels.some(level => level.description.trim())
    ).length, 0
  );

  const maxScore = totalCriteria * 4;
  const completionRate = totalCriteria > 0 ? Math.round((completedCriteria / totalCriteria) * 100) : 0;

  const handleExport = () => {
    console.log('Export rubric:', rubricData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">{rubricData.name || '評分標準預覽'}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {rubricData.categories.length} 類別
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {totalCriteria} 標準
                  </Badge>
                  <Badge 
                    variant={completionRate === 100 ? "default" : "secondary"} 
                    className="text-xs"
                  >
                    {completionRate}% 完成
                  </Badge>
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              導出
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="p-6 space-y-6">
            {rubricData.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">評分標準說明</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {rubricData.description}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">評分概要</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-primary">{totalCriteria}</div>
                    <div className="text-xs text-muted-foreground">評分標準</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-primary">{maxScore}</div>
                    <div className="text-xs text-muted-foreground">總分</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-primary">4</div>
                    <div className="text-xs text-muted-foreground">等級數</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-primary">{completionRate}%</div>
                    <div className="text-xs text-muted-foreground">完成度</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {rubricData.categories.map((category, categoryIndex) => (
              <Card key={category.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      {categoryIndex + 1}
                    </span>
                    {category.name}
                    <Badge variant="outline" className="ml-auto">
                      {category.criteria.length} 個標準
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {category.criteria.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic text-center py-4">
                      此類別尚無評分標準
                    </p>
                  ) : (
                    category.criteria.map((criterion, criterionIndex) => (
                      <div key={criterion.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">
                              {categoryIndex + 1}.{criterionIndex + 1} {criterion.name}
                            </h4>
                            {criterion.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {criterion.description}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="ml-2">
                            最高 4 分
                          </Badge>
                        </div>

                        {/* 等級標準 */}
                        <div className="grid gap-2">
                          <h5 className="text-sm font-medium text-muted-foreground">評分等級：</h5>
                          <div className="grid gap-2">
                            {[4, 3, 2, 1].map((score) => {
                              const level = criterion.levels.find(l => l.score === score);
                              const description = level?.description || '';
                              
                              return (
                                <div key={score} className="flex items-start gap-3 p-2 rounded-md bg-muted/30">
                                  <Badge 
                                    className={`${LEVEL_COLORS[score as keyof typeof LEVEL_COLORS]} border`}
                                    variant="outline"
                                  >
                                    {score}分 - {LEVEL_LABELS[score as keyof typeof LEVEL_LABELS]}
                                  </Badge>
                                  <div className="flex-1 min-w-0">
                                    {description ? (
                                      <p className="text-sm">{description}</p>
                                    ) : (
                                      <p className="text-sm text-muted-foreground italic">
                                        尚未設定此等級的描述
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ))}

            {rubricData.categories.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">尚無內容可預覽</h3>
                  <p className="text-muted-foreground">
                    請先添加評分類別和標準來查看預覽
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}; 