import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage, getAirQuality, getPlan, userTimeZone } from './api/client.js';
import { useI18n } from './i18n/I18nContext.jsx';
import { LanguageToggle } from './components/LanguageToggle.jsx';
import { LocationSearch } from './components/LocationSearch.jsx';
import { AqiCard } from './components/AqiCard.jsx';
import { UrgentAlert } from './components/UrgentAlert.jsx';
import { DEFAULT_PROFILE, ProfileForm } from './components/ProfileForm.jsx';
import { PlanView } from './components/PlanView.jsx';
import { Disclaimer } from './components/Disclaimer.jsx';

// The chat is only needed after a location is chosen — load it on demand.
const Chat = lazy(() => import('./components/Chat.jsx'));

const PROFILE_KEY = 'smogsense.profile';
const IDLE = { status: 'idle' };

/** Restore the profile saved in this browser (never sent anywhere but our API). */
function loadSavedProfile() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(PROFILE_KEY) ?? 'null');
    return saved
      ? {
          ...DEFAULT_PROFILE,
          ...saved,
          household: { ...DEFAULT_PROFILE.household, ...saved.household },
        }
      : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export default function App() {
  const { t, lang } = useI18n();
  const [location, setLocation] = useState(
    /** @type {{ name: string, lat: number, lon: number } | null} */ (null),
  );
  const [aq, setAq] = useState(IDLE);
  const [plan, setPlan] = useState(IDLE);
  const [profile, setProfile] = useState(loadSavedProfile);
  const [locationError, setLocationError] = useState('');

  const cityInputRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const planHeadingRef = useRef(/** @type {HTMLHeadingElement | null} */ (null));
  const aqAbort = useRef(/** @type {AbortController | null} */ (null));
  const planAbort = useRef(/** @type {AbortController | null} */ (null));

  const loadAirQuality = useCallback(
    async (loc) => {
      aqAbort.current?.abort();
      const controller = new AbortController();
      aqAbort.current = controller;
      setAq({ status: 'loading' });
      try {
        const data = await getAirQuality(loc.lat, loc.lon, controller.signal);
        setAq({ status: 'success', data });
      } catch (err) {
        if (err?.name !== 'AbortError') setAq({ status: 'error', error: errorMessage(err, t) });
      }
    },
    [t],
  );

  const handleSelectLocation = useCallback(
    (loc) => {
      setLocation(loc);
      setLocationError('');
      setPlan(IDLE);
      loadAirQuality(loc);
    },
    [loadAirQuality],
  );

  const generatePlan = useCallback(
    async (nextProfile) => {
      if (!location) {
        setLocationError(t('profile.needLocation'));
        cityInputRef.current?.focus();
        return;
      }
      planAbort.current?.abort();
      const controller = new AbortController();
      planAbort.current = controller;
      setPlan({ status: 'loading' });
      try {
        const data = await getPlan(
          {
            lat: location.lat,
            lon: location.lon,
            locationName: location.name || undefined,
            lang,
            timeZone: userTimeZone(),
            profile: nextProfile,
          },
          controller.signal,
        );
        setPlan({ status: 'success', data: { ...data, lang } });
      } catch (err) {
        if (err?.name !== 'AbortError') setPlan({ status: 'error', error: errorMessage(err, t) });
      }
    },
    [location, lang, t],
  );

  const handleProfileSubmit = useCallback(
    (nextProfile) => {
      setProfile(nextProfile);
      try {
        window.localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile));
      } catch {
        /* storage unavailable — continue without persistence */
      }
      generatePlan(nextProfile);
    },
    [generatePlan],
  );

  const retryAq = useCallback(
    () => location && loadAirQuality(location),
    [location, loadAirQuality],
  );
  const regeneratePlan = useCallback(() => generatePlan(profile), [generatePlan, profile]);

  // Move focus to the plan when it is ready, so keyboard & screen-reader users land on it.
  useEffect(() => {
    if (plan.status === 'success') planHeadingRef.current?.focus();
  }, [plan.status]);

  useEffect(
    () => () => {
      aqAbort.current?.abort();
      planAbort.current?.abort();
    },
    [],
  );

  return (
    <>
      <a href="#main" className="skip-link">
        {t('app.skip')}
      </a>
      <header className="header">
        <div className="header__inner">
          <div>
            <h1 className="header__title">
              <span aria-hidden="true">🌫️ </span>
              {t('app.title')}
            </h1>
            <p className="header__tagline">{t('app.tagline')}</p>
          </div>
          <LanguageToggle />
        </div>
      </header>

      <main id="main" className="main" tabIndex={-1}>
        <LocationSearch ref={cityInputRef} onSelect={handleSelectLocation} />
        {locationError && (
          <p className="field-error" role="alert">
            {locationError}
          </p>
        )}

        {aq.status === 'success' && <UrgentAlert category={aq.data.aqi.category} />}
        <AqiCard state={aq} onRetry={retryAq} locationName={location?.name} />

        <ProfileForm
          initialProfile={profile}
          onSubmit={handleProfileSubmit}
          busy={plan.status === 'loading'}
          hasLocation={Boolean(location)}
        />

        <PlanView
          ref={planHeadingRef}
          state={plan}
          onRetry={regeneratePlan}
          onRegenerate={regeneratePlan}
        />

        {location && (
          <Suspense fallback={<p className="muted">{t('common.loading')}</p>}>
            <Chat location={location} profile={profile} />
          </Suspense>
        )}
      </main>

      <Disclaimer />
    </>
  );
}
