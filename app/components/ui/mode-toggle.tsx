import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/stores/uiStore';
import { useTranslation } from 'react-i18next';

export function ModeToggle() {
  const { theme, setTheme } = useUiStore();
  const { t } = useTranslation('common');

  const handleToggle = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <Button variant="ghost" size="icon" className="h-10 w-10" onClick={handleToggle}>
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">{t('theme')}</span>
    </Button>
  );
}
