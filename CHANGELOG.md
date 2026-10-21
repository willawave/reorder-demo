# Changelog

All notable changes to the reorder demo are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.2.0] - 2026-10-21

### Added

- Real weather: weekly mean daily highs at Omaha Eppley Airfield for the 2010–2025 seasons,
  from NOAA GHCN-Daily. `pnpm data:noaa` regenerates the file and refuses to write one with
  a missing week.

## [0.1.1.0] - 2026-10-21

### Added

- The model behind the demo: the season calendar, leave-one-out weather normals and anomalies
  (`weather.ts`), and demand, the ordering policy and both reorder plans (`reorder.ts`). Table
  tests cover each, and `docs/model.md` explains the rules.

## [0.1.0.0] - 2026-10-21

### Added

- Project setup: static prerendered Angular app, brand tokens with light and dark themes, CI
  (lint, format, unit tests, build-output checks, Playwright + AXE) and a Hosting release script
  that refuses to deploy anywhere but the `reorder-demo` site.
