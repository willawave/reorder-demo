import { DOCUMENT, Service, inject, signal } from '@angular/core';

/** An explicit override. Absent from storage means "follow the OS". */
export type StoredTheme = 'light' | 'dark';

/** Shared with the inline resolver in index.html. Changing one changes both. */
const STORAGE_KEY = 'ww-theme';

/*
 * Theme override, ported from willawave-ai.
 *
 * Two states in the UI, three in the model. The button is a plain light/dark
 * switch, but storage still has an absent state meaning "follow the OS", and
 * toggling TO the theme that already matches the OS CLEARS the key rather than
 * writing it. Without that, one click pins a visitor forever: their machine
 * goes dark at night and the site stays light, with no way back short of
 * clearing site data.
 *
 * The DOM is authoritative on startup, not localStorage. The inline script in
 * index.html has already read storage and stamped data-theme before first
 * paint, so reading the attribute here costs no second storage access and
 * cannot disagree with what is on screen.
 */
@Service()
export class Theme {
  private readonly document = inject(DOCUMENT);

  private readonly stored = signal<StoredTheme | null>(this.readStamped());

  /** The explicit override, or null when following the OS. For tests. */
  readonly override = this.stored.asReadonly();

  toggle(): void {
    const target: StoredTheme = this.resolved() === 'dark' ? 'light' : 'dark';
    // Landing back on the OS's own theme means "stop overriding", not "write
    // the same value" -- that is what keeps following-the-OS reachable without
    // a third button.
    if (target === this.systemTheme()) {
      this.clear();
    } else {
      this.set(target);
    }
  }

  set(theme: StoredTheme): void {
    this.stored.set(theme);
    this.document.documentElement?.setAttribute('data-theme', theme);
    this.persist(theme);
  }

  clear(): void {
    this.stored.set(null);
    // Removing the attribute rather than setting a third value lets the media
    // query in styles.css take over with no extra selector.
    this.document.documentElement?.removeAttribute('data-theme');
    this.persist(null);
  }

  /** What the page is actually showing right now. */
  private resolved(): StoredTheme {
    return this.readStamped() ?? this.systemTheme();
  }

  private systemTheme(): StoredTheme {
    // Optional all the way down: matchMedia is absent in the prerender DOM and
    // in jsdom. Calling toggle() server-side never happens, but a throw here
    // would take the whole prerender down with it -- see readStamped().
    const matches = this.document.defaultView?.matchMedia?.(
      '(prefers-color-scheme: dark)',
    )?.matches;
    return matches ? 'dark' : 'light';
  }

  private readStamped(): StoredTheme | null {
    // getAttribute, not dataset: `documentElement.dataset` is UNDEFINED in the
    // server DOM used for prerendering, and reading through it threw during
    // the build -- which dropped index.html while `ng build` still reported
    // "Prerendered 2 static routes" and exited 0. Attribute methods exist on
    // both DOMs. Do not switch this back to dataset.
    const stamped = this.document.documentElement?.getAttribute('data-theme');
    return stamped === 'light' || stamped === 'dark' ? stamped : null;
  }

  private persist(theme: StoredTheme | null): void {
    // Storage is unavailable during prerender, and ACCESS throws (rather than
    // returning null) in Safari private mode. A failed write must not break the
    // toggle -- the choice simply does not survive the reload.
    try {
      if (theme === null) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, theme);
      }
    } catch {
      /* no persistence available; the in-memory override still applies */
    }
  }
}
