/**
 * ErrorPage - Reusable error page component
 * Following "Architectural Editorial Minimalism" design style
 * Supports i18n for both Chinese and English
 */

import { Link } from 'react-router';
import { Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ErrorPageProps {
  /**
   * HTTP status code (404, 400, 401, 403, 500, etc.)
   */
  statusCode?: number | string;
  
  /**
   * Translation key for the error message
   * e.g., "errors.404.submission" or "errors.generic.message"
   */
  messageKey: string;
  
  /**
   * Path to return to (default: "/")
   */
  returnTo?: string;
  
  /**
   * Optional custom return button label translation key
   */
  returnLabelKey?: string;
}

export function ErrorPage({ 
  statusCode = 'Error', 
  messageKey, 
  returnTo = '/',
  returnLabelKey = 'returnHome'
}: ErrorPageProps) {
  const { t } = useTranslation(['common']);

  return (
    <div className="flex min-h-full w-full items-center justify-center px-4 py-8">
      <div className="space-y-6 text-center">
        <div className="space-y-3">
          <h1 className="font-serif text-4xl font-light text-[#2B2B2B] dark:text-gray-100">
            {statusCode}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t(messageKey)}
          </p>
        </div>
        <Link
          to={returnTo}
          className="inline-flex items-center gap-2 border border-[#2B2B2B] px-6 py-3 text-sm transition-colors hover:bg-[#2B2B2B] hover:text-white dark:border-gray-200 dark:hover:bg-gray-200 dark:hover:text-[#2B2B2B]"
        >
          <Home className="h-4 w-4" />
          {t(returnLabelKey)}
        </Link>
      </div>
    </div>
  );
}
