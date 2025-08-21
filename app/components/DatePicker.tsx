import { CalendarIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as UICalendar } from '@/components/ui/calendar';
import { useState } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';


export function DatePicker({ name, defaultISOString }: { name: string; defaultISOString?: string }) {
  const { t } = useTranslation('common');
  const [date, setDate] = useState<Date | undefined>(() =>
    defaultISOString ? new Date(defaultISOString) : undefined
  );

  return (
    <div>
      {/* Hidden input to submit ISO date back to the server */}
      <input type="hidden" name={name} value={date ? date.toISOString() : ''} />
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              data-empty={!date}
              className="data-[empty=true]:text-muted-foreground w-[280px] justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {/* Use a fixed, locale-agnostic format to avoid SSR mismatches */}
              {date ? format(date, 'yyyy-MM-dd') : <span>{t('pickDate')}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <UICalendar
              mode="single"
              selected={date}
              onSelect={(d) => setDate(d)}
            />
          </PopoverContent>
        </Popover>
        {date && (
          <Button type="button" variant="ghost" onClick={() => setDate(undefined)}>
            {t('clear')}
          </Button>
        )}
      </div>
    </div>
  );
}
