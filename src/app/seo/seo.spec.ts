import { TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { Seo } from './seo';

describe('Seo', () => {
  function content(selector: string): string | null {
    return TestBed.inject(Meta).getTag(selector)?.getAttribute('content') ?? null;
  }

  function canonical(): string | null {
    return document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null;
  }

  const landing = {
    title: 'Weather-adjusted reorder demo · WillaWave',
    description: 'Replay a real Omaha season against two flea and tick ordering plans.',
    path: '/',
    index: true,
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    document.head.querySelector('link[rel="canonical"]')?.remove();
    for (const tag of document.head.querySelectorAll('meta[name], meta[property]')) {
      if (tag.getAttribute('charset') === null) tag.remove();
    }
  });

  it('should set the description and Open Graph basics', () => {
    TestBed.inject(Seo).apply(landing);

    expect(content('name="description"')).toBe(landing.description);
    expect(content('property="og:title"')).toBe(landing.title);
    expect(content('property="og:description"')).toBe(landing.description);
    expect(content('property="og:site_name"')).toBe('WillaWave');
    expect(content('property="og:type"')).toBe('website');
  });

  it('should use ABSOLUTE urls for og:image, og:url, and canonical', () => {
    TestBed.inject(Seo).apply(landing);

    // Every scraper resolves a relative og:image against nothing and drops the
    // tag. A relative canonical is ignored the same way. This is the assertion
    // that keeps the OG card working.
    expect(content('property="og:image"')).toBe(
      'https://reorder-demo.willawave.ai/og-1200x630.png',
    );
    expect(content('property="og:url"')).toBe('https://reorder-demo.willawave.ai/');
    expect(canonical()).toBe('https://reorder-demo.willawave.ai/');
  });

  it('should describe the card so a shared link is not a bare image', () => {
    TestBed.inject(Seo).apply(landing);

    expect(content('property="og:image:width"')).toBe('1200');
    expect(content('property="og:image:height"')).toBe('630');
    // The card's chart shows sales, so its description must say they're hypothetical.
    expect(content('property="og:image:alt"')).toContain('hypothetical');
    expect(content('name="twitter:card"')).toBe('summary_large_image');
  });

  it('should mark an indexable page index, follow', () => {
    TestBed.inject(Seo).apply(landing);
    expect(content('name="robots"')).toBe('index, follow');
  });

  it('should mark a non-indexable page noindex, follow', () => {
    TestBed.inject(Seo).apply({ ...landing, path: '/404', index: false });
    expect(content('name="robots"')).toBe('noindex, follow');
    expect(canonical()).toBe('https://reorder-demo.willawave.ai/404');
  });

  it('should never leave noindex behind when the next page is indexable', () => {
    // The one that would quietly delete the site from Google. `robots` is set
    // explicitly in both directions rather than only when suppression is
    // wanted, so a stale noindex cannot survive into the homepage.
    const seo = TestBed.inject(Seo);
    seo.apply({ ...landing, path: '/404', index: false });
    seo.apply(landing);

    expect(content('name="robots"')).toBe('index, follow');
    expect(document.head.querySelectorAll('meta[name="robots"]').length).toBe(1);
  });

  it('should give the browser chrome a color for each theme', () => {
    TestBed.inject(Seo).apply(landing);
    const themeColors = [...document.head.querySelectorAll('meta[name="theme-color"]')].map(
      (tag) => [tag.getAttribute('media'), tag.getAttribute('content')],
    );
    expect(themeColors).toEqual([
      ['(prefers-color-scheme: light)', '#ffffff'],
      ['(prefers-color-scheme: dark)', '#121212'],
    ]);
  });

  it('should reuse one canonical link rather than appending another', () => {
    const seo = TestBed.inject(Seo);
    seo.apply(landing);
    seo.apply({ ...landing, path: '/404', index: false });

    expect(document.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
    expect(canonical()).toBe('https://reorder-demo.willawave.ai/404');
  });
});
