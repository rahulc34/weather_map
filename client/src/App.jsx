import { Suspense, lazy } from 'react';
import { useI18n } from './i18n/I18nContext.jsx';
import { useAssistantFlow } from './hooks/useAssistantFlow.js';
import { Header } from './components/Header.jsx';
import { LocationSearch } from './components/LocationSearch.jsx';
import { AqiCard } from './components/AqiCard.jsx';
import { UrgentAlert } from './components/UrgentAlert.jsx';
import { ProfileForm } from './components/ProfileForm.jsx';
import { PlanView } from './components/PlanView.jsx';
import { Disclaimer } from './components/Disclaimer.jsx';

// The chat is only needed after a location is chosen — load it on demand.
const Chat = lazy(() => import('./components/Chat.jsx'));

/**
 * SmogSense application: location → live AQI → household profile → AI plan → chat.
 * All state lives in useAssistantFlow; this component is layout only.
 * @returns {import('react').JSX.Element} the app
 */
export default function App() {
  const { t } = useI18n();
  const {
    location,
    needsLocation,
    profile,
    airQuality,
    plan,
    cityInputRef,
    planHeadingRef,
    selectLocation,
    submitProfile,
    retryAirQuality,
    regeneratePlan,
  } = useAssistantFlow();

  return (
    <>
      <Header />
      <main id="main" className="main" tabIndex={-1}>
        <LocationSearch ref={cityInputRef} onSelect={selectLocation} />
        {needsLocation && (
          <p className="field-error" role="alert">
            {t('profile.needLocation')}
          </p>
        )}
        {airQuality.status === 'success' && <UrgentAlert category={airQuality.data.aqi.category} />}
        <AqiCard state={airQuality} onRetry={retryAirQuality} locationName={location?.name} />
        <ProfileForm
          initialProfile={profile}
          onSubmit={submitProfile}
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
