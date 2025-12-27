/**
 * VersionTimeline Component
 * 
 * Displays a vertical timeline of submission versions with Architectural Editorial Minimalism style
 * - Cream/beige paper background (#FAF9F6)
 * - Charcoal borders (#2B2B2B)
 * - Terracotta accents (#E07A5F) for version numbers and active states
 * - Serif fonts for headings, sans-serif for data
 */

import React from 'react';
import { Link } from 'react-router';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

export interface VersionTimelineItem {
  id: string;
  version: number;
  isLatest: boolean;
  submittedAt: Date;
  status: string;
  finalScore?: number | null;
  normalizedScore?: number | null;
}

interface VersionTimelineProps {
  versions: VersionTimelineItem[];
  onCompare?: (versionId: string) => void;
  selectedForComparison?: string[];
  viewDetailUrl?: (versionId: string) => string;
}

export function VersionTimeline({
  versions,
  onCompare,
  selectedForComparison = [],
  viewDetailUrl,
}: VersionTimelineProps) {
  const { t, i18n } = useTranslation(['common', 'assignment']);
  const isZhTW = i18n.language.startsWith('zh');

  const formatDate = (date: Date) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: isZhTW ? zhTW : undefined,
    });
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      SUBMITTED: '已提交',
      ANALYZED: 'AI 分析已完成',
      GRADED: '已評分',
      DRAFT: '草稿',
    };
    return statusMap[status] || status;
  };

  return (
    <div className="border-2 border-[#2B2B2B] bg-[#FAF9F6] p-6 dark:border-gray-200 dark:bg-gray-950">
      {/* Timeline Header */}
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-light text-[#2B2B2B] dark:text-gray-100">
          作業歷史版本
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          共 {versions.length} 個版本
        </p>
      </div>

      {/* Timeline Container */}
      <div className="relative pl-8">
        {/* Vertical Timeline Line */}
        <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-[#2B2B2B]/20 dark:bg-gray-200/20" />

        {/* Version Cards */}
        <div className="space-y-6">
          {versions.map((version, index) => (
            <div key={version.id} className="relative">
              {/* Version Dot */}
              <div
                className={`absolute left-[-1.25rem] top-3 h-4 w-4 rounded-full border-2 ${
                  version.isLatest
                    ? 'border-[#E07A5F] bg-[#E07A5F] dark:border-[#E87D3E] dark:bg-[#E87D3E]'
                    : 'border-[#2B2B2B] bg-[#FAF9F6] dark:border-gray-200 dark:bg-gray-950'
                }`}
              />

              {/* Version Card */}
              <div className="group border-2 border-[#2B2B2B] bg-[#FAF9F6] p-4 transition-all hover:shadow-md dark:border-gray-200 dark:bg-gray-900/30">
                {/* Version Header */}
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-lg font-light text-[#E07A5F] dark:text-[#E87D3E]">
                      v{version.version}
                      {version.isLatest && (
                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                          (最新版本)
                        </span>
                      )}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(version.submittedAt)}
                    </p>
                  </div>

                  {/* Score Badge */}
                  {version.finalScore !== null && version.finalScore !== undefined && (
                    <div className="border-2 border-[#E07A5F] px-3 py-1 dark:border-[#E87D3E]">
                      <span className="font-serif text-xl font-light text-[#E07A5F] dark:text-[#E87D3E]">
                        {version.finalScore}
                      </span>
                      <span className="ml-1 text-xs text-gray-600 dark:text-gray-400">分</span>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="mb-4">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {getStatusText(version.status)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {/* View Details Button */}
                  {viewDetailUrl && (
                    <Link
                      to={viewDetailUrl(version.id)}
                      className="inline-flex items-center border-2 border-[#2B2B2B] px-4 py-2 text-sm transition-colors hover:bg-[#2B2B2B] hover:text-[#FAF9F6] dark:border-gray-200 dark:hover:bg-gray-200 dark:hover:text-gray-950"
                    >
                      查看詳情
                    </Link>
                  )}

                  {/* Compare Button */}
                  {onCompare && versions.length > 1 && (
                    <button
                      onClick={() => onCompare(version.id)}
                      className={`inline-flex items-center border-2 px-4 py-2 text-sm transition-colors ${
                        selectedForComparison.includes(version.id)
                          ? 'border-[#E07A5F] bg-[#E07A5F] text-[#FAF9F6] dark:border-[#E87D3E] dark:bg-[#E87D3E]'
                          : 'border-dashed border-[#E07A5F] hover:bg-[#E07A5F]/10 dark:border-[#E87D3E] dark:hover:bg-[#E87D3E]/10'
                      }`}
                    >
                      {selectedForComparison.includes(version.id) ? '已選擇' : '選擇比較'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Helper Text */}
      {onCompare && selectedForComparison.length > 0 && (
        <div className="mt-6 border-2 border-dashed border-[#E07A5F] p-4 dark:border-[#E87D3E]">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {selectedForComparison.length === 1 && '請再選擇一個版本進行比較'}
            {selectedForComparison.length === 2 && '已選擇兩個版本，可以開始比較'}
            {selectedForComparison.length > 2 && '最多只能選擇兩個版本進行比較'}
          </p>
        </div>
      )}
    </div>
  );
}
