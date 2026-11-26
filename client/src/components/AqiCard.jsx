import { memo } from 'react';
import { useI18n } from '../i18n/I18nContext.jsx';
import { AqiDetails } from './AqiDetails.jsx';
import { ErrorMessage } from './ErrorMessage.jsx';

/**
 * Placeholder shown while live data loads (hidden from assistive tech).
 * @returns {import('react').JSX.Element} skeleton
 */
function AqiSkeleton() {
  return (
    <div className="skeleton-group" aria-hidden="true" data-testid="aqi-skeleton">
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--big" />
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}

/**
 * Live air-quality dashboard card: empty, loading, error or details.
 * @param {{ state: import('../hooks/useAsyncState.js').AsyncState<any>, onRetry: () => void, locationName?: string }} props
 * @returns {import('react').JSX.Element} card
 */
function AqiCardInner({ state, onRetry, locationName }) {
  const { t } = useI18n();
  const { status } = state;

  return (
    <section className="card" aria-labelledby="aqi-heading" aria-busy={status === 'loading'}>
      <h2 id="aqi-heading">{t('aqi.heading')}</h2>
      {status === 'idle' && <p className="muted">{t('aqi.empty')}</p>}
      {status === 'loading' && (
        <>
          <p className="visually-hidden" role="status">
            {t('aqi.loading')}
          </p>
          <AqiSkeleton />
        </>
      )}
      {status === 'error' && <ErrorMessage error={state.error} onRetry={onRetry} />}
      {status === 'success' && <AqiDetails data={state.data} locationName={locationName} />}
    </section>
  );
}

export const AqiCard = memo(AqiCardInner);
