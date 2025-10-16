import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from './resources';
import { getServerLocale } from './i18n';

export default async function initI18nServer(request: Request, routerContext: any) {
  const instance = createInstance();
  const lng = getServerLocale(request);

  await instance.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

  return instance;
}
