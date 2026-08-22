import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient, apiRequest } from '../services/apiClient.js';
import { BASE_STRINGS } from './strings.js';

export const LANGUAGES = [
  { code: 'en', native: 'English', tts: 'en-IN' },
  { code: 'hi', native: 'हिन्दी', tts: 'hi-IN' },
  { code: 'bn', native: 'বাংলা', tts: 'bn-IN' },
  { code: 'te', native: 'తెలుగు', tts: 'te-IN' },
  { code: 'mr', native: 'मराठी', tts: 'mr-IN' },
  { code: 'ta', native: 'தமிழ்', tts: 'ta-IN' },
  { code: 'gu', native: 'ગુજરાતી', tts: 'gu-IN' },
  { code: 'kn', native: 'ಕನ್ನಡ', tts: 'kn-IN' },
  { code: 'ml', native: 'മലയാളം', tts: 'ml-IN' },
  { code: 'pa', native: 'ਪੰਜਾਬੀ', tts: 'pa-IN' },
  { code: 'or', native: 'ଓଡ଼ିଆ', tts: 'or-IN' },
];

const LanguageContext = createContext(null);

const stored = (k, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? fallback;
  } catch {
    return fallback;
  }
};

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => stored('vg-lang', 'en'));
  const [dicts, setDicts] = useState(() => stored('vg-dicts', {}));
  const [loading, setLoading] = useState(false);

  const setLang = useCallback(
    async (code) => {
      setLangState(code);
      localStorage.setItem('vg-lang', JSON.stringify(code));
      if (code === 'en' || dicts[code]) return;
      setLoading(true);
      try {
        const data = await apiRequest(
          apiClient.post('/i18n', { lang: code, strings: BASE_STRINGS }, { timeout: 180_000 })
        );
        setDicts((prev) => {
          const next = { ...prev, [code]: data.strings };
          try {
            localStorage.setItem('vg-dicts', JSON.stringify(next));
          } catch {
            /* storage full — in-memory only */
          }
          return next;
        });
      } catch {
        // stay on English strings for missing keys
      } finally {
        setLoading(false);
      }
    },
    [dicts]
  );

  // Re-fetch on mount if the stored language has no cached dict (e.g. cleared)
  useEffect(() => {
    if (lang !== 'en' && !dicts[lang]) setLang(lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(() => {
    const dict = dicts[lang] || {};
    const t = (key) => dict[key] ?? BASE_STRINGS[key] ?? key;
    const language = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];
    return { lang, language, setLang, t, translating: loading };
  }, [lang, dicts, setLang, loading]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useI18n must be used inside LanguageProvider');
  return ctx;
}
