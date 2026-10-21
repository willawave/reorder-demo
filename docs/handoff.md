# Handing this off

What a client needs to run and grow a tool like this one. The demo is the worked example: the
same steps apply to a version built on a client's own sales history. Support and handoff terms
are on [willawave.ai](https://willawave.ai), not in this repo.

## Keeping it current

- **Monthly:** `pnpm update` within the declared ranges, `pnpm audit`, then open a PR. CI runs
  the full gate: lint, unit tests with coverage thresholds, the build checks, and the browser
  tests with accessibility scans. A green PR is safe to merge.
- **About every six months:** Angular ships a major version. On a branch, run
  `pnpm ng update @angular/core @angular/cli` and follow its migration notes. The coverage
  thresholds and the e2e suite catch behaviour changes.
- **Newly published packages:** pnpm 11 holds them back for a few days by default
  (`minimumReleaseAge`), which keeps a compromised release from landing the day it ships.
  Leave that setting on.
- **Toolchain:** the pnpm version is pinned by `packageManager` in `package.json`. CI runs
  Node 24; move it there and locally together.
- **Never lower a coverage threshold to make a run pass.** Add the tests. `CLAUDE.md` lists
  the bars.

## Refreshing the weather

Once a year, after the season closes on Oct 31, add the new season:

1. Raise `LAST_YEAR` in `scripts/noaa-to-json.mjs` and run `pnpm data:noaa`. It rewrites
   `src/app/data/omaha-weather.json`, drops readings NOAA flags as failing quality control, and
   refuses to write the file if any season week has fewer than five valid days.
2. The season count and the year range also appear in the tests and the copy (search for
   `2010–2025` and for the 16-season checks). The tests fail until those are updated, which is
   on purpose: a new season changes every normal, so the presets and the premise check need a
   second look.
3. Review the regenerated file and the updated numbers in a PR like any other change.

## Fitting the model to real sales

The demo's sales are hypothetical. A client version replaces the made-up parts with the
client's data. [`docs/model.md`](model.md) stays the spec throughout, so update it in the same
PR as the code.

1. **Baseline:** replace `BASELINE` in `src/app/model/baseline.ts` with the SKU's typical
   weekly sales, averaged over past seasons.
2. **Weather effect:** estimate it from the client's sales history instead of setting it with
   a slider. Regress weekly sales over baseline on the weather index from the week before
   (`weatherIndex` in `src/app/model/weather.ts`, lagged one week). The slope is the effect.
   Keep the leave-one-out discipline the normals already use, so a season's own sales never
   tune the number it is judged with.
3. **Place and product:** the station and years are in `scripts/noaa-to-json.mjs`, the season
   window and the index in `src/app/model/weather.ts`, and the frost rule (32°F on or after
   Aug 15) in `scripts/noaa-weekly.mjs`. Change them, then regenerate the data.
4. **Guards:** `src/app/simulator/premise.spec.ts` replays every season and fails if the
   weather-adjusted plan stops beating the normal plan overall. The model folder has stricter
   coverage (95% lines, 90% branches, 100% functions). If a refinement breaks the premise, that
   is a finding to discuss, not a test to loosen.

## Moving the hosting

The site is static files on Firebase Hosting ([why](hosting.md)). To move it to the client's
own Firebase project:

1. Set `PROJECT` and `SITE_ID` in `scripts/hosting-site.mjs`, and `SITE_ORIGIN` in
   `src/app/site.ts`, to the client's project, site and domain. The deploy guard refuses to
   run without an explicit site, so nothing can overwrite another site by accident.
2. Update `.firebaserc` and the `site` in `firebase.json` to match.
3. Add the custom domain in the Firebase console and create the DNS records it shows.
4. Release with `pnpm release:hosting` from a clean `main`. It builds, deploys, checks the
   live site byte for byte, then tags the version and creates a GitHub release.

## Going further

- **Installable app:** adding a web app manifest and a service worker makes the site
  installable on phones and usable offline, with no app store. The icons are already in
  `public/brand/`. This is the cheapest way to make it feel like an app.
- **App stores:** Capacitor can wrap the same Angular code as iOS and Android apps. Worth it
  only when store presence is required: it adds store fees, review delays and two more release
  pipelines, and the tool uses no device features.
- **Private sales data:** a tool fed live client data needs sign-in and a backend before
  anything else, because the data can no longer be shipped in a public static site. Plan that
  step before the choice of platform.
