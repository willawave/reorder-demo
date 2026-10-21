# Weather-adjusted reorder demo

Would the weather have changed your flea and tick order? This demo replays a real Omaha season
week by week and compares two reorder plans for one product. The **normal plan** orders to the
usual seasonal curve. The **weather-adjusted plan** scales that curve by the last four weeks of
weather. Pick a season, move the sliders, and see when adjusting for weather pays off and when
it doesn't.

**Live:** https://reorder-demo.willawave.ai

## Real weather, hypothetical sales

- **Weather is real:** NOAA GHCN-Daily for Omaha Eppley Airfield (`USW00014942`), seasons
  2010–2025: daily highs, lows and rain.
- **Sales are hypothetical:** the seasonal curve and the weather sensitivities are illustrative.
  They come from no real orders.

[`docs/model.md`](docs/model.md) sets out every rule: the weather index, demand, the ordering
policy and what counts as a lost sale.

## Run it

Needs Node 24 and pnpm (the version is pinned in `package.json`).

```bash
pnpm install
pnpm start              # dev server on http://localhost:4200
pnpm test:coverage      # unit tests with the coverage gate (pnpm ng test to watch)
pnpm test:scripts       # tests for the data and hosting scripts
pnpm build:hosting      # static, prerendered build in dist/
pnpm e2e                # browser tests and accessibility checks against that build
```

`pnpm e2e` grades the built site, not the dev server, so run `pnpm build:hosting` first.

## Weather data

`pnpm data:noaa` downloads the daily records from NOAA and rewrites
`src/app/data/omaha-weather.json`. It drops readings NOAA flags as failing quality control, and
refuses to write the file if any season week has fewer than five valid days of highs or rain.

## Deploying

The site is static, served by Firebase Hosting. [`docs/hosting.md`](docs/hosting.md) explains
the choice. Releases go through `pnpm release:hosting`, which is for maintainers only: it
deploys, checks the live site byte for byte, then tags the release.

## Handing this off

[`docs/handoff.md`](docs/handoff.md) covers what a client needs to run and grow a tool like
this: keeping dependencies current, refreshing the data, fitting the model to real sales, and
moving the hosting.

## Built by

[WillaWave](https://willawave.ai), with Angular 22 (signals, prerendered to static HTML) and
Firebase Hosting.
