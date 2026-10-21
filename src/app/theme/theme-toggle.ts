import { Component, inject } from '@angular/core';
import { Theme } from './theme';

/*
 * Header theme control.
 *
 * Both icons and both labels render unconditionally; CSS shows one, using the
 * same three states as the design tokens. Nothing here binds to a signal, and
 * that is the point.
 *
 * The previous version picked its icon and aria-label from the service, so the
 * prerendered HTML always baked in the "system" branch -- verified: it shipped
 * the auto icon and `aria-label="Switch to light theme"` for every visitor.
 * A returning visitor arrives with data-theme already stamped, so the icon and
 * the accessible name were both briefly wrong until hydration swapped them.
 * Angular raises no error for this. Rendering both and letting CSS choose makes
 * the prerendered markup identical for everyone, so there is nothing to swap.
 *
 * No aria-label: `display: none` content is excluded from the accessible-name
 * computation, so the button's name is exactly the visible span. That keeps the
 * name naming the ACTION rather than the current state, with no JS in the path.
 *
 * The 44x44 touch target comes from the global `button` rule in styles.css.
 */
@Component({
  selector: 'app-theme-toggle',
  template: `
    <button
      type="button"
      class="inline-flex items-center justify-center rounded-md text-ink-muted"
      (click)="theme.toggle()"
    >
      <!-- sun: shown in light, where the action is to go dark -->
      <svg
        class="when-light"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="1.8" />
        <path
          d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        />
      </svg>
      <!-- moon: shown in dark -->
      <svg
        class="when-dark"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M20 13.4A8.2 8.2 0 0 1 10.6 4a8.4 8.4 0 1 0 9.4 9.4Z"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linejoin="round"
        />
      </svg>
      <span class="sr-only when-light">Switch to dark theme</span>
      <span class="sr-only when-dark">Switch to light theme</span>
    </button>
  `,
})
export class ThemeToggle {
  protected readonly theme = inject(Theme);
}
