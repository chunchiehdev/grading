import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WEEKDAYS, PERIODS, formatScheduleDisplay } from '@/constants/schedule';
import { Clock } from 'lucide-react';

/**
 * 時段選擇器值的介面
 */
export interface PeriodSelectorValue {
  weekday: string;    // 星期代碼：一、二、三...
  periodCode: string; // 節次代碼：1, 2, 3, ..., Z, A, B, C, D
}

export interface PeriodSelectorProps {
  /** 當前值 */
  value?: PeriodSelectorValue;
  /** 值變更時的回調 */
  onChange?: (value: PeriodSelectorValue) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否必填 */
  required?: boolean;
  /** 星期欄位的 name 屬性（用於表單提交） */
  weekdayName?: string;
  /** 節次欄位的 name 屬性（用於表單提交） */
  periodName?: string;
  /** 是否顯示預覽 */
  showPreview?: boolean;
}

/**
 * 時段選擇器組件
 *
 * 提供星期和節次的雙下拉選單，自動計算並預覽實際上課時間
 */
export function PeriodSelector({
  value,
  onChange,
  disabled = false,
  required = false,
  weekdayName = 'weekday',
  periodName = 'periodCode',
  showPreview = true,
}: PeriodSelectorProps) {
  const [weekday, setWeekday] = useState(value?.weekday || '');
  const [periodCode, setPeriodCode] = useState(value?.periodCode || '');

  // 當外部 value 改變時更新內部狀態
  useEffect(() => {
    if (value) {
      setWeekday(value.weekday || '');
      setPeriodCode(value.periodCode || '');
    }
  }, [value]);

  // 當內部狀態改變時通知外部
  useEffect(() => {
    if (onChange && weekday && periodCode) {
      onChange({ weekday, periodCode });
    }
  }, [weekday, periodCode, onChange]);

  // 生成預覽文字
  const previewText = weekday && periodCode ? formatScheduleDisplay(weekday, periodCode) : '';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 星期選擇 */}
        <div className="space-y-2">
          <Label htmlFor={weekdayName}>
            星期 {required && <span className="text-red-500">*</span>}
          </Label>
          <Select
            name={weekdayName}
            value={weekday}
            onValueChange={setWeekday}
            disabled={disabled}
            required={required}
          >
            <SelectTrigger id={weekdayName}>
              <SelectValue placeholder="選擇星期" />
            </SelectTrigger>
            <SelectContent>
              {WEEKDAYS.map((w) => (
                <SelectItem key={w.code} value={w.code}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 節次選擇 */}
        <div className="space-y-2">
          <Label htmlFor={periodName}>
            節次 {required && <span className="text-red-500">*</span>}
          </Label>
          <Select
            name={periodName}
            value={periodCode}
            onValueChange={setPeriodCode}
            disabled={disabled}
            required={required}
          >
            <SelectTrigger id={periodName}>
              <SelectValue placeholder="選擇節次" />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.code} value={p.code}>
                  {p.displayName} ({p.startTime}-{p.endTime})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 預覽區域 */}
      {showPreview && previewText && (
        <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <Clock className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">上課時間</p>
            <p className="text-sm text-muted-foreground">{previewText}</p>
          </div>
        </div>
      )}

      {/* 提示訊息 */}
      {required && (!weekday || !periodCode) && (
        <p className="text-xs text-muted-foreground">
          請選擇星期和節次以設定上課時間
        </p>
      )}
    </div>
  );
}
