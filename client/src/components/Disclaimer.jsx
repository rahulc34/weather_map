import { useI18n } from '../i18n/I18nContext.jsx';

/**
 * Medical / AI disclaimer shown in the page footer.
 * @returns {import('react').JSX.Element} footer
 */
export function Disclaimer() {
  const { t } = useI18n();
  return (
    <footer className="footer">
      <div className="disclaimer">
        <h2 className="h4">
          <span aria-hidden="true">⚕️ </span>
          {t('disclaimer.title')}
        </h2>
        <p>{t('disclaimer.text')}</p>
      </div>
      <p className="small muted">{t('disclaimer.data')}</p>
    </footer>
  );
}
