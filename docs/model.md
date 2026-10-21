# The model

How the demo turns one past season of real weather into two reorder plans. The code is in
`src/app/model/`:

- `weather.ts` holds the season calendar, the normals and the anomaly;
- `reorder.ts` holds demand, the ordering policy and both plans.

Both files are pure functions, each with a table-test spec beside it.

**The weather is real; the sales are hypothetical.** The baseline and the sensitivities are
illustrative and come from no real orders.

## Weather

- **Station:** Omaha Eppley Airfield, NOAA GHCN-Daily `USW00014942`, seasons 2010–2025.
- **Measure:** the weekly mean of daily maximum temperature (TMAX), in °F.
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

### Data

The weekly means are committed in `src/app/data/omaha-tmax.json`, and the page imports that file.
The build never fetches anything. `pnpm data:noaa` (`scripts/noaa-to-json.mjs`) regenerates
the file from the NCEI Access Data Service ("daily-summaries", no token, whole °F). It applies
these rules:

- a day with a quality flag (the second field of `TMAX_ATTRIBUTES`) or a non-numeric value is
  dropped;
- a week with fewer than 5 valid days is missing;
- any missing season week fails the run, listing every such week, and nothing is written.

The rules live in `scripts/noaa-weekly.mjs`, with table tests. That file takes the season
calendar from `weather.ts`, so the data and the model always agree on which weeks are in season.

## Demand

- **Factor:** `max(0, 1 + sensitivity × anomaly)`. Sensitivity is the fractional change in
  demand per standard deviation of anomaly. The clamp keeps demand and forecasts from going
  negative.
- **Actual demand:** `round(baseline × factor(true sensitivity, that week's anomaly))`. The
  _true_ sensitivity only generates the sales history.

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
- **Weather-adjusted plan:** forecast = baseline × factor(_assumed_ sensitivity, mean anomaly
  of the last two observed weeks). It uses week 0 alone at _t_ = 0, and the forecast is held
  flat across the horizon.

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
