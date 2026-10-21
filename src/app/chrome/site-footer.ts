import { Component } from '@angular/core';

@Component({
  selector: 'app-site-footer',
  template: `
    <footer class="border-t border-divider px-4 py-8 text-sm text-ink-muted">
      <div class="mx-auto flex max-w-page flex-wrap gap-x-6 gap-y-2">
        <a class="inline-flex min-h-11 items-center" href="https://willawave.ai">willawave.ai</a>
        <a
          class="inline-flex min-h-11 items-center"
          href="https://github.com/willawave/reorder-demo"
          target="_blank"
          rel="noopener"
          >Source on GitHub<span class="sr-only"> (opens in a new tab)</span></a
        >
      </div>
    </footer>
  `,
})
export class SiteFooter {}
