# Why classic Hosting, not App Hosting

Decided 2026-10-21. The demo deploys as a second **Firebase Hosting** site, `reorder-demo` in
`willawave-prod`, not as an App Hosting backend.

## The short version

The demo is a fully static, prerendered site (`outputMode: "static"`). Classic Hosting serves
those files straight from its CDN. App Hosting would put a Node server in front of the same
files, and the demo has nothing for a server to do.

## What "CDN" means here

Both products use a CDN, so the CDN alone does not separate them. What differs is what sits
behind the CDN:

|                       | Classic Hosting                                                                  | App Hosting                                                                                |
| --------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Origin behind the CDN | The uploaded files                                                               | A Node server on Cloud Run. For a static Angular build, the adapter generates that server. |
| Cache miss            | Served from Hosting storage                                                      | Starts or wakes a Cloud Run instance, so the visitor can hit a cold start                  |
| Cost at demo traffic  | The free tier covers it                                                          | Cloud Run, Cloud Build and Artifact Registry usage                                         |
| Angular 22            | Not relevant, since Hosting serves plain files                                   | Support depends on the adapter. It is likely still "preview".                              |
| Deploy                | `pnpm release:hosting`: guard, build, deploy, byte-check the live site, then tag | Rollout on each push to the live branch. The release script would need a rewrite.          |

A static demo linked from an article gets bursty traffic from first-time visitors. Edge-served
files with no cold start fit that traffic best.

## What App Hosting would have bought

- **Isolation.** A separate backend can't overwrite willawave.ai. Classic Hosting shares the
  `willawave-prod` project, and its default site _is_ willawave.ai. A `firebase.json` without
  `"site"` would deploy over it. `scripts/hosting-site.mjs` guards against that: `verify:build`
  (in CI) and `release:hosting` both run the check, and the deploy targets
  `--only hosting:reorder-demo`.
- **Server code later.** If the demo ever needs live data at request time, App Hosting becomes
  the better fit. The NOAA data is fetched by a build-time script, so it doesn't need a server.

## When to revisit

Revisit this if the demo needs server-side rendering per request, an API route, or secrets at
runtime.
