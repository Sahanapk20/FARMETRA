// Core translations type definition
export type LanguageCode = 'en' | 'hi' | 'bn' | 'te' | 'mr' | 'ta' | 'ur' | 'gu' | 'kn' | 'ml' | 'pa' | 'or' | 'as' | 'sd' | 'ks' | 'ne' | 'kok' | 'doi' | 'mai' | 'sa' | 'mni' | 'bho';

export interface TranslationSection {
  [key: string]: string;
}

export interface Translations {
  [section: string]: {
    [lang in LanguageCode]?: TranslationSection;
  };
}
