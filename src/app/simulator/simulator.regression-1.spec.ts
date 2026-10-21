import { TestBed } from '@angular/core/testing';
import { Simulator } from './simulator';

// Regression: ISSUE-001 — retained result relabelled with a newly picked season
// Found by /qa on 2026-10-21
// Report: .gstack/qa-reports/qa-report-127-0-0-1-2026-10-21.md

/*
 * Value: protects=results shown while unit cost is invalid stay attributed to
 * the season they were computed for; fails_when=picking a season during an
 * invalid unit cost relabels the retained numbers with the new season's
 * heading and dates; why_new=simulator.spec.ts covers retention and season
 * switching separately, never together; seam=none; no_claim=none beyond protects
 */
describe('Simulator, ISSUE-001', () => {
  it('should keep the retained result labelled with its own season until inputs are valid', async () => {
    const fixture = TestBed.createComponent(Simulator);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const text = (selector: string) => el.querySelector(selector)?.textContent?.trim();
    const firstRow = () => text('app-cash-table tbody tr');
    const row2012 = firstRow();

    const cost = el.querySelector<HTMLInputElement>('#unit-cost')!;
    cost.value = '';
    cost.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    const radio2022 = el.querySelector<HTMLInputElement>('input[value="2022"]')!;
    radio2022.checked = true;
    radio2022.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    // The numbers are still 2012's, so the labels must still say 2012.
    expect(firstRow()).toBe(row2012);
    expect(text('#results-title')).toContain('2012');
    expect(text('app-cash-table tbody tr th')).toBe('Mar 5');

    cost.value = '25';
    cost.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(text('#results-title')).toContain('2022');
    expect(text('app-cash-table tbody tr th')).toBe('Mar 7');
    expect(firstRow()).not.toBe(row2012);
  });
});
