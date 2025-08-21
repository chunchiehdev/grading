import { useTranslation } from 'react-i18next';

export const Footers = () => {
  const { t } = useTranslation('common');
  return (
    <footer className="text-stone-400 py-12">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <p>{t('thanks')}</p>
      </div>
    </footer>
  );
};
