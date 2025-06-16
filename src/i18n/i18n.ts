
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import language resources
import translationEN from './locales/en.json';
import translationHE from './locales/he.json';

// Resources for i18next
const resources = {
  en: {
    translation: translationEN
  },
  he: {
    translation: translationHE
  }
};

i18n
  // Use language detector to detect browser language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources,
    fallbackLng: 'he', // Default language
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false // Prevents issues with SSR
    }
  });

export default i18n;
