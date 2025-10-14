/**
 * 課程時間表常數定義
 *
 * 定義星期和節次的對照表，用於課程時段管理。
 * 老師只需選擇「星期」和「節次」，系統會自動對應實際上課時間。
 */

/**
 * 星期定義
 */
export interface WeekdayDefinition {
  code: string;        // 代碼：一、二、三、四、五、六、日
  name: string;        // 中文名稱：星期一、星期二...
  englishName: string; // 英文名稱：Monday, Tuesday...
}

export const WEEKDAYS: WeekdayDefinition[] = [
  { code: '一', name: '星期一', englishName: 'Monday' },
  { code: '二', name: '星期二', englishName: 'Tuesday' },
  { code: '三', name: '星期三', englishName: 'Wednesday' },
  { code: '四', name: '星期四', englishName: 'Thursday' },
  { code: '五', name: '星期五', englishName: 'Friday' },
  { code: '六', name: '星期六', englishName: 'Saturday' },
  { code: '日', name: '星期日', englishName: 'Sunday' },
] as const;

/**
 * 節次定義
 *
 * 節次編碼規則：
 * - 1-9: 第 1-9 節
 * - Z: 午休時段 (12:00-12:50)
 * - A: 第 10 節 (18:00-18:50)
 * - B-D: 第 11-13 節
 */
export interface PeriodDefinition {
  code: string;        // 節次代碼：1, 2, 3, ..., 9, Z, A, B, C, D
  startTime: string;   // 開始時間：HH:mm 格式
  endTime: string;     // 結束時間：HH:mm 格式
  displayName: string; // 顯示名稱：第1節、午休等
}

export const PERIODS: PeriodDefinition[] = [
  { code: '1', startTime: '08:00', endTime: '08:50', displayName: '第1節' },
  { code: '2', startTime: '09:00', endTime: '09:50', displayName: '第2節' },
  { code: '3', startTime: '10:00', endTime: '10:50', displayName: '第3節' },
  { code: '4', startTime: '11:00', endTime: '11:50', displayName: '第4節' },
  { code: 'Z', startTime: '12:00', endTime: '12:50', displayName: '午休' },
  { code: '5', startTime: '13:00', endTime: '13:50', displayName: '第5節' },
  { code: '6', startTime: '14:00', endTime: '14:50', displayName: '第6節' },
  { code: '7', startTime: '15:00', endTime: '15:50', displayName: '第7節' },
  { code: '8', startTime: '16:00', endTime: '16:50', displayName: '第8節' },
  { code: '9', startTime: '17:00', endTime: '17:50', displayName: '第9節' },
  { code: 'A', startTime: '18:00', endTime: '18:50', displayName: '第10節' },
  { code: 'B', startTime: '19:00', endTime: '19:50', displayName: '第11節' },
  { code: 'C', startTime: '20:00', endTime: '20:50', displayName: '第12節' },
  { code: 'D', startTime: '21:00', endTime: '21:50', displayName: '第13節' },
] as const;

/**
 * 根據節次代碼查詢節次定義
 * @param code 節次代碼
 * @returns 節次定義，找不到則返回 undefined
 */
export function getPeriodByCode(code: string): PeriodDefinition | undefined {
  return PERIODS.find(p => p.code === code);
}

/**
 * 根據星期代碼查詢星期定義
 * @param code 星期代碼
 * @returns 星期定義，找不到則返回 undefined
 */
export function getWeekdayByCode(code: string): WeekdayDefinition | undefined {
  return WEEKDAYS.find(w => w.code === code);
}

/**
 * 格式化時段顯示文字
 * @param weekdayCode 星期代碼
 * @param periodCode 節次代碼
 * @returns 格式化的顯示文字，例如：「星期一 第3節 (10:00-10:50)」
 */
export function formatScheduleDisplay(weekdayCode: string, periodCode: string): string {
  const weekday = getWeekdayByCode(weekdayCode);
  const period = getPeriodByCode(periodCode);

  if (!weekday || !period) {
    return '';
  }

  return `${weekday.name} ${period.displayName} (${period.startTime}-${period.endTime})`;
}

/**
 * 格式化時段簡短顯示（不含時間）
 * @param weekdayCode 星期代碼
 * @param periodCode 節次代碼
 * @returns 格式化的顯示文字，例如：「星期一 第3節」
 */
export function formatScheduleShort(weekdayCode: string, periodCode: string): string {
  const weekday = getWeekdayByCode(weekdayCode);
  const period = getPeriodByCode(periodCode);

  if (!weekday || !period) {
    return '';
  }

  return `${weekday.name} ${period.displayName}`;
}

/**
 * 驗證星期代碼是否有效
 */
export function isValidWeekday(code: string): boolean {
  return WEEKDAYS.some(w => w.code === code);
}

/**
 * 驗證節次代碼是否有效
 */
export function isValidPeriod(code: string): boolean {
  return PERIODS.some(p => p.code === code);
}
