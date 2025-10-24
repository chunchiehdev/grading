import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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

const LEVEL_LABELS = {
  4: 'Excellent',
  3: 'Good',
  2: 'Fair',
  1: 'Poor',
};

export const RubricPreview = ({ isOpen, onClose, rubricData }: RubricPreviewProps) => {
  const { t } = useTranslation('rubric');

  // Calculate statistics
  const totalCriteria = rubricData.categories.reduce((acc, cat) => acc + cat.criteria.length, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] h-[95vh] max-w-5xl p-0 overflow-hidden flex flex-col">
        {/* Header - Apple style */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="flex-1">
            <h2 className="text-3xl font-semibold text-foreground mb-2">{rubricData.name || 'Rubric Preview'}</h2>
            <p className="text-sm text-muted-foreground">
              {rubricData.categories.length} {rubricData.categories.length === 1 ? 'category' : 'categories'} · {totalCriteria} {totalCriteria === 1 ? 'criterion' : 'criteria'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full flex-shrink-0">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="px-8 py-8 space-y-10">
            {/* Description */}
            {rubricData.description && (
              <div>
                <p className="text-base text-muted-foreground leading-relaxed">{rubricData.description}</p>
              </div>
            )}

            {/* Categories and Criteria */}
            {rubricData.categories.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-semibold text-foreground mb-2">No Categories Yet</h3>
                <p className="text-muted-foreground">Add categories and criteria to preview the rubric</p>
              </div>
            ) : (
              <div className="space-y-10">
                {rubricData.categories.map((category, categoryIndex) => (
                  <div key={category.id}>
                    {/* Category Title */}
                    <h3 className="text-xl font-semibold text-foreground mb-6">{category.name}</h3>

                    {/* Criteria List */}
                    {category.criteria.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic py-4">No criteria added</p>
                    ) : (
                      <div className="space-y-8">
                        {category.criteria.map((criterion, criterionIndex) => (
                          <div key={criterion.id} className="space-y-4">
                            {/* Criterion Name and Description */}
                            <div>
                              <h4 className="text-base font-semibold text-foreground">
                                {criterion.name}
                              </h4>
                              {criterion.description && (
                                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                                  {criterion.description}
                                </p>
                              )}
                            </div>

                            {/* Scoring Levels - Enhanced Table */}
                            <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                              <div className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-slate-950">
                                {[4, 3, 2, 1].map((score, index) => {
                                  const level = criterion.levels.find((l) => l.score === score);
                                  const description = level?.description || '';

                                  // Color coding for scores
                                  const scoreColor = {
                                    4: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30',
                                    3: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30',
                                    2: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30',
                                    1: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30',
                                  }[score] || '';

                                  return (
                                    <div
                                      key={score}
                                      className="px-5 py-4 flex items-start gap-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                                    >
                                      {/* Score Column */}
                                      <div className={`flex-shrink-0 px-3 py-2 rounded-md font-semibold ${scoreColor}`}>
                                        <div className="text-lg">{score}</div>
                                        <div className="text-xs font-medium mt-0.5">
                                          {LEVEL_LABELS[score as keyof typeof LEVEL_LABELS]}
                                        </div>
                                      </div>

                                      {/* Description Column */}
                                      <div className="flex-1 min-w-0 py-1">
                                        {description ? (
                                          <p className="text-sm text-foreground leading-relaxed">{description}</p>
                                        ) : (
                                          <p className="text-sm text-muted-foreground italic">No description provided</p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Divider between categories */}
                    {categoryIndex < rubricData.categories.length - 1 && (
                      <div className="mt-10 pt-10 border-t border-gray-200 dark:border-gray-800" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
