import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkHostingSite } from './hosting-site.mjs';

/*
 * Value: protects=willawave.ai from being overwritten by a demo deploy;
 * fails_when=the guard accepts a firebase.json with no site, the default site,
 * or a different site; why_new=nothing else reads firebase.json before a
 * deploy; seam=none
 */
const cases = [
  ['the demo site', { hosting: { site: 'reorder-demo' } }, true],
  ['no hosting block', {}, false],
  ['no site field', { hosting: { public: 'dist' } }, false],
  ['an empty site', { hosting: { site: '' } }, false],
  ['the willawave.ai site', { hosting: { site: 'willawave-prod' } }, false],
  ['some other site', { hosting: { site: 'reorder-demo-2' } }, false],
  ['a non-string site', { hosting: { site: 1 } }, false],
  ['several hosting targets', { hosting: [{ site: 'reorder-demo' }] }, false],
  ['a null config', null, false],
];

for (const [name, config, ok] of cases) {
  test(`${ok ? 'accepts' : 'refuses'} ${name}`, () => {
    assert.equal(checkHostingSite(config).ok, ok);
  });
}
