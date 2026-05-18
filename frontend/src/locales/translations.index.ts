// Main translations index - combines modular translation files
import { landing } from './translations/landing';
import { common } from './translations/common';
import { auth } from './translations/auth';

// Re-export the old translations object with all sections
export const translations = {
  // Landing page translations - uses landingExtended key for compatibility
  landingExtended: landing,
  
  // Common UI translations
  common: common,
  
  // Auth translations - uses authExtended key for compatibility
  authExtended: auth,
  
  // Navigation translations (use landing for now)
  navigation: landing,
  
  // Errors (use auth errors)
  errors: auth,
};

// Helper function to get translation
export const getTranslation = (
  section: keyof typeof translations,
  key: string,
  language: string
): string => {
  const sectionData = translations[section] as Record<string, Record<string, string>>;
  if (!sectionData) return key;
  
  const langSection = sectionData[language] || sectionData['en'];
  if (!langSection) return key;
  
  return langSection[key] || key;
};

export default translations;
