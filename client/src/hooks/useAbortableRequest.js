import { useCallback, useEffect, useRef } from 'react';

/**
 * One in-flight request at a time: each call to the returned function aborts
 * the previous request and returns a fresh AbortSignal. Any pending request
 * is aborted when the component unmounts.
 * @returns {() => AbortSignal} function returning the signal for a new request
 */
export function useAbortableRequest() {
  const controllerRef = useRef(/** @type {AbortController | null} */ (null));

  useEffect(() => () => controllerRef.current?.abort(), []);

  return useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = new AbortController();
    return controllerRef.current.signal;
  }, []);
}
