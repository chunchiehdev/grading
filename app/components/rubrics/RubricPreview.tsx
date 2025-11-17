import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
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

export const RubricPreview = ({ isOpen, onClose, rubricData }: RubricPreviewProps) => {
  const { t } = useTranslation('rubric');

  // Calculate statistics
  const totalCriteria = rubricData.categories.reduce((acc, cat) => acc + cat.criteria.length, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fixed inset-0 max-w-none h-screen p-0 flex flex-col bg-background border-0 translate-x-0 translate-y-0 left-0 top-0 sm:rounded-none">
        <DialogTitle className="sr-only">評分標準預覽</DialogTitle>

        {/* Header */}
        <div className="flex-shrink-0 border-b border-border bg-background">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2">
              {rubricData.name || t('rubric:preview')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {rubricData.categories.length} {rubricData.categories.length === 1 ? t('rubric:category') : t('rubric:categories')} · {' '}
              {totalCriteria} {totalCriteria === 1 ? t('rubric:criterion') : t('rubric:criteria')}
            </p>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
            {/* Description */}
            {rubricData.description && (
              <div>
                <p className="text-base text-foreground leading-relaxed">{rubricData.description}</p>
              </div>
            )}

            {/* Categories and Criteria */}
            {rubricData.categories.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">{t('rubric:emptyState.noCategories')}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {rubricData.categories.map((category) => (
                  <div key={category.id} className="space-y-3">
                    {/* Category Title */}
                    <h3 className="text-lg font-semibold text-foreground">
                      {category.name}
                    </h3>

                    {/* Criteria List */}
                    {category.criteria.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic py-2">
                        {t('rubric:emptyState.noCriteria')}
                      </p>
                    ) : (
                      <div className="divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
                        {category.criteria.map((criterion) => (
                          <div key={criterion.id} className="p-4 sm:p-6 hover:bg-muted/30 transition-colors">
                            {/* Criterion Header */}
                            <div className="mb-4">
                              <h4 className="text-base font-medium text-foreground">
                                {criterion.name}
                              </h4>
                              {criterion.description && (
                                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                  {criterion.description}
                                </p>
                              )}
                            </div>

                            {/* Scoring Levels - Simple List */}
                            <div className="space-y-2">
                              {[4, 3, 2, 1].map((score) => {
                                const level = criterion.levels.find((l) => l.score === score);
                                const description = level?.description || '';
                                const scoreLabels = {
                                  4: 'Excellent',
                                  3: 'Good',
                                  2: 'Fair',
                                  1: 'Poor',
                                };

                                return (
                                  <div
                                    key={score}
                                    className="flex gap-3 text-sm py-2"
                                  >
                                    {/* Score Badge */}
                                    <div className="flex-shrink-0 w-8 flex items-center justify-center rounded bg-muted text-foreground font-semibold">
                                      {score}
                                    </div>

                                    {/* Description */}
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-foreground">
                                        {scoreLabels[score as keyof typeof scoreLabels]}
                                      </div>
                                      {description ? (
                                        <p className="text-muted-foreground leading-relaxed">
                                          {description}
                                        </p>
                                      ) : (
                                        <p className="text-muted-foreground italic">
                                          {t('rubric:noDescription')}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Bottom spacing */}
            <div className="pb-4" />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
