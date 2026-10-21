#!/usr/bin/env node
/*
 * Hosting postbuild: publish a real 404, and stamp version.json (below).
 * Ported from willawave-ai.
 *
 * Firebase Hosting serves `404.html` from the public root for any unmatched
 * path, with a real HTTP 404 status. Angular prerenders the 404 route to
 * `404/index.html`, which Hosting will not use for that. Without this copy an
 * unknown URL falls through to the homepage at HTTP 200: a soft 404, which
 * Google treats as a quality problem rather than a missing page.
 *
 * A copy rather than a build config change on purpose: the prerendered route
 * must keep existing at /404, where the router sends unknown in-app links.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const browser = 'dist/reorder-demo/browser';
const source = join(browser, '404', 'index.html');
const destination = join(browser, '404.html');

if (!existsSync(source)) {
  console.error(
    `postbuild: ${source} does not exist — the 404 route did not prerender.\n` +
      'Note that `ng build` logs a prerender exception but still exits 0, so a green\n' +
      'build is not evidence the route rendered.',
  );
  process.exit(1);
}

copyFileSync(source, destination);
console.log(`postbuild: ${source} -> ${destination}`);

/*
 * Stamp the release: `curl https://reorder-demo.web.app/version.json` answers
 * which VERSION and commit are live. The commit is HEAD, so a build of
 * uncommitted work names the last commit; `pnpm release:hosting` refuses a
 * dirty tree for exactly that reason.
 */
const stamp = {
  version: readFileSync('VERSION', 'utf8').trim(),
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
};
writeFileSync(join(browser, 'version.json'), `${JSON.stringify(stamp)}\n`);
console.log(`postbuild: version.json ${stamp.version} @ ${stamp.commit.slice(0, 7)}`);
