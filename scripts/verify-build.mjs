#!/usr/bin/env node
/*
 * Build-output guard, adapted from willawave-ai.
 *
 * Angular itself hard-errors on a RenderMode.Server route under outputMode
 * "static"; this script does not add that. What it adds is output-shape
 * verification the compiler has no opinion about: no server bundle, the landing
 * route actually prerendered, the release stamp, and a firebase.json that
 * cannot deploy over willawave.ai.
 *
 * It must run against a FRESH build or it is worthless: a failed `ng build`
 * aborts before wiping dist/, leaving the previous good output in place. Hence
 * the freshness gate below, and hence `verify:build` chains the build itself.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { checkHostingSite } from './hosting-site.mjs';

const dist = 'dist/reorder-demo';
const browser = join(dist, 'browser');
// Both feed the build: src is compiled, public is copied.
const sources = ['src', 'public'];
const indexPath = join(browser, 'index.html');
const failures = [];
const checks = [];

function check(name, ok, detail) {
  checks.push({ name, ok, detail });
  if (!ok) failures.push(`${name} — ${detail}`);
  return ok;
}

function report() {
  for (const { name, ok } of checks) console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}`);
  if (failures.length) {
    console.error(`\n${failures.length} check(s) failed:`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`\nAll ${checks.length} build-output checks passed.`);
}

const haveOutput = check(
  'build output exists and is non-empty',
  existsSync(browser) && readdirSync(browser).length > 0,
  `${browser} is missing or empty; run \`pnpm ng build\` first`,
);
if (!haveOutput) report();

const newestSrc = Math.max(
  ...sources.map(function walk(dir) {
    let newest = 0;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      newest = Math.max(newest, entry.isDirectory() ? walk(p) : statSync(p).mtimeMs);
    }
    return newest;
  }),
);

// A missing index.html is a prerender failure, not staleness: `ng build` logs
// the prerender exception but still exits 0. Name it precisely.
const haveIndex = existsSync(indexPath);
const staleBy = haveIndex ? Math.round((newestSrc - statSync(indexPath).mtimeMs) / 1000) : Infinity;
const isFresh = check(
  'build output is newer than source',
  haveIndex && staleBy <= 0,
  haveIndex
    ? `${sources.join(' or ')} changed ${staleBy}s after the last build — rebuild before verifying`
    : `${indexPath} does not exist — the landing route did not prerender. ` +
        'Scroll up: `ng build` logs the prerender exception but still exits 0.',
);
if (!isFresh) report();

check(
  'no server bundle emitted',
  !existsSync(join(dist, 'server')),
  `${join(dist, 'server')} exists — outputMode is no longer "static"`,
);

// Prerendering can silently degrade to an empty shell. Assert real content.
check(
  'landing HTML carries the app content',
  readFileSync(indexPath, 'utf8').includes('<h1'),
  'no <h1> in the prerendered landing HTML — the app rendered an empty shell',
);

{
  const versionPath = join(browser, 'version.json');
  const expected = readFileSync('VERSION', 'utf8').trim();
  let stamped = null;
  try {
    stamped = JSON.parse(readFileSync(versionPath, 'utf8'));
  } catch {
    // Missing or malformed reads as null and fails below.
  }
  check(
    'version.json stamps the release in VERSION',
    stamped?.version === expected && /^[0-9a-f]{40}$/.test(stamped?.commit ?? ''),
    `${versionPath} is ${stamped ? JSON.stringify(stamped) : 'missing or not JSON'}; ` +
      `expected version ${expected} and a full commit SHA`,
  );
}

/*
 * firebase.json is deploy config, so nothing in the build or the test suite
 * touches it. The release script checks the site again right before deploying;
 * checking here as well means CI fails the PR that breaks it.
 */
const config = existsSync('firebase.json')
  ? JSON.parse(readFileSync('firebase.json', 'utf8'))
  : null;
{
  const { ok, detail } = checkHostingSite(config);
  check('firebase.json targets the reorder-demo site, never willawave.ai', ok, detail);
}
check(
  'firebase.json publishes the built browser output',
  config?.hosting?.public === browser,
  `hosting.public is ${JSON.stringify(config?.hosting?.public)}, expected "${browser}"`,
);
check(
  'index.csr.html is not published',
  (config?.hosting?.ignore ?? []).some((pattern) => pattern.includes('index.csr.html')),
  'index.csr.html would be published — an empty CSR shell indexable as a duplicate homepage',
);

report();
