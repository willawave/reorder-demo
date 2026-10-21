/*
 * The one mistake here that would break the live business site.
 *
 * This app deploys as a second Hosting site inside willawave-prod, whose
 * default site IS willawave.ai. A firebase.json without an explicit `site`
 * deploys to that default, so `firebase deploy --only hosting` would overwrite
 * willawave.ai with this demo. Both the release script and verify:build call
 * this before anything is deployed.
 */
export const PROJECT = 'willawave-prod';
export const SITE_ID = 'reorder-demo';
// The default site of PROJECT: willawave.ai. Never a valid target from here.
export const FORBIDDEN_SITE = 'willawave-prod';

/**
 * @param {unknown} config parsed firebase.json
 * @returns {{ ok: boolean, detail: string }}
 */
export function checkHostingSite(config) {
  const hosting = /** @type {{ hosting?: unknown }} */ (config ?? {}).hosting;
  if (Array.isArray(hosting)) {
    return { ok: false, detail: 'firebase.json lists several hosting targets; expected one' };
  }
  const site = /** @type {{ site?: unknown } | undefined} */ (hosting)?.site;
  if (typeof site !== 'string' || site === '') {
    return {
      ok: false,
      detail: `firebase.json hosting has no "site" — a deploy would overwrite willawave.ai`,
    };
  }
  if (site === FORBIDDEN_SITE) {
    return { ok: false, detail: `firebase.json hosting.site is "${site}", which is willawave.ai` };
  }
  if (site !== SITE_ID) {
    return { ok: false, detail: `firebase.json hosting.site is "${site}", expected "${SITE_ID}"` };
  }
  return { ok: true, detail: `hosting.site is "${site}"` };
}
