/**
 * Deterministic, rule-based guidance used when the LLM is unavailable.
 * The UI labels it as "basic guidance" so users know it is not AI-personalised.
 * Content lives in fallbackContent.js; this module only selects and localises it.
 */
import { isUrgent } from './promptBuilder.js';
import { FALLBACK_CHAT, FALLBACK_SUMMARY, TIPS, URGENT_PRECAUTIONS } from './fallbackContent.js';

/** Cooking fuels that make clean-cooking advice the top sustainable action. */
const POLLUTING_FUELS = Object.freeze(['biomass', 'kerosene']);

/**
 * Convert a bilingual tip into the plan's suggestion shape.
 * @param {import('./fallbackContent.js').FallbackTip} tip
 * @param {'en'|'hi'} lang
 * @returns {object} suggestion matching the plan response schema
 */
function localize(tip, lang) {
  return {
    title: tip.title[lang],
    details: tip.details[lang],
    timing: '',
    impact: {
      reduces: tip.reduces,
      explanation: tip.explanation[lang],
      estimate: tip.estimate[lang],
      confidence: tip.confidence,
    },
  };
}

/**
 * Pick the tips that fit this household.
 * @param {{ hasAirPurifier?: boolean, cookingFuel?: string }} profile
 * @returns {{ dailyRoutine: object[], indoorHacks: object[], sustainableAlternatives: object[] }} tips per section
 */
function selectTips(profile) {
  const cleanCooking = POLLUTING_FUELS.includes(profile.cookingFuel) ? [TIPS.cleanCooking] : [];
  return {
    dailyRoutine: [TIPS.timing, TIPS.mask],
    indoorHacks: [
      profile.hasAirPurifier ? TIPS.purifier : TIPS.diyFilter,
      TIPS.ventilate,
      TIPS.noSmoke,
    ],
    sustainableAlternatives: [...cleanCooking, TIPS.transit, TIPS.noBurning],
  };
}

/**
 * Build a schema-compatible plan without the LLM.
 * @param {{ airQuality: import('./airQualityMappers.js').AirQualityReport | null, profile: any, lang: 'en'|'hi' }} input
 * @returns {object} plan matching the plan response schema
 */
export function buildFallbackPlan({ airQuality, profile, lang }) {
  const sections = selectTips(profile);
  const hasVulnerableMember = Object.values(profile.household ?? {}).some(Boolean);
  const localizeAll = (tips) => tips.map((tip) => localize(tip, lang));
  return {
    summary: FALLBACK_SUMMARY[lang],
    urgentPrecautions:
      isUrgent(airQuality) || hasVulnerableMember ? [...URGENT_PRECAUTIONS[lang]] : [],
    dailyRoutine: localizeAll(sections.dailyRoutine),
    indoorHacks: localizeAll(sections.indoorHacks),
    sustainableAlternatives: localizeAll(sections.sustainableAlternatives),
  };
}

/**
 * Fallback chat answer when the LLM is unavailable.
 * @param {'en'|'hi'} lang
 * @returns {{ answer: string, safetyNote: string }} answer in the requested language
 */
export function buildFallbackChat(lang) {
  return { ...(FALLBACK_CHAT[lang] ?? FALLBACK_CHAT.en) };
}
