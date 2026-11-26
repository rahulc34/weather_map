/**
 * Constants shared by the SmogSense server and client: the single source of
 * truth for supported languages, profile options, input limits and the
 * AQI / plan vocabulary. Changing a value here updates validation (server)
 * and the UI (client) together.
 */

/** Supported UI + AI output languages. */
export const LANGUAGES = Object.freeze(['en', 'hi']);

/** Household members that change the advice (vulnerable groups). */
export const HOUSEHOLD_MEMBERS = Object.freeze([
  'children',
  'elderly',
  'respiratory',
  'heart',
  'pregnant',
]);

/** Main ways the household travels. */
export const COMMUTE_MODES = Object.freeze([
  'none',
  'walk',
  'cycle',
  'two_wheeler',
  'car',
  'public_transport',
]);

/** Cooking fuels, from cleanest to most polluting is not implied. */
export const COOKING_FUELS = Object.freeze(['lpg', 'piped_gas', 'electric', 'biomass', 'kerosene']);

/** Winter heating methods. */
export const HEATING_TYPES = Object.freeze(['none', 'electric', 'gas', 'wood_coal', 'heat_pump']);

/** Yes/no lifestyle flags on the profile. */
export const EQUIPMENT_FLAGS = Object.freeze(['hasAirPurifier', 'hasPlants', 'worksFromHome']);

/** Profile used before the user fills in the form (and as server defaults). */
export const DEFAULT_PROFILE = Object.freeze({
  household: Object.freeze(Object.fromEntries(HOUSEHOLD_MEMBERS.map((m) => [m, false]))),
  commute: 'public_transport',
  cookingFuel: 'lpg',
  heating: 'none',
  hasAirPurifier: false,
  hasPlants: false,
  worksFromHome: false,
  notes: '',
});

/** Maximum lengths for user-supplied text (enforced on both sides). */
export const LIMITS = Object.freeze({
  cityQuery: 80,
  locationName: 120,
  notes: 300,
  question: 500,
  historyItems: 6,
  historyText: 1000,
});

/** Pollutants shown in the dashboard, in display order. */
export const POLLUTANTS = Object.freeze(['pm2_5', 'pm10', 'no2', 'o3', 'co', 'so2']);

/** AQI category levels at or above this ("Very poor", "Severe") need urgent guidance. */
export const URGENT_LEVEL = 5;

/** Sections of the AI plan, in display order. */
export const PLAN_SECTIONS = Object.freeze([
  'dailyRoutine',
  'indoorHacks',
  'sustainableAlternatives',
]);

/** What a suggestion reduces. */
export const IMPACT_TYPES = Object.freeze(['exposure', 'emissions', 'both']);

/** How confident the estimate is. */
export const CONFIDENCE_LEVELS = Object.freeze(['low', 'medium', 'high']);
