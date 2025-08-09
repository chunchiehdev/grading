import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'dropdown' | 'toggle' | 'tabs';
}

export function LanguageSwitcher({ className, variant = 'dropdown' }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation('common');
  const locale = i18n.language as 'en' | 'zh';

  const setLocale = (newLocale: 'en' | 'zh') => {
    i18n.changeLanguage(newLocale);
  };

  const languages = [
    { code: 'zh' as const, name: '繁體中文', nativeName: '繁體中文' },
    { code: 'en' as const, name: 'English', nativeName: 'English' },
  ];

  const currentLanguage = languages.find(lang => lang.code === locale);

  if (variant === 'toggle') {
    return (
      <div className={cn('flex border rounded-md', className)}>
        {languages.map((lang) => (
          <Button
            key={lang.code}
            variant={locale === lang.code ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setLocale(lang.code)}
            className={cn(
              'px-3 py-1 text-xs rounded-none first:rounded-l-md last:rounded-r-md',
              locale === lang.code && 'bg-primary text-primary-foreground'
            )}
          >
            {lang.nativeName}
          </Button>
        ))}
      </div>
    );
  }

  if (variant === 'tabs') {
    return (
      <div className={cn('flex space-x-1 bg-muted p-1 rounded-lg', className)}>
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLocale(lang.code)}
            className={cn(
              'px-3 py-1 text-sm rounded-md transition-all duration-200',
              locale === lang.code
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {lang.nativeName}
          </button>
        ))}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn('gap-2', className)}>
          <Languages className="w-4 h-4" />
          <span className="hidden sm:inline">{currentLanguage?.nativeName}</span>
          <span className="sm:hidden">{locale.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLocale(lang.code)}
            className="flex items-center justify-between min-w-[120px]"
          >
            <span>{lang.nativeName}</span>
            {locale === lang.code && <Check className="w-4 h-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
