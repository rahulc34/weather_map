import { useCallback, useState } from 'react';
import { isAbortError } from '../api/client.js';
import { useAbortableRequest } from './useAbortableRequest.js';

/**
 * @template T
 * @typedef {{ status: 'idle' } | { status: 'loading' } | { status: 'success', data: T } | { status: 'error', error: unknown }} AsyncState
 */

const IDLE = Object.freeze({ status: 'idle' });

/**
 * Track the state of an async request (idle → loading → success | error).
 * Starting a new request cancels the previous one; aborted requests never
 * update state. Errors are stored as objects so they can be translated at
 * render time in the current language.
 * @template A, T
 * @param {(arg: A, signal: AbortSignal) => Promise<T>} fetcher a stable (module-level) function
 * @returns {{ state: AsyncState<T>, run: (arg: A) => Promise<void>, reset: () => void }} state and controls
 */
export function useAsyncState(fetcher) {
  const [state, setState] = useState(/** @type {AsyncState<T>} */ (IDLE));
  const nextSignal = useAbortableRequest();

  const run = useCallback(
    async (arg) => {
      const signal = nextSignal();
      setState({ status: 'loading' });
      try {
        setState({ status: 'success', data: await fetcher(arg, signal) });
      } catch (error) {
        if (!isAbortError(error)) setState({ status: 'error', error });
      }
    },
    [fetcher, nextSignal],
  );

  const reset = useCallback(() => setState(IDLE), []);

  return { state, run, reset };
}
