// FILE: apps/web/src/hooks/useTranslation.js
import { useState, useEffect, useCallback } from 'react';
import { translations } from '@/i18n/translations';

const useTranslation = () => {
  const [language, setLanguage] = useState(
    localStorage.getItem('language') || 'en'
  );

  useEffect(() => {
    const handleLanguageChange = (event) => {
      setLanguage(event.detail.language);
    };

    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  const t = useCallback((key) => {
    const lang = translations[language] || translations.en;
    return lang[key] || key;
  }, [language]);

  return { t, language, setLanguage };
};

export default useTranslation;
