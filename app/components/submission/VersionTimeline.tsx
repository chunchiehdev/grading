/**
 * VersionTimeline Component
 * 
 * Clean timeline with Architectural Editorial Minimalism aesthetic
 * - Fine charcoal line work and subtle borders
 * - Terracotta accents for active states
 * - Serif typography for elegance
 * - De-boxed layout with breathing room
 * - No decorative elements, pure minimalism
 */

import React from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

export interface VersionTimelineItem {
  id: string;
  version: number;
  isLatest: boolean;
  submittedAt: Date;
  submittedAtFormatted: string; // Pre-formatted relative time
  submittedAtFull: string; // Pre-formatted full datetime  
  status: string;
  statusText?: string; // Pre-formatted status text
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
  const { t } = useTranslation(['submissions']);

  return (
    <div className="w-full" role="list" aria-label={t('submissions:historyPage.timeline.ariaLabel')}>
      {/* Timeline Container */}
      <div className="relative">
        {/* Vertical Timeline Line - subtle charcoal */}
        <div 
          className="absolute left-0 top-0 bottom-0 ml-7 w-px bg-[#2B2B2B]/20 dark:bg-gray-200/20"
          aria-hidden="true"
        />

        {/* Version Items */}
        <div className="space-y-0">
          {versions.map((version, index) => {
            const isSelected = selectedForComparison.includes(version.id);
            const isLast = index === versions.length - 1;

            return (
              <article
                key={version.id}
                className="relative flex gap-6"
                role="listitem"
                aria-label={t('submissions:historyPage.timeline.versionAriaLabel', { version: version.version })}
              >
                {/* Timeline Marker - Simple Circle */}
                <div className="relative flex flex-col items-center">
                  <div
                    className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-full border transition-all ${
                      version.isLatest
                        ? 'border-[#E07A5F] bg-[#E07A5F]/5 dark:border-[#E87D3E] dark:bg-[#E87D3E]/5'
                        : 'border-[#2B2B2B]/30 bg-white dark:border-gray-200/30 dark:bg-gray-900'
                    }`}
                    aria-hidden="true"
                  >
                    {/* Version Number in Circle */}
                    <span className={`font-serif text-sm font-light ${
                      version.isLatest 
                        ? 'text-[#E07A5F] dark:text-[#E87D3E]' 
                        : 'text-[#2B2B2B]/60 dark:text-gray-200/60'
                    }`}>
                      v{version.version}
                    </span>
                  </div>
                </div>

                {/* Version Card */}
                <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-12'}`}>
                  <div
                    className={`group relative border-l-2 bg-transparent pl-6 pr-0 py-0 transition-all ${
                      version.isLatest 
                        ? 'border-l-[#E07A5F] dark:border-l-[#E87D3E]' 
                        : 'border-l-[#2B2B2B]/10 dark:border-l-gray-200/10'
                    } ${isSelected ? 'border-l-[#E07A5F] dark:border-l-[#E87D3E]' : ''}`}
                  >
                    {/* Content */}
                    <div className="relative">
                      {/* Version Header */}
                      <div className="mb-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-baseline gap-3">
                            <h3 className="font-serif text-2xl font-light text-[#2B2B2B] dark:text-gray-100">
                              v{version.version}
                            </h3>
                            {version.isLatest && (
                              <span className="text-xs uppercase tracking-wider text-[#E07A5F] dark:text-[#E87D3E]">
                                {t('submissions:historyPage.timeline.latest')}
                              </span>
                            )}
                          </div>
                          
                          {/* Date - use pre-formatted strings */}
                          <time 
                            dateTime={new Date(version.submittedAt).toISOString()}
                            className="mt-1 block text-sm text-[#2B2B2B]/60 dark:text-gray-200/60"
                            title={version.submittedAtFull}
                          >
                            {version.submittedAtFormatted}
                          </time>
                        </div>

                        {/* Score Badge */}
                        {version.finalScore !== null && version.finalScore !== undefined && (
                          <div 
                            className="inline-flex items-baseline gap-1 border border-[#E07A5F]/40 px-3 py-1 dark:border-[#E87D3E]/40"
                            aria-label={t('submissions:historyPage.timeline.scoreAriaLabel', { score: version.finalScore })}
                          >
                            <span className="font-serif text-xl font-light text-[#E07A5F] dark:text-[#E87D3E]">
                              {version.finalScore}
                            </span>
                            <span className="text-xs text-[#2B2B2B]/60 dark:text-gray-200/60">{t('submissions:historyPage.timeline.points')}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-3">
                        {/* View Details Button */}
                        {viewDetailUrl && (
                          <Link
                            to={viewDetailUrl(version.id)}
                            className="inline-flex items-center border border-[#2B2B2B]/40 bg-white px-4 py-1.5 text-sm transition-all hover:border-[#2B2B2B] hover:bg-[#2B2B2B] hover:text-white dark:border-gray-200/40 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-200 dark:hover:bg-gray-200 dark:hover:text-gray-950"
                            aria-label={t('submissions:historyPage.timeline.viewDetailAriaLabel', { version: version.version })}
                          >
                            {t('submissions:historyPage.timeline.viewDetails')}
                          </Link>
                        )}

                        {/* Compare Button */}
                        {onCompare && versions.length > 1 && (
                          <button
                            onClick={() => onCompare(version.id)}
                            className={`inline-flex items-center border px-4 py-1.5 text-sm transition-all ${
                              isSelected
                                ? 'border-[#E07A5F] bg-[#E07A5F] text-white dark:border-[#E87D3E] dark:bg-[#E87D3E]'
                                : 'border-dashed border-[#E07A5F]/40 bg-white text-[#E07A5F] hover:border-[#E07A5F] hover:border-solid dark:border-[#E87D3E]/40 dark:bg-gray-900 dark:text-[#E87D3E] dark:hover:border-[#E87D3E]'
                            }`}
                            aria-label={
                              isSelected
                                ? t('submissions:historyPage.timeline.deselectAriaLabel', { version: version.version })
                                : t('submissions:historyPage.timeline.selectAriaLabel', { version: version.version })
                            }
                            aria-pressed={isSelected}
                          >
                            {isSelected
                              ? t('submissions:historyPage.timeline.selected')
                              : t('submissions:historyPage.timeline.selectCompare')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
