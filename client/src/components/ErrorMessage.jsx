import { useI18n } from '../i18n/I18nContext.jsx';

/**
 * Accessible error banner (announced immediately via role="alert").
 * @param {{ message: string, onRetry?: () => void }} props
 */
export function ErrorMessage({ message, onRetry }) {
  const { t } = useI18n();
  return (
    <div className="error" role="alert">
      <p>
        <span aria-hidden="true">⚠️ </span>
        {message}
      </p>
      {onRetry && (
        <button type="button" className="btn btn--secondary" onClick={onRetry}>
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}
