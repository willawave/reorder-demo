import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteFooter } from '../chrome/site-footer';
import { SiteHeader } from '../chrome/site-header';
import { Seo } from '../seo/seo';

/*
 * Prerendered to 404/index.html and served as a REAL HTTP 404, ported from
 * willawave-ai. Two things outside this file make that true, and removing
 * either silently turns unknown URLs into the homepage at HTTP 200 (a soft
 * 404, which Google treats as a quality problem):
 *
 *   1. scripts/postbuild.mjs copies 404/index.html up to 404.html, the file
 *      Hosting serves for unmatched paths.
 *   2. firebase.json has NO catch-all rewrite.
 *
 * verify-build.mjs asserts both. The page is noindex: it is a crawlable page
 * whose content is "page not found".
 */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink, SiteFooter, SiteHeader],
  template: `
    <app-site-header />
    <main class="mx-auto flex max-w-page flex-col gap-4 px-4 py-16">
      <h1 class="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p>That link doesn't point anywhere on this site.</p>
      <p>
        <a class="inline-flex min-h-11 items-center text-brand underline" routerLink="/"
          >Go to the reorder demo</a
        >
      </p>
    </main>
    <app-site-footer />
  `,
})
export class NotFound {
  constructor() {
    inject(Seo).apply({
      title: 'Page not found · WillaWave',
      description: 'That link does not point anywhere on the WillaWave reorder demo.',
      path: '/404',
      index: false,
    });
  }
}
