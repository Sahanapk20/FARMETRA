import React, { useState } from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getTranslation } from '../locales/translations';
import './LanguageSelector.css';

const LanguageSelector: React.FC = () => {
  const { currentLanguage, setLanguage, availableLanguages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const currentLang = availableLanguages.find(lang => lang.code === currentLanguage);

  const handleLanguageSelect = (languageCode: string) => {
    setLanguage(languageCode);
    setIsOpen(false);
  };

  return (
    <div className="language-selector">
      <button
        className="language-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select language"
      >
        <Globe size={16} />
        <span className="language-flag">{currentLang?.flag}</span>
        <span className="language-name">{currentLang?.nativeName}</span>
        <ChevronDown size={14} className={`language-arrow ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="language-dropdown">
          <div className="language-search">
            <input
              type="text"
              placeholder={getTranslation('common', 'search', currentLanguage)}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="language-list">
            {availableLanguages.map((language) => (
              <button
                key={language.code}
                className={`language-option ${language.code === currentLanguage ? 'selected' : ''}`}
                onClick={() => handleLanguageSelect(language.code)}
              >
                <span className="language-option-flag">{language.flag}</span>
                <div className="language-option-text">
                  <span className="language-option-native">{language.nativeName}</span>
                  <span className="language-option-english">{language.name}</span>
                </div>
                {language.code === currentLanguage && (
                  <span className="language-selected-check">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {isOpen && (
        <div 
          className="language-selector-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default LanguageSelector;
