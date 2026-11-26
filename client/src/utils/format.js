/**
 * Locale-aware formatting helpers.
 */

const LOCALES = { en: 'en-IN', hi: 'hi-IN' };
const TIME = { hour: 'numeric', minute: '2-digit' };

/**
 * @param {string} iso
 * @param {'en'|'hi'} lang
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string} localised time
 */
export function formatTime(iso, lang, options = TIME) {
  return new Intl.DateTimeFormat(LOCALES[lang] ?? LOCALES.en, options).format(new Date(iso));
}

/**
 * "2:00 pm – 5:00 pm" style range, with the weekday when it is not today.
 * @param {{ start: string, end: string }} window `end` is exclusive
 * @param {'en'|'hi'} lang
 * @param {Date} [now]
 * @returns {string} localised time range
 */
export function formatWindow({ start, end }, lang, now = new Date()) {
  const sameDay = new Date(start).toDateString() === now.toDateString();
  const startOpts = sameDay ? TIME : { weekday: 'short', ...TIME };
  return `${formatTime(start, lang, startOpts)} – ${formatTime(end, lang)}`;
}
