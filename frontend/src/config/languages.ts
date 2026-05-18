// Indian Languages Configuration
export interface Language {
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
  flag: string;
}

export const INDIAN_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', rtl: false, flag: '🇺🇸' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', rtl: false, flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', rtl: false, flag: '🇧🇩' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', rtl: false, flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', rtl: false, flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', rtl: false, flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', rtl: true, flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', rtl: false, flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', rtl: false, flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', rtl: false, flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', rtl: false, flag: '🇮🇳' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', rtl: false, flag: '🇮🇳' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', rtl: false, flag: '🇮🇳' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي', rtl: true, flag: '🇮🇳' },
  { code: 'ks', name: 'Kashmiri', nativeName: 'कॉशुर', rtl: false, flag: '🇮🇳' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', rtl: false, flag: '🇳🇵' },
  { code: 'kok', name: 'Konkani', nativeName: 'कोंकणी', rtl: false, flag: '🇮🇳' },
  { code: 'doi', name: 'Dogri', nativeName: 'डोगरी', rtl: false, flag: '🇮🇳' },
  { code: 'mai', name: 'Maithili', nativeName: 'मৈথিলি', rtl: false, flag: '🇮🇳' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', rtl: false, flag: '🇮🇳' },
  { code: 'mni', name: 'Manipuri', nativeName: 'মৈতৈলোন', rtl: false, flag: '🇮🇳' },
  { code: 'bho', name: 'Bhojpuri', nativeName: 'भोजपुरी', rtl: false, flag: '🇮🇳' },
];

export const DEFAULT_LANGUAGE = 'en';
export const RTL_LANGUAGES = INDIAN_LANGUAGES.filter(lang => lang.rtl).map(lang => lang.code);
