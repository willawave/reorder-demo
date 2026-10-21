# TODOs

## Before the public launch

- [ ] **Rewrite `README.md` for public readers.** It is still the Angular CLI default. Before
      the demo is announced, it should cover:
  - what the demo is, in a few lines;
  - the live link;
  - that the weather is real (NOAA, Omaha) and the sales are hypothetical;
  - a pointer to `docs/model.md`;
  - how to run the app and the tests (`pnpm start`, `pnpm ng test`, `pnpm test:scripts`,
    `pnpm e2e`);
  - how to regenerate the weather data (`pnpm data:noaa`).
- [ ] **Page chrome, ported from willawave-ai.** These were left out of the simulator page PR to
      keep that review focused:
  - the theme toggle, with the inline no-flash resolver in `index.html` (`theme.ts`,
    `theme-toggle.ts`);
  - brand assets, favicons and the header wordmark;
  - SEO: meta description, canonical and Open Graph tags with an absolute `og:image`, plus
    `robots.txt` and `sitemap.xml`;
  - a 404 route, with `postbuild.mjs` copying it to `404.html` and `verify:build` checking it.
- [ ] **Radio buttons render as 44px circles.** The global touch-target rule in `styles.css`
      sizes them. The label is already the large click target, so the circle could shrink
      to normal size. This needs a decision on how the target-size test treats a radio inside
      a label.
