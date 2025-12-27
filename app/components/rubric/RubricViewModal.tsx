import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import type { JsonValue } from '@prisma/client/runtime/library';

interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  maxScore: number;
  levels?: Array<{
    score: number;
    description: string;
  }>;
}

interface Rubric {
  id: string;
  name: string;
  description: string;
  criteria: JsonValue; // Accept JsonValue from Prisma
}

interface RubricViewModalProps {
  rubric: Rubric;
}

export function RubricViewModal({ rubric }: RubricViewModalProps) {
  const [open, setOpen] = useState(false);

  // Parse and validate criteria
  let criteria: RubricCriterion[] = [];
  
  try {
    // Handle JsonValue: could be string, object, array, null, etc.
    if (typeof rubric.criteria === 'string') {
      criteria = JSON.parse(rubric.criteria);
    } else if (Array.isArray(rubric.criteria)) {
      criteria = rubric.criteria as unknown as RubricCriterion[];
    } else if (rubric.criteria && typeof rubric.criteria === 'object') {
      // If it's an object but not array, wrap it
      criteria = [rubric.criteria as unknown as RubricCriterion];
    }
  } catch (error) {
    console.error('Failed to parse rubric criteria:', error);
    criteria = [];
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1 text-sm text-gray-700 underline decoration-dotted underline-offset-2 transition-colors hover:text-[#D2691E] dark:text-gray-300 dark:hover:text-[#E87D3E]">
          {rubric.name}
          <ExternalLink className="h-3 w-3" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-light text-[#2B2B2B] dark:text-gray-100">
            {rubric.name}
          </DialogTitle>
        </DialogHeader>

        {/* Rubric Description */}
        {rubric.description && (
          <div className="mb-6 border-l-2 border-[#E07A5F] pl-4 dark:border-[#E87D3E]">
            <p className="text-sm text-gray-600 dark:text-gray-400">{rubric.description}</p>
          </div>
        )}

        {/* Criteria List */}
        <div className="space-y-6">
          {criteria.map((criterion: RubricCriterion, index: number) => (
            <div
              key={criterion.id}
              className="group relative border-2 border-[#2B2B2B] p-5 transition-all hover:shadow-md dark:border-gray-200"
            >
              {/* Sketch effect */}
              <div className="pointer-events-none absolute inset-0 border-2 border-[#2B2B2B]/20 dark:border-gray-200/20" />
              
              <div className="relative">
                {/* Criterion Header */}
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-serif text-lg font-light text-[#2B2B2B] dark:text-gray-100">
                      {index + 1}. {criterion.name}
                    </h3>
                    {criterion.description && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {criterion.description}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 border-2 border-[#E07A5F] px-3 py-1 dark:border-[#E87D3E]">
                    <span className="text-sm font-medium text-[#E07A5F] dark:text-[#E87D3E]">
                      最高 {criterion.maxScore} 分
                    </span>
                  </div>
                </div>

                {/* Score Levels (if available) */}
                {criterion.levels && criterion.levels.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-500">
                      評分等級
                    </p>
                    <div className="space-y-2">
                      {criterion.levels
                        .sort((a, b) => b.score - a.score) // Sort high to low
                        .map((level, levelIndex) => (
                          <div
                            key={levelIndex}
                            className="flex gap-3 border-l-2 border-gray-300 pl-3 dark:border-gray-600"
                          >
                            <span className="flex-shrink-0 font-medium text-gray-700 dark:text-gray-300">
                              {level.score} 分：
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {level.description}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Total Score Summary */}
        <div className="mt-6 border-t-2 border-[#2B2B2B] pt-4 dark:border-gray-200">
          <div className="flex items-center justify-between">
            <span className="font-serif text-lg font-light text-gray-700 dark:text-gray-300">
              總分
            </span>
            <span className="font-serif text-xl font-medium text-[#2B2B2B] dark:text-gray-100">
              {criteria.reduce((sum: number, c: RubricCriterion) => sum + c.maxScore, 0)} 分
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
