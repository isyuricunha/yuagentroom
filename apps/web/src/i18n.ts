import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import pt from './locales/pt.json';
import es from './locales/es.json';

export const resources = {
  en: { translation: en },
  pt: { translation: pt },
  es: { translation: es },
} as const;

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('i18n-language') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
