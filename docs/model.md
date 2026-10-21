# The model

How the demo turns one past season of real weather into two reorder plans. The code is in
`src/app/model/`:

- `weather.ts` holds the season calendar, the normals, the anomaly and the weather index;
- `reorder.ts` holds demand, the ordering policy and both plans.

Both files are pure functions, each with a table-test spec beside it.

**The weather is real; the sales are hypothetical.** The baseline and the sensitivities are
illustrative and come from no real orders.

## Weather

- **Station:** Omaha Eppley Airfield, NOAA GHCN-Daily `USW00014942`, seasons 2010–2025.
- **Measures:** the weekly mean of daily highs (TMAX, °F), the weekly rain total (PRCP,
  inches), and the first fall frost: the first season week with a low (TMIN) at or below 32°F
  on or after Aug 15.
- **Season:** the ISO weeks (Monday to Sunday) whose Monday falls between Mar 1 and Oct 31.
  That span is 245 days, so every year has exactly **35 season weeks**.
- **Week alignment:** weeks are matched across years by their position in the season (0–34),
  not by ISO week number. The first season Monday is ISO week 9 in some years and week 10 in
  others.
- **Normals:** for the replayed season, each week's normal and standard deviation come from
  the **other 15 seasons**, leaving that season out. A season's own weather therefore never
  shifts the normal it is measured against. The SD is the sample SD (n − 1).
- **Anomaly:** (measure − normal) ÷ SD. A week whose other seasons all agree (SD 0) has
  anomaly 0.

### The weather index

Demand responds to a weekly **weather index**, in standard deviations
(`weatherIndex` in `src/app/model/weather.ts`). It encodes a rule from the buying desk: warm,
wet weather raises flea and tick demand, and an early frost cuts it.

- **Sustained warmth:** the mean TMAX anomaly over the last **4 weeks**. A single week's
  anomaly barely predicts the weeks after it (lag-2 correlation 0.07 at Omaha, 2010–2025), so a
  plan that reacted to one week was reacting to noise. The 4-week mean persists (0.61 two weeks
  on).
- **Rain amplifies warmth:** the last 4 weeks' rain total is standardized against the same
  window in the other seasons (`wetness`), clamped to −1…+2 SD. When the warmth is positive, the
  index is warmth × (1 + 0.3 × wetness). A cool stretch stays as cool as it is, however wet.
- **First fall frost:** from the frost week on, the index drops by 5/3 SD. At the default
  sensitivity of 0.3 that halves demand. The frost sits inside the index rather than beside it,
  so a buyer who assumes weather doesn't matter (assumed sensitivity 0) ignores it too.

**Weather model v1**, until 2026-10-21, used the same week's TMAX anomaly alone. On the real
2010–2025 seasons, the weather-adjusted plan then did worse than the normal plan in 13 of 16.
With v2 at the page defaults it does better in 12 of 16, and lost sales plus leftover stock
fall from 417 to 215 units. `premise.spec.ts` guards that result.

### Data

The weekly values are committed in `src/app/data/omaha-weather.json`, and the page imports that
file. The build never fetches anything. `pnpm data:noaa` (`scripts/noaa-to-json.mjs`)
regenerates the file from the NCEI Access Data Service ("daily-summaries", no token, whole °F
and inches). It applies these rules:

- a value with a quality flag (the second field of its `_ATTRIBUTES`) or a non-numeric value
  is dropped;
- a week with fewer than 5 valid days of highs or of rain is missing; rain is scaled from the
  valid days to a 7-day total;
- any missing season week fails the run, listing every such week, and nothing is written.

The rules live in `scripts/noaa-weekly.mjs`, with table tests. That file takes the season
calendar from `weather.ts`, so the data and the model always agree on which weeks are in season.

## Demand

- **Baseline:** a committed, **hypothetical** curve of expected units per season week
  (`src/app/model/baseline.ts`). It rises from 15 units in early March, holds at 100 through
  June and early July, and tapers to 15 by late October. The scale is a round number chosen for
  readability, not taken from real orders.
- **Factor:** `max(0, 1 + sensitivity × index)`. Sensitivity is the fractional change in demand
  per standard deviation of the weather index. The clamp keeps demand and forecasts from going
  negative.
- **Actual demand:** `round(baseline × factor(true sensitivity, last week's index))`. Sales
  follow the weather by a week: people buy after they notice fleas and ticks, and stop after a
  frost. Week 0 uses its own index. The _true_ sensitivity only generates the sales history.

## The weekly timeline

Each season week runs in this order:

1. orders due this week arrive;
2. demand is filled from stock;
3. unmet demand is lost, with no backorders;
4. the week's weather is observed;
5. the order is placed.

An order placed in week _t_ uses weather up to and including week _t_, and forecasts week _t_ + 1
onward. It arrives at the start of week _t_ + lead time.

## Ordering policy

Both plans use the same policy:

- **Target:** the forecast demand over the lead time plus one review week, covering weeks
  _t_ + 1 through _t_ + lead time + 1.
- **Order:** target − inventory position, where position is stock on hand plus orders in
  transit. A positive gap orders at least the **MOQ**: `max(⌈gap⌉, MOQ)`. The MOQ is a minimum,
  not a case-pack multiple. Any other gap orders nothing.

The plans differ only in the forecast:

- **Normal plan:** forecast = baseline.
- **Weather-adjusted plan:** forecast = baseline × factor(_assumed_ sensitivity, the weather
  index observed this week). The forecast is held flat across the horizon. Because sales follow
  the index by a week, the index the buyer sees when ordering is the one that drives next
  week's sales.

At assumed sensitivity 0 the two plans are identical by construction, and a test enforces it.

## Season end

- Forecast demand is zero after the last season week, so targets shrink as the season closes.
- An order that arrives after the season still counts in **cash committed** and in **season-end
  excess**.

## Outputs per plan

- **Units ordered** and **cash committed**, in total and by week. Cash is counted when an order
  is placed.
- **Weeks with unmet demand** and **units short.** The replay has no randomness, so these are
  counts, not probabilities.
- **Season-end excess:** stock left on hand plus late arrivals, in units and at unit cost.
