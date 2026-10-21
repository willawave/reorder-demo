/*
 * Reorder side of the model: demand, the ordering policy, and the two plans
 * the page compares. Pure functions; see docs/model.md for the rules.
 *
 * Each week runs in this order:
 *   1. orders due this week arrive;
 *   2. demand is filled from stock;
 *   3. unmet demand is lost (no backorders);
 *   4. the week's weather is observed;
 *   5. the order is placed, forecasting the weeks after this one.
 *
 * The two plans share everything except the forecast, so at assumed
 * sensitivity 0 they are identical by construction.
 */

export interface SimInputs {
  /** Hypothetical units per season week, before weather. */
  readonly baseline: readonly number[];
  /** Observed weather index per season week, in standard deviations (weatherIndex in weather.ts). */
  readonly weatherIndex: readonly number[];
  /** How demand really responds to weather. Generates the sales. */
  readonly trueSensitivity: number;
  /** What the buyer believes. Drives the weather-adjusted forecast. */
  readonly assumedSensitivity: number;
  /** Weeks from placing an order to its arrival. Integer, at least 1. */
  readonly leadTimeWeeks: number;
  /** Minimum order quantity. Integer, at least 0. */
  readonly moq: number;
  readonly startingInventory: number;
  readonly unitCost: number;
}

export interface WeekRow {
  readonly arrived: number;
  readonly demand: number;
  readonly sold: number;
  readonly short: number;
  readonly ordered: number;
  readonly cash: number;
  readonly onHandEnd: number;
}

export interface PlanResult {
  readonly weeks: readonly WeekRow[];
  readonly unitsOrdered: number;
  readonly cashCommitted: number;
  readonly weeksShort: number;
  readonly unitsShort: number;
  /** Stock left at season end plus orders that arrive after it. */
  readonly excessUnits: number;
  readonly excessValue: number;
}

export interface SimResult {
  readonly demand: readonly number[];
  readonly normal: PlanResult;
  readonly adjusted: PlanResult;
}

/** Forecast of week `k`'s demand, made at the end of week `t`. */
export type Forecast = (t: number, k: number) => number;

/** 1 + sensitivity × index, clamped so demand never goes negative. */
export function demandFactor(sensitivity: number, index: number): number {
  return Math.max(0, 1 + sensitivity * index);
}

/*
 * Sales follow the weather by a week (Brad, from the buying desk: people buy
 * after they notice fleas and ticks, and stop after a frost kills them off).
 * So week t's sales respond to the index observed at the end of week t − 1,
 * the same index the buyer sees when placing week t − 1's order. Week 0 has
 * no earlier week in the season and uses its own.
 */
export const SALES_LAG_WEEKS = 1;

/** The synthetic sales: whole units, driven by the true sensitivity. */
export function actualDemand(
  inputs: Pick<SimInputs, 'baseline' | 'weatherIndex' | 'trueSensitivity'>,
): number[] {
  return inputs.baseline.map((units, week) => {
    const index = inputs.weatherIndex[Math.max(0, week - SALES_LAG_WEEKS)];
    return Math.round(units * demandFactor(inputs.trueSensitivity, index));
  });
}

/** The normal plan forecasts the baseline. Nothing sells after the season. */
export function normalForecast(baseline: readonly number[]): Forecast {
  return (_t, k) => (k < baseline.length ? baseline[k] : 0);
}

/**
 * The weather-adjusted plan scales the baseline by the weather index observed
 * this week, held flat over the horizon. The index is already a multi-week
 * trailing value (see weatherIndex in weather.ts), and it reads weather up to
 * week t and never after.
 */
export function adjustedForecast(
  baseline: readonly number[],
  weatherIndex: readonly number[],
  assumedSensitivity: number,
): Forecast {
  return (t, k) =>
    k >= baseline.length ? 0 : baseline[k] * demandFactor(assumedSensitivity, weatherIndex[t]);
}

/** Units to order for a gap between target and position: at least the MOQ. */
export function orderQuantity(gap: number, moq: number): number {
  // The epsilon keeps float noise (130.00000000001) from ordering a unit extra.
  return gap > 1e-9 ? Math.max(Math.ceil(gap - 1e-9), moq) : 0;
}

/** Replays one plan week by week against the actual demand. */
export function runPlan(
  inputs: SimInputs,
  demand: readonly number[],
  forecast: Forecast,
): PlanResult {
  const lead = inputs.leadTimeWeeks;
  const due: number[] = new Array(demand.length + lead).fill(0);
  const weeks: WeekRow[] = [];
  let onHand = inputs.startingInventory;
  let inTransit = 0;

  for (let t = 0; t < demand.length; t++) {
    const arrived = due[t];
    onHand += arrived;
    inTransit -= arrived;

    const sold = Math.min(onHand, demand[t]);
    onHand -= sold;

    let target = 0;
    for (let k = t + 1; k <= t + lead + 1; k++) target += forecast(t, k);
    const ordered = orderQuantity(target - (onHand + inTransit), inputs.moq);
    due[t + lead] += ordered;
    inTransit += ordered;

    weeks.push({
      arrived,
      demand: demand[t],
      sold,
      short: demand[t] - sold,
      ordered,
      cash: ordered * inputs.unitCost,
      onHandEnd: onHand,
    });
  }

  const unitsOrdered = weeks.reduce((sum, w) => sum + w.ordered, 0);
  const excessUnits = onHand + inTransit;
  return {
    weeks,
    unitsOrdered,
    cashCommitted: unitsOrdered * inputs.unitCost,
    weeksShort: weeks.filter((w) => w.short > 0).length,
    unitsShort: weeks.reduce((sum, w) => sum + w.short, 0),
    excessUnits,
    excessValue: excessUnits * inputs.unitCost,
  };
}

/** Both plans against the same synthetic season. */
export function simulate(inputs: SimInputs): SimResult {
  if (inputs.baseline.length !== inputs.weatherIndex.length) {
    throw new RangeError(
      `baseline has ${inputs.baseline.length} weeks but the weather index has ${inputs.weatherIndex.length}`,
    );
  }
  if (!Number.isInteger(inputs.leadTimeWeeks) || inputs.leadTimeWeeks < 1) {
    throw new RangeError(
      `lead time must be a whole number of weeks ≥ 1, got ${inputs.leadTimeWeeks}`,
    );
  }
  if (!Number.isInteger(inputs.moq) || inputs.moq < 0) {
    throw new RangeError(`MOQ must be a whole number ≥ 0, got ${inputs.moq}`);
  }

  const demand = actualDemand(inputs);
  return {
    demand,
    normal: runPlan(inputs, demand, normalForecast(inputs.baseline)),
    adjusted: runPlan(
      inputs,
      demand,
      adjustedForecast(inputs.baseline, inputs.weatherIndex, inputs.assumedSensitivity),
    ),
  };
}
