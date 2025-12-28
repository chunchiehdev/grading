/**
 * Reusable Not Found (404) Error Page Component
 * 
 * Use this component in ErrorBoundary functions to display consistent 404 errors
 * across the application with Architectural Editorial Minimalism design.
 * 
 * @example
 * ```tsx
 * import { NotFoundPage } from '@/components/errors/NotFoundPage';
 * 
 * export function ErrorBoundary() {
 *   const error = useRouteError();
 *   
 *   if (isRouteErrorResponse(error) && error.status === 404) {
 *     return (
 *       <NotFoundPage 
 *         message="找不到此提交記錄，可能已被刪除或不存在"
 *         returnTo="/student"
 *         returnLabel="返回首頁"
 *       />
 *     );
 *   }
 *   
 *   // Handle other errors...
 * }
 * ```
 */

import { Link } from 'react-router';
import { Home } from 'lucide-react';

interface NotFoundPageProps {
  /** Error message to display to the user */
  message?: string;
  /** Path to navigate when clicking the return button */
  returnTo?: string;
  /** Label for the return button */
  returnLabel?: string;
}

export function NotFoundPage({
  message = '找不到此頁面，可能已被刪除或不存在',
  returnTo = '/',
  returnLabel = '返回首頁',
}: NotFoundPageProps) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4">
      <div className="space-y-6 text-center">
        <div className="space-y-3">
          <h1 className="font-serif text-4xl font-light text-[#2B2B2B] dark:text-gray-100">
            404
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{message}</p>
        </div>
        <Link
          to={returnTo}
          className="inline-flex items-center gap-2 border border-[#2B2B2B] px-6 py-3 text-sm transition-colors hover:bg-[#2B2B2B] hover:text-white dark:border-gray-200 dark:hover:bg-gray-200 dark:hover:text-[#2B2B2B]"
        >
          <Home className="h-4 w-4" />
          {returnLabel}
        </Link>
      </div>
    </div>
  );
}

/**
 * Generic error page for non-404 errors
 */
interface ErrorPageProps {
  /** Error title (e.g., "錯誤", "未授權", "禁止訪問") */
  title?: string;
  /** Error message to display */
  message?: string;
  /** Path to navigate when clicking the return button */
  returnTo?: string;
  /** Label for the return button */
  returnLabel?: string;
}

export function ErrorPage({
  title = '錯誤',
  message = '發生錯誤，請稍後再試',
  returnTo = '/',
  returnLabel = '返回首頁',
}: ErrorPageProps) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4">
      <div className="space-y-6 text-center">
        <div className="space-y-3">
          <h1 className="font-serif text-4xl font-light text-[#2B2B2B] dark:text-gray-100">
            {title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{message}</p>
        </div>
        <Link
          to={returnTo}
          className="inline-flex items-center gap-2 border border-[#2B2B2B] px-6 py-3 text-sm transition-colors hover:bg-[#2B2B2B] hover:text-white dark:border-gray-200 dark:hover:bg-gray-200 dark:hover:text-[#2B2B2B]"
        >
          <Home className="h-4 w-4" />
          {returnLabel}
        </Link>
      </div>
    </div>
  );
}
