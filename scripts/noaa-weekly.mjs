/*
 * NOAA daily rows -> weekly season weather. Pure, so the rules are
 * table-tested (noaa-weekly.test.mjs) apart from the network fetch in
 * noaa-to-json.mjs.
 *
 * Per season week:
 *   tmax  mean of daily highs (°F)
 *   prcp  weekly precipitation total (inches): mean of valid days × 7, so a
 *         week with one missing day is not read as drier than it was
 * Per season:
 *   frostWeek  index of the first season week holding a day on or after
 *              Aug 15 with a low at or below 32°F, or null. Spring frosts do
 *              not count; the demand rule is about the fall.
 *
 * The rules, from the eng review:
 *   - a value whose quality flag is set, or that is not a number, is dropped;
 *   - a week with fewer than 5 valid days of TMAX or of PRCP is missing;
 *   - any missing season week fails the whole run, listing every one. A gap
 *     is never written as a zero or a null, because the page states the
 *     weather as fact.
 *
 * The season calendar comes from the model itself, so the data and the app
 * can never disagree about which weeks are in season.
 */
import { seasonMondays } from '../src/app/model/weather.ts';

export const MIN_VALID_DAYS = 5;
export const FROST_F = 32;

const DAY_MS = 86_400_000;
const ELEMENTS = ['TMAX', 'TMIN', 'PRCP'];

/** The value of one element on one row, or undefined if flagged, blank or non-numeric. */
function valueOf(row, element) {
  const raw = row[element];
  if (raw === undefined || raw.trim() === '') return undefined;
  const qualityFlag = (row[`${element}_ATTRIBUTES`] ?? '').split(',')[1] ?? '';
  if (qualityFlag.trim() !== '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

const round = (value, places) => Math.round(value * 10 ** places) / 10 ** places;
const mean = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;

/**
 * @param {readonly Record<string, string>[]} rows NCEI daily-summaries JSON
 *   rows with TMAX, TMIN and PRCP; `<ELEMENT>_ATTRIBUTES` is "MFLAG,QFLAG,SFLAG".
 * @returns {{ tmax: Record<string, number[]>, prcp: Record<string, number[]>,
 *   frostWeek: Record<string, number | null> }}
 */
export function weeklyWeather(rows, firstYear, lastYear) {
  const days = new Map();
  for (const row of rows) {
    days.set(row.DATE, Object.fromEntries(ELEMENTS.map((e) => [e, valueOf(row, e)])));
  }

  const tmax = {};
  const prcp = {};
  const frostWeek = {};
  const missing = [];
  for (let year = firstYear; year <= lastYear; year++) {
    tmax[year] = [];
    prcp[year] = [];
    frostWeek[year] = null;
    seasonMondays(year).forEach((monday, week) => {
      const start = Date.parse(`${monday}T00:00:00Z`);
      const highs = [];
      const rain = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(start + d * DAY_MS).toISOString().slice(0, 10);
        const day = days.get(date);
        if (day?.TMAX !== undefined) highs.push(day.TMAX);
        if (day?.PRCP !== undefined) rain.push(day.PRCP);
        const fall = date.slice(5) >= '08-15';
        if (fall && frostWeek[year] === null && day?.TMIN !== undefined && day.TMIN <= FROST_F) {
          frostWeek[year] = week;
        }
      }
      if (highs.length < MIN_VALID_DAYS || rain.length < MIN_VALID_DAYS) {
        missing.push(
          `${year} week of ${monday}: ${highs.length} valid TMAX days, ${rain.length} valid PRCP days`,
        );
        tmax[year].push(NaN);
        prcp[year].push(NaN);
        return;
      }
      tmax[year].push(round(mean(highs), 1));
      prcp[year].push(round(mean(rain) * 7, 2));
    });
  }

  if (missing.length) {
    throw new Error(
      `${missing.length} season week(s) have fewer than ${MIN_VALID_DAYS} valid days:\n  ` +
        missing.join('\n  '),
    );
  }
  return { tmax, prcp, frostWeek };
}
