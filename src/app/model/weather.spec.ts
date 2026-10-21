import {
  FROST_SHIFT,
  SEASON_WEEKS,
  WET_GAIN,
  WeeklySeries,
  anomalies,
  normals,
  seasonMondays,
  trailingMean,
  weatherIndex,
  wetness,
} from './weather';

const flat = (value: number): number[] => new Array(SEASON_WEEKS).fill(value);

/*
 * Value: protects=the season calendar every year shares; fails_when=the first
 * Monday is picked wrongly or a year gets 34 or 36 weeks; why_new=new model;
 * seam=none
 */
describe('seasonMondays', () => {
  const cases: [year: number, first: string, last: string][] = [
    [2010, '2010-03-01', '2010-10-25'],
    [2012, '2012-03-05', '2012-10-29'],
    [2015, '2015-03-02', '2015-10-26'],
    [2021, '2021-03-01', '2021-10-25'],
    [2024, '2024-03-04', '2024-10-28'],
  ];

  for (const [year, first, last] of cases) {
    it(`should run ${year} from ${first} to ${last}`, () => {
      const mondays = seasonMondays(year);
      expect(mondays).toHaveLength(SEASON_WEEKS);
      expect(mondays[0]).toBe(first);
      expect(mondays.at(-1)).toBe(last);
    });
  }

  it('should give every year 2010–2025 exactly 35 Mondays inside Mar 1 – Oct 31', () => {
    for (let year = 2010; year <= 2025; year++) {
      const mondays = seasonMondays(year);
      expect(mondays).toHaveLength(SEASON_WEEKS);
      expect(mondays[0] >= `${year}-03-01`).toBe(true);
      expect(mondays.at(-1)! <= `${year}-10-31`).toBe(true);
      for (const day of mondays) expect(new Date(`${day}T00:00:00Z`).getUTCDay()).toBe(1);
    }
  });
});

/*
 * Value: protects=leave-one-out normals (eng D3); fails_when=the normal
 * includes the replayed season, or uses population SD; why_new=new model;
 * seam=none
 */
describe('normals', () => {
  const series: WeeklySeries = { 2010: flat(50), 2011: flat(60), 2012: flat(70) };

  it('should average the other seasons with the sample SD', () => {
    const { mean, sd } = normals(series, 2012);
    expect(mean[0]).toBe(55);
    // Sample SD of [50, 60]: sqrt((25 + 25) / 1).
    expect(sd[0]).toBeCloseTo(Math.sqrt(50), 10);
    expect(mean).toHaveLength(SEASON_WEEKS);
  });

  it("should leave the replayed season's own normal unchanged when its weather changes", () => {
    const before = normals(series, 2012);
    const after = normals({ ...series, 2012: flat(999) }, 2012);
    expect(after).toEqual(before);
  });

  it('should change the normal when another season changes', () => {
    const before = normals(series, 2012);
    const after = normals({ ...series, 2010: flat(40) }, 2012);
    expect(after.mean[0]).not.toBe(before.mean[0]);
  });

  it('should refuse fewer than 2 other seasons', () => {
    expect(() => normals({ 2010: flat(50), 2011: flat(60) }, 2011)).toThrow(RangeError);
  });

  it('should refuse a season without 35 weeks', () => {
    expect(() => normals({ ...series, 2011: [60, 60] }, 2012)).toThrow(/2011 has 2 weeks/);
  });
});

/*
 * Value: protects=the standardised anomaly that drives demand and the adjusted
 * forecast; fails_when=sign, scale or the SD-0 guard regresses; why_new=new
 * model; seam=none
 */
describe('anomalies', () => {
  // The other seasons give every week mean 60 and sample SD 10.
  const others = { 2010: flat(50), 2011: flat(60), 2012: flat(70) };
  const replay = flat(60);
  replay[0] = 70;
  replay[1] = 60;
  replay[2] = 40;
  const result = anomalies({ ...others, 2013: replay }, 2013);

  const cases: [week: number, expected: number][] = [
    [0, 1],
    [1, 0],
    [2, -2],
  ];
  for (const [week, expected] of cases) {
    it(`should give week ${week} an anomaly of ${expected} SD`, () => {
      expect(result[week]).toBeCloseTo(expected, 10);
    });
  }

  it('should give 0, not NaN, when the other seasons all agree', () => {
    const agreeing = { 2010: flat(60), 2011: flat(60), 2012: flat(75) };
    expect(anomalies(agreeing, 2012)).toEqual(flat(0));
  });

  it('should refuse a year with no weather', () => {
    expect(() => anomalies(others, 2099)).toThrow(/no weather for 2099/);
  });
});

