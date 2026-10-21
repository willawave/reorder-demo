import { TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { NotFound } from './not-found';

/*
 * Value: protects=the 404 page offers a way back and stays out of search;
 * fails_when=the home link or the noindex tag is dropped; why_new=new route;
 * seam=none; no_claim=the real HTTP 404 status (verify-build checks 404.html)
 */
describe('NotFound', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFound],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should offer a route back to the demo', async () => {
    const fixture = TestBed.createComponent(NotFound);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Page not found');
    const back = compiled.querySelector<HTMLAnchorElement>('main a[href="/"]');
    expect(back?.textContent).toContain('reorder demo');
  });

  it('should be where an unknown in-app path lands', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/no-such-page');
    expect(TestBed.inject(Router).url).toBe('/404');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'Page not found',
    );
  });

  it('should keep itself out of search results', async () => {
    const fixture = TestBed.createComponent(NotFound);
    await fixture.whenStable();
    expect(TestBed.inject(Meta).getTag('name="robots"')?.getAttribute('content')).toBe(
      'noindex, follow',
    );
  });
});
