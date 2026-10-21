import { expect, test } from '@playwright/test';

/*
 * Value: protects=the theme toggle works and its choice survives a reload with
 * no flash, and the 404 page is reachable, noindex and leads home;
 * fails_when=the toggle stops switching or persisting, the inline resolver
 * stops applying the stored theme before paint, or the 404 page loses its
 * noindex or home link; why_new=new page chrome; seam=none; no_claim=Hosting
 * serving 404.html with a real 404 status (verify:build checks the file, the
 * live check happens at release)
 */

const theme = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.getAttribute('data-theme'));

test.describe('theme toggle', () => {
  for (const os of ['light', 'dark'] as const) {
    test(`switches away from a ${os} OS theme and remembers it across a reload`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ colorScheme: os });
      const page = await context.newPage();
      await page.goto('/');
      await expect(page.locator('#lead-time')).toBeEnabled();
      expect(await theme(page)).toBeNull();

      const other = os === 'light' ? 'dark' : 'light';
      await page.getByRole('button', { name: `Switch to ${other} theme` }).click();
      expect(await theme(page)).toBe(other);

      // The inline resolver stamps the attribute before the app or the
      // stylesheet loads, so the stored choice is there on first paint.
      await page.reload({ waitUntil: 'commit' });
      await page.waitForFunction(() => document.documentElement.hasAttribute('data-theme'));
      expect(await theme(page)).toBe(other);

      // Toggling back to the OS theme clears the override instead of pinning it.
      await expect(page.locator('#lead-time')).toBeEnabled();
      await page.getByRole('button', { name: `Switch to ${os} theme` }).click();
      expect(await theme(page)).toBeNull();
      expect(await page.evaluate(() => localStorage.getItem('ww-theme'))).toBeNull();
      await context.close();
    });
  }

  test('keeps a 44px touch target', async ({ page }) => {
    await page.goto('/');
    const box = await page
      .getByRole('button', { name: /Switch to (dark|light) theme/ })
      .boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  });
});

test.describe('404 page', () => {
  test('says the page is missing, stays out of search, and links home', async ({ page }) => {
    await page.goto('/404');
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
    await page.getByRole('link', { name: 'Go to the reorder demo' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Would the weather');
  });

  test('is published as 404.html for Hosting to serve on unknown paths', async ({ request }) => {
    const response = await request.get('/404.html');
    expect(response.ok()).toBe(true);
    expect(await response.text()).toContain('Page not found');
  });
});
