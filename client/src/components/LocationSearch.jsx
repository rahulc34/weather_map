import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { searchCities, errorMessage } from '../api/client.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { useI18n } from '../i18n/I18nContext.jsx';

const MIN_CHARS = 2;

/** @param {{ name: string, state: string | null, country: string }} place */
const placeLabel = (place) => [place.name, place.state, place.country].filter(Boolean).join(', ');

/**
 * City search (debounced suggestions) + "Use my location" (browser geolocation).
 * @param {{ onSelect: (loc: { name: string, lat: number, lon: number }) => void }} props
 */
export const LocationSearch = forwardRef(function LocationSearch({ onSelect }, inputRef) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState(
    /** @type {{ kind: string, message?: string }} */ ({ kind: 'idle' }),
  );
  const debouncedQuery = useDebouncedValue(query.trim(), 400);
  const abortRef = useRef(/** @type {AbortController | null} */ (null));
  const skipNextSearch = useRef(false);

  const runSearch = useCallback(
    async (q) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStatus({ kind: 'searching' });
      try {
        const found = await searchCities(q, controller.signal);
        setResults(found);
        setStatus({ kind: found.length ? 'results' : 'empty' });
      } catch (err) {
        if (err?.name === 'AbortError') return;
        setResults([]);
        setStatus({ kind: 'error', message: errorMessage(err, t) });
      }
    },
    [t],
  );

  // Debounced type-ahead search.
  useEffect(() => {
    if (skipNextSearch.current || debouncedQuery.length < MIN_CHARS) {
      skipNextSearch.current = false;
      return;
    }
    runSearch(debouncedQuery);
  }, [debouncedQuery, runSearch]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const handleChange = (e) => {
    setQuery(e.target.value);
    if (e.target.value.trim().length < MIN_CHARS) {
      setResults([]);
      setStatus({ kind: 'idle' });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length < MIN_CHARS) {
      setStatus({ kind: 'error', message: t('location.minChars') });
      return;
    }
    runSearch(q);
  };

  const choose = (place) => {
    const name = placeLabel(place);
    skipNextSearch.current = true;
    setQuery(name);
    setResults([]);
    setStatus({ kind: 'selected', message: t('location.selected', { name }) });
    onSelect({ name, lat: place.lat, lon: place.lon });
  };

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) {
      setStatus({ kind: 'error', message: t('location.geoUnsupported') });
      return;
    }
    setStatus({ kind: 'locating' });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setResults([]);
        setStatus({
          kind: 'selected',
          message: t('location.selected', { name: t('location.current') }),
        });
        onSelect({ name: '', lat: coords.latitude, lon: coords.longitude });
      },
      (err) => {
        const key = err.code === 1 ? 'location.geoDenied' : 'location.geoUnavailable';
        setStatus({ kind: 'error', message: t(key) });
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60 * 1000 },
    );
  };

  const statusText = {
    searching: t('location.searching'),
    locating: t('location.locating'),
    results: t('location.results', { count: results.length }),
    empty: t('location.noResults'),
    selected: status.message,
  }[status.kind];

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
            maxLength={80}
            placeholder={t('location.placeholder')}
            value={query}
            onChange={handleChange}
            aria-describedby="location-status"
            aria-invalid={status.kind === 'error' || undefined}
          />
          <button type="submit" className="btn">
            {t('location.search')}
          </button>
        </div>
      </form>

      <button type="button" className="btn btn--secondary location-geo" onClick={useMyLocation}>
        <span aria-hidden="true">📍 </span>
        {t('location.useMine')}
      </button>

      <p id="location-status" className="status-text" role="status" aria-live="polite">
        {statusText ?? ''}
      </p>
      {status.kind === 'error' && (
        <p className="field-error" role="alert">
          {status.message}
        </p>
      )}

      {results.length > 0 && (
        <ul className="results" aria-label={t('location.resultsLabel')}>
          {results.map((place) => (
            <li key={`${place.lat},${place.lon}`}>
              <button type="button" className="results__btn" onClick={() => choose(place)}>
                {placeLabel(place)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
});
