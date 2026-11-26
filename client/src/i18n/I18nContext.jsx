import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { STRINGS } from './strings.js';

const I18nContext = createContext(null);

const STORAGE_KEY = 'smogsense.lang';

/**
 * Resolve a dotted key ("plan.sections.dailyRoutine") and fill {placeholders}.
 * Arrays/objects are returned as-is; missing keys return the key itself.
 * @param {'en'|'hi'} lang
 * @param {string} key
 * @param {Record<string, string | number>} [vars]
 */
export function translate(lang, key, vars) {
  const value = key.split('.').reduce((node, part) => node?.[part], STRINGS[lang]);
  if (value === undefined) return key;
  if (typeof value !== 'string' || !vars) return value;
  return value.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

function initialLang() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'hi') return saved;
  } catch {
    /* storage unavailable (private mode) — fall through */
  }
  return navigator.language?.startsWith('hi') ? 'hi' : 'en';
}

/**
 * Provides the current language, a setter and the `t` helper.
 * Keeps <html lang> in sync so screen readers use the right voice.
 */
export function I18nProvider({ children, initial }) {
  const [lang, setLangState] = useState(() => initial ?? initialLang());

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ lang, setLang, t: (key, vars) => translate(lang, key, vars) }),
    [lang, setLang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** @returns {{ lang: 'en'|'hi', setLang: (l: 'en'|'hi') => void, t: (key: string, vars?: object) => any }} */
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
