import {
  PlanResult,
  SimInputs,
  WeekRow,
  actualDemand,
  adjustedForecast,
  demandFactor,
  orderQuantity,
  simulate,
} from './reorder';

/*
 * All quantities below are hypothetical round numbers chosen to make the
 * arithmetic traceable by hand. None of them is a real order.
 */

// A smooth 35-week season and a weather pattern with warm and cool spells.
const season: SimInputs = {
  baseline: Array.from({ length: 35 }, (_, w) =>
    Math.round(20 + 80 * Math.sin((Math.PI * w) / 34)),
  ),
  weatherIndex: Array.from({ length: 35 }, (_, w) => 1.5 * Math.sin(w / 3)),
  trueSensitivity: 0.3,
  assumedSensitivity: 0.3,
  leadTimeWeeks: 3,
  moq: 50,
  startingInventory: 200,
  unitCost: 12,
};

const rows = (plan: PlanResult) =>
  plan.weeks.map((w: WeekRow) => [
    w.arrived,
    w.demand,
    w.sold,
    w.short,
    w.ordered,
    w.cash,
    w.onHandEnd,
  ]);

/*
 * Value: protects=demand and forecast never go negative; fails_when=the clamp
 * is removed; why_new=new model; seam=none
 */
describe('demandFactor', () => {
  const cases: [sensitivity: number, anomaly: number, expected: number][] = [
    [0, 3, 1],
    [0.3, 1, 1.3],
    [0.3, -1, 0.7],
    [-0.2, 2, 0.6],
    [0.5, -2, 0],
    [0.5, -5, 0],
    [-0.5, 4, 0],
  ];
  for (const [sensitivity, anomaly, expected] of cases) {
    it(`should give ${expected} for sensitivity ${sensitivity} at anomaly ${anomaly}`, () => {
      expect(demandFactor(sensitivity, anomaly)).toBeCloseTo(expected, 10);
    });
  }

  it('should clamp actual demand and the adjusted forecast at 0 for a large negative anomaly', () => {
    const inputs = { baseline: [40, 40], weatherIndex: [-5, -5], trueSensitivity: 0.5 };
    expect(actualDemand(inputs)).toEqual([0, 0]);
    expect(adjustedForecast(inputs.baseline, inputs.weatherIndex, 0.5)(1, 1)).toBe(0);
  });
});

/*
 * Value: protects=minimum-order rule (MOQ is a minimum, not a case multiple);
 * fails_when=orders round to MOQ multiples or order on a non-positive gap;
 * why_new=new model; seam=none
 */
describe('orderQuantity', () => {
  const cases: [gap: number, moq: number, expected: number][] = [
    [30, 50, 50],
    [130, 50, 130],
    [129.2, 50, 130],
    [130.00000000001, 0, 130],
    [0, 50, 0],
    [-20, 50, 0],
    [7, 0, 7],
  ];
  for (const [gap, moq, expected] of cases) {
    it(`should order ${expected} for a gap of ${gap} with MOQ ${moq}`, () => {
      expect(orderQuantity(gap, moq)).toBe(expected);
    });
  }
});

/*
 * Value: protects=the honesty check, the no-hindsight rule, lost sales and
 * season-end accounting; fails_when=the plans diverge at assumed sensitivity
 * 0, an order reads future weather, shortages backorder, or late arrivals drop
 * out of cash and excess; why_new=new model; seam=none; no_claim=forecast
 * accuracy, since demand is synthetic
 */
