/**
 * Version Comparison Component
 * 
 * Displays side-by-side comparison of two submission versions
 * Architectural Editorial Minimalism style
 */

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface VersionComparisonData {
  versionA: {
    version: number;
    submittedAt: Date;
    submission: any;
  };
  versionB: {
    version: number;
    submittedAt: Date;
    submission: any;
  };
  differences: {
    timeDiff: string;
    fileChanged: boolean;
  };
  aiAnalysis?: {
    scoreChanges: Array<{
      criterion: string;
      oldScore: number;
      newScore: number;
      change: number;
    }>;
    overallChange: number;
  };
  grading?: {
    oldScore?: number;
    newScore?: number;
    change?: number;
  };
}

interface VersionComparisonProps {
  comparison: VersionComparisonData;
}

export function VersionComparison({ comparison }: VersionComparisonProps) {
  const { versionA, versionB, differences, aiAnalysis, grading } = comparison;

  const renderScoreChange = (change: number) => {
    if (change > 0) {
      return (
        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <TrendingUp className="h-4 w-4" />
          <span>+{change}</span>
        </div>
      );
    } else if (change < 0) {
      return (
        <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
          <TrendingDown className="h-4 w-4" />
          <span>{change}</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 text-gray-500">
          <Minus className="h-4 w-4" />
          <span>0</span>
        </div>
      );
    }
  };

  return (
    <div className="space-y-8">
      {/* Comparison Header */}
      <div className="border-2 border-[#2B2B2B] bg-[#FAF9F6] p-6 dark:border-gray-200 dark:bg-gray-950">
        <h2 className="mb-4 font-serif text-2xl font-light text-[#2B2B2B] dark:text-gray-100">
          版本比較
        </h2>

        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <div className="mb-2 font-serif text-3xl font-light text-[#E07A5F] dark:text-[#E87D3E]">
              v{versionA.version}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">舊版本</div>
          </div>

          <ArrowRight className="h-6 w-6 text-gray-400" />

          <div className="text-center">
            <div className="mb-2 font-serif text-3xl font-light text-[#E07A5F] dark:text-[#E87D3E]">
              v{versionB.version}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">新版本</div>
          </div>
        </div>

        <div className="mt-6 space-y-2 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>時間差：{differences.timeDiff}</p>
          {differences.fileChanged && (
            <p className="text-[#E07A5F] dark:text-[#E87D3E]">文件已更新</p>
          )}
        </div>
      </div>

      {/* Teacher Grading Comparison */}
      {grading && (grading.oldScore !== undefined || grading.newScore !== undefined) && (
        <div className="border-2 border-[#2B2B2B] bg-[#FAF9F6] p-6 dark:border-gray-200 dark:bg-gray-950">
          <h3 className="mb-4 font-serif text-xl font-light text-[#2B2B2B] dark:text-gray-100">
            教師評分變化
          </h3>

          <div className="grid grid-cols-3 gap-4">
            <div className="border-2 border-[#2B2B2B] p-4 dark:border-gray-200">
              <div className="text-sm text-gray-600 dark:text-gray-400">舊評分</div>
              <div className="mt-2 font-serif text-2xl text-[#2B2B2B] dark:text-gray-100">
                {grading.oldScore ?? '-'}
              </div>
            </div>

            <div className="flex items-center justify-center">
              {grading.change !== undefined && renderScoreChange(grading.change)}
            </div>

            <div className="border-2 border-[#E07A5F] p-4 dark:border-[#E87D3E]">
              <div className="text-sm text-gray-600 dark:text-gray-400">新評分</div>
              <div className="mt-2 font-serif text-2xl text-[#E07A5F] dark:text-[#E87D3E]">
                {grading.newScore ?? '-'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Analysis Comparison */}
      {aiAnalysis && aiAnalysis.scoreChanges.length > 0 && (
        <div className="border-2 border-[#2B2B2B] bg-[#FAF9F6] p-6 dark:border-gray-200 dark:bg-gray-950">
          <h3 className="mb-4 font-serif text-xl font-light text-[#2B2B2B] dark:text-gray-100">
            AI 分析比較
          </h3>

          {/* Overall Change */}
          <div className="mb-6 border-2 border-dashed border-[#E07A5F] p-4 dark:border-[#E87D3E]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                總分變化
              </span>
              <div className="flex items-center gap-2">
                {renderScoreChange(aiAnalysis.overallChange)}
                <span className="font-serif text-lg text-[#E07A5F] dark:text-[#E87D3E]">
                  {aiAnalysis.overallChange > 0 ? '+' : ''}
                  {aiAnalysis.overallChange} 分
                </span>
              </div>
            </div>
          </div>

          {/* Criterion-by-Criterion Comparison */}
          <div className="space-y-4">
            {aiAnalysis.scoreChanges.map((change, index) => (
              <div
                key={index}
                className="border-2 border-[#2B2B2B] p-4 dark:border-gray-200"
              >
                <div className="mb-3 font-medium text-gray-800 dark:text-gray-200">
                  {change.criterion}
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">舊分數：</span>
                    <span className="ml-2 font-serif text-base text-gray-800 dark:text-gray-200">
                      {change.oldScore}
                    </span>
                  </div>

                  <div className="flex items-center justify-center">
                    {renderScoreChange(change.change)}
                  </div>

                  <div>
                    <span className="text-gray-600 dark:text-gray-400">新分數：</span>
                    <span className="ml-2 font-serif text-base text-[#E07A5F] dark:text-[#E87D3E]">
                      {change.newScore}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Significant Changes */}
      {!aiAnalysis && !grading && (
        <div className="border-2 border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400">
            這兩個版本之間沒有顯著的評分變化
          </p>
        </div>
      )}
    </div>
  );
}
