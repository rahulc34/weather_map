import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { STRINGS } from './strings.js';
import { translate, useI18n } from './I18nContext.jsx';

/** Flatten nested keys: { a: { b: 'x' } } → ['a.b'] */
const flatKeys = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? flatKeys(v, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );

describe('translations', () => {
  it('English and Hindi have exactly the same keys', () => {
    expect(flatKeys(STRINGS.hi).sort()).toEqual(flatKeys(STRINGS.en).sort());
  });

  it('Hindi strings are actually translated (contain Devanagari)', () => {
    expect(STRINGS.hi.profile.submit).toMatch(/[ऀ-ॿ]/);
    expect(STRINGS.hi.disclaimer.text).toMatch(/[ऀ-ॿ]/);
  });

  it('interpolates placeholders and keeps unknown ones', () => {
    expect(translate('en', 'location.results', { count: 3 })).toBe(
      '3 places found. Choose one below.',
    );
    expect(translate('en', 'location.results')).toContain('{count}');
  });

  it('returns the key for missing entries and arrays as-is', () => {
    expect(translate('en', 'does.not.exist')).toBe('does.not.exist');
    expect(Array.isArray(translate('hi', 'chat.examples'))).toBe(true);
  });

  it('useI18n throws outside the provider', () => {
    expect(() => renderHook(() => useI18n())).toThrow(/I18nProvider/);
  });
});
