import { useI18n } from '../i18n/I18nContext.jsx';

/**
 * @typedef {object} Suggestion
 * @property {string} title
 * @property {string} details
 * @property {string} [timing]
 * @property {{ reduces: 'exposure'|'emissions'|'both', explanation: string, estimate: string, confidence: 'low'|'medium'|'high' }} impact
 */

/**
 * The "Impact" block: what the action reduces, why, and an honest estimate.
 * @param {{ impact: Suggestion['impact'] }} props
 * @returns {import('react').JSX.Element} impact block
 */
function ImpactBlock({ impact }) {
  const { t } = useI18n();
  return (
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
  );
}

/**
 * One AI suggestion card. Model text is rendered as plain text only.
 * @param {{ item: Suggestion }} props
 * @returns {import('react').JSX.Element} list item
 */
export function SuggestionCard({ item }) {
  const { t } = useI18n();
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
        <ImpactBlock impact={item.impact} />
      </article>
    </li>
  );
}
