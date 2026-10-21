/*
 * Single-source site constants.
 *
 * SITE_ORIGIN must stay absolute wherever it is used: scrapers ignore a
 * relative og:image or canonical (Facebook, Slack, LinkedIn and X resolve them
 * against nothing and drop the tag). It is the planned custom domain; the
 * reorder-demo.web.app URL also serves the site but is never canonical.
 */
export const SITE_ORIGIN = 'https://reorder-demo.willawave.ai';

export const BOOKING_URL = 'https://cal.com/willawave/intro';

/** The demo's Open Graph card. Its source and render steps are in brand/og-card.html. */
export const OG_IMAGE = {
  url: `${SITE_ORIGIN}/og-1200x630.png`,
  width: '1200',
  height: '630',
  alt:
    'Would the weather have changed your flea and tick order? The usual flea and tick season ' +
    "against 2012's hypothetical demand, which came early after a warm March.",
} as const;
