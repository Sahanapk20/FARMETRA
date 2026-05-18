import React, { createContext, useContext, useState, useEffect } from 'react';
import { type ReactNode } from 'react';
import { INDIAN_LANGUAGES, DEFAULT_LANGUAGE, type Language } from '../config/languages';

interface LanguageContextType {
  currentLanguage: string;
  setLanguage: (languageCode: string) => void;
  availableLanguages: Language[];
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [currentLanguage, setCurrentLanguageState] = useState<string>(() => {
    // Get language from localStorage or browser preference
    const savedLanguage = localStorage.getItem('aFARMETRA-language');
    if (savedLanguage && INDIAN_LANGUAGES.find(lang => lang.code === savedLanguage)) {
      return savedLanguage;
    }
    
    // Check browser language
    const browserLang = navigator.language.split('-')[0];
    const supportedLang = INDIAN_LANGUAGES.find(lang => lang.code === browserLang);
    return supportedLang?.code || DEFAULT_LANGUAGE;
  });

  const setLanguage = (languageCode: string) => {
    if (INDIAN_LANGUAGES.find(lang => lang.code === languageCode)) {
      setCurrentLanguageState(languageCode);
      localStorage.setItem('aFARMETRA-language', languageCode);
      
      // Update document direction for RTL languages
      const selectedLang = INDIAN_LANGUAGES.find(lang => lang.code === languageCode);
      document.documentElement.dir = selectedLang?.rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = languageCode;
    }
  };

  const isRTL = INDIAN_LANGUAGES.find(lang => lang.code === currentLanguage)?.rtl || false;

  useEffect(() => {
    // Set initial direction
    const selectedLang = INDIAN_LANGUAGES.find(lang => lang.code === currentLanguage);
    document.documentElement.dir = selectedLang?.rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);

  const value: LanguageContextType = {
    currentLanguage,
    setLanguage,
    availableLanguages: INDIAN_LANGUAGES,
    isRTL,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
