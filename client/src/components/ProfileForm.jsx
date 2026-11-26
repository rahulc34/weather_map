import { useState } from 'react';
import { useI18n } from '../i18n/I18nContext.jsx';

export const NOTES_MAX = 300;

export const DEFAULT_PROFILE = Object.freeze({
  household: { children: false, elderly: false, respiratory: false, heart: false, pregnant: false },
  commute: 'public_transport',
  cookingFuel: 'lpg',
  heating: 'none',
  hasAirPurifier: false,
  hasPlants: false,
  worksFromHome: false,
  notes: '',
});

const HOUSEHOLD_KEYS = ['children', 'elderly', 'respiratory', 'heart', 'pregnant'];
const COMMUTE = ['none', 'walk', 'cycle', 'two_wheeler', 'car', 'public_transport'];
const COOKING = ['lpg', 'piped_gas', 'electric', 'biomass', 'kerosene'];
const HEATING = ['none', 'electric', 'gas', 'wood_coal', 'heat_pump'];
const EQUIPMENT = [
  ['hasAirPurifier', 'purifier'],
  ['hasPlants', 'plants'],
  ['worksFromHome', 'wfh'],
];

/**
 * Labelled <select> bound to one profile field.
 * @param {{ id: string, label: string, value: string, options: string[], optionLabel: (o: string) => string, onChange: (v: string) => void }} props
 */
function SelectField({ id, label, value, options, optionLabel, onChange }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {optionLabel(o)}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Household & lifestyle questionnaire.
 * @param {{ initialProfile?: typeof DEFAULT_PROFILE, onSubmit: (p: typeof DEFAULT_PROFILE) => void, busy?: boolean, hasLocation: boolean }} props
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
  const toggleHousehold = (key) =>
    setProfile((p) => ({ ...p, household: { ...p.household, [key]: !p.household[key] } }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...profile, notes: profile.notes.trim() });
  };

  return (
    <section className="card" aria-labelledby="profile-heading">
      <h2 id="profile-heading">{t('profile.heading')}</h2>
      <p className="muted">{t('profile.intro')}</p>

      <form onSubmit={handleSubmit} className="profile-form">
        <fieldset>
          <legend>{t('profile.household')}</legend>
          <div className="checkbox-grid">
            {HOUSEHOLD_KEYS.map((key) => (
              <div className="checkbox" key={key}>
                <input
                  id={`hh-${key}`}
                  type="checkbox"
                  checked={profile.household[key]}
                  onChange={() => toggleHousehold(key)}
                />
                <label htmlFor={`hh-${key}`}>{t(`profile.${key}`)}</label>
              </div>
            ))}
          </div>
        </fieldset>

        <div className="field-grid">
          <SelectField
            id="commute"
            label={t('profile.commute')}
            value={profile.commute}
            options={COMMUTE}
            optionLabel={(o) => t(`profile.commuteOptions.${o}`)}
            onChange={(v) => update('commute', v)}
          />
          <SelectField
            id="cooking"
            label={t('profile.cooking')}
            value={profile.cookingFuel}
            options={COOKING}
            optionLabel={(o) => t(`profile.cookingOptions.${o}`)}
            onChange={(v) => update('cookingFuel', v)}
          />
          <SelectField
            id="heating"
            label={t('profile.heating')}
            value={profile.heating}
            options={HEATING}
            optionLabel={(o) => t(`profile.heatingOptions.${o}`)}
            onChange={(v) => update('heating', v)}
          />
        </div>

        <fieldset>
          <legend>{t('profile.equipment')}</legend>
          <div className="checkbox-grid">
            {EQUIPMENT.map(([field, key]) => (
              <div className="checkbox" key={field}>
                <input
                  id={`eq-${field}`}
                  type="checkbox"
                  checked={profile[field]}
                  onChange={() => update(field, !profile[field])}
                />
                <label htmlFor={`eq-${field}`}>{t(`profile.${key}`)}</label>
              </div>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="notes">{t('profile.notes')}</label>
          <textarea
            id="notes"
            rows={3}
            maxLength={NOTES_MAX}
            value={profile.notes}
            onChange={(e) => update('notes', e.target.value)}
            aria-describedby="notes-hint notes-count"
          />
          <p id="notes-hint" className="small muted">
            {t('profile.notesHint')}
          </p>
          <p id="notes-count" className="small muted">
            {t('profile.charsLeft', { count: NOTES_MAX - profile.notes.length })}
          </p>
        </div>

        {!hasLocation && (
          <p id="need-location" className="hint">
            {t('profile.needLocation')}
          </p>
        )}
        <button
          type="submit"
          className="btn btn--primary"
          aria-disabled={busy || undefined}
          aria-describedby={hasLocation ? undefined : 'need-location'}
          disabled={busy}
        >
          {busy ? t('profile.generating') : t('profile.submit')}
        </button>
      </form>
    </section>
  );
}
