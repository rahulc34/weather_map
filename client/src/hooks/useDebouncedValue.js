import { useEffect, useState } from 'react';

/**
 * Returns `value` only after it has stopped changing for `delayMs`.
 * Used to avoid an API call on every keystroke in the city search.
 * @template T
 * @param {T} value
 * @param {number} [delayMs] quiet period in ms (defaults to 400)
 * @returns {T} the debounced value
 */
export function useDebouncedValue(value, delayMs = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
