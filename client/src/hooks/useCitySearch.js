import { useCallback, useEffect, useRef, useState } from 'react';
import { isAbortError, searchCities } from '../api/client.js';
import { useAbortableRequest } from './useAbortableRequest.js';
import { useDebouncedValue } from './useDebouncedValue.js';

const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 400;

/**
 * Search status. Stores message *keys* / error objects, never translated
 * text, so messages re-translate on a language switch.
 * @typedef {{ kind: 'idle' | 'searching' | 'results' | 'empty' | 'locating' }
 *   | { kind: 'selected', name: string | null }
 *   | { kind: 'error', key?: string, error?: unknown }} SearchStatus
 */

/**
 * @param {{ name: string, state: string | null, country: string }} place
 * @returns {string} e.g. "New Delhi, Delhi, IN"
 */
export const placeLabel = (place) =>
  [place.name, place.state, place.country].filter(Boolean).join(', ');

/**
 * Run `onSearch` when the user pauses typing (unless the next search is skipped,
 * e.g. right after choosing a place fills the input).
 * @param {string} query current input value
 * @param {(text: string) => void} onSearch
 * @param {import('react').MutableRefObject<boolean>} skipNextRef
 */
function useTypeAhead(query, onSearch, skipNextRef) {
  const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  useEffect(() => {
    if (skipNextRef.current || debouncedQuery.length < MIN_QUERY_LENGTH) {
      skipNextRef.current = false;
      return;
    }
    onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch, skipNextRef]);
}

/**
 * City search state: debounced type-ahead, explicit submit, selection.
 * @param {(location: { name: string, lat: number, lon: number }) => void} onSelect
 * @returns {object} query, results, status and event handlers
 */
export function useCitySearch(onSelect) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState(/** @type {SearchStatus} */ ({ kind: 'idle' }));
  const nextSignal = useAbortableRequest();
  const skipNextSearch = useRef(false);

  const runSearch = useCallback(
    async (text) => {
      const signal = nextSignal();
      setStatus({ kind: 'searching' });
      try {
        const found = await searchCities(text, signal);
        setResults(found);
        setStatus({ kind: found.length ? 'results' : 'empty' });
      } catch (error) {
        if (isAbortError(error)) return;
        setResults([]);
        setStatus({ kind: 'error', error });
      }
    },
    [nextSignal],
  );

  useTypeAhead(query, runSearch, skipNextSearch);

  const select = (location, statusName) => {
    setResults([]);
    setStatus({ kind: 'selected', name: statusName });
    onSelect(location);
  };

  return {
    query,
    results,
    status,
    setStatus,
    changeQuery(value) {
      setQuery(value);
      if (value.trim().length >= MIN_QUERY_LENGTH) return;
      setResults([]);
      setStatus({ kind: 'idle' });
    },
    submitQuery() {
      const text = query.trim();
      if (text.length < MIN_QUERY_LENGTH) setStatus({ kind: 'error', key: 'location.minChars' });
      else runSearch(text);
    },
    choosePlace(place) {
      const name = placeLabel(place);
      skipNextSearch.current = true;
      setQuery(name);
      select({ name, lat: place.lat, lon: place.lon }, name);
    },
    chooseCoords({ lat, lon }) {
      select({ name: '', lat, lon }, null);
    },
  };
}
