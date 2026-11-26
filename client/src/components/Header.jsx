import { useI18n } from '../i18n/I18nContext.jsx';
import { LanguageToggle } from './LanguageToggle.jsx';

/**
 * Skip link + page header with the app name and language switch.
 * @returns {import('react').JSX.Element} header
 */
export function Header() {
  const { t } = useI18n();
  return (
    <>
      <a href="#main" className="skip-link">
        {t('app.skip')}
      </a>
      <header className="header">
        <div className="header__inner">
          <div>
            <h1 className="header__title">
              <img src="/favicon.svg" alt="" width="36" height="36" className="header__logo" />
              {t('app.title')}
            </h1>
            <p className="header__tagline">{t('app.tagline')}</p>
          </div>
          <LanguageToggle />
        </div>
      </header>
    </>
  );
}
