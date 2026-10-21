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
import { SITE_ORIGIN } from '../src/app/site.ts';
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

/*
 * Prerendering can silently degrade to an empty shell, and the simulator is a
 * lazy route, so a failed chunk load at prerender time would still build.
 * Assert the parts of the page that matter reached the static HTML: the
 * honesty label, the default season's computed tables, and the way to act.
 */
{
  const html = readFileSync(indexPath, 'utf8');
  const required = [
    ['the headline', '<h1'],
    ['the hypothetical-sales label', 'Sales are hypothetical'],
    ['the comparison and cash tables', '<table'],
    ['a computed result sentence', 'The weather-adjusted plan committed'],
    ['the closing question', 'Would this change your order?'],
    ['the booking link', 'href="https://cal.com/willawave/intro"'],
    // Without the attribute every thumb sits at its midpoint until hydration.
    ['slider values as attributes', /<input type="range"(?=[^>]*id="lead-time")(?=[^>]*value="2")/],
  ];
  const missing = required
    .filter(([, needle]) =>
      typeof needle === 'string' ? !html.includes(needle) : !needle.test(html),
    )
    .map(([name]) => name);
  check(
    'landing HTML carries the prerendered simulator',
    missing.length === 0,
    `missing from prerendered HTML: ${missing.join('; ')}`,
  );
}

/*
 * Page chrome, ported from willawave-ai's guard. Everything below is copied or
 * written into the head rather than imported, so nothing else notices if it
 * stops shipping.
 */
{
  const html = readFileSync(indexPath, 'utf8');

  // ORDER is the property worth checking: the resolver must run before the
  // stylesheet or a visitor who chose light on a dark OS sees a dark flash.
  const themeScript = html.indexOf("localStorage.getItem('ww-theme')");
  const firstStylesheet = html.indexOf('rel="stylesheet"');
  check(
    'theme resolver is inline and runs before the stylesheet',
    themeScript !== -1 && (firstStylesheet === -1 || themeScript < firstStylesheet),
    themeScript === -1
      ? 'no-flash theme script missing from prerendered HTML'
      : `theme script at ${themeScript} comes after the first stylesheet at ${firstStylesheet}`,
  );

  check(
    'landing HTML links the brand icons',
    html.includes('brand/favicon.svg') && html.includes('brand/apple-touch-icon.png'),
    'SVG favicon or apple-touch icon missing from the built head',
  );

  // Scrapers never run the app, so these must be in the PRERENDERED head, and
  // absolute: a relative og:image or canonical is dropped.
  check(
    'landing HTML carries the meta description',
    /<meta name="description" content="[^"]{50,}"/.test(html),
    'description meta tag missing or suspiciously short in prerendered HTML',
  );
  check(
    'landing HTML carries an absolute og:image and canonical',
    html.includes(`content="${SITE_ORIGIN}/og-1200x630.png"`) &&
      html.includes(`<link rel="canonical" href="${SITE_ORIGIN}/"`),
    `og:image or canonical is missing, or not absolute on ${SITE_ORIGIN}`,
  );
  // The tag that would delete the page from search if it leaked here.
  check(
    'landing HTML is indexable',
    html.includes('content="index, follow"') && !html.includes('noindex'),
    'the landing page carries noindex; it would be removed from search results',
  );
}

{
  const notFoundRoute = join(browser, '404', 'index.html');
  const notFound = existsSync(notFoundRoute) ? readFileSync(notFoundRoute, 'utf8') : '';
  check(
    '404 route prerendered with noindex',
    notFound.includes('Page not found') && notFound.includes('content="noindex, follow"'),
    notFound
      ? 'the 404 page is indexable or lost its content'
      : `${notFoundRoute} missing; the 404 route did not prerender`,
  );
  check(
    '404.html published at the public root',
    existsSync(join(browser, '404.html')),
    `${join(browser, '404.html')} missing; Hosting would serve the homepage at HTTP 200 for ` +
      'unknown paths, which Google records as a soft 404',
  );
}

// Copied by the asset pipeline, not imported: a broken `assets` config breaks
// these silently while the page still renders.
{
  const requiredFiles = [
    'brand/favicon.svg',
    'brand/apple-touch-icon.png',
    'brand/wordmark.svg',
    'brand/wordmark-dark.svg',
    'og-1200x630.png',
    'robots.txt',
    'sitemap.xml',
  ];
  const missingFiles = requiredFiles.filter((file) => !existsSync(join(browser, file)));
  check(
    'brand assets and crawl files copied to the build output',
    missingFiles.length === 0,
    `missing from ${browser}: ${missingFiles.join(', ')}`,
  );

  // Angular's default favicon.ico is ~15KB; the brand one is under 1KB.
  const rootIcon = join(browser, 'favicon.ico');
  check(
    'root favicon.ico is the brand icon, not the Angular default',
    existsSync(rootIcon) && statSync(rootIcon).size < 5000,
    existsSync(rootIcon)
      ? `favicon.ico is ${statSync(rootIcon).size} bytes; that is the Angular default`
      : 'favicon.ico missing from the build output',
  );
}

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
// A catch-all rewrite would serve the homepage at HTTP 200 for every unknown
// path, bypassing 404.html entirely.
{
  const catchAll = (config?.hosting?.rewrites ?? []).filter((rule) =>
    /^\*{1,2}$|^\/\*{1,2}$/.test(rule.source ?? rule.glob ?? ''),
  );
  check(
    'no catch-all rewrite',
    catchAll.length === 0,
    `catch-all rewrite present (${JSON.stringify(catchAll)}); unknown paths would return the ` +
      'homepage at 200 instead of 404.html',
  );
}
check(
  'index.csr.html is not published',
  (config?.hosting?.ignore ?? []).some((pattern) => pattern.includes('index.csr.html')),
  'index.csr.html would be published — an empty CSR shell indexable as a duplicate homepage',
);

report();
