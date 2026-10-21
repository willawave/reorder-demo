/*
 * Weather side of the model: the season calendar, leave-one-out normals and
 * the standardised anomaly. Pure functions with no Angular imports, so the
 * NOAA conversion script can share the season definition.
 *
 * Weeks are aligned across years by season-week index (0 to 34), not by ISO
 * week number: the first season Monday is ISO week 9 in some years (2010,
 * 2021) and week 10 in the rest, so ISO numbering would leave the ends of the
 * season with fewer years behind their normal.
 */

/**
 * The season is the ISO weeks whose Monday falls between Mar 1 and Oct 31.
 * That span is 245 days, exactly 35 weeks, so every year has 35 season weeks.
 */
export const SEASON_WEEKS = 35;

/** Weekly measures per season, keyed by year, 35 values each. */
export type WeeklySeries = Readonly<Record<number, readonly number[]>>;

export interface Normals {
  readonly mean: readonly number[];
  readonly sd: readonly number[];
}

const DAY_MS = 86_400_000;

/** The 35 season Mondays of `year`, as `YYYY-MM-DD`. */
export function seasonMondays(year: number): string[] {
  const march1 = Date.UTC(year, 2, 1);
  // getUTCDay is 0 for Sunday and 1 for Monday.
  const daysToMonday = (8 - new Date(march1).getUTCDay()) % 7;
  const first = march1 + daysToMonday * DAY_MS;
  return Array.from({ length: SEASON_WEEKS }, (_, week) =>
    new Date(first + week * 7 * DAY_MS).toISOString().slice(0, 10),
  );
}

/**
 * Per-week mean and sample standard deviation from every season except
 * `replayYear`. Leaving the replayed season out keeps its own weather from
 * leaking into the normal it is measured against.
 */
export function normals(series: WeeklySeries, replayYear: number): Normals {
  const others = Object.entries(series)
    .filter(([year]) => Number(year) !== replayYear)
    .map(([year, weeks]) => checkedWeeks(Number(year), weeks));
  if (others.length < 2) {
    throw new RangeError(`normals need at least 2 other seasons, got ${others.length}`);
  }

  const mean: number[] = [];
  const sd: number[] = [];
  for (let week = 0; week < SEASON_WEEKS; week++) {
    const values = others.map((weeks) => weeks[week]);
    const m = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
    mean.push(m);
    sd.push(Math.sqrt(variance));
  }
  return { mean, sd };
}

/**
 * Standardised anomaly of each week of `replayYear`: (measure − normal) ÷ SD.
 * A week whose other seasons all agree has SD 0 and gets anomaly 0, never NaN.
 */
export function anomalies(series: WeeklySeries, replayYear: number): number[] {
  const replay = series[replayYear];
  if (!replay) throw new RangeError(`no weather for ${replayYear}`);
  const weeks = checkedWeeks(replayYear, replay);
  const { mean, sd } = normals(series, replayYear);
  return weeks.map((value, week) => (sd[week] === 0 ? 0 : (value - mean[week]) / sd[week]));
}

/*
 * The weather index: what demand responds to (weather model v2, Brad's rule
 * from the buying desk: warm, wet weather raises demand).
 *
 * Demand follows SUSTAINED weather, so the index averages the last
 * WINDOW_WEEKS weeks. A single week's temperature anomaly barely predicts the
 * weeks after it (lag-2 correlation 0.07 at Omaha, 2010–2025), so a plan that
 * reacted to it was reacting to noise; a 4-week trailing mean persists
 * (0.61 two weeks on), which is what lets a weather-adjusted order help.
 *
 * Rain amplifies warmth and nothing else: a warm, wet stretch scores higher
 * than a warm, dry one, while a cool stretch stays cool however wet it is.
 *
 * The first fall frost (Brad's rule: an early frost cuts demand) is weather
 * too, so it enters the index rather than bypassing it: from the frost week
 * on, the index drops by FROST_SHIFT. At the page's default sensitivity of
 * 0.3 that halves demand (1 + 0.3 × −5/3 = 0.5). Keeping it inside the index
 * keeps the honesty rule: a buyer who assumes weather doesn't matter
 * (assumed sensitivity 0) ignores the frost as well.
 */
export const WINDOW_WEEKS = 4;
export const WET_GAIN = 0.3;
export const FROST_SHIFT = 5 / 3;
const WET_CLAMP = { min: -1, max: 2 } as const;

/** Mean of `values` over the `k` weeks ending at week `t` (fewer at the season start). */
export function trailingMean(values: readonly number[], t: number, k = WINDOW_WEEKS): number {
  const window = values.slice(Math.max(0, t - k + 1), t + 1);
  return window.reduce((sum, v) => sum + v, 0) / window.length;
}

export interface SeasonWeather {
  readonly tmax: WeeklySeries;
  readonly prcp: WeeklySeries;
  /** First season week with a fall frost, or null. */
  readonly frostWeek: Readonly<Record<number, number | null>>;
}

/**
 * Standardised anomaly of the rain total over the last WINDOW_WEEKS weeks,
 * against the same window in the other seasons (leave-one-out, as for temperature).
 */
export function wetness(prcp: WeeklySeries, replayYear: number): number[] {
  const windowTotals = Object.fromEntries(
    Object.entries(prcp).map(([year, weeks]) => [
      year,
      weeks.map((_, t) => trailingMean(weeks, t) * Math.min(t + 1, WINDOW_WEEKS)),
    ]),
  );
  return anomalies(windowTotals, replayYear);
}

/** The index demand responds to, one value per season week, in standard deviations. */
export function weatherIndex(weather: SeasonWeather, replayYear: number): number[] {
  const warmth = anomalies(weather.tmax, replayYear);
  const wet = wetness(weather.prcp, replayYear);
  const frostWeek = weather.frostWeek[replayYear] ?? Infinity;
  return warmth.map((_, t) => {
    const sustained = trailingMean(warmth, t);
    const rain = Math.min(WET_CLAMP.max, Math.max(WET_CLAMP.min, wet[t]));
    const index = sustained > 0 ? sustained * (1 + WET_GAIN * rain) : sustained;
    return t >= frostWeek ? index - FROST_SHIFT : index;
  });
}

function checkedWeeks(year: number, weeks: readonly number[]): readonly number[] {
  if (weeks.length !== SEASON_WEEKS) {
    throw new RangeError(`${year} has ${weeks.length} weeks, expected ${SEASON_WEEKS}`);
  }
  return weeks;
}
