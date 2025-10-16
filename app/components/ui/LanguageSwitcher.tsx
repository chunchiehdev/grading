import { Button } from '@/components/ui/button';
import { useUiStore } from '@/stores/uiStore';
import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const { language, toggleLanguage } = useUiStore();
  const { t } = useTranslation('common');

  return (
    <Button variant="ghost" size="icon" className="h-10 w-10" onClick={toggleLanguage}>
      <span className="h-[1.2rem] w-[1.2rem] text-sm font-medium">{language === 'zh' ? '中' : 'EN'}</span>
      <span className="sr-only">{t('language')}</span>
    </Button>
  );
}
