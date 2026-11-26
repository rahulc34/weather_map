import { LANGUAGES } from '@smogsense/shared';
import { useI18n } from '../i18n/I18nContext.jsx';

/**
 * English / Hindi switch implemented as a pair of toggle buttons.
 * @returns {import('react').JSX.Element} language toggle
 */
export function LanguageToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="lang-toggle" role="group" aria-label={t('lang.label')}>
      {LANGUAGES.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={lang === code}
          className="lang-toggle__btn"
          onClick={() => setLang(code)}
        >
          {t(`lang.${code}`)}
        </button>
      ))}
    </div>
  );
}
