import assert from 'node:assert/strict';
import { test } from 'node:test';
import { seasonMondays } from '../src/app/model/weather.ts';
import { weeklyTmax } from './noaa-weekly.mjs';

/*
 * Value: protects=the real-weather claim has no silent gaps or flagged values;
 * fails_when=a missing week is written as a number, a quality-flagged day is
 * averaged in, or off-season days leak into a week; why_new=new script;
 * seam=none; no_claim=station choice quality
 *
 * Temperatures are made up. Every test starts from one complete 2012 season
 * at a flat 70 °F and breaks one thing.
 */
const DAY_MS = 86_400_000;
const firstMonday = seasonMondays(2012)[0];

function season2012(tmax = () => '70', attributes = () => ',,X') {
  const rows = [];
  // Feb 1 to Nov 30 covers the season with off-season days on both sides.
  for (let t = Date.UTC(2012, 1, 1); t <= Date.UTC(2012, 10, 30); t += DAY_MS) {
    const date = new Date(t).toISOString().slice(0, 10);
    rows.push({ DATE: date, STATION: 'X', TMAX: tmax(date), TMAX_ATTRIBUTES: attributes(date) });
  }
  return rows;
}

// The first season week, 2012-03-05 to 2012-03-11.
const week0 = (date) => date >= '2012-03-05' && date <= '2012-03-11';

test('averages a complete season into 35 weeks', () => {
  const weeks = weeklyTmax(season2012(), 2012, 2012);
  assert.equal(weeks[2012].length, 35);
  assert.ok(weeks[2012].every((v) => v === 70));
});

test('rounds the weekly mean to 0.1 °F', () => {
  const rows = season2012((date) => (date === '2012-03-05' ? '71' : '70'));
  assert.equal(weeklyTmax(rows, 2012, 2012)[2012][0], 70.1); // 491 / 7 = 70.142...
});

test('fails on a week with only 4 valid days, naming it', () => {
  const rows = season2012().filter(
    (r) => !['2012-03-05', '2012-03-06', '2012-03-07'].includes(r.DATE),
  );
  assert.throws(() => weeklyTmax(rows, 2012, 2012), /2012 week of 2012-03-05: 4 valid days/);
});

test('accepts a week with exactly 5 valid days, at the mean of those 5', () => {
  const rows = season2012((date) => (date === '2012-03-07' ? '80' : '70')).filter(
    (r) => !['2012-03-05', '2012-03-06'].includes(r.DATE),
  );
  assert.equal(weeklyTmax(rows, 2012, 2012)[2012][0], 72); // (80 + 4 × 70) / 5
});

test('drops a quality-flagged value instead of averaging it', () => {
  const rows = season2012(
    (date) => (date === '2012-03-05' ? '140' : '70'),
    (date) => (date === '2012-03-05' ? ',I,X' : ',,X'),
  );
  assert.equal(weeklyTmax(rows, 2012, 2012)[2012][0], 70);
});

test('drops non-numeric and empty values', () => {
  const rows = season2012((date) =>
    date === '2012-03-05' ? 'NaN' : date === '2012-03-06' ? ' ' : '70',
  );
  assert.equal(weeklyTmax(rows, 2012, 2012)[2012][0], 70);
});

test('drops a row with no TMAX field, and reads a row with no attributes as unflagged', () => {
  const rows = season2012().map((r) => {
    if (r.DATE === '2012-03-05') return { DATE: r.DATE, STATION: 'X' };
    if (r.DATE === '2012-03-06') return { DATE: r.DATE, STATION: 'X', TMAX: '77' };
    return r;
  });
  assert.equal(weeklyTmax(rows, 2012, 2012)[2012][0], 71.2); // (77 + 5 × 70) / 6 = 71.17
});

test('counts dropped values toward a missing week', () => {
  const rows = season2012(
    () => '70',
    (date) => (week0(date) && date < '2012-03-09' ? ',S,X' : ',,X'),
  );
  assert.throws(() => weeklyTmax(rows, 2012, 2012), /2012-03-05: 3 valid days/);
});

test('ignores days outside the season weeks', () => {
  const rows = season2012((date) => (date < firstMonday || date > '2012-11-04' ? '-40' : '70'));
  assert.ok(weeklyTmax(rows, 2012, 2012)[2012].every((v) => v === 70));
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
    () => weeklyTmax(rows, 2012, 2012),
    (error) =>
      /2 season week\(s\)/.test(error.message) &&
      error.message.includes('2012-03-05') &&
      error.message.includes('2012-10-29'),
  );
});

test('fails on a year with no rows at all', () => {
  assert.throws(() => weeklyTmax(season2012(), 2012, 2013), /35 season week\(s\)/);
});
