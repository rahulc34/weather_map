import { POLLUTANTS } from '@smogsense/shared';
import { useI18n } from '../i18n/I18nContext.jsx';
import { formatTime, formatWindow } from '../utils/format.js';

/**
 * Category badge: colour AND text label, never colour alone.
 * @param {{ categoryKey: string }} props
 * @returns {import('react').JSX.Element} badge
 */
export function AqiBadge({ categoryKey }) {
  const { t } = useI18n();
  return (
    <span className={`aqi-badge aqi-badge--${categoryKey}`}>
      {t(`categories.${categoryKey}.label`)}
    </span>
  );
}

/**
 * Big AQI number, category badge and plain-language health message.
 * @param {{ aqi: { value: number, category: { key: string } } }} props
 * @returns {import('react').JSX.Element} summary
 */
function AqiSummary({ aqi }) {
  const { t } = useI18n();
  const categoryKey = aqi.category.key;
  return (
    <div className={`aqi__summary aqi__summary--${categoryKey}`}>
      <p className="aqi__value">
        <span className="visually-hidden">{t('aqi.indexLabel')}: </span>
        <span className="aqi__number" data-testid="aqi-value">
          {aqi.value}
        </span>
        <AqiBadge categoryKey={categoryKey} />
      </p>
      <p className="aqi__scale">
        {t('aqi.indexLabel')} · {t('aqi.scale')}
      </p>
      <p className="aqi__health">{t(`categories.${categoryKey}.health`)}</p>
    </div>
  );
}

/**
 * Pollutant concentrations as a description list (abbreviations expanded).
 * @param {{ pollutants: Record<string, number> }} props
 * @returns {import('react').JSX.Element} pollutant list
 */
function PollutantList({ pollutants }) {
  const { t } = useI18n();
  return (
    <>
      <h3 className="h4">
        {t('aqi.pollutants')} <span className="muted">({t('aqi.unit')})</span>
      </h3>
      <dl className="pollutants">
        {POLLUTANTS.filter((key) => pollutants[key] !== undefined).map((key) => (
          <div key={key} className="pollutants__item">
            <dt>
              <abbr title={t(`pollutantNames.${key}`)}>{t(`pollutants.${key}`)}</abbr>
            </dt>
            <dd>{pollutants[key]}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

/**
 * One forecast window (cleanest or most polluted).
 * @param {{ kind: 'best' | 'worst', window: { start: string, end: string, avgAqi: number } }} props
 * @returns {import('react').JSX.Element} list item
 */
function ForecastWindow({ kind, window }) {
  const { t, lang } = useI18n();
  const isBest = kind === 'best';
  return (
    <li className={`forecast__item forecast__item--${kind}`}>
      <span className="forecast__label">
        <span aria-hidden="true">{isBest ? '✅ ' : '⛔ '}</span>
        {t(isBest ? 'aqi.forecastBest' : 'aqi.forecastWorst')}
      </span>
      <span>
        {formatWindow(window, lang)} · AQI ~{window.avgAqi}
      </span>
    </li>
  );
}

/**
 * Cleanest / most polluted windows in the next 24 hours.
 * @param {{ windows?: { best: object, worst: object } | null }} props
 * @returns {import('react').JSX.Element} forecast section
 */
function ForecastWindows({ windows }) {
  const { t } = useI18n();
  return (
    <>
      <h3 className="h4">{t('aqi.forecastHeading')}</h3>
      {windows ? (
        <ul className="forecast">
          <ForecastWindow kind="best" window={windows.best} />
          <ForecastWindow kind="worst" window={windows.worst} />
        </ul>
      ) : (
        <p className="muted">{t('aqi.forecastNone')}</p>
      )}
    </>
  );
}

/**
 * Full live air-quality details.
 * @param {{ data: any, locationName?: string }} props
 * @returns {import('react').JSX.Element} details
 */
export function AqiDetails({ data, locationName }) {
  const { t, lang } = useI18n();
  const { aqi, pollutants, forecast, observedAt } = data;
  const place = locationName || data.location?.name;
  const dominant = aqi.dominantPollutant;
  const owm = aqi.owmIndex;

  return (
    <div className="aqi">
      {place && <p className="aqi__place">{place}</p>}
      <AqiSummary aqi={aqi} />
      {dominant && (
        <p>
          <strong>{t('aqi.dominant')}:</strong> {t(`pollutants.${dominant}`)} (
          {t(`pollutantNames.${dominant}`)})
        </p>
      )}
      <PollutantList pollutants={pollutants} />
      <ForecastWindows windows={forecast?.windows} />
      <p className="small muted">
        {owm && <>{t('aqi.owm', { value: owm.value, label: owm.label })} · </>}
        {t('aqi.updated', { time: formatTime(observedAt, lang) })}
      </p>
      <p className="small muted">{t('aqi.note')}</p>
    </div>
  );
}
