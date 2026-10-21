# TODOs

## Before the public launch

- [x] **Rewrite `README.md` for public readers.** Done 2026-10-21, with a client handoff guide
      in `docs/handoff.md`.
- [x] **Page chrome, ported from willawave-ai.** The theme toggle, brand icons and the header
      wordmark, SEO tags with `robots.txt` and `sitemap.xml`, and a 404 route served as
      `404.html`.
- [x] **DNS for `reorder-demo.willawave.ai` at Namecheap.** Live 2026-10-21; the certificate
      runs to 2027-01-19 and Firebase renews it. `pnpm release:hosting` now byte-checks this
      domain.
- [x] **A demo-specific Open Graph card before the 11/09 article.** `public/og-1200x630.png`,
      rendered from `brand/og-card.html`.
- [ ] **Run LinkedIn Post Inspector on `https://reorder-demo.willawave.ai/` once** (Brad, by
      hand) so LinkedIn caches the new card before the article goes out.
- [x] **Radio buttons render as 44px circles.** Kept as is (Brad, 2026-10-21): the global
      touch-target rule in `styles.css` sizes them and the look is fine. No change.
