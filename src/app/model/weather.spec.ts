import { SEASON_WEEKS, WeeklySeries, anomalies, normals, seasonMondays } from './weather';

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
