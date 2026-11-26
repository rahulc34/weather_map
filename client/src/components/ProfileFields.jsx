import { useI18n } from '../i18n/I18nContext.jsx';

/**
 * A fieldset of labelled checkboxes.
 * @param {{ legend: string, idPrefix: string, items: { key: string, label: string, checked: boolean }[], onToggle: (key: string) => void }} props
 * @returns {import('react').JSX.Element} fieldset
 */
export function CheckboxGroup({ legend, idPrefix, items, onToggle }) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      <div className="checkbox-grid">
        {items.map(({ key, label, checked }) => {
          const id = `${idPrefix}-${key}`;
          return (
            <div className="checkbox" key={key}>
              <input id={id} type="checkbox" checked={checked} onChange={() => onToggle(key)} />
              <label htmlFor={id}>{label}</label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Labelled <select> bound to one profile field.
 * @param {{ id: string, label: string, value: string, options: string[], optionLabel: (option: string) => string, onChange: (value: string) => void }} props
 * @returns {import('react').JSX.Element} select field
 */
export function SelectField({ id, label, value, options, optionLabel, onChange }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabel(option)}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Optional free-text note with hint and live character counter.
 * @param {{ value: string, maxLength: number, onChange: (value: string) => void }} props
 * @returns {import('react').JSX.Element} notes field
 */
export function NotesField({ value, maxLength, onChange }) {
  const { t } = useI18n();
  return (
    <div className="field">
      <label htmlFor="notes">{t('profile.notes')}</label>
      <textarea
        id="notes"
        rows={3}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby="notes-hint notes-count"
      />
      <p id="notes-hint" className="small muted">
        {t('profile.notesHint')}
      </p>
      <p id="notes-count" className="small muted">
        {t('profile.charsLeft', { count: maxLength - value.length })}
      </p>
    </div>
  );
}
