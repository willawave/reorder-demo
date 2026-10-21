import weather from '../data/omaha-weather.json';
import { BASELINE } from '../model/baseline';
import { simulate } from '../model/reorder';
import { weatherIndex } from '../model/weather';
import { DEFAULT_SETTINGS } from './settings';

/*
 * Value: protects=the demo's premise on its own data and defaults, that
 * adjusting for weather beats the usual curve more often than not;
 * fails_when=a model, data or default change makes the weather-adjusted plan
 * lose most seasons again (it lost 13 of 16 under weather model v1, which is
 * what Brad caught); why_new=nothing else runs all 16 real seasons;
 * seam=none; no_claim=that real sales behave this way (sales are
 * hypothetical; the rule is Brad's)
 */
describe('the demo premise across 2010–2025 at the page defaults', () => {
  const seasons = Object.keys(weather.tmax).map(Number);
  const results = seasons.map((year) => {
    const { normal, adjusted } = simulate({
      ...DEFAULT_SETTINGS,
      unitCost: Number(DEFAULT_SETTINGS.unitCost),
      baseline: BASELINE,
      weatherIndex: weatherIndex(weather, year),
    });
    return {
      normal: normal.unitsShort + normal.excessUnits,
      adjusted: adjusted.unitsShort + adjusted.excessUnits,
    };
  });

  it('should cover all 16 seasons', () => {
    expect(seasons).toHaveLength(16);
  });

  it('should leave fewer lost sales plus leftovers with the weather-adjusted plan in total', () => {
    const total = (plan: 'normal' | 'adjusted') => results.reduce((sum, r) => sum + r[plan], 0);
    expect(total('adjusted')).toBeLessThan(total('normal'));
  });

  it('should win more seasons than it loses', () => {
    const wins = results.filter((r) => r.adjusted < r.normal).length;
    const losses = results.filter((r) => r.adjusted > r.normal).length;
    expect(wins).toBeGreaterThan(losses);
  });
});
