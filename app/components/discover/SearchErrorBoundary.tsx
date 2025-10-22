/**
 * Search Error Boundary Component
 * Catches errors in search feature and displays fallback UI
 */

import { Component, ReactNode } from 'react';

interface SearchErrorBoundaryProps {
  children: ReactNode;
}

interface SearchErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary for search feature
 * Catches and displays errors gracefully without crashing the page
 */
export class SearchErrorBoundary extends Component<SearchErrorBoundaryProps, SearchErrorBoundaryState> {
  constructor(props: SearchErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): SearchErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging
    console.error('Search Error:', error);
    console.error('Error Info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center animate-in fade-in-50 duration-300">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Search Feature Error</h3>
          <p className="text-red-800 mb-4">
            An unexpected error occurred in the search feature. Please try refreshing the page.
          </p>
          <details className="text-left text-sm text-red-700 mb-4 bg-white rounded p-3">
            <summary className="cursor-pointer font-semibold mb-2">Error Details</summary>
            <pre className="overflow-auto max-h-40 text-xs">{this.state.error?.toString()}</pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            className="inline-block px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
