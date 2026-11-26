import { forwardRef, memo } from 'react';
import { useI18n } from '../i18n/I18nContext.jsx';
import { ErrorMessage } from './ErrorMessage.jsx';
import { PlanContent } from './PlanContent.jsx';

export { SuggestionCard } from './SuggestionCard.jsx';

/**
 * Loading placeholder for the plan.
 * @returns {import('react').JSX.Element} skeleton
 */
function PlanSkeleton() {
  return (
    <div className="skeleton-group" aria-hidden="true" data-testid="plan-skeleton">
      {[0, 1, 2].map((i) => (
        <div key={i} className="skeleton skeleton--card" />
      ))}
    </div>
  );
}

/**
 * Plan card: loading, error or the generated plan. The heading receives focus
 * when the plan is ready (via the forwarded ref).
 * @param {{
 *   state: import('../hooks/useAsyncState.js').AsyncState<import('./PlanContent.jsx').PlanResponse>,
 *   onRetry: () => void,
 *   onRegenerate: () => void,
 * }} props
 * @param {import('react').Ref<HTMLHeadingElement>} headingRef
 * @returns {import('react').JSX.Element | null} plan card
 */
function PlanViewInner({ state, onRetry, onRegenerate }, headingRef) {
  const { t } = useI18n();
  const { status } = state;
  if (status === 'idle') return null;
  const loading = status === 'loading';

  return (
    <section className="card plan" aria-labelledby="plan-heading" aria-busy={loading}>
      <h2 id="plan-heading" ref={headingRef} tabIndex={-1}>
        {t('plan.heading')}
      </h2>
      <div aria-live="polite">{loading && <p className="status-text">{t('plan.loading')}</p>}</div>
      {loading && <PlanSkeleton />}
      {status === 'error' && <ErrorMessage error={state.error} onRetry={onRetry} />}
      {status === 'success' && <PlanContent data={state.data} onRegenerate={onRegenerate} />}
    </section>
  );
}

export const PlanView = memo(forwardRef(PlanViewInner));
