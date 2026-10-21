import { Component } from '@angular/core';
import { ThemeToggle } from '../theme/theme-toggle';

/*
 * Shared header for every route.
 *
 * The W mark is brand/wordmark.svg (the filenames are inverted; see
 * public/brand/README.md). Both variants are in the DOM and styles.css shows
 * one, so an explicit theme choice on the opposite OS theme still gets the
 * right mark; a <picture media> could not see [data-theme]. alt="" because the
 * adjacent text already says WillaWave.
 */
@Component({
  selector: 'app-site-header',
  imports: [ThemeToggle],
  template: `
    <header class="border-b border-divider px-4 py-2">
      <div class="mx-auto flex max-w-page items-center justify-between gap-4">
        <p class="flex items-center gap-2 font-semibold tracking-tight">
          <a class="inline-flex min-h-11 items-center gap-2" href="https://willawave.ai">
            <img class="when-light" src="brand/wordmark.svg" alt="" width="30" height="23" />
            <img class="when-dark" src="brand/wordmark-dark.svg" alt="" width="30" height="23" />
            WillaWave
          </a>
          <span class="font-normal text-ink-muted">· Reorder demo</span>
        </p>
        <app-theme-toggle />
      </div>
    </header>
  `,
})
export class SiteHeader {}
