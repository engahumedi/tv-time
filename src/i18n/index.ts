import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './en';
import { ar } from './ar';

const STORAGE_KEY = 'showtrack:lang';

export function getStoredLang(): 'en' | 'ar' {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'ar' ? 'ar' : 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: getStoredLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

/** Apply language + document direction, and persist the choice. */
export function setLanguage(lang: 'en' | 'ar'): void {
  i18n.changeLanguage(lang);
  localStorage.setItem(STORAGE_KEY, lang);
  applyDir(lang);
}

export function applyDir(lang: 'en' | 'ar'): void {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lang);
}

// Apply direction on first load.
applyDir(getStoredLang());

export default i18n;