/*
 * Value: protects=the 4-week window demand responds to; fails_when=the window
 * length or the season-start handling changes; why_new=weather model v2;
 * seam=none
 */
describe('trailingMean', () => {
  const values = [1, 2, 3, 4, 5, 6];
  const cases: [t: number, expected: number][] = [
    [0, 1],
    [1, 1.5],
    [3, 2.5],
    [4, 3.5],
    [5, 4.5],
  ];
  for (const [t, expected] of cases) {
    it(`should average the 4 weeks ending at week ${t} to ${expected}`, () => {
      expect(trailingMean(values, t)).toBe(expected);
    });
  }
});

/*
 * Value: protects=Brad's rule that warm, wet weather raises demand and an
 * early frost cuts it, as encoded in the index; fails_when=rain moves a cool
 * stretch, the wet clamp or gain changes, or the frost shift starts in the
 * wrong week; why_new=weather model v2; seam=none; no_claim=that the rule is
 * right for every product (it is the buying-desk rule for this one)
 */
describe('weatherIndex', () => {
  // The other seasons give every week a 60 °F normal (SD 10) and 1.0 in of
  // rain (4-week totals: normal 4.0, SD 2.0, from week 3 on).
  const others = {
    tmax: { 2010: flat(50), 2011: flat(60), 2012: flat(70) },
    prcp: { 2010: flat(0.5), 2011: flat(1), 2012: flat(1.5) },
    frostWeek: { 2010: 30, 2011: 31, 2012: null },
  };
  const replay = (tmax: number, prcp: number, frostWeek: number | null = null) =>
    weatherIndex(
      {
        tmax: { ...others.tmax, 2013: flat(tmax) },
        prcp: { ...others.prcp, 2013: flat(prcp) },
        frostWeek: { ...others.frostWeek, 2013: frostWeek },
      },
      2013,
    );

  const cases: [name: string, tmax: number, prcp: number, expected: number][] = [
    ['warm and wet is amplified', 70, 1.5, 1 + WET_GAIN],
    ['warm and normal rain is plain warmth', 70, 1, 1],
    ['warm and dry is damped', 70, 0.5, 1 - WET_GAIN],
    ['very wet is capped at +2 SD of rain', 70, 5, 1 + 2 * WET_GAIN],
    ['bone dry is capped at -1 SD of rain', 70, 0, 1 - WET_GAIN],
    ['cool and wet stays cool', 50, 1.5, -1],
    ['cool and dry stays cool', 50, 0.5, -1],
  ];
  for (const [name, tmax, prcp, expected] of cases) {
    it(`should score week 10: ${name}`, () => {
      expect(replay(tmax, prcp)[10]).toBeCloseTo(expected, 10);
    });
  }

  it('should drop the index by FROST_SHIFT from the frost week on, and not before', () => {
    const index = replay(70, 1, 30);
    expect(index[29]).toBeCloseTo(1, 10);
    expect(index[30]).toBeCloseTo(1 - FROST_SHIFT, 10);
    expect(index[34]).toBeCloseTo(1 - FROST_SHIFT, 10);
  });

  it('should halve demand at the default sensitivity when the frost lands in a normal week', () => {
    expect(1 + 0.3 * (0 - FROST_SHIFT)).toBeCloseTo(0.5, 10);
  });

  it('should judge rain against the same window in the other seasons', () => {
    // Week 0 has a one-week window: the others total 0.5, 1.0 and 1.5 there.
    const wet = wetness({ ...others.prcp, 2013: flat(1.5) }, 2013);
    expect(wet[0]).toBeCloseTo(1, 10);
    expect(wet[3]).toBeCloseTo(1, 10);
  });
});
