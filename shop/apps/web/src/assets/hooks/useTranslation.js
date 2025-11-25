// FILE: apps/web/src/hooks/useTranslation.js
import { useState, useEffect } from 'react';
import { translations } from '@/i18n/translations';

const useTranslation = () => {
  const [language, setLanguage] = useState(
    localStorage.getItem('language') || 'en'
  );

  useEffect(() => {
    // Listen for language change events
    const handleLanguageChange = (event) => {
      setLanguage(event.detail.language);
    };

    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  const t = (key) => {
    const lang = translations[language] || translations.en;
    return lang[key] || key;
  };

  return { t, language, setLanguage };
};

export default useTranslation;
