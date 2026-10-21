#!/usr/bin/env node
/*
 * Hosting postbuild: stamp the release.
 *
 * `curl https://reorder-demo.web.app/version.json` answers which VERSION and
 * commit are live. The commit is HEAD, so a build of uncommitted work names the
 * last commit; `pnpm release:hosting` refuses a dirty tree for exactly that
 * reason.
 *
 * willawave-ai's copy also publishes 404.html from the prerendered 404 route.
 * Add that here when this app gets a 404 route.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const browser = 'dist/reorder-demo/browser';

const stamp = {
  version: readFileSync('VERSION', 'utf8').trim(),
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
};
writeFileSync(join(browser, 'version.json'), `${JSON.stringify(stamp)}\n`);
console.log(`postbuild: version.json ${stamp.version} @ ${stamp.commit.slice(0, 7)}`);
