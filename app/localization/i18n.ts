import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { resources } from './resources'

// Simple locale detection for server-side
export function getServerLocale(request: Request): string {
  const url = new URL(request.url)
  const urlLang = url.searchParams.get('lang')
  if (urlLang && ['en', 'zh'].includes(urlLang)) {
    return urlLang
  }

  // Check language cookie set by LanguageSwitcher
  const cookieHeader = request.headers.get('cookie')
  if (cookieHeader) {
    const languageCookie = cookieHeader
      .split(';')
      .find(cookie => cookie.trim().startsWith('language='))
    if (languageCookie) {
      const lang = languageCookie.split('=')[1]?.trim()
      if (lang && ['en', 'zh'].includes(lang)) {
        return lang
      }
    }
  }

  const acceptLanguage = request.headers.get('accept-language')
  if (acceptLanguage) {
    if (acceptLanguage.includes('zh')) return 'zh'
    if (acceptLanguage.includes('en')) return 'en'
  }

  return 'zh'
}

// Initialize i18n instance
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh', 
    fallbackLng: 'zh',
    
    interpolation: {
      escapeValue: false, 
    },
    
    react: {
      useSuspense: false, 
    },
  })

export default i18n
