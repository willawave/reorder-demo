import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

/*
 * Value: protects=the committed weather file the page imports keeps its shape;
 * fails_when=a hand edit or a partial regeneration drops a year, a week, or
 * writes a non-number; why_new=the file is generated once and imported by the
 * page, so nothing else re-checks it; seam=none; no_claim=the values match
 * NOAA (the generator's rules and the verified spot facts cover that)
 */
const data = JSON.parse(readFileSync('src/app/data/omaha-tmax.json', 'utf8'));

test('names the Omaha station', () => {
  assert.equal(data.station, 'USW00014942');
  assert.equal(data.units, '°F');
});

test('has 35 plausible weekly means for every season 2010–2025', () => {
  const years = Object.keys(data.weeks).map(Number);
  assert.deepEqual(
    years,
    Array.from({ length: 16 }, (_, i) => 2010 + i),
  );
  for (const [year, values] of Object.entries(data.weeks)) {
    assert.equal(values.length, 35, `${year} has ${values.length} weeks`);
    for (const v of values) assert.ok(Number.isFinite(v) && v > -20 && v < 120, `${year}: ${v}`);
  }
});
