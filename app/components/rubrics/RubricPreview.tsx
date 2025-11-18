import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useEffect } from 'react';

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

  // ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col [--content-margin:1rem] sm:[--content-margin:1.5rem] lg:[--content-margin:4rem]">
      {/* Header with close button */}
      <div className="flex-shrink-0 border-b border-border bg-background px-[var(--content-margin)] py-3 sm:py-4">
        <div className="mx-auto max-w-4xl flex justify-between items-center">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-1">
              {rubricData.name || t('preview.dialogTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {rubricData.categories.length} {rubricData.categories.length === 1 ? t('category') : t('categories')} · {' '}
              {totalCriteria} {totalCriteria === 1 ? t('criterion') : t('criteria')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors touch-manipulation ml-4"
            aria-label="關閉預覽"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Content - native scroll */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
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
      </div>
    </div>
  );
};
