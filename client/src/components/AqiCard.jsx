import { memo } from 'react';
import { useI18n } from '../i18n/I18nContext.jsx';
import { formatTime, formatWindow } from '../utils/format.js';
import { ErrorMessage } from './ErrorMessage.jsx';

const POLLUTANT_ORDER = ['pm2_5', 'pm10', 'no2', 'o3', 'co', 'so2'];

/** Placeholder shown while live data loads (hidden from assistive tech). */
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
 * Category badge: colour AND text label, never colour alone.
 * @param {{ categoryKey: string, label: string }} props
 */
export function AqiBadge({ categoryKey, label }) {
  return <span className={`aqi-badge aqi-badge--${categoryKey}`}>{label}</span>;
}

/**
 * Live air-quality dashboard.
 * @param {{ state: { status: 'idle'|'loading'|'success'|'error', data?: any, error?: string }, onRetry: () => void, locationName?: string }} props
 */
function AqiCardInner({ state, onRetry, locationName }) {
  const { t, lang } = useI18n();
  const { status, data, error } = state;

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

      {status === 'error' && <ErrorMessage message={error} onRetry={onRetry} />}

      {status === 'success' && data && (
        <AqiDetails data={data} locationName={locationName} t={t} lang={lang} />
      )}
    </section>
  );
}

/** @param {{ data: any, locationName?: string, t: Function, lang: 'en'|'hi' }} props */
function AqiDetails({ data, locationName, t, lang }) {
  const { aqi, pollutants, forecast, observedAt } = data;
  const categoryKey = aqi.category.key;
  const label = t(`categories.${categoryKey}.label`);
  const place = locationName || data.location?.name;
  const windows = forecast?.windows;

  return (
    <div className="aqi">
      {place && <p className="aqi__place">{place}</p>}

      <div className={`aqi__summary aqi__summary--${categoryKey}`}>
        <p className="aqi__value">
          <span className="visually-hidden">{t('aqi.indexLabel')}: </span>
          <span className="aqi__number" data-testid="aqi-value">
            {aqi.value}
          </span>
          <AqiBadge categoryKey={categoryKey} label={label} />
        </p>
        <p className="aqi__scale">
          {t('aqi.indexLabel')} · {t('aqi.scale')}
        </p>
        <p className="aqi__health">{t(`categories.${categoryKey}.health`)}</p>
      </div>

      {aqi.dominantPollutant && (
        <p>
          <strong>{t('aqi.dominant')}:</strong> {t(`pollutants.${aqi.dominantPollutant}`)} (
          {t(`pollutantNames.${aqi.dominantPollutant}`)})
        </p>
      )}

      <h3 className="h4">
        {t('aqi.pollutants')} <span className="muted">({t('aqi.unit')})</span>
      </h3>
      <dl className="pollutants">
        {POLLUTANT_ORDER.filter((k) => pollutants[k] !== undefined).map((k) => (
          <div key={k} className="pollutants__item">
            <dt>
              <abbr title={t(`pollutantNames.${k}`)}>{t(`pollutants.${k}`)}</abbr>
            </dt>
            <dd>{pollutants[k]}</dd>
          </div>
        ))}
      </dl>

      <h3 className="h4">{t('aqi.forecastHeading')}</h3>
      {windows ? (
        <ul className="forecast">
          <li className="forecast__item forecast__item--best">
            <span className="forecast__label">
              <span aria-hidden="true">✅ </span>
              {t('aqi.forecastBest')}
            </span>
            <span>
              {formatWindow(windows.best, lang)} · AQI ~{windows.best.avgAqi}
            </span>
          </li>
          <li className="forecast__item forecast__item--worst">
            <span className="forecast__label">
              <span aria-hidden="true">⛔ </span>
              {t('aqi.forecastWorst')}
            </span>
            <span>
              {formatWindow(windows.worst, lang)} · AQI ~{windows.worst.avgAqi}
            </span>
          </li>
        </ul>
      ) : (
        <p className="muted">{t('aqi.forecastNone')}</p>
      )}

      <p className="small muted">
        {aqi.owmIndex && (
          <>{t('aqi.owm', { value: aqi.owmIndex.value, label: aqi.owmIndex.label })} · </>
        )}
        {t('aqi.updated', { time: formatTime(observedAt, lang) })}
      </p>
      <p className="small muted">{t('aqi.note')}</p>
    </div>
  );
}

export const AqiCard = memo(AqiCardInner);
