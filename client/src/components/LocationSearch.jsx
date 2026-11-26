import { forwardRef } from 'react';
import { LIMITS } from '@smogsense/shared';
import { errorMessage } from '../api/client.js';
import { placeLabel, useCitySearch } from '../hooks/useCitySearch.js';
import { useI18n } from '../i18n/I18nContext.jsx';
import { getCurrentCoords } from '../utils/geolocation.js';

/**
 * Translate the current search status into live-region text.
 * @param {import('../hooks/useCitySearch.js').SearchStatus} status
 * @param {number} resultCount
 * @param {(key: string, vars?: object) => string} t
 * @returns {string} status message ('' when there is nothing to announce)
 */
function statusMessage(status, resultCount, t) {
  switch (status.kind) {
    case 'searching':
      return t('location.searching');
    case 'locating':
      return t('location.locating');
    case 'results':
      return t('location.results', { count: resultCount });
    case 'empty':
      return t('location.noResults');
    case 'selected':
      return t('location.selected', { name: status.name ?? t('location.current') });
    default:
      return '';
  }
}

/**
 * Polite status line plus an assertive error line.
 * @param {{ status: import('../hooks/useCitySearch.js').SearchStatus, resultCount: number }} props
 * @returns {import('react').JSX.Element} status region
 */
function SearchStatusText({ status, resultCount }) {
  const { t } = useI18n();
  const isError = status.kind === 'error';
  return (
    <>
      <p id="location-status" className="status-text" role="status" aria-live="polite">
        {statusMessage(status, resultCount, t)}
      </p>
      {isError && (
        <p className="field-error" role="alert">
          {status.key ? t(status.key) : errorMessage(status.error, t)}
        </p>
      )}
    </>
  );
}

/**
 * Matching places as a list of buttons.
 * @param {{ places: { name: string, state: string | null, country: string, lat: number, lon: number }[], onChoose: (place: object) => void }} props
 * @returns {import('react').JSX.Element | null} results list
 */
function PlaceResults({ places, onChoose }) {
  const { t } = useI18n();
  if (places.length === 0) return null;
  return (
    <ul className="results" aria-label={t('location.resultsLabel')}>
      {places.map((place) => (
        <li key={`${place.lat},${place.lon}`}>
          <button type="button" className="results__btn" onClick={() => onChoose(place)}>
            {placeLabel(place)}
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * City search (debounced suggestions) + "Use my location" (browser geolocation).
 * @param {{ onSelect: (location: { name: string, lat: number, lon: number }) => void }} props
 * @param {import('react').Ref<HTMLInputElement>} inputRef
 * @returns {import('react').JSX.Element} location card
 */
function LocationSearchInner({ onSelect }, inputRef) {
  const { t } = useI18n();
  const search = useCitySearch(onSelect);

  const locateMe = async () => {
    search.setStatus({ kind: 'locating' });
    try {
      search.chooseCoords(await getCurrentCoords());
    } catch (err) {
      search.setStatus({ kind: 'error', key: err.i18nKey });
    }
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    search.submitQuery();
  };

  return (
    <section className="card" aria-labelledby="location-heading">
      <h2 id="location-heading">{t('location.heading')}</h2>
      <form className="location-form" role="search" onSubmit={handleSubmit} noValidate>
        <label htmlFor="city-input">{t('location.label')}</label>
        <div className="location-form__row">
          <input
            id="city-input"
            ref={inputRef}
            type="text"
            inputMode="search"
            autoComplete="address-level2"
            maxLength={LIMITS.cityQuery}
            placeholder={t('location.placeholder')}
            value={search.query}
            onChange={(e) => search.changeQuery(e.target.value)}
            aria-describedby="location-status"
            aria-invalid={search.status.kind === 'error' || undefined}
          />
          <button type="submit" className="btn">
            {t('location.search')}
          </button>
        </div>
      </form>
      <button type="button" className="btn btn--secondary location-geo" onClick={locateMe}>
        <span aria-hidden="true">📍 </span>
        {t('location.useMine')}
      </button>
      <SearchStatusText status={search.status} resultCount={search.results.length} />
      <PlaceResults places={search.results} onChoose={search.choosePlace} />
    </section>
  );
}

export const LocationSearch = forwardRef(LocationSearchInner);
