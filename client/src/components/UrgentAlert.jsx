import { URGENT_LEVEL } from '@smogsense/shared';
import { useI18n } from '../i18n/I18nContext.jsx';

/**
 * Prominent safety banner for very poor / severe air.
 * @param {{ category: { key: string, level: number } }} props
 * @returns {import('react').JSX.Element | null} alert, or nothing below "Very poor"
 */
export function UrgentAlert({ category }) {
  const { t } = useI18n();
  if (!category || category.level < URGENT_LEVEL) return null;
  const items = t('urgent.items');
  return (
    <section className="urgent" role="alert" aria-labelledby="urgent-heading">
      <h2 id="urgent-heading">
        <span aria-hidden="true">🚨 </span>
        {t('urgent.title', { label: t(`categories.${category.key}.label`) })}
      </h2>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
