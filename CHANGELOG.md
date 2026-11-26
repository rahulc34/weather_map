# Changelog

All notable changes to SmogSense. Format: [Keep a Changelog](https://keepachangelog.com/).

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
- **Testing & CI** — 178 Vitest tests (Supertest API integration, React Testing Library, axe);
  GitHub Actions: lint, format check, tests with coverage, build, `npm audit`.
- One-click **Render** deploy via `render.yaml`.
