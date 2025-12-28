/**
 * Server-side date formatting utilities
 */

/**
 * Formats a date for display in the UI
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDateForDisplay(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * Formats a date for HTML datetime-local input
 * @param date - Date to format
 * @returns ISO string formatted for datetime-local input
 */
export function formatDateForForm(date: Date): string {
  // datetime-local input expects YYYY-MM-DDTHH:mm format
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Calculates days until a due date
 * @param dueDate - Due date
 * @returns Number of days (negative if overdue)
 */
export function getDaysUntilDue(dueDate: Date): number {
  const now = new Date();
  const due = new Date(dueDate);
  const timeDiff = due.getTime() - now.getTime();
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
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

/**
 * Formats a full date-time string for SSR compatibility
 * Uses UTC to ensure consistency between server and client
 * @param date - Date to format
 * @param locale - Locale code (default: 'en-US')
 * @returns Formatted date-time string
 */
export function formatFullDateTime(date: Date, locale: string = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(date));
}
