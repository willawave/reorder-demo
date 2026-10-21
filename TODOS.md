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
- [x] **Page chrome, ported from willawave-ai.** The theme toggle, brand icons and the header
      wordmark, SEO tags with `robots.txt` and `sitemap.xml`, and a 404 route served as
      `404.html`.
- [ ] **DNS for `reorder-demo.willawave.ai` at Namecheap.** The canonical link, `og:url`,
      `og:image` and the sitemap all point there. Until the records and the certificate are
      live, a shared link's preview image and the canonical URL don't resolve. Add the records
      Firebase shows when the custom domain is added to the `reorder-demo` Hosting site.
- [ ] **A demo-specific Open Graph card before the 11/09 article.** The page currently reuses
      WillaWave's `og-1200x630.png`. A card showing the demo itself would make the LinkedIn
      preview more specific.
- [ ] **Radio buttons render as 44px circles.** The global touch-target rule in `styles.css`
      sizes them. The label is already the large click target, so the circle could shrink
      to normal size. This needs a decision on how the target-size test treats a radio inside
      a label.
