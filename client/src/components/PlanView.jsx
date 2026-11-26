import { forwardRef, memo } from 'react';
import { useI18n } from '../i18n/I18nContext.jsx';
import { ErrorMessage } from './ErrorMessage.jsx';

const SECTIONS = [
  ['dailyRoutine', '🗓️'],
  ['indoorHacks', '🏠'],
  ['sustainableAlternatives', '🌱'],
];

/**
 * One AI suggestion with its "Impact" explanation.
 * @param {{ item: { title: string, details: string, timing?: string, impact: { reduces: string, explanation: string, estimate: string, confidence: string } } }} props
 */
export function SuggestionCard({ item }) {
  const { t } = useI18n();
  const { impact } = item;
  return (
    <li className="suggestion">
      <article>
        <h4>{item.title}</h4>
        <p>{item.details}</p>
        {item.timing && (
          <p className="suggestion__timing">
            <strong>{t('plan.when')}:</strong> {item.timing}
          </p>
        )}
        <div className="impact">
          <p className="impact__head">
            <strong>{t('plan.impact')}:</strong>{' '}
            <span className={`impact__tag impact__tag--${impact.reduces}`}>
              {t(`plan.reduces.${impact.reduces}`)}
            </span>
          </p>
          <p>{impact.explanation}</p>
          <p className="impact__estimate">
            <strong>{t('plan.estimate')}:</strong> {impact.estimate}{' '}
            <span className="muted">({t(`plan.confidence.${impact.confidence}`)})</span>
          </p>
        </div>
      </article>
    </li>
  );
}

/** Loading placeholder for the plan. */
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
 * Renders the structured plan. Model output is rendered as plain text only.
 * @param {{
 *   state: { status: 'idle'|'loading'|'success'|'error', data?: any, error?: string },
 *   onRetry: () => void,
 *   onRegenerate: () => void,
 * }} props
 */
const PlanViewInner = forwardRef(function PlanView({ state, onRetry, onRegenerate }, headingRef) {
  const { t, lang } = useI18n();
  const { status, data, error } = state;
  if (status === 'idle') return null;

  return (
    <section className="card plan" aria-labelledby="plan-heading" aria-busy={status === 'loading'}>
      <h2 id="plan-heading" ref={headingRef} tabIndex={-1}>
        {t('plan.heading')}
      </h2>

      <div aria-live="polite">
        {status === 'loading' && <p className="status-text">{t('plan.loading')}</p>}
      </div>
      {status === 'loading' && <PlanSkeleton />}
      {status === 'error' && <ErrorMessage message={error} onRetry={onRetry} />}

      {status === 'success' && data && (
        <>
          <p className={`source source--${data.source}`}>
            <span aria-hidden="true">{data.source === 'ai' ? '✨ ' : 'ℹ️ '}</span>
            {data.source === 'ai' ? t('plan.sourceAi') : t('plan.sourceFallback')}
          </p>
          {data.lang !== lang && (
            <p className="hint">
              {t('plan.langMismatch', { lang: t(`lang.${data.lang}`) })}{' '}
              <button type="button" className="btn btn--link" onClick={onRegenerate}>
                {t('plan.regenerate', { lang: t(`lang.${lang}`) })}
              </button>
            </p>
          )}
          {!data.airQualityAvailable && <p className="hint">{t('plan.noAqi')}</p>}

          <div lang={data.lang}>
            <p className="plan__summary">{data.plan.summary}</p>

            {data.plan.urgentPrecautions.length > 0 && (
              <div className="urgent urgent--inline">
                <h3>
                  <span aria-hidden="true">🚨 </span>
                  {t('plan.urgent')}
                </h3>
                <ul>
                  {data.plan.urgentPrecautions.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            )}

            {SECTIONS.map(([key, icon]) => (
              <section key={key} className="plan__section" aria-labelledby={`plan-${key}`}>
                <h3 id={`plan-${key}`}>
                  <span aria-hidden="true">{icon} </span>
                  {t(`plan.sections.${key}`)}
                </h3>
                <ul className="suggestions">
                  {data.plan[key].map((item, i) => (
                    <SuggestionCard key={`${key}-${i}`} item={item} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <p className="small muted">{t('plan.estimateNote')}</p>
        </>
      )}
    </section>
  );
});

export const PlanView = memo(PlanViewInner);
