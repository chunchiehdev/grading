/**
 * CourseSearchBar Component
 * Search input with debounce functionality for course discovery
 * Triggers fetcher.load() to fetch search results without full page navigation
 *
 * The input remains enabled during searches to allow user to continue typing.
 * The loading state is communicated via the spinner, not by disabling the field.
 *
 * Key features:
 * - Uses useFetcher to fetch search results non-blocking
 * - Preserves other URL params (limit, offset, sort) while updating search
 * - Cleans up debounce timer on unmount
 * - 400ms debounce before triggering fetcher.load()
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import type { FetcherWithComponents } from 'react-router';
import { SEARCH_CONSTRAINTS } from '@/contracts/search-api';

interface CourseSearchBarProps {
  fetcher: FetcherWithComponents<any>;
  onSearchChange?: (query: string) => void;
}

export function CourseSearchBar({ fetcher, onSearchChange }: CourseSearchBarProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [localValue, setLocalValue] = useState<string>(() => searchParams.get('search') || '');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync localValue when URL search params change (browser back/forward, etc)
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    if (urlSearch !== localValue) {
      setLocalValue(urlSearch);
    }
  }, [searchParams.get('search')]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handle input change with debounce
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      // Update local UI immediately
      if (value.length <= SEARCH_CONSTRAINTS.MAX_LENGTH) {
        setLocalValue(value);

        // Clear previous timer
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        // Debounce: fetch search results after 400ms
        debounceTimerRef.current = setTimeout(() => {
          // Build search URL with query params, preserving existing params
          const params = new URLSearchParams(searchParams);
          params.set('offset', '0'); // Reset to first page on new search
          if (value) {
            params.set('search', value);
          } else {
            params.delete('search');
          }

          // 同步 URL - 讓搜尋可分享
          const queryString = params.toString();
          navigate(`?${queryString}`, { replace: true });

          // 使用正確的 API endpoint
          fetcher.load(`/api/courses/discover?${queryString}`);

          // Notify parent component of search change
          onSearchChange?.(value);
        }, SEARCH_CONSTRAINTS.DEBOUNCE_DELAY_MS);
      }
    },
    [searchParams, fetcher, onSearchChange, navigate]
  );

  // Handle clear button
  const handleClear = useCallback(() => {
    setLocalValue('');

    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Fetch all courses (no search filter), reset to first page
    const params = new URLSearchParams(searchParams);
    params.delete('search');
    params.set('offset', '0');
    const queryString = params.toString();

    // 同步 URL
    navigate(`?${queryString}`, { replace: true });

    // 觸發搜尋
    fetcher.load(`/api/courses/discover?${queryString}`);

    // Notify parent of clear
    onSearchChange?.('');
  }, [searchParams, fetcher, onSearchChange, navigate]);

  return (
    <div className="relative w-full space-y-2">
      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-4 py-3 shadow-sm transition-all duration-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 hover:border-border/80">
        {/* Search Icon with Animation */}
        <svg
          className="h-5 w-5 text-muted-foreground transition-colors duration-200 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        {/* Input - always enabled for smooth typing experience */}
        <input
          type="text"
          placeholder="Search courses by name or description..."
          value={localValue}
          onChange={handleInputChange}
          maxLength={SEARCH_CONSTRAINTS.MAX_LENGTH}
          aria-label="Search courses"
          className="flex-1 bg-transparent outline-none placeholder-muted-foreground text-sm font-medium"
        />

        {/* Debounce Indicator */}
        {fetcher.state === 'loading' && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}

        {/* Clear Button */}
        {localValue && fetcher.state !== 'loading' && (
          <button
            onClick={handleClear}
            className="rounded-md p-1.5 hover:bg-muted transition-colors duration-150 flex-shrink-0"
            title="Clear search"
            aria-label="Clear search"
          >
            <svg
              className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Character Count and Status */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <div>
          <span className="font-mono font-semibold">{localValue.length}</span>
          <span className="opacity-50"> / {SEARCH_CONSTRAINTS.MAX_LENGTH}</span>
        </div>
        {fetcher.state === 'loading' && (
          <span className="text-primary font-medium">Searching...</span>
        )}
      </div>
    </div>
  );
}
