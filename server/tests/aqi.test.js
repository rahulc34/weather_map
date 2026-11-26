import { describe, expect, it } from 'vitest';
import {
  categorize,
  computeAqi,
  describeOwmIndex,
  findForecastWindows,
  subIndex,
} from '../src/utils/aqi.js';
import { CLEAN_COMPONENTS, SMOGGY_COMPONENTS } from './fixtures.js';

describe('subIndex', () => {
  it('interpolates within PM2.5 breakpoints', () => {
    expect(subIndex('pm2_5', 0)).toBe(0);
    expect(subIndex('pm2_5', 30)).toBe(50);
    expect(subIndex('pm2_5', 45)).toBe(75);
    expect(subIndex('pm2_5', 90)).toBe(200);
  });

  it('converts CO from µg/m³ to mg/m³', () => {
    expect(subIndex('co', 1000)).toBe(50); // 1 mg/m³
  });

  it('caps at 500 for extreme values', () => {
    expect(subIndex('pm2_5', 999)).toBe(500);
  });

  it('returns null for unknown pollutants or invalid values', () => {
    expect(subIndex('xyz', 10)).toBeNull();
    expect(subIndex('pm10', undefined)).toBeNull();
    expect(subIndex('pm10', Number.NaN)).toBeNull();
  });

  it('treats negative concentrations as zero', () => {
    expect(subIndex('pm10', -5)).toBe(0);
  });
});

describe('categorize', () => {
  it.each([
    [0, 'good'],
    [50, 'good'],
    [51, 'satisfactory'],
    [150, 'moderate'],
    [250, 'poor'],
    [350, 'very_poor'],
    [450, 'severe'],
  ])('AQI %i → %s', (aqi, key) => {
    expect(categorize(aqi).key).toBe(key);
  });
});

describe('computeAqi', () => {
  it('uses the dominant pollutant on a smoggy day', () => {
    const result = computeAqi(SMOGGY_COMPONENTS);
    expect(result.dominantPollutant).toBe('pm2_5');
    expect(result.value).toBeGreaterThan(300);
    expect(result.category.key).toBe('very_poor');
    expect(result.category.level).toBe(5);
  });

  it('reports good air on a clean day', () => {
    expect(computeAqi(CLEAN_COMPONENTS).category.key).toBe('good');
  });

  it('handles empty input', () => {
    expect(computeAqi({})).toEqual({
      value: 0,
      dominantPollutant: null,
      category: { key: 'good', label: 'Good', level: 1 },
    });
  });
});

describe('describeOwmIndex', () => {
  it('maps the 1–5 OpenWeather index', () => {
    expect(describeOwmIndex(1)).toEqual({ value: 1, label: 'Good' });
    expect(describeOwmIndex(5)).toEqual({ value: 5, label: 'Very poor' });
  });

  it('returns null for invalid values', () => {
    expect(describeOwmIndex(0)).toBeNull();
    expect(describeOwmIndex(undefined)).toBeNull();
  });
});

describe('findForecastWindows', () => {
  const at = (h) => new Date(Date.UTC(2026, 10, 26, h)).toISOString();
  const hours = [300, 280, 100, 90, 95, 400, 420, 410].map((aqi, i) => ({ time: at(i), aqi }));

  it('finds the cleanest and most polluted 3-hour windows (end exclusive)', () => {
    const { best, worst } = findForecastWindows(hours);
    expect(best).toEqual({ start: at(2), end: at(5), avgAqi: 95 });
    expect(worst).toEqual({ start: at(5), end: at(8), avgAqi: 410 });
  });

  it('returns null when there is not enough data', () => {
    expect(findForecastWindows(hours.slice(0, 2))).toBeNull();
    expect(findForecastWindows(null)).toBeNull();
  });
});
