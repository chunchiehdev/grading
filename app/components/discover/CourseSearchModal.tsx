'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import type { FetcherWithComponents } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Clock, MapPin, Users, Search, AlertCircle } from 'lucide-react';
import { SEARCH_CONSTRAINTS } from '@/contracts/search-api';
import type { DiscoverableCourse, DiscoveryResponse } from '@/types/course';

interface CourseSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fetcher: FetcherWithComponents<DiscoveryResponse>;
}

/** 
 * @deprecated This component is deprecated and will be removed in future releases.
 * CourseSearchModal
 * Full-featured search modal for discovering courses
 *
 * Features:
 * - Auto-focused search input
 * - Real-time search with 400ms debounce
 * - Inline result display with loading state
 * - Error handling within modal
 * - Focus trap and keyboard navigation
 * - Responsive design
 */
export function CourseSearchModal({ open, onOpenChange, fetcher }: CourseSearchModalProps) {
  const { t } = useTranslation(['course']);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [localValue, setLocalValue] = useState<string>('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (open && inputRef.current) {
      // Use setTimeout to ensure focus happens after render
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      if (value.length <= SEARCH_CONSTRAINTS.MAX_LENGTH) {
        setLocalValue(value);

        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
          const params = new URLSearchParams(searchParams);
          params.set('offset', '0');
          if (value) {
            params.set('search', value);
          } else {
            params.delete('search');
          }

          const queryString = params.toString();
          navigate(`?${queryString}`, { replace: true });
          fetcher.load(`/api/courses/discover?${queryString}`);
        }, SEARCH_CONSTRAINTS.DEBOUNCE_DELAY_MS);
      }
    },
    [searchParams, fetcher, navigate]
  );

  const handleClear = useCallback(() => {
    setLocalValue('');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const params = new URLSearchParams(searchParams);
    params.delete('search');
    params.set('offset', '0');
    const queryString = params.toString();

    navigate(`?${queryString}`, { replace: true });
    fetcher.load(`/api/courses/discover?${queryString}`);
  }, [searchParams, fetcher, navigate]);

  // Parse search results from fetcher
  // Type is already known from fetcher prop, no assertion needed
  const searchData = fetcher.data;
  const courses = searchData?.data?.courses || [];
  const searchError = searchData && !searchData.success ? searchData.error : null;
  const isLoading = fetcher.state === 'loading';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[80vh] flex flex-col"
        aria-labelledby="search-modal-title"
        aria-describedby="search-modal-description"
      >
        {/* Header */}
        <DialogHeader>
          <DialogTitle id="search-modal-title">
            {t('course:discovery.searchModalTitle')}
          </DialogTitle>
          <DialogDescription id="search-modal-description">
            {t('course:discovery.searchModalDescription')}
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
          <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={t('course:discovery.search')}
            value={localValue}
            onChange={handleInputChange}
            maxLength={SEARCH_CONSTRAINTS.MAX_LENGTH}
            aria-label={t('course:discovery.searchModalTitle')}
            className="border-0 bg-transparent outline-none placeholder-muted-foreground flex-1"
          />
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
          )}
        </div>

        {/* Character count */}
        <div className="text-xs text-muted-foreground px-1">
          <span className="font-mono font-semibold">{localValue.length}</span>
          <span className="opacity-50"> / {SEARCH_CONSTRAINTS.MAX_LENGTH}</span>
        </div>

        {/* Results Area */}
        <ScrollArea className="flex-1 rounded-lg border border-border/30 bg-background/50">
          <div className="p-4 space-y-3">
            {/* Error State */}
            {searchError && (
              <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/5 text-destructive">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">{t('course:discovery.errorFetching')}</p>
                  <p className="text-xs opacity-75">{searchError}</p>
                </div>
              </div>
            )}

            {/* No Results State */}
            {!isLoading && courses.length === 0 && localValue && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="h-12 w-12 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-medium text-foreground">
                  {t('course:discovery.searchNoResults', { query: localValue })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('course:discovery.searchTryAgain')}
                </p>
              </div>
            )}

            {/* Empty State (no search yet) */}
            {localValue === '' && courses.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="h-12 w-12 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {t('course:discovery.searchModalDescription')}
                </p>
              </div>
            )}

            {/* Loading State */}
            {isLoading && courses.length === 0 && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {/* Search Results */}
            {courses.length > 0 && (
              <div
                className="space-y-2"
                role="status"
                aria-live="polite"
                aria-atomic="false"
              >
                {courses.map((course: DiscoverableCourse) => (
                  <SearchResultCard key={course.id} course={course} />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Result Count Info */}
        {!isLoading && courses.length > 0 && (
          <div className="text-xs text-muted-foreground text-center">
            {t('course:discovery.coursesFound')}: {courses.length}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * SearchResultCard
 * Individual course result card displayed in search results
 */
function SearchResultCard({ course }: { course: DiscoverableCourse }) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4 space-y-3">
        {/* Course Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm line-clamp-1">{course.name}</h3>
            {course.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {course.description}
              </p>
            )}
          </div>
          {course.code && (
            <Badge variant="secondary" className="shrink-0 font-mono text-xs">
              {course.code}
            </Badge>
          )}
        </div>

        {/* Teacher Info */}
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7 flex-shrink-0 ring-1 ring-border/50">
            {course.teacher.picture && (
              <AvatarImage src={course.teacher.picture} alt={course.teacher.name} />
            )}
            <AvatarFallback className="text-xs font-semibold">
              {course.teacher.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground truncate">{course.teacher.name}</span>
        </div>

        {/* Classes Info - Condensed */}
        {course.classes.length > 0 && (
          <div className="space-y-1">
            {course.classes.slice(0, 2).map((cls) => (
              <div key={cls.id} className="flex items-center justify-between text-xs text-muted-foreground gap-2">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="font-medium truncate">{cls.name}</span>
                  {cls.schedule && (
                    <>
                      <span>•</span>
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{cls.schedule.weekday}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Users className="h-3 w-3" />
                  <span>{cls.enrollmentCount}/{cls.capacity || '∞'}</span>
                </div>
              </div>
            ))}
            {course.classes.length > 2 && (
              <p className="text-xs text-muted-foreground">
                +{course.classes.length - 2} {course.classes.length - 2 === 1 ? 'more class' : 'more classes'}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
