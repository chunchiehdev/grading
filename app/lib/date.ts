/**
 * Shared date formatting utilities
 * Can be used on both server and client
 */

export const APP_TIME_ZONE = 'Asia/Taipei';

function formatInTimeZone(date: Date | string, locale: string, options: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

export function formatDateForDisplay(date: Date | string): string {
  try {
    return formatDateOnlyInTimeZone(date);
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
}

export function formatDateOnlyInTimeZone(date: Date | string, timeZone: string = APP_TIME_ZONE): string {
  return formatInTimeZone(date, 'en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatTimeInTimeZone(date: Date | string, timeZone: string = APP_TIME_ZONE): string {
  return formatInTimeZone(date, 'en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).replace(/\u200E|\u200F/g, '');
}

export function formatDateTimeInTimeZone(
  date: Date | string,
  locale: string = 'zh-TW',
  timeZone: string = APP_TIME_ZONE
): string {
  return formatInTimeZone(date, locale, {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).replace(/\u200E|\u200F/g, '');
}

export function parseTaipeiDateTimeToUTC(
  dateValue: string | null | undefined,
  timeValue: string | null | undefined
): Date | null | undefined {
  if (!dateValue || dateValue.trim() === '') {
    return null;
  }

  const dateMatch = dateValue.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) return undefined;

  const time = timeValue && timeValue.trim() !== '' ? timeValue : '18:00';
  const timeMatch = time.match(/^(\d{2}):(\d{2})$/);
  if (!timeMatch) return undefined;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);

  if (month < 1 || month > 12 || day < 1 || day > 31 || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return undefined;
  }

  const utcDateCheck = new Date(Date.UTC(year, month - 1, day));
  if (
    utcDateCheck.getUTCFullYear() !== year ||
    utcDateCheck.getUTCMonth() !== month - 1 ||
    utcDateCheck.getUTCDate() !== day
  ) {
    return undefined;
  }

  const taiwanISO = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T${timeMatch[1]}:${timeMatch[2]}:00+08:00`;
  const parsed = new Date(taiwanISO);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
