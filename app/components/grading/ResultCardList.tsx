import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { GradingResultDisplay } from './GradingResultDisplay';
import { type GradingResultData } from '@/types/grading';
import { FileText, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface ResultCardItem {
  id: string;
  title: string;
  fileName: string;
  rubricName: string;
  result: GradingResultData;
  normalizedScore?: number | null;
}

interface ResultCardListProps {
  results: ResultCardItem[];
}

export function ResultCardList({ results }: ResultCardListProps) {
  const { t } = useTranslation(['grading', 'common']);
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newExpandedIds = new Set(expandedIds);
    if (expandedIds.has(id)) {
      newExpandedIds.delete(id);
    } else {
      newExpandedIds.add(id);
    }
    setExpandedIds(newExpandedIds);
  };

  const expandAll = () => {
    setExpandedIds(new Set(results.map((r) => r.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  if (!results || results.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{t('grading:resultCard.noResults')}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            {t('common:expandAll')}
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            {t('common:collapseAll')}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {results.map((resultItem, index) => {
          // Use normalized score (100-point scale) if available, otherwise fallback to old calculation
          const displayScore =
            resultItem.normalizedScore ?? Math.round((resultItem.result.totalScore / resultItem.result.maxScore) * 100);
          const isExpanded = expandedIds.has(resultItem.id);

          return (
            <Card key={resultItem.id} className="overflow-hidden">
              <CardHeader
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleExpand(resultItem.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                      <span className="text-sm font-bold text-primary">{index + 1}</span>
                    </div>

                    <div>
                      <CardTitle className="text-lg">{resultItem.fileName}</CardTitle>
                      <p className="text-sm text-muted-foreground">{t('grading:resultCard.rubric', { name: resultItem.rubricName })}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-right min-w-[120px]">
                      <div className="flex items-center justify-end space-x-2 mb-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-xl font-bold">{displayScore.toFixed(1)}</span>
                        <span className="text-sm text-muted-foreground">/ 100</span>
                      </div>
                      <Progress value={displayScore} className="h-2 w-24 ml-auto" />
                      <div className="text-xs text-muted-foreground mt-1">{displayScore.toFixed(0)}%</div>
                    </div>

                    <Badge
                      variant={
                        displayScore >= 90
                          ? 'default'
                          : displayScore >= 80
                            ? 'secondary'
                            : displayScore >= 70
                              ? 'outline'
                              : 'destructive'
                      }
                      className="min-w-16 justify-center"
                    >
                      {displayScore >= 90
                        ? t('grading:resultCard.grades.excellent')
                        : displayScore >= 80
                          ? t('grading:resultCard.grades.good')
                          : displayScore >= 70
                            ? t('grading:resultCard.grades.satisfactory')
                            : displayScore >= 60
                              ? t('grading:resultCard.grades.acceptable')
                              : t('grading:resultCard.grades.needsImprovement')}
                    </Badge>

                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="border-t bg-muted/20 pt-6">
                  <GradingResultDisplay result={resultItem.result} normalizedScore={resultItem.normalizedScore} />
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
