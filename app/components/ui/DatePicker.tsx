import { CalendarIcon, X } from 'lucide-react';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Calendar as UICalendar } from '@/components/ui/calendar';
import { useState } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

export function DatePicker({ name, defaultISOString }: { name: string; defaultISOString?: string }) {
  const { t } = useTranslation('common');
  const [date, setDate] = useState<Date | undefined>(() => (defaultISOString ? new Date(defaultISOString) : undefined));

  return (
    <div>
      {/* Hidden input to submit ISO date back to the server */}
      <input type="hidden" name={name} value={date ? date.toISOString() : ''} />
      <div className="flex items-center gap-2 min-w-0">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              data-empty={!date}
              className="data-[empty=true]:text-muted-foreground min-w-0 flex-1 sm:flex-initial sm:w-[280px] justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
              {/* Use a fixed, locale-agnostic format to avoid SSR mismatches */}
              <span className="truncate">{date ? format(date, 'yyyy-MM-dd') : t('pickDate')}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <UICalendar mode="single" selected={date} onSelect={(d) => setDate(d)} />
          </PopoverContent>
        </Popover>
        {date && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setDate(undefined)}
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
