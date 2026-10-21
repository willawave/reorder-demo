import assert from 'node:assert/strict';
import { test } from 'node:test';
import { seasonMondays } from '../src/app/model/weather.ts';
import { weeklyWeather } from './noaa-weekly.mjs';

/*
 * Value: protects=the real-weather claim has no silent gaps or flagged values,
 * and the frost week is the first fall frost; fails_when=a missing week is
 * written as a number, a quality-flagged day is averaged in, off-season days
 * leak into a week, or a spring frost counts; why_new=new script; seam=none;
 * no_claim=station choice quality
 *
 * Weather is made up. Every test starts from one complete 2012 season, flat
 * 70 °F highs, 50 °F lows and 0.10 in of rain a day, and breaks one thing.
 */
const DAY_MS = 86_400_000;
const firstMonday = seasonMondays(2012)[0];

function season2012({
  tmax = () => '70',
  tmin = () => '50',
  prcp = () => '0.10',
  attributes = () => ',,X',
} = {}) {
  const rows = [];
  // Feb 1 to Nov 30 covers the season with off-season days on both sides.
  for (let t = Date.UTC(2012, 1, 1); t <= Date.UTC(2012, 10, 30); t += DAY_MS) {
    const date = new Date(t).toISOString().slice(0, 10);
    rows.push({
      DATE: date,
      STATION: 'X',
      TMAX: tmax(date),
      TMAX_ATTRIBUTES: attributes(date),
      TMIN: tmin(date),
      TMIN_ATTRIBUTES: ',,X',
      PRCP: prcp(date),
      PRCP_ATTRIBUTES: ',,X',
    });
  }
  return rows;
}

const week2012 = (rows) => weeklyWeather(rows, 2012, 2012);

// The first season week, 2012-03-05 to 2012-03-11.
const week0 = (date) => date >= '2012-03-05' && date <= '2012-03-11';

test('averages highs and totals rain for a complete season of 35 weeks', () => {
  const { tmax, prcp, frostWeek } = week2012(season2012());
  assert.equal(tmax[2012].length, 35);
  assert.ok(tmax[2012].every((v) => v === 70));
  assert.ok(prcp[2012].every((v) => v === 0.7));
  assert.equal(frostWeek[2012], null);
});

test('rounds the weekly mean high to 0.1 °F', () => {
  const rows = season2012({ tmax: (date) => (date === '2012-03-05' ? '71' : '70') });
  assert.equal(week2012(rows).tmax[2012][0], 70.1); // 491 / 7 = 70.142...
});

test('scales rain from valid days to a 7-day total', () => {
  // Two days of rain gone: the five left average 0.30, so the week reads 2.10.
  const rows = season2012({ prcp: (date) => (week0(date) ? '0.30' : '0.10') }).map((r) =>
    ['2012-03-05', '2012-03-06'].includes(r.DATE) ? { ...r, PRCP: '' } : r,
  );
  assert.equal(week2012(rows).prcp[2012][0], 2.1);
});

test('fails on a week with only 4 valid days, naming it', () => {
  const rows = season2012().filter(
    (r) => !['2012-03-05', '2012-03-06', '2012-03-07'].includes(r.DATE),
  );
  assert.throws(() => week2012(rows), /2012 week of 2012-03-05: 4 valid TMAX days, 4 valid PRCP/);
});

test('fails when rain alone is missing for a week', () => {
  const rows = season2012({ prcp: (date) => (week0(date) && date < '2012-03-09' ? '' : '0.10') });
  assert.throws(() => week2012(rows), /2012-03-05: 7 valid TMAX days, 3 valid PRCP days/);
});

test('accepts a week with exactly 5 valid days, at the mean of those 5', () => {
  const rows = season2012({ tmax: (date) => (date === '2012-03-07' ? '80' : '70') }).filter(
    (r) => !['2012-03-05', '2012-03-06'].includes(r.DATE),
  );
  assert.equal(week2012(rows).tmax[2012][0], 72); // (80 + 4 × 70) / 5
});

test('drops a quality-flagged value instead of averaging it', () => {
  const rows = season2012({
    tmax: (date) => (date === '2012-03-05' ? '140' : '70'),
    attributes: (date) => (date === '2012-03-05' ? ',I,X' : ',,X'),
  });
  assert.equal(week2012(rows).tmax[2012][0], 70);
});

test('drops non-numeric and empty values', () => {
  const rows = season2012({
    tmax: (date) => (date === '2012-03-05' ? 'NaN' : date === '2012-03-06' ? ' ' : '70'),
  });
  assert.equal(week2012(rows).tmax[2012][0], 70);
});

test('drops a row with no fields, and reads a row with no attributes as unflagged', () => {
  const rows = season2012().map((r) => {
    if (r.DATE === '2012-03-05') return { DATE: r.DATE, STATION: 'X' };
    if (r.DATE === '2012-03-06') return { DATE: r.DATE, STATION: 'X', TMAX: '77', PRCP: '0.10' };
    return r;
  });
  assert.equal(week2012(rows).tmax[2012][0], 71.2); // (77 + 5 × 70) / 6 = 71.17
});

test('counts dropped values toward a missing week', () => {
  const rows = season2012({
    attributes: (date) => (week0(date) && date < '2012-03-09' ? ',S,X' : ',,X'),
  });
  assert.throws(() => week2012(rows), /2012-03-05: 3 valid TMAX days/);
});

test('ignores days outside the season weeks', () => {
  const rows = season2012({
    tmax: (date) => (date < firstMonday || date > '2012-11-04' ? '-40' : '70'),
  });
  assert.ok(week2012(rows).tmax[2012].every((v) => v === 70));
});

const frostCases = [
  // [name, frost dates, expected week]
  ['no frost', [], null],
  ['a frost on Oct 6 lands in the week of Oct 1', ['2012-10-06'], 30],
  ['the first of two fall frosts counts', ['2012-10-20', '2012-10-09'], 31],
  ['a spring frost does not count', ['2012-04-10'], null],
  ['a frost exactly at 32 °F counts', ['2012-10-29'], 34],
  ['a frost after the season ends does not count', ['2012-11-10'], null],
];
for (const [name, dates, expected] of frostCases) {
  test(`frost week: ${name}`, () => {
    const rows = season2012({ tmin: (date) => (dates.includes(date) ? '32' : '50') });
    assert.equal(week2012(rows).frostWeek[2012], expected);
  });
}

test('a low of 33 °F is not a frost', () => {
  const rows = season2012({ tmin: (date) => (date === '2012-10-06' ? '33' : '50') });
  assert.equal(week2012(rows).frostWeek[2012], null);
});

test('lists every missing week in one error', () => {
  const gone = new Set([
    '2012-03-05',
    '2012-03-06',
    '2012-03-07',
    '2012-10-29',
    '2012-10-30',
    '2012-10-31',
  ]);
  const rows = season2012().filter((r) => !gone.has(r.DATE));
  assert.throws(
    () => week2012(rows),
    (error) =>
      /2 season week\(s\)/.test(error.message) &&
      error.message.includes('2012-03-05') &&
      error.message.includes('2012-10-29'),
  );
});

test('fails on a year with no rows at all', () => {
  assert.throws(() => weeklyWeather(season2012(), 2012, 2013), /35 season week\(s\)/);
});
