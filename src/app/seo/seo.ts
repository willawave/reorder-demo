import { DOCUMENT, Service, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { OG_IMAGE, SITE_ORIGIN } from '../site';

export interface PageSeo {
  /** Also the route's `title`; repeated here for og:title and twitter:title. */
  readonly title: string;
  readonly description: string;
  /** Path from the origin, with a leading slash. */
  readonly path: string;
  /** False keeps the page out of search results. */
  readonly index: boolean;
}

/*
 * Per-route metadata, ported from willawave-ai.
 *
 * Called from each route component's constructor so the tags are written during
 * prerender and bake into the static HTML. A scraper never runs the app; if
 * these were applied after hydration they would not exist as far as Facebook,
 * Slack, LinkedIn, or X are concerned.
 */
@Service()
export class Seo {
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  apply(page: PageSeo): void {
    const url = `${SITE_ORIGIN}${page.path}`;

    this.meta.updateTag({ name: 'description', content: page.description });

    // noindex is the single most destructive tag on the page: leaking it onto
    // the homepage would remove the site from Google entirely. It is explicit
    // in both directions rather than "set when needed", so the value is always
    // whatever this route actually intends.
    this.meta.updateTag({
      name: 'robots',
      content: page.index ? 'index, follow' : 'noindex, follow',
    });

    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: 'WillaWave' });
    this.meta.updateTag({ property: 'og:title', content: page.title });
    this.meta.updateTag({ property: 'og:description', content: page.description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: OG_IMAGE.url });
    this.meta.updateTag({ property: 'og:image:width', content: OG_IMAGE.width });
    this.meta.updateTag({ property: 'og:image:height', content: OG_IMAGE.height });
    this.meta.updateTag({ property: 'og:image:alt', content: OG_IMAGE.alt });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: page.title });
    this.meta.updateTag({ name: 'twitter:description', content: page.description });
    this.meta.updateTag({ name: 'twitter:image', content: OG_IMAGE.url });

    this.setThemeColors();
    this.setCanonical(url);
  }

  /*
   * Two tags, so the browser chrome matches whichever theme is showing. These
   * track the --ww-surface values in styles.css.
   *
   * Not via Meta.updateTag: its selector argument is interpolated as
   * `meta[${selector}]`, so it cannot express two attributes without bracket
   * trickery, and the default selector is `name="theme-color"` alone -- which
   * makes the second call silently overwrite the first, leaving one valid tag
   * where there should be two. A test covers that, because the failure looks
   * like success.
   */
  private setThemeColors(): void {
    for (const [scheme, color] of [
      ['light', '#ffffff'],
      ['dark', '#121212'],
    ] as const) {
      const media = `(prefers-color-scheme: ${scheme})`;
      this.upsertHeadTag('meta', `meta[name="theme-color"][media="${media}"]`, {
        name: 'theme-color',
        media,
        content: color,
      });
    }
  }

  private upsertHeadTag(
    tagName: string,
    selector: string,
    attributes: Record<string, string>,
  ): void {
    const head = this.document.head;
    if (!head) return;

    let element = head.querySelector(selector);
    if (!element) {
      element = this.document.createElement(tagName);
      head.appendChild(element);
    }
    // setAttribute, not property assignment: the prerender DOM is not jsdom and
    // does not implement every convenience property. Reading through one of
    // them (documentElement.dataset) already cost this project an index.html,
    // on a build that reported success and exited 0.
    for (const [name, value] of Object.entries(attributes)) {
      element.setAttribute(name, value);
    }
  }

  private setCanonical(url: string): void {
    this.upsertHeadTag('link', 'link[rel="canonical"]', { rel: 'canonical', href: url });
  }
}
