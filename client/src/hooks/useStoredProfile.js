import { useCallback, useState } from 'react';
import { DEFAULT_PROFILE } from '@smogsense/shared';

const PROFILE_KEY = 'smogsense.profile';

/**
 * Restore the profile saved in this browser, merged over the defaults so new
 * fields always have a value.
 * @returns {typeof DEFAULT_PROFILE} saved or default profile
 */
function loadProfile() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(PROFILE_KEY) ?? 'null');
    if (!saved) return DEFAULT_PROFILE;
    return {
      ...DEFAULT_PROFILE,
      ...saved,
      household: { ...DEFAULT_PROFILE.household, ...saved.household },
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

/**
 * Household profile persisted in localStorage (never stored on the server).
 * @returns {[typeof DEFAULT_PROFILE, (profile: typeof DEFAULT_PROFILE) => void]} profile and saver
 */
export function useStoredProfile() {
  const [profile, setProfile] = useState(loadProfile);

  const saveProfile = useCallback((next) => {
    setProfile(next);
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable (private mode) — keep the in-memory profile */
    }
  }, []);

  return [profile, saveProfile];
}
