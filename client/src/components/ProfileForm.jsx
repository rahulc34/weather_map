import { useState } from 'react';
import {
  COMMUTE_MODES,
  COOKING_FUELS,
  DEFAULT_PROFILE,
  EQUIPMENT_FLAGS,
  HEATING_TYPES,
  HOUSEHOLD_MEMBERS,
  LIMITS,
} from '@smogsense/shared';
import { useI18n } from '../i18n/I18nContext.jsx';
import { CheckboxGroup, NotesField, SelectField } from './ProfileFields.jsx';

/** The three single-choice questions, driven by shared option lists. */
const SELECT_FIELDS = Object.freeze([
  { field: 'commute', options: COMMUTE_MODES, i18nKey: 'commute' },
  { field: 'cookingFuel', options: COOKING_FUELS, i18nKey: 'cooking' },
  { field: 'heating', options: HEATING_TYPES, i18nKey: 'heating' },
]);

/**
 * Household & lifestyle questionnaire.
 * @param {{ initialProfile?: typeof DEFAULT_PROFILE, onSubmit: (profile: typeof DEFAULT_PROFILE) => void, busy?: boolean, hasLocation: boolean }} props
 * @returns {import('react').JSX.Element} profile form
 */
export function ProfileForm({
  initialProfile = DEFAULT_PROFILE,
  onSubmit,
  busy = false,
  hasLocation,
}) {
  const { t } = useI18n();
  const [profile, setProfile] = useState(initialProfile);

  const update = (field, value) => setProfile((p) => ({ ...p, [field]: value }));
  const toggleMember = (key) =>
    setProfile((p) => ({ ...p, household: { ...p.household, [key]: !p.household[key] } }));
  const toggleFlag = (key) => setProfile((p) => ({ ...p, [key]: !p[key] }));
  const checkboxItems = (keys, values) =>
    keys.map((key) => ({ key, label: t(`profile.${key}`), checked: values[key] }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...profile, notes: profile.notes.trim() });
  };

  return (
    <section className="card" aria-labelledby="profile-heading">
      <h2 id="profile-heading">{t('profile.heading')}</h2>
      <p className="muted">{t('profile.intro')}</p>
      <form onSubmit={handleSubmit} className="profile-form">
        <CheckboxGroup
          legend={t('profile.household')}
          idPrefix="hh"
          items={checkboxItems(HOUSEHOLD_MEMBERS, profile.household)}
          onToggle={toggleMember}
        />
        <div className="field-grid">
          {SELECT_FIELDS.map(({ field, options, i18nKey }) => (
            <SelectField
              key={field}
              id={field}
              label={t(`profile.${i18nKey}`)}
              value={profile[field]}
              options={options}
              optionLabel={(option) => t(`profile.${i18nKey}Options.${option}`)}
              onChange={(value) => update(field, value)}
            />
          ))}
        </div>
        <CheckboxGroup
          legend={t('profile.equipment')}
          idPrefix="eq"
          items={checkboxItems(EQUIPMENT_FLAGS, profile)}
          onToggle={toggleFlag}
        />
        <NotesField
          value={profile.notes}
          maxLength={LIMITS.notes}
          onChange={(v) => update('notes', v)}
        />
        <SubmitPlanButton busy={busy} hasLocation={hasLocation} />
      </form>
    </section>
  );
}

/**
 * Submit button, with a hint when no location has been chosen yet.
 * @param {{ busy: boolean, hasLocation: boolean }} props
 * @returns {import('react').JSX.Element} button (and hint)
 */
function SubmitPlanButton({ busy, hasLocation }) {
  const { t } = useI18n();
  return (
    <>
      {!hasLocation && (
        <p id="need-location" className="hint">
          {t('profile.needLocation')}
        </p>
      )}
      <button
        type="submit"
        className="btn btn--primary"
        aria-describedby={hasLocation ? undefined : 'need-location'}
        disabled={busy}
      >
        {busy ? t('profile.generating') : t('profile.submit')}
      </button>
    </>
  );
}
