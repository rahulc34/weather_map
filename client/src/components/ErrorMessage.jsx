import { errorMessage } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';

/**
 * Accessible error banner (announced immediately via role="alert").
 * Pass an `error` object to have it translated in the current language, or a
 * ready-made `message`.
 * @param {{ error?: unknown, message?: string, onRetry?: () => void }} props
 * @returns {import('react').JSX.Element} error banner
 */
export function ErrorMessage({ error, message, onRetry }) {
  const { t } = useI18n();
  return (
    <div className="error" role="alert">
      <p>
        <span aria-hidden="true">⚠️ </span>
        {message ?? errorMessage(error, t)}
      </p>
      {onRetry && (
        <button type="button" className="btn btn--secondary" onClick={onRetry}>
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}
