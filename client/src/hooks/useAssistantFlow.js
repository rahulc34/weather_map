import { useCallback, useEffect, useRef, useState } from 'react';
import { buildContextPayload, getAirQuality, getPlan } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';
import { useAsyncState } from './useAsyncState.js';
import { useStoredProfile } from './useStoredProfile.js';

/**
 * @param {{ lat: number, lon: number }} location
 * @param {AbortSignal} signal
 * @returns {Promise<object>} live air-quality report
 */
const fetchAirQuality = (location, signal) => getAirQuality(location.lat, location.lon, signal);

/**
 * Fetch a plan and remember which language it was written in.
 * @param {{ lang: 'en'|'hi' }} payload
 * @param {AbortSignal} signal
 * @returns {Promise<object>} plan response plus `lang`
 */
const fetchPlan = (payload, signal) =>
  getPlan(payload, signal).then((data) => ({ ...data, lang: payload.lang }));

/**
 * Move focus to an element once content is ready (for keyboard and screen-reader users).
 * @param {import('react').RefObject<HTMLElement | null>} ref
 * @param {boolean} ready
 */
function useFocusWhenReady(ref, ready) {
  useEffect(() => {
    if (ready) ref.current?.focus();
  }, [ref, ready]);
}

/**
 * App state for the main flow: location → live AQI → profile → AI plan.
 * Keeps all orchestration out of the view so App is pure layout.
 * @returns {object} state, refs and event handlers for App
 */
export function useAssistantFlow() {
  const { lang } = useI18n();
  const [location, setLocation] = useState(
    /** @type {{ name: string, lat: number, lon: number } | null} */ (null),
  );
  const [needsLocation, setNeedsLocation] = useState(false);
  const [profile, saveProfile] = useStoredProfile();
  const { state: airQuality, run: loadAirQuality } = useAsyncState(fetchAirQuality);
  const { state: plan, run: loadPlan, reset: resetPlan } = useAsyncState(fetchPlan);
  const cityInputRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const planHeadingRef = useRef(/** @type {HTMLHeadingElement | null} */ (null));
  useFocusWhenReady(planHeadingRef, plan.status === 'success');

  const selectLocation = useCallback(
    (next) => {
      setLocation(next);
      setNeedsLocation(false);
      resetPlan();
      loadAirQuality(next);
    },
    [loadAirQuality, resetPlan],
  );

  const requestPlan = (nextProfile) => {
    if (!location) {
      setNeedsLocation(true);
      cityInputRef.current?.focus();
      return;
    }
    loadPlan(buildContextPayload({ location, profile: nextProfile, lang }));
  };

  return {
    location,
    needsLocation,
    profile,
    airQuality,
    plan,
    cityInputRef,
    planHeadingRef,
    selectLocation,
    submitProfile(nextProfile) {
      saveProfile(nextProfile);
      requestPlan(nextProfile);
    },
    retryAirQuality: () => location && loadAirQuality(location),
    regeneratePlan: () => requestPlan(profile),
  };
}
