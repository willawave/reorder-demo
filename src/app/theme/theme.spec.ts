import { TestBed } from '@angular/core/testing';
import { Theme } from './theme';

describe('Theme', () => {
  const root = document.documentElement;
  let matchMedia: typeof window.matchMedia | undefined;

  /** jsdom does not implement matchMedia, so every case states the OS itself. */
  function osPrefers(scheme: 'light' | 'dark'): void {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (query: string) => ({ matches: scheme === 'dark' && query.includes('dark') }),
    });
  }

  beforeEach(() => {
    matchMedia = window.matchMedia;
    root.removeAttribute('data-theme');
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: matchMedia,
    });
    root.removeAttribute('data-theme');
    localStorage.clear();
  });

  it('should follow the OS until something is stored', () => {
    osPrefers('light');
    expect(TestBed.inject(Theme).override()).toBeNull();
    expect(root.getAttribute('data-theme')).toBeNull();
  });

  it('should store an override when toggling away from the OS theme', () => {
    osPrefers('light');
    TestBed.inject(Theme).toggle();

    expect(root.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('ww-theme')).toBe('dark');
  });

  it('should clear the override when toggling back onto the OS theme', () => {
    osPrefers('light');
    const theme = TestBed.inject(Theme);

    theme.toggle();
    theme.toggle();

    // The visitor sees light either way, but the page is following the OS
    // again rather than pinned to light -- so it still goes dark at night.
    expect(theme.override()).toBeNull();
    expect(root.getAttribute('data-theme')).toBeNull();
    expect(localStorage.getItem('ww-theme')).toBeNull();
  });

  it('should mirror that behaviour on a dark OS', () => {
    osPrefers('dark');
    const theme = TestBed.inject(Theme);

    theme.toggle();
    expect(root.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('ww-theme')).toBe('light');

    theme.toggle();
    expect(root.getAttribute('data-theme')).toBeNull();
    expect(localStorage.getItem('ww-theme')).toBeNull();
  });

  it('should adopt what the inline head script already stamped', () => {
    // The DOM is authoritative on startup: index.html resolves storage before
    // first paint, so the service must not disagree with the rendered page.
    osPrefers('light');
    root.setAttribute('data-theme', 'dark');
    expect(TestBed.inject(Theme).override()).toBe('dark');
  });

  it('should toggle out of a stored choice that matches the OS', () => {
    // Reachable from an older build that stored the OS-matching value.
    osPrefers('dark');
    root.setAttribute('data-theme', 'dark');

    TestBed.inject(Theme).toggle();
    expect(root.getAttribute('data-theme')).toBe('light');
  });

  it('should survive a browser with no matchMedia', () => {
    // The prerender DOM has none. A throw here would take the whole build down.
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    const theme = TestBed.inject(Theme);
    expect(() => theme.toggle()).not.toThrow();
    expect(root.getAttribute('data-theme')).toBe('dark');
  });

  it('should still toggle when localStorage throws', () => {
    // Safari private mode and blocked site data throw on ACCESS rather than
    // returning null. A failed write must cost persistence, not the feature.
    osPrefers('light');
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException('denied');
    };
    try {
      TestBed.inject(Theme).toggle();
      expect(root.getAttribute('data-theme')).toBe('dark');
    } finally {
      Storage.prototype.setItem = setItem;
    }
  });
});
