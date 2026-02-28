import { CalendarIcon, X } from 'lucide-react';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Calendar as UICalendar } from '@/components/ui/calendar';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export function DatePicker({ name, defaultISOString }: { name: string; defaultISOString?: string }) {
  const { t } = useTranslation('common');
  const [dateValue, setDateValue] = useState<string>(() => toDateOnlyString(defaultISOString));

  const selectedDate = dateValue ? parseDateOnlyToLocalDate(dateValue) : undefined;

  return (
    <div>
      {/* Hidden input submits date-only value (YYYY-MM-DD) */}
      <input type="hidden" name={name} value={dateValue} />
      <div className="flex items-center gap-2 min-w-0">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              data-empty={!dateValue}
              className="data-[empty=true]:text-muted-foreground min-w-0 flex-1 sm:flex-initial sm:w-[280px] justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="truncate">{dateValue || t('pickDate')}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <UICalendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => setDateValue(d ? formatDateOnlyFromLocalDate(d) : '')}
            />
          </PopoverContent>
        </Popover>
        {dateValue && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setDateValue('')}
            className="flex-shrink-0 w-9 h-9 p-0 sm:w-auto sm:h-auto sm:px-4 sm:py-2"
            title={t('clear')}
          >
            <X className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">{t('clear')}</span>
          </Button>
        )}
      </div>
    </div>
  );
}

function toDateOnlyString(value?: string): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().split('T')[0];
}

function formatDateOnlyFromLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateOnlyToLocalDate(dateOnly: string): Date | undefined {
  const match = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);

  return new Date(year, month, day, 12, 0, 0, 0);
}
