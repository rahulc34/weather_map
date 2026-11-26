import { PLAN_SECTIONS } from '@smogsense/shared';
import { useI18n } from '../i18n/I18nContext.jsx';
import { SuggestionCard } from './SuggestionCard.jsx';

/** Decorative icon per plan section. */
const SECTION_ICONS = Object.freeze({
  dailyRoutine: '🗓️',
  indoorHacks: '🏠',
  sustainableAlternatives: '🌱',
});

/**
 * @typedef {object} PlanResponse
 * @property {{ summary: string, urgentPrecautions: string[] } & Record<string, import('./SuggestionCard.jsx').Suggestion[]>} plan
 * @property {'ai' | 'fallback'} source
 * @property {boolean} airQualityAvailable
 * @property {'en' | 'hi'} lang language the plan was written in
 */

/**
 * Where the plan came from, plus language / missing-data notices.
 * @param {{ data: PlanResponse, onRegenerate: () => void }} props
 * @returns {import('react').JSX.Element} notices
 */
function PlanNotices({ data, onRegenerate }) {
  const { t, lang } = useI18n();
  const isAi = data.source === 'ai';
  return (
    <>
      <p className={`source source--${data.source}`}>
        <span aria-hidden="true">{isAi ? '✨ ' : 'ℹ️ '}</span>
        {t(isAi ? 'plan.sourceAi' : 'plan.sourceFallback')}
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
    </>
  );
}

/**
 * Urgent precautions written by the model (only when relevant).
 * @param {{ items: string[] }} props
 * @returns {import('react').JSX.Element | null} urgent block
 */
function UrgentPrecautions({ items }) {
  const { t } = useI18n();
  if (items.length === 0) return null;
  return (
    <div className="urgent urgent--inline">
      <h3>
        <span aria-hidden="true">🚨 </span>
        {t('plan.urgent')}
      </h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * One plan section (routine / indoor hacks / sustainable alternatives).
 * @param {{ sectionKey: string, items: import('./SuggestionCard.jsx').Suggestion[] }} props
 * @returns {import('react').JSX.Element} section
 */
function PlanSection({ sectionKey, items }) {
  const { t } = useI18n();
  const headingId = `plan-${sectionKey}`;
  return (
    <section className="plan__section" aria-labelledby={headingId}>
      <h3 id={headingId}>
        <span aria-hidden="true">{SECTION_ICONS[sectionKey]} </span>
        {t(`plan.sections.${sectionKey}`)}
      </h3>
      <ul className="suggestions">
        {items.map((item, index) => (
          <SuggestionCard key={`${sectionKey}-${index}`} item={item} />
        ))}
      </ul>
    </section>
  );
}

/**
 * The full generated plan.
 * @param {{ data: PlanResponse, onRegenerate: () => void }} props
 * @returns {import('react').JSX.Element} plan content
 */
export function PlanContent({ data, onRegenerate }) {
  const { t } = useI18n();
  return (
    <>
      <PlanNotices data={data} onRegenerate={onRegenerate} />
      <div lang={data.lang}>
        <p className="plan__summary">{data.plan.summary}</p>
        <UrgentPrecautions items={data.plan.urgentPrecautions} />
        {PLAN_SECTIONS.map((key) => (
          <PlanSection key={key} sectionKey={key} items={data.plan[key]} />
        ))}
      </div>
      <p className="small muted">{t('plan.estimateNote')}</p>
    </>
  );
}
