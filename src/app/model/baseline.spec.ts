import { BASELINE } from './baseline';
import { SEASON_WEEKS, seasonMondays } from './weather';

/*
 * Value: protects=the hypothetical baseline keeps the season shape the page
 * describes; fails_when=a week is dropped or added, a value goes fractional or
 * non-positive, or the peak moves out of June–July; why_new=new fixture data;
 * seam=none; no_claim=realism of the scale (it is hypothetical by design)
 */
describe('BASELINE', () => {
  it('should have one positive whole number per season week', () => {
    expect(BASELINE).toHaveLength(SEASON_WEEKS);
    for (const units of BASELINE) {
      expect(Number.isInteger(units) && units > 0).toBe(true);
    }
  });

  it('should peak in June and July', () => {
    // Any season's calendar works for month names; 2024 is a preset.
    const mondays = seasonMondays(2024);
    const peak = Math.max(...BASELINE);
    const peakMonths = new Set(
      BASELINE.flatMap((units, week) => (units === peak ? [mondays[week].slice(5, 7)] : [])),
    );
    expect([...peakMonths].every((month) => month === '06' || month === '07')).toBe(true);
  });

  it('should rise to the peak and taper after it', () => {
    const peakAt = BASELINE.indexOf(Math.max(...BASELINE));
    for (let week = 1; week < SEASON_WEEKS; week++) {
      const step = BASELINE[week] - BASELINE[week - 1];
      if (week <= peakAt) expect(step).toBeGreaterThanOrEqual(0);
    }
    const lastPeak = BASELINE.lastIndexOf(Math.max(...BASELINE));
    for (let week = lastPeak + 1; week < SEASON_WEEKS; week++) {
      expect(BASELINE[week]).toBeLessThanOrEqual(BASELINE[week - 1]);
    }
  });
});
