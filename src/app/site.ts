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

/** WillaWave's Open Graph card, shared with willawave.ai until the demo has its own. */
export const OG_IMAGE = {
  url: `${SITE_ORIGIN}/brand/og-1200x630.png`,
  width: '1200',
  height: '630',
  alt: 'WillaWave — predictive decision tools for weather-exposed operations',
} as const;
