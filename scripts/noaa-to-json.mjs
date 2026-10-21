#!/usr/bin/env node
/*
 * One-off: download Omaha's daily highs, lows and precipitation from NOAA and
 * write the committed weekly JSON the page imports. The build never fetches;
 * rerun this by hand (`pnpm data:noaa`) only to change the station or years.
 *
 * Source: NCEI Access Data Service, GHCN-Daily "daily-summaries". No token.
 * `units=standard` returns whole °F and inches, as NOAA publishes them.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { weeklyWeather } from './noaa-weekly.mjs';

const STATION = 'USW00014942';
const NAME = 'Omaha Eppley Airfield, NE';
const FIRST_YEAR = 2010;
const LAST_YEAR = 2025;
const OUT = 'src/app/data/omaha-weather.json';

const source =
  'https://www.ncei.noaa.gov/access/services/data/v1?dataset=daily-summaries' +
  `&stations=${STATION}&dataTypes=TMAX,TMIN,PRCP&startDate=${FIRST_YEAR}-01-01` +
  `&endDate=${LAST_YEAR}-12-31&format=json&units=standard&includeAttributes=true`;

const response = await fetch(source);
if (!response.ok) {
  console.error(`noaa-to-json: NOAA answered ${response.status} ${response.statusText}`);
  process.exit(1);
}
const rows = await response.json();

let weather;
try {
  weather = weeklyWeather(rows, FIRST_YEAR, LAST_YEAR);
} catch (error) {
  console.error(`noaa-to-json: ${error.message}\nNothing was written.`);
  process.exit(1);
}

// One line per year: Prettier would put each of the 1,120 numbers on its own.
const header = {
  station: STATION,
  name: NAME,
  tmaxMeasure: 'weekly mean of daily TMAX, °F',
  prcpMeasure: 'weekly total precipitation, inches',
  frostRule: 'first season week with TMIN <= 32 °F on or after Aug 15, else null',
  source,
  retrieved: new Date().toISOString().slice(0, 10),
  firstYear: FIRST_YEAR,
  lastYear: LAST_YEAR,
};
const block = (key, byYear, last) =>
  `  ${JSON.stringify(key)}: {\n` +
  Object.entries(byYear)
    .map(([year, value]) => `    "${year}": ${JSON.stringify(value)}`)
    .join(',\n') +
  `\n  }${last ? '' : ','}`;
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  [
    '{',
    ...Object.entries(header).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`),
    block('tmax', weather.tmax, false),
    block('prcp', weather.prcp, false),
    block('frostWeek', weather.frostWeek, true),
    '}',
    '',
  ].join('\n'),
);

const highs = Object.values(weather.tmax).flat();
const frosts = Object.values(weather.frostWeek).filter((w) => w !== null).length;
console.log(
  `noaa-to-json: ${rows.length} daily rows -> ${Object.keys(weather.tmax).length} seasons x 35 ` +
    `weeks, weekly highs ${Math.min(...highs)}–${Math.max(...highs)} °F, ` +
    `${frosts} seasons with an in-season fall frost -> ${OUT}`,
);
