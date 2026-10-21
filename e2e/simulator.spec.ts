import { expect, test, type Page } from '@playwright/test';

/*
 * Value: protects=the simulator works for a real visitor in a real browser:
 * hydration, keyboard and pointer input, the unit-cost error state, phone
 * layout and the no-JS prerender; fails_when=a control stops driving the
 * results, an error shows NaN or $0 or no message, the page scrolls sideways
 * on a phone, or the static HTML loses the default results; why_new=first
 * interactive page; seam=none; no_claim=the maths (unit tests own it) and
 * screen-reader announcement order
 */

const sentence = (page: Page) => page.locator('app-plan-comparison p');
const totals = (page: Page) => page.locator('app-plan-comparison tbody');
const cashRows = (page: Page) => page.locator('app-cash-table tbody tr');
const results = (page: Page) => page.locator('app-plan-comparison, app-cash-table');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // Hydration is done once the comparison reacts; a fill before that is lost.
  await expect(page.locator('#lead-time')).toBeEnabled();
});

test.describe('happy paths', () => {
  test('opens on 2012 with both plans and a 35-week cash table', async ({ page }) => {
    await expect(page.getByRole('radio', { name: /2012/ })).toBeChecked();
    await expect(page.getByRole('heading', { name: '2012: how the two plans did' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Weather-adjusted plan' })).toBeVisible();
    await expect(cashRows(page)).toHaveCount(35);
    await expect(cashRows(page).first().locator('th')).toHaveText('Mar 5');
  });

  test('replays 2015 and then 2022 when picked', async ({ page }) => {
    const first = await sentence(page).textContent();
    await page.getByRole('radio', { name: /2015/ }).check();
    await expect(page.getByRole('heading', { name: '2015: how the two plans did' })).toBeVisible();
    await expect(cashRows(page).first().locator('th')).toHaveText('Mar 2');
    await expect(sentence(page)).not.toHaveText(first!);

    await page.getByRole('radio', { name: /2022/ }).check();
    await expect(page.getByRole('heading', { name: '2022: how the two plans did' })).toBeVisible();
    await expect(cashRows(page).first().locator('th')).toHaveText('Mar 7');
    // 2022's first fall frost (30 °F on Oct 8) is marked in its week's row, and only there.
    await expect(page.getByText('(first frost)')).toHaveCount(1);
    await expect(cashRows(page).filter({ hasText: '(first frost)' }).locator('th')).toContainText(
      'Oct 3',
    );
  });

  for (const id of [
    'lead-time',
    'moq',
    'starting-inventory',
    'true-sensitivity',
    'assumed-sensitivity',
  ]) {
    test(`moves the ${id} slider with the keyboard`, async ({ page }) => {
      const output = page.locator(`output[for="${id}"]`);
      const before = await output.textContent();
      const tables = await results(page).allTextContents();
      await page.locator(`#${id}`).focus();
      await page.keyboard.press('ArrowRight');
      await expect(output).not.toHaveText(before!);
      await expect(page.locator(`#${id}`)).toHaveAttribute(
        'aria-valuetext',
        (await output.textContent())!,
      );
      expect(await results(page).allTextContents()).not.toEqual(tables);
    });
  }

  test('ends on the question and the booking link', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Would this change your order?' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Book an intro call' })).toHaveAttribute(
      'href',
      'https://cal.com/willawave/intro',
    );
  });
});

test.describe('unit cost errors', () => {
  const cases: [value: string, message: RegExp][] = [
    ['', /Enter a unit cost/],
    ['0', /at least \$1/],
    ['9999', /at most \$500/],
  ];

  for (const [value, message] of cases) {
    test(`explains "${value || 'empty'}" and keeps the last valid result`, async ({ page }) => {
      const cost = page.getByLabel('Unit cost ($)');
      const valid = await totals(page).textContent();

      await cost.fill(value);
      await expect(page.locator('#unit-cost-error')).toHaveText(message);
      await expect(cost).toHaveAttribute('aria-invalid', 'true');
      await expect(cost).toHaveAttribute('aria-describedby', 'unit-cost-error');
      await expect(totals(page)).toHaveText(valid!);
      await expect(results(page).first()).not.toContainText('NaN');

      await cost.fill('10');
      await expect(page.locator('#unit-cost-error')).toHaveCount(0);
      await expect(cost).toHaveAttribute('aria-invalid', 'false');
      await expect(totals(page)).not.toHaveText(valid!);
    });
  }
});

test.describe('edge cases', () => {
  test('makes both plans identical at assumed sensitivity 0', async ({ page }) => {
    await page.locator('#assumed-sensitivity').fill('0');
    await expect(page.locator('output[for="assumed-sensitivity"]')).toHaveText('0%');
    for (const row of await totals(page).locator('tr').all()) {
      const [normal, adjusted] = await row.locator('td').allTextContents();
      expect(adjusted).toBe(normal);
    }
    await expect(sentence(page)).toContainText('the same cash');
  });

  for (const extreme of ['-0.5', '0.5']) {
    test(`shows no negative or NaN result with both sensitivities at ${extreme} in 2012`, async ({
      page,
    }) => {
      await page.locator('#true-sensitivity').fill(extreme);
      await page.locator('#assumed-sensitivity').fill(extreme);
      const cells = await page
        .locator('app-plan-comparison td, app-cash-table td')
        .allTextContents();
      // 5 totals rows × 2 plans + 35 weeks × 5 columns.
      expect(cells).toHaveLength(185);
      for (const cell of cells) expect(cell).not.toMatch(/NaN|^-|\(\$|−/);
      await expect(sentence(page)).not.toContainText('NaN');
    });
  }

  test('counts late arrivals as left over at the longest lead time', async ({ page }) => {
    await page.locator('#lead-time').fill('6');
    await expect(page.locator('output[for="lead-time"]')).toHaveText('6 weeks');
    const leftOver = totals(page).getByRole('row', { name: /Left over at season end/ });
    // With 6 weeks of lead time, orders placed in the last weeks land after
    // October; they are committed cash, so they must show up as excess.
    await expect(leftOver).not.toContainText(/^Left over at season end0 units/);
    const cells = await leftOver.locator('td').allTextContents();
    expect(cells.some((cell) => !cell.startsWith('0 units'))).toBe(true);
  });
});

test.describe('phone width', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('has no sideways page scroll, scrolls the cash table in place, and keeps 44px targets', async ({
    page,
  }) => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    const region = page.getByRole('region', { name: /Week by week/ });
    const scrolls = await region.evaluate((el) => el.scrollWidth > el.clientWidth);
    expect(scrolls).toBe(true);

    const targets = page.locator('input[type="range"], input[type="radio"], #unit-cost, a');
    for (const target of await targets.all()) {
      // WCAG 2.5.8 exempts a link inside a sentence; every standalone one must be 44px.
      const inSentence = await target.evaluate(
        (el) =>
          el.tagName === 'A' &&
          (el.parentElement?.textContent?.length ?? 0) > (el.textContent?.length ?? 0) + 20,
      );
      if (inSentence) continue;
      const box = await target.boundingBox();
      expect(
        box?.height ?? 0,
        await target.evaluate((el) => el.outerHTML.slice(0, 80)),
      ).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('already shows the 2012 results and slider positions', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(sentence(page)).toContainText('The weather-adjusted plan committed');
    await expect(cashRows(page)).toHaveCount(35);
    await expect(page.locator('#lead-time')).toHaveValue('2');
    await expect(page.locator('#assumed-sensitivity')).toHaveValue('0.3');
    await expect(page.getByLabel('Unit cost ($)')).toHaveValue('25');
  });
});
