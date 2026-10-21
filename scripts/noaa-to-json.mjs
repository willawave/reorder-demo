#!/usr/bin/env node
/*
 * One-off: download Omaha's daily TMAX from NOAA and write the committed
 * weekly JSON the page imports. The build never fetches; rerun this by hand
 * (`pnpm data:noaa`) only to change the station or the years.
 *
 * Source: NCEI Access Data Service, GHCN-Daily "daily-summaries". No token.
 * `units=standard` returns whole °F, as NOAA publishes them.
 */
import { writeFileSync } from 'node:fs';
import { weeklyTmax } from './noaa-weekly.mjs';

const STATION = 'USW00014942';
const NAME = 'Omaha Eppley Airfield, NE';
const FIRST_YEAR = 2010;
const LAST_YEAR = 2025;
const OUT = 'src/app/data/omaha-tmax.json';

const source =
  'https://www.ncei.noaa.gov/access/services/data/v1?dataset=daily-summaries' +
  `&stations=${STATION}&dataTypes=TMAX&startDate=${FIRST_YEAR}-01-01&endDate=${LAST_YEAR}-12-31` +
  '&format=json&units=standard&includeAttributes=true';

const response = await fetch(source);
if (!response.ok) {
  console.error(`noaa-to-json: NOAA answered ${response.status} ${response.statusText}`);
  process.exit(1);
}
const rows = await response.json();

let weeks;
try {
  weeks = weeklyTmax(rows, FIRST_YEAR, LAST_YEAR);
} catch (error) {
  console.error(`noaa-to-json: ${error.message}\nNothing was written.`);
  process.exit(1);
}

// One line per year: Prettier would put each of the 560 numbers on its own.
const header = {
  station: STATION,
  name: NAME,
  measure: 'weekly mean of daily TMAX',
  units: '°F',
  source,
  retrieved: new Date().toISOString().slice(0, 10),
  firstYear: FIRST_YEAR,
  lastYear: LAST_YEAR,
};
const headerLines = Object.entries(header).map(
  ([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`,
);
const yearLines = Object.entries(weeks).map(
  ([year, values]) => `    "${year}": ${JSON.stringify(values)}`,
);
writeFileSync(
  OUT,
  `{\n${headerLines.join('\n')}\n  "weeks": {\n${yearLines.join(',\n')}\n  }\n}\n`,
);

const all = Object.values(weeks).flat();
console.log(
  `noaa-to-json: ${rows.length} daily rows -> ${Object.keys(weeks).length} seasons x 35 weeks, ` +
    `weekly means ${Math.min(...all)}–${Math.max(...all)} °F -> ${OUT}`,
);
