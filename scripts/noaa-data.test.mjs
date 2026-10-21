import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

/*
 * Value: protects=the committed weather file the page imports keeps its shape;
 * fails_when=a hand edit or a partial regeneration drops a year, a week or a
 * frost entry, or writes a non-number; why_new=the file is generated once and
 * imported by the page, so nothing else re-checks it; seam=none;
 * no_claim=the values match NOAA (the generator's rules and the verified spot
 * facts cover that)
 */
const data = JSON.parse(readFileSync('src/app/data/omaha-weather.json', 'utf8'));
const YEARS = Array.from({ length: 16 }, (_, i) => String(2010 + i));

test('names the Omaha station', () => {
  assert.equal(data.station, 'USW00014942');
});

for (const [key, low, high] of [
  ['tmax', -20, 120],
  ['prcp', 0, 15],
]) {
  test(`has 35 plausible weekly ${key} values for every season 2010–2025`, () => {
    assert.deepEqual(Object.keys(data[key]), YEARS);
    for (const [year, values] of Object.entries(data[key])) {
      assert.equal(values.length, 35, `${year} has ${values.length} weeks`);
      for (const v of values)
        assert.ok(Number.isFinite(v) && v >= low && v < high, `${year}: ${v}`);
    }
  });
}

test('has a frost week (0–34) or null for every season', () => {
  assert.deepEqual(Object.keys(data.frostWeek), YEARS);
  for (const [year, week] of Object.entries(data.frostWeek)) {
    assert.ok(
      week === null || (Number.isInteger(week) && week >= 0 && week < 35),
      `${year}: ${week}`,
    );
  }
});

test('keeps the verified facts', () => {
  // NOAA, checked 2026-10-21: summer 2015 had 15.96 in of rain; the first fall
  // frost of 2012 was Oct 6, in the week of Oct 1 (season week 30).
  const summer2015 = data.prcp['2015'].slice(13, 26).reduce((sum, v) => sum + v, 0);
  assert.equal(Math.round(summer2015 * 100) / 100, 15.96);
  assert.equal(data.frostWeek['2012'], 30);
});
