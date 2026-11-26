/** Shared test fixtures — realistic shapes of OpenWeather & Gemini payloads. */

export const NOW_SEC = Math.floor(Date.now() / 1000);

/** Delhi-on-a-bad-day concentrations (µg/m³). PM2.5 180 → NAQI "Very poor". */
export const SMOGGY_COMPONENTS = {
  co: 2500,
  no: 20,
  no2: 85,
  o3: 30,
  so2: 15,
  pm2_5: 180,
  pm10: 260,
  nh3: 10,
};

export const CLEAN_COMPONENTS = { co: 300, no2: 10, o3: 40, so2: 2, pm2_5: 12, pm10: 20 };

export const owmCurrent = (components = SMOGGY_COMPONENTS, aqi = 5) => ({
  coord: { lat: 28.61, lon: 77.21 },
  list: [{ dt: NOW_SEC, main: { aqi }, components }],
});

export const owmForecast = () => ({
  list: Array.from({ length: 30 }, (_, i) => ({
    dt: NOW_SEC + i * 3600,
    main: { aqi: 4 },
    // Cleanest around hours 12–14.
    components: { ...SMOGGY_COMPONENTS, pm2_5: i >= 12 && i <= 14 ? 40 : 150 + i },
  })),
});

export const owmGeocode = () => [
  {
    name: 'Delhi',
    local_names: { en: 'Delhi', hi: 'दिल्ली' },
    lat: 28.6517,
    lon: 77.2219,
    country: 'IN',
    state: 'Delhi',
  },
];

export const owmReverse = () => [
  { name: 'New Delhi', lat: 28.61, lon: 77.21, country: 'IN', state: 'Delhi' },
];

const suggestion = (title) => ({
  title,
  details: `Details for ${title}.`,
  timing: '2–4 pm',
  impact: {
    reduces: 'exposure',
    explanation: 'Lowers the amount of PM2.5 you breathe.',
    estimate: '~30% lower exposure',
    confidence: 'medium',
  },
});

export const validPlan = () => ({
  summary: 'Air is very poor today. Stay indoors in the morning.',
  urgentPrecautions: ['Keep children indoors.'],
  dailyRoutine: [suggestion('Walk at 2 pm'), suggestion('Take the metro')],
  indoorHacks: [suggestion('Run purifier'), suggestion('Avoid incense')],
  sustainableAlternatives: [suggestion('Carpool'), suggestion('Do not burn leaves')],
});

export const validProfile = () => ({
  household: { children: true, elderly: false, respiratory: true, heart: false, pregnant: false },
  commute: 'car',
  cookingFuel: 'lpg',
  heating: 'electric',
  hasAirPurifier: false,
  hasPlants: true,
  worksFromHome: false,
  notes: 'Son has mild asthma.',
});

/** A sample report as produced by airQualityService.getReport. */
export const sampleReport = (level = 5) => ({
  location: { name: 'New Delhi, Delhi, IN', lat: 28.61, lon: 77.21 },
  aqi: {
    value: level >= 5 ? 346 : 40,
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
      best: { start: '2026-11-26T08:30:00.000Z', end: '2026-11-26T10:30:00.000Z', avgAqi: 70 },
      worst: { start: '2026-11-26T16:30:00.000Z', end: '2026-11-26T18:30:00.000Z', avgAqi: 380 },
    },
  },
  observedAt: '2026-11-26T07:00:00.000Z',
});

/**
 * Build a fake fetch that routes OpenWeather paths to handlers.
 * @param {Record<string, () => any>} routes path → body; return an Error to simulate network failure
 */
export function fakeFetch(routes) {
  const calls = [];
  const fn = async (url) => {
    const u = new URL(url);
    calls.push(u);
    const handler = routes[u.pathname];
    if (!handler) return { ok: false, status: 404, json: async () => ({}) };
    const body = handler(u);
    if (body instanceof Error) throw body;
    if (body && body.__status) return { ok: false, status: body.__status, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => body };
  };
  fn.calls = calls;
  return fn;
}
