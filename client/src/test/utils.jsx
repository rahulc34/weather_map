import axe from 'axe-core';
import { render } from '@testing-library/react';
import { expect, vi } from 'vitest';
import { I18nProvider } from '../i18n/I18nContext.jsx';

/**
 * Render inside the i18n provider.
 * @param {import('react').ReactElement} ui
 * @param {{ lang?: 'en'|'hi' }} [options]
 */
export function renderWithI18n(ui, { lang = 'en' } = {}) {
  return render(<I18nProvider initial={lang}>{ui}</I18nProvider>);
}

/**
 * Run axe-core against a container and fail with readable violations.
 * `color-contrast` is disabled because jsdom cannot compute rendered colours;
 * contrast is guaranteed by the colour tokens in index.css instead.
 * @param {Element} container
 * @param {{ isolated?: boolean }} [options] isolated components have no page landmarks
 */
export async function expectNoA11yViolations(container, { isolated = true } = {}) {
  const results = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false },
      ...(isolated ? { region: { enabled: false } } : {}),
    },
  });
  const summary = results.violations.map(
    (v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
  expect(summary).toEqual([]);
}

/** JSON Response helper for fetch mocks. */
export const jsonResponse = (body, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );

/**
 * Stub global fetch with a router: (url, init) => Promise<Response>.
 * @param {(url: URL, init?: RequestInit) => Promise<Response>} handler
 */
export function mockFetch(handler) {
  const fn = vi.fn((input, init) => handler(new URL(String(input), 'http://localhost'), init));
  vi.stubGlobal('fetch', fn);
  return fn;
}

export const sampleAirQuality = (level = 5) => ({
  location: { name: 'New Delhi, Delhi, IN', lat: 28.61, lon: 77.21 },
  aqi: {
    value: level >= 5 ? 346 : 42,
    dominantPollutant: 'pm2_5',
    category:
      level >= 5
        ? { key: 'very_poor', label: 'Very poor', level: 5 }
        : { key: 'good', label: 'Good', level: 1 },
    owmIndex: { value: 5, label: 'Very poor' },
  },
  pollutants: { pm2_5: 180, pm10: 260, no2: 85, o3: 30, co: 2500, so2: 15 },
  forecast: {
    hourly: [],
    windows: {
      best: { start: '2026-11-26T08:30:00.000Z', end: '2026-11-26T11:30:00.000Z', avgAqi: 70 },
      worst: { start: '2026-11-26T16:30:00.000Z', end: '2026-11-26T19:30:00.000Z', avgAqi: 380 },
    },
  },
  observedAt: '2026-11-26T07:00:00.000Z',
});

const suggestion = (title, reduces = 'exposure') => ({
  title,
  details: `How to: ${title}.`,
  timing: '2–4 pm',
  impact: {
    reduces,
    explanation: `Why ${title} helps.`,
    estimate: '~30% lower PM2.5',
    confidence: 'medium',
  },
});

export const samplePlanResponse = (overrides = {}) => ({
  plan: {
    summary: 'Very poor air today — keep outdoor time short.',
    urgentPrecautions: ['Keep your child indoors this evening.'],
    dailyRoutine: [suggestion('Walk at 2 pm'), suggestion('Take the metro', 'both')],
    indoorHacks: [suggestion('DIY box-fan filter'), suggestion('Avoid incense')],
    sustainableAlternatives: [
      suggestion('Carpool to work', 'emissions'),
      suggestion('Never burn leaves', 'emissions'),
    ],
  },
  source: 'ai',
  airQualityAvailable: true,
  generatedAt: '2026-11-26T07:05:00.000Z',
  ...overrides,
});
