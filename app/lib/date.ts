/**
 * Shared date formatting utilities
 * Can be used on both server and client
 */

export function formatDateForDisplay(date: Date | string): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Use consistent ISO date format to avoid hydration mismatches
    return dateObj.toISOString().split('T')[0];
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
}

export function formatDatetime(date: Date | string): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
  } catch (error) {
    console.error('Datetime formatting error:', error);
    return 'Invalid Datetime';
  }
}

export function formatRelativeDate(date: Date | string): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffTime = now.getTime() - dateObj.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return formatDateForDisplay(dateObj);
  } catch (error) {
    console.error('Relative date formatting error:', error);
    return 'Unknown';
  }
} 