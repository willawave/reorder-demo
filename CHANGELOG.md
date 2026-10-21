# Changelog

All notable changes to the reorder demo are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed

- The weather sliders now use plain language and show percent values ("+30%" in place of
  "+0.30 per SD"), in their own section: "Actual effect on sales" and "Buyer's estimate".

## [0.2.0.0] - 2026-10-21

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

### Changed

- Weather model v2. The old model let the weather-adjusted plan lose in 13 of 16 real seasons.
  The demo now follows the buying-desk rule:
  - demand follows the last four weeks of warmth, boosted when it's also wet;
  - the first fall frost cuts demand;
  - sales lag the weather by a week.

  The adjusted plan now does better in 12 of 16 seasons, and a test on all 16 guards that.

- The weather data now includes daily lows and rain (`omaha-weather.json`).
- The third preset is now 2022's early frost instead of 2024. The cash table marks the
  first-frost week.

## [0.1.0.0] - 2026-10-21

### Added

- Project setup: static prerendered Angular app, brand tokens with light and dark themes, CI
  (lint, format, unit tests, build-output checks, Playwright + AXE) and a Hosting release script
  that refuses to deploy anywhere but the `reorder-demo` site.
