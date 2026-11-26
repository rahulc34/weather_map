/**
 * Air Quality Index helpers based on India's National AQI (CPCB, 0–500).
 *
 * OpenWeather returns raw pollutant concentrations (µg/m³). We convert them to
 * NAQI sub-indices with linear interpolation between breakpoints. NAQI is
 * officially defined on 24-h / 8-h averages; applying it to current hourly
 * concentrations gives an *approximate, indicative* index — the UI says so.
 */

/** Breakpoints: [concLow, concHigh, indexLow, indexHigh]. Concentrations in µg/m³ (CO in mg/m³). */
const BREAKPOINTS = Object.freeze({
  pm2_5: [
    [0, 30, 0, 50],
    [30, 60, 50, 100],
    [60, 90, 100, 200],
    [90, 120, 200, 300],
    [120, 250, 300, 400],
    [250, 380, 400, 500],
  ],
  pm10: [
    [0, 50, 0, 50],
    [50, 100, 50, 100],
    [100, 250, 100, 200],
    [250, 350, 200, 300],
    [350, 430, 300, 400],
    [430, 510, 400, 500],
  ],
  no2: [
    [0, 40, 0, 50],
    [40, 80, 50, 100],
    [80, 180, 100, 200],
    [180, 280, 200, 300],
    [280, 400, 300, 400],
    [400, 520, 400, 500],
  ],
  o3: [
    [0, 50, 0, 50],
    [50, 100, 50, 100],
    [100, 168, 100, 200],
    [168, 208, 200, 300],
    [208, 748, 300, 400],
    [748, 1000, 400, 500],
  ],
  co: [
    [0, 1, 0, 50],
    [1, 2, 50, 100],
    [2, 10, 100, 200],
    [10, 17, 200, 300],
    [17, 34, 300, 400],
    [34, 50, 400, 500],
  ],
});

/** NAQI categories, ordered from best to worst. `level` is 1-based. */
export const AQI_CATEGORIES = Object.freeze([
  { key: 'good', label: 'Good', max: 50, level: 1 },
  { key: 'satisfactory', label: 'Satisfactory', max: 100, level: 2 },
  { key: 'moderate', label: 'Moderately polluted', max: 200, level: 3 },
  { key: 'poor', label: 'Poor', max: 300, level: 4 },
  { key: 'very_poor', label: 'Very poor', max: 400, level: 5 },
  { key: 'severe', label: 'Severe', max: Infinity, level: 6 },
]);

/** Levels at or above this are "very poor"/"severe" and trigger urgent guidance. */
export const URGENT_LEVEL = 5;

const OWM_INDEX_LABELS = ['Good', 'Fair', 'Moderate', 'Poor', 'Very poor'];

/**
 * Compute one pollutant's NAQI sub-index.
 * @param {keyof typeof BREAKPOINTS} pollutant
 * @param {number} concentration µg/m³ as reported by OpenWeather
 * @returns {number | null} rounded sub-index (0–500) or null if not computable
 */
export function subIndex(pollutant, concentration) {
  const table = BREAKPOINTS[pollutant];
  if (!table || typeof concentration !== 'number' || !Number.isFinite(concentration)) return null;
  const c = Math.max(0, pollutant === 'co' ? concentration / 1000 : concentration);
  const last = table[table.length - 1];
  if (c >= last[1]) return 500;
  const [cLo, cHi, iLo, iHi] = table.find(([, hi]) => c <= hi) ?? last;
  return Math.round(iLo + ((iHi - iLo) * (c - cLo)) / (cHi - cLo));
}

/**
 * Map an AQI value to its category.
 * @param {number} aqi
 * @returns {(typeof AQI_CATEGORIES)[number]}
 */
export function categorize(aqi) {
  return AQI_CATEGORIES.find((c) => aqi <= c.max) ?? AQI_CATEGORIES[AQI_CATEGORIES.length - 1];
}

/**
 * Overall AQI is the maximum sub-index; the pollutant responsible is "dominant".
 * @param {Record<string, number>} components OpenWeather `components` object
 * @returns {{ value: number, dominantPollutant: string | null, category: { key: string, label: string, level: number } }}
 */
export function computeAqi(components = {}) {
  let value = 0;
  let dominantPollutant = null;
  for (const pollutant of Object.keys(BREAKPOINTS)) {
    const idx = subIndex(
      /** @type {keyof typeof BREAKPOINTS} */ (pollutant),
      components[pollutant],
    );
    if (idx !== null && idx > value) {
      value = idx;
      dominantPollutant = pollutant;
    }
  }
  const { key, label, level } = categorize(value);
  return { value, dominantPollutant, category: { key, label, level } };
}

/**
 * @param {number} index OpenWeather's own 1–5 index
 * @returns {{ value: number, label: string } | null}
 */
export function describeOwmIndex(index) {
  if (!Number.isInteger(index) || index < 1 || index > 5) return null;
  return { value: index, label: OWM_INDEX_LABELS[index - 1] };
}

const HOUR_MS = 60 * 60 * 1000;

/**
 * Find the cleanest and dirtiest contiguous windows in an hourly forecast.
 * `end` is exclusive (one hour after the last hourly sample in the window).
 * @param {{ time: string, aqi: number }[]} hourly chronologically sorted, ISO times
 * @param {number} [windowHours=3]
 * @returns {{ best: { start: string, end: string, avgAqi: number }, worst: { start: string, end: string, avgAqi: number } } | null}
 */
export function findForecastWindows(hourly, windowHours = 3) {
  if (!Array.isArray(hourly) || hourly.length < windowHours) return null;
  let best = null;
  let worst = null;
  for (let i = 0; i + windowHours <= hourly.length; i += 1) {
    const slice = hourly.slice(i, i + windowHours);
    const avgAqi = Math.round(slice.reduce((sum, h) => sum + h.aqi, 0) / windowHours);
    const end = new Date(Date.parse(slice[slice.length - 1].time) + HOUR_MS).toISOString();
    const window = { start: slice[0].time, end, avgAqi };
    if (!best || avgAqi < best.avgAqi) best = window;
    if (!worst || avgAqi > worst.avgAqi) worst = window;
  }
  return { best, worst };
}