describe('simulate', () => {
  const honestyCases: [name: string, inputs: SimInputs][] = [
    ['the default season', { ...season, assumedSensitivity: 0 }],
    ['a strong true response', { ...season, assumedSensitivity: 0, trueSensitivity: 0.5 }],
    ['an inverse response', { ...season, assumedSensitivity: 0, trueSensitivity: -0.4 }],
    ['lead time 1, no MOQ', { ...season, assumedSensitivity: 0, leadTimeWeeks: 1, moq: 0 }],
  ];
  for (const [name, inputs] of honestyCases) {
    it(`should give identical plans at assumed sensitivity 0 for ${name}`, () => {
      const { normal, adjusted } = simulate(inputs);
      expect(adjusted).toEqual(normal);
    });
  }

  for (const t of [0, 1, 5, 17, 30, 34]) {
    it(`should leave orders up to week ${t} unchanged when later weather changes`, () => {
      const changed = season.weatherIndex.map((a, w) => (w > t ? (w % 2 ? 9 : -9) : a));
      const before = simulate(season);
      const after = simulate({ ...season, weatherIndex: changed });
      for (const plan of ['normal', 'adjusted'] as const) {
        const ordered = (r: typeof before) => r[plan].weeks.slice(0, t + 1).map((w) => w.ordered);
        expect(ordered(after)).toEqual(ordered(before));
      }
    });
  }

  it('should make sales follow the weather index by one week', () => {
    // Week 0 has no earlier season week and uses its own index.
    const demand = actualDemand({
      baseline: [10, 10, 10, 10],
      weatherIndex: [2, 0, -2, 4],
      trueSensitivity: 0.5,
    });
    expect(demand).toEqual([20, 20, 10, 0]);
  });

  it('should count an order that arrives after the season as cash and excess, never as sold', () => {
    // A warm week 3 (index 4, factor 3 at 0.5) lifts the adjusted forecast for
    // weeks 4 and 5 to 60 against a position of 20, so week 3 orders 40. With
    // lead time 3 that order is due in week 6, after the 6-week season ends.
    const { adjusted } = simulate({
      baseline: [0, 0, 0, 0, 10, 10],
      weatherIndex: [0, 0, 0, 4, 0, 0],
      trueSensitivity: 0,
      assumedSensitivity: 0.5,
      leadTimeWeeks: 3,
      moq: 0,
      startingInventory: 0,
      unitCost: 2,
    });
    expect(adjusted.weeks[3].ordered).toBe(40);
    expect(adjusted.weeks.map((w) => w.arrived)).toEqual([0, 0, 0, 10, 10, 0]);
    expect(adjusted.cashCommitted).toBe(120);
    expect(adjusted.excessUnits).toBe(40);
    expect(adjusted.excessValue).toBe(80);
    expect(adjusted.weeks.reduce((sum, w) => sum + w.sold, 0)).toBe(20);
  });

  it('should lose unmet demand rather than backorder it', () => {
    const { normal } = simulate({
      baseline: [10, 10, 10],
      weatherIndex: [0, 0, 0],
      trueSensitivity: 0,
      assumedSensitivity: 0,
      leadTimeWeeks: 1,
      moq: 0,
      startingInventory: 4,
      unitCost: 1,
    });
    expect(normal.weeks[0]).toMatchObject({ demand: 10, sold: 4, short: 6 });
    // Week 1 sells only its own 10; the 6 lost in week 0 never come back.
    expect(normal.weeks[1]).toMatchObject({ demand: 10, sold: 10, short: 0 });
    expect(normal.unitsShort).toBe(6);
    expect(normal.weeksShort).toBe(1);
  });

  describe('a hand-traced 6-week season', () => {
    // The index reads 3 SD warm at the end of weeks 1 and 2. Sales lag it by a
    // week, so weeks 2 and 3 sell 2.5 × baseline (true sensitivity 0.5), while
    // the adjusted plan sees the warmth one week earlier, when it orders.
    const { demand, normal, adjusted } = simulate({
      baseline: [10, 20, 30, 30, 20, 10],
      weatherIndex: [0, 3, 3, 0, 0, 0],
      trueSensitivity: 0.5,
      assumedSensitivity: 0.5,
      leadTimeWeeks: 1,
      moq: 0,
      startingInventory: 20,
      unitCost: 2,
    });

    it('should generate demand from the true sensitivity, a week behind the index', () => {
      expect(demand).toEqual([10, 20, 75, 75, 20, 10]);
    });

    it('should trace the normal plan, which runs short in the warm spell', () => {
      // prettier-ignore
      expect(rows(normal)).toEqual([
        // arrived demand sold short ordered cash onHandEnd
        [ 0, 10, 10,  0, 40,  80, 10],
        [40, 20, 20,  0, 30,  60, 30],
        [30, 75, 60, 15, 50, 100,  0],
        [50, 75, 50, 25, 30,  60,  0],
        [30, 20, 20,  0,  0,   0, 10],
        [ 0, 10, 10,  0,  0,   0,  0],
      ]);
      expect(normal).toMatchObject({
        unitsOrdered: 150,
        cashCommitted: 300,
        weeksShort: 2,
        unitsShort: 40,
        excessUnits: 0,
        excessValue: 0,
      });
    });

    it('should trace the adjusted plan, which covers the spell and ends with some excess', () => {
      // Week 1 sees index 3 and orders for (30 + 30) × 2.5, less the 30 on hand.
      // Week 2 still sees 3: (30 + 20) × 2.5, less the 75 on hand.
      // prettier-ignore
      expect(rows(adjusted)).toEqual([
        // arrived demand sold short ordered cash onHandEnd
        [  0, 10, 10, 0,  40,  80, 10],
        [ 40, 20, 20, 0, 120, 240, 30],
        [120, 75, 75, 0,  50, 100, 75],
        [ 50, 75, 75, 0,   0,   0, 50],
        [  0, 20, 20, 0,   0,   0, 30],
        [  0, 10, 10, 0,   0,   0, 20],
      ]);
      expect(adjusted).toMatchObject({
        unitsOrdered: 210,
        cashCommitted: 420,
        weeksShort: 0,
        unitsShort: 0,
        excessUnits: 20,
        excessValue: 40,
      });
    });
  });

  it('should conserve units: starting stock + ordered = sold + excess', () => {
    for (const inputs of [season, ...honestyCases.map(([, i]) => i)]) {
      const result = simulate(inputs);
      for (const plan of [result.normal, result.adjusted]) {
        const sold = plan.weeks.reduce((sum, w) => sum + w.sold, 0);
        expect(inputs.startingInventory + plan.unitsOrdered).toBe(sold + plan.excessUnits);
      }
    }
  });

  const invalid: [name: string, change: Partial<SimInputs>, message: RegExp][] = [
    ['mismatched lengths', { weatherIndex: [0, 0] }, /baseline has 35 weeks/],
    ['a lead time of 0', { leadTimeWeeks: 0 }, /lead time/],
    ['a fractional lead time', { leadTimeWeeks: 1.5 }, /lead time/],
    ['a negative MOQ', { moq: -1 }, /MOQ/],
  ];
  for (const [name, change, message] of invalid) {
    it(`should refuse ${name}`, () => {
      expect(() => simulate({ ...season, ...change })).toThrow(message);
    });
  }
});
