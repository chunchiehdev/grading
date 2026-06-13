/**
 * Server-side date formatting utilities
 */

/**
 * Formats a date for display in the UI
 * @param date - Date to format
 * @param locale - Locale code ('zh', 'zh-TW', 'en', etc.)
 * @returns Formatted date string
 */
export function formatDateForDisplay(date: Date, locale: string = 'zh'): string {
  const normalizedLocale = locale.toLowerCase().startsWith('en') ? 'en-US' : 'zh-TW';

  return new Intl.DateTimeFormat(normalizedLocale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Taipei', // 台灣時區 (UTC+8)
  }).format(new Date(date));
}

/**
 * Formats a relative time string (e.g., "2 days ago", "in 3 hours")
 * @param date - Date to format
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffTime / (1000 * 60));

  if (Math.abs(diffDays) >= 1) {
    if (diffDays > 0) {
      return `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    } else {
      return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`;
    }
  } else if (Math.abs(diffHours) >= 1) {
    if (diffHours > 0) {
      return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    } else {
      return `${Math.abs(diffHours)} hour${Math.abs(diffHours) !== 1 ? 's' : ''} ago`;
    }
  } else if (Math.abs(diffMinutes) >= 1) {
    if (diffMinutes > 0) {
      return `in ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
    } else {
      return `${Math.abs(diffMinutes)} minute${Math.abs(diffMinutes) !== 1 ? 's' : ''} ago`;
    }
  } else {
    return 'just now';
  }
}
