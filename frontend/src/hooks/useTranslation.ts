import { useLanguage } from '../context/LanguageContext';
import { translations, getTranslation } from '../locales/translations';

/**
 * Custom hook for UI translations
 * Provides a t() function to get translated strings based on the current language
 */
export const useTranslation = () => {
    const { currentLanguage } = useLanguage();

    /**
     * Get a translation for a specific section and key
     * @param section The translation section (e.g., 'navigation', 'common')
     * @param key The translation key (e.g., 'home', 'save')
     * @returns The translated string or the key if not found
     */
    const t = (section: keyof typeof translations, key: string): string => {
        return getTranslation(section, key, currentLanguage);
    };

    return {
        t,
        language: currentLanguage,
        translations
    };
};

export default useTranslation;
