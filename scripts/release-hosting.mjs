#!/usr/bin/env node
/*
 * Release Hosting: deploy from main, prove the live site serves this build,
 * and only then tag it and publish a GitHub release. Adapted from willawave-ai.
 *
 *   pnpm release:hosting
 *
 * The tag is the record of what is live, so it is written last: a deploy that
 * fails or a CDN that still serves the old bytes leaves no tag behind.
 *
 * This site shares the willawave-prod project with willawave.ai, so the deploy
 * names the site twice: firebase.json must carry it (checkHostingSite), and the
 * --only flag targets it, so a deploy can never fall through to the default.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SITE_ORIGIN } from '../src/app/site.ts';
import { PROJECT, SITE_ID, checkHostingSite } from './hosting-site.mjs';

// The canonical domain visitors use (DNS and certificate live since 2026-10-21).
// It serves the same Hosting site as ${SITE_ID}.web.app.
const SITE = SITE_ORIGIN;
const BUILT = 'dist/reorder-demo/browser';
// What must match byte for byte: the page and the stamp.
const LIVE_FILES = [
  ['/', 'index.html'],
  ['/version.json', 'version.json'],
];

const read = (cmd, args) =>
  execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' });
const fail = (message) => {
  console.error(`\nrelease:hosting: ${message}`);
  process.exit(1);
};
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

// 0. Never deploy over willawave.ai.
const siteCheck = checkHostingSite(JSON.parse(readFileSync('firebase.json', 'utf8')));
if (!siteCheck.ok) fail(`refusing to deploy: ${siteCheck.detail}.`);

const version = readFileSync('VERSION', 'utf8').trim();
const tag = `v${version}`;

// 1. Refuse anything but a clean, pushed main with an untagged VERSION.
if (read('git', ['branch', '--show-current']) !== 'main') fail('run this from main.');
if (read('git', ['status', '--porcelain'])) fail('the working tree is not clean.');
run('git', ['fetch', '--quiet', '--tags', 'origin', 'main']);
const head = read('git', ['rev-parse', 'HEAD']);
if (head !== read('git', ['rev-parse', 'origin/main'])) {
  fail('HEAD is not origin/main. Pull (or merge the PR) first.');
}
if (read('git', ['tag', '--list', tag])) {
  fail(`${tag} already exists. Bump VERSION for a new release; a tag is never moved.`);
}
const changelog = readFileSync('CHANGELOG.md', 'utf8');
const section = new RegExp(
  `^## \\[${version.replaceAll('.', '\\.')}\\][^\\n]*\\n([\\s\\S]*?)(?=^## \\[|(?![\\s\\S]))`,
  'm',
).exec(changelog);
if (!section) fail(`CHANGELOG.md has no "## [${version}]" entry for the release notes.`);

// 2. Build, verify, deploy.
run('pnpm', ['verify:build']);
run('npx', [
  '-y',
  'firebase-tools@15',
  'deploy',
  '--only',
  `hosting:${SITE_ID}`,
  '--project',
  PROJECT,
]);

// 3. The live site must serve exactly this build. A cache-busting query keeps
//    the CDN from answering with the previous release; retry briefly for edges.
for (const [path, file] of LIVE_FILES) {
  const expected = sha256(readFileSync(join(BUILT, file)));
  let live = null;
  for (let attempt = 1; attempt <= 5 && live !== expected; attempt++) {
    if (attempt > 1) await new Promise((resolve) => setTimeout(resolve, 3000));
    const response = await fetch(`${SITE}${path}?release=${Date.now()}`, { cache: 'no-store' });
    live = response.ok ? sha256(Buffer.from(await response.arrayBuffer())) : null;
  }
  if (live !== expected) {
    fail(`${SITE}${path} does not serve the built ${file}. Deployed, but NOT tagged.`);
  }
  console.log(`live ${path} matches ${file} (${expected.slice(0, 12)})`);
}

// 4. Record what is live: an annotated tag on HEAD, then the GitHub release.
const notes = section[1].trim();
const notesFile = join(mkdtempSync(join(tmpdir(), 'release-')), 'notes.md');
writeFileSync(notesFile, `${notes}\n`);
run('git', ['tag', '-a', tag, '-F', notesFile, head]);
run('git', ['push', 'origin', `refs/tags/${tag}`]);
run('gh', ['release', 'create', tag, '--verify-tag', '--title', tag, '--notes-file', notesFile]);
console.log(`\nreleased ${tag} at ${head.slice(0, 7)}: ${SITE}/version.json`);
