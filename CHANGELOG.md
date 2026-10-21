# Changelog

All notable changes to the reorder demo are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- The model behind the demo: the season calendar, leave-one-out weather normals and anomalies
  (`weather.ts`), and demand, the ordering policy and both reorder plans (`reorder.ts`). Table
  tests cover each, and `docs/model.md` explains the rules.
- Real weather: weekly mean daily highs at Omaha Eppley Airfield for the 2010–2025 seasons,
  from NOAA GHCN-Daily. `pnpm data:noaa` regenerates the file and refuses to write one with
  a missing week.
- The simulator page. Pick 2012, 2015 or 2024 and set lead time, minimum order, starting
  stock, unit cost and both sensitivities. The page compares the normal and weather-adjusted
  plans in a season-totals table and a week-by-week cash table, and ends on "Would this change
  your order?". The page states that the weather is real and the sales are hypothetical, and
  the default season's results are already in the prerendered HTML.
- Page chrome ported from willawave.ai:
  - the WillaWave favicons and header mark;
  - a light and dark theme toggle that remembers the choice without a flash on load;
  - search and link-preview tags on the `reorder-demo.willawave.ai` origin, plus
    `robots.txt` and `sitemap.xml`;
  - a 404 page that Hosting serves with a real 404 status.

  `verify:build` now runs 18 checks.

- Playwright tests for the page: happy paths, the unit-cost error state, edge cases (assumed
  sensitivity 0, extreme sensitivities, longest lead time), phone width, and no JavaScript.
- Unit-test coverage is enforced in CI: 80% for app code, and 95% lines and 90% branches for
  the model. `pnpm test:coverage` writes an HTML report to `coverage/`.

## [0.1.0.0] - 2026-10-21

### Added

- Project setup: static prerendered Angular app, brand tokens with light and dark themes, CI
  (lint, format, unit tests, build-output checks, Playwright + AXE) and a Hosting release script
  that refuses to deploy anywhere but the `reorder-demo` site.
