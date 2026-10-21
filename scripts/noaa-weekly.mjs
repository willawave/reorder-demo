/*
 * NOAA daily rows -> weekly season means. Pure, so the rules are table-tested
 * (noaa-weekly.test.mjs) apart from the network fetch in noaa-to-json.mjs.
 *
 * The rules, from the eng review:
 *   - a day whose quality flag is set, or whose value is not a number, is dropped;
 *   - a week with fewer than 5 valid days is missing;
 *   - any missing season week fails the whole run, listing every one. A gap
 *     is never written as a zero or a null, because the page states the
 *     weather as fact.
 *
 * The season calendar comes from the model itself, so the data and the app
 * can never disagree about which weeks are in season.
 */
import { seasonMondays } from '../src/app/model/weather.ts';

export const MIN_VALID_DAYS = 5;

const DAY_MS = 86_400_000;

/**
 * @param {readonly { DATE: string; TMAX?: string; TMAX_ATTRIBUTES?: string }[]} rows
 *   NCEI daily-summaries JSON rows. TMAX_ATTRIBUTES is "MFLAG,QFLAG,SFLAG".
 * @returns {Record<string, number[]>} 35 weekly mean TMAX values per year, to 0.1.
 */
export function weeklyTmax(rows, firstYear, lastYear) {
  const valid = new Map();
  for (const row of rows) {
    const qualityFlag = (row.TMAX_ATTRIBUTES ?? '').split(',')[1] ?? '';
    const value = Number(row.TMAX);
    if (qualityFlag.trim() !== '' || row.TMAX === undefined || row.TMAX.trim() === '') continue;
    if (!Number.isFinite(value)) continue;
    valid.set(row.DATE, value);
  }

  const weeks = {};
  const missing = [];
  for (let year = firstYear; year <= lastYear; year++) {
    weeks[year] = seasonMondays(year).map((monday) => {
      const start = Date.parse(`${monday}T00:00:00Z`);
      const days = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(start + d * DAY_MS).toISOString().slice(0, 10);
        if (valid.has(date)) days.push(valid.get(date));
      }
      if (days.length < MIN_VALID_DAYS) {
        missing.push(`${year} week of ${monday}: ${days.length} valid days`);
        return NaN;
      }
      return Math.round((days.reduce((sum, v) => sum + v, 0) / days.length) * 10) / 10;
    });
  }

  if (missing.length) {
    throw new Error(
      `${missing.length} season week(s) have fewer than ${MIN_VALID_DAYS} valid days:\n  ` +
        missing.join('\n  '),
    );
  }
  return weeks;
}
