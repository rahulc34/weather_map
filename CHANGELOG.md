# Changelog

All notable changes to SmogSense. Format: [Keep a Changelog](https://keepachangelog.com/).

## [1.1.0] — 2026-11-27

Code-quality release. Behaviour is unchanged except for the fixes listed below.

### Changed

- **Enforced code-quality gates in ESLint:** max 60 lines per function, complexity ≤ 10, ≤ 4
  parameters, max depth 3, and no nested ternaries, shadowing or parameter reassignment. Fixed
  all 94 violations; lint now reports 0 errors and 0 warnings.
- **Complete JSDoc:** `eslint-plugin-jsdoc` now requires `@param` and `@returns` on every
  exported function, hook and component.
- **Removed duplication:**
  - New `shared/` workspace package (`@smogsense/shared`) with the constants used by both
    server and client: languages, profile options, limits, pollutants, AQI levels and plan
    sections.
  - Plan and chat now share one AI pipeline (task descriptors).
  - One `composePrompt()` builds every prompt.
  - One `summarizeIssues()` handles zod errors.
  - One `useAbortableRequest` / `useAsyncState` replaces four copies of the abort logic.
  - One `buildContextPayload()` builds the plan and chat request bodies.
- **Smaller modules:**
  - OpenWeather HTTP client split from pure mappers.
  - Fallback content (data) split from the selection logic.
  - `App` is layout only, with state in `useAssistantFlow`.
  - `LocationSearch`, `Chat`, `ProfileForm`, `PlanView` and `AqiCard` are split into
    focused sub-components and hooks.
  - i18n split into `en.js` and `hi.js`.
- **Consistent naming:** `aq` → `airQuality`; `createX` factories, `useX` hooks, `toX`
  mappers, `buildX` builders. Profile i18n keys now match field names.
- Errors are stored as objects and translated at render time, so messages follow the selected
  language.

### Fixed

- Gemini requests now use the `v1beta` API, which system instructions and JSON-schema output
  require. Before this, live plans fell back to basic guidance.
- Switching language no longer re-runs the city search and re-opens the results list.
- Header logo renders consistently on Windows (SVG instead of the fog emoji).

### Added

- 13 new tests: OpenWeather mappers, error normalisation, zod issue summaries, a client/server
  contract test, and a regression test for the language-switch bug. 191 tests in total, about
  98% coverage.

## [1.0.0] — 2026-11-26

First submission for Hack2skill PromptWars — Challenge 6: Urban Air Quality Assistant.

### Added

- **Live AQI dashboard** — city search (debounced) or browser geolocation; India NAQI (0–500)
  computed from OpenWeather concentrations; PM2.5, PM10, NO₂, O₃, CO, SO₂; colour + text
  category labels; plain-language health message; cleanest / most polluted 3-hour windows from
  the 24-hour forecast.
- **AI personalised plan (Google Gemini)** — low-emission daily routine, indoor air-quality hacks
  and sustainable alternatives, each with an "Impact" (exposure / emissions, explanation,
  approximate estimate, confidence). Structured JSON output, validated server-side with zod.
- **AI chat follow-ups** with live AQI + household profile as context (lazy-loaded).
- **English / Hindi** UI and AI output; `<html lang>` kept in sync.
- **Safety** — urgent precautions for Very poor / Severe air; medical disclaimer; labelled
  rule-based fallback guidance when the AI is unavailable.
- **Security** — helmet CSP, same-origin CORS (foreign origins → 403), rate limits (stricter on
  AI routes), 10 kB body limit, zod validation, prompt-injection hardening, generic client
  errors, no secrets in client or logs.
- **Efficiency** — TTL + LRU caches with in-flight de-duplication (AQI 10 min, geocoding 24 h,
  AI 15 min), compression, immutable asset caching, code-split chat, no UI libraries.
- **Accessibility** — WCAG 2.1 AA: semantic landmarks, skip link, labelled controls, visible
  focus, live regions, focus management, reduced-motion support; axe-core checks in tests and
  `jsx-a11y` strict lint rules.
- **Testing & CI** — 178 Vitest tests at v1.0.0 (Supertest API integration, React Testing Library, axe);
  GitHub Actions: lint, format check, tests with coverage, build, `npm audit`.
- One-click **Render** deploy via `render.yaml`.
