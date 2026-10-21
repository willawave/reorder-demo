import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/*
 * Value: protects=the page passes AXE (WCAG 2.1 A/AA) in both themes, also
 * with the unit-cost error showing; fails_when=a contrast, label, landmark or
 * error-state regression lands in either theme;
 * why_new=jsdom has no layout or colour engine, so the unit suite cannot see
 * contrast; seam=none; no_claim=screen-reader announcement order, which no
 * automated check proves
 */
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

for (const theme of ['light', 'dark'] as const) {
  test(`has no AXE violations in the ${theme} theme`, async ({ page }) => {
    await page.goto('/');
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    await expectNoViolations(page);
  });

  test(`has no AXE violations with the unit-cost error showing in the ${theme} theme`, async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('#lead-time')).toBeEnabled();
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    await page.getByLabel('Unit cost ($)').fill('');
    await expect(page.locator('#unit-cost-error')).toBeVisible();
    await expectNoViolations(page);
  });
}

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  // Rule ids and their nodes make a failure readable without a re-run.
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
}
