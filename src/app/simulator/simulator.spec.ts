import { TestBed } from '@angular/core/testing';
import { Simulator } from './simulator';

/*
 * Value: protects=the page wires settings and season into both plans and
 * keeps the last valid result on bad input; fails_when=a control stops
 * driving the comparison, the season picker stops switching the replay, or an
 * empty unit cost renders NaN/$0; why_new=new page; seam=none;
 * no_claim=layout, contrast and real keyboard behaviour (Playwright covers
 * those in e2e/)
 */
describe('Simulator', () => {
  async function render() {
    const fixture = TestBed.createComponent(Simulator);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const text = (selector: string) => el.querySelector(selector)?.textContent?.trim() ?? '';
    const input = (id: string) => el.querySelector<HTMLInputElement>(`#${id}`)!;
    const set = async (id: string, value: string, event = 'input') => {
      input(id).value = value;
      input(id).dispatchEvent(new Event(event));
      await fixture.whenStable();
    };
    const cells = (column: number) =>
      [...el.querySelectorAll('app-plan-comparison tbody tr')].map((row) =>
        row.querySelectorAll('td')[column].textContent?.trim(),
      );
    return { el, text, input, set, cells, stable: () => fixture.whenStable() };
  }

  it('should render the headline, the hypothetical-sales label and the call to action', async () => {
    const { el, text } = await render();
    expect(text('h1')).toContain('Would the weather have changed');
    expect(el.textContent).toContain('Sales are hypothetical');
    expect(el.querySelector('a[href="https://cal.com/willawave/intro"]')).not.toBeNull();
  });

  it('should describe itself for search and link previews, indexable, on the canonical origin', async () => {
    await render();
    const meta = (selector: string) =>
      document.head.querySelector(`meta[${selector}]`)?.getAttribute('content');
    expect(meta('name="description"')).toContain('hypothetical sales');
    expect(meta('name="robots"')).toBe('index, follow');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://reorder-demo.willawave.ai/',
    );
  });

  it('should open on 2012 with its result and 35 weeks in the cash table', async () => {
    const { el, text } = await render();
    expect(el.querySelector<HTMLInputElement>('input[value="2012"]')!.checked).toBe(true);
    expect(text('#results-title')).toContain('2012');
    expect(el.querySelectorAll('app-cash-table tbody tr')).toHaveLength(35);
    expect(text('app-cash-table tbody tr th')).toBe('Mar 5');
  });

  it('should replay another season when one is picked', async () => {
    const { el, text, stable } = await render();
    const before = text('app-plan-comparison p');
    const radio = el.querySelector<HTMLInputElement>('input[value="2024"]')!;
    radio.checked = true;
    radio.dispatchEvent(new Event('change'));
    await stable();
    expect(text('#results-title')).toContain('2024');
    expect(text('app-cash-table tbody tr th')).toBe('Mar 4');
    expect(text('app-plan-comparison p')).not.toBe(before);
  });

  it('should make both plans identical at assumed sensitivity 0', async () => {
    const { set, cells, text } = await render();
    expect(cells(1)).not.toEqual(cells(0));
    await set('assumed-sensitivity', '0');
    expect(text('output[for="assumed-sensitivity"]')).toBe('0.00 per SD');
    expect(cells(1)).toEqual(cells(0));
    expect(text('app-plan-comparison p')).toContain('the same cash');
  });

  it('should show a slider value in its output, formatted', async () => {
    const { el, set } = await render();
    await set('lead-time', '4');
    const output = el.querySelector('output[for="lead-time"]')!;
    expect(output.textContent?.trim()).toBe('4 weeks');
    expect(el.querySelector('#lead-time')!.getAttribute('aria-valuetext')).toBe('4 weeks');
  });

  it('should label every slider and give it an output', async () => {
    const { el } = await render();
    const ranges = [...el.querySelectorAll<HTMLInputElement>('input[type="range"]')];
    expect(ranges).toHaveLength(5);
    for (const range of ranges) {
      expect(el.querySelector(`label[for="${range.id}"]`)).not.toBeNull();
      expect(el.querySelector(`output[for="${range.id}"]`)).not.toBeNull();
    }
  });

  it('should keep the last valid result and explain why while unit cost is invalid', async () => {
    const { el, set, cells, input } = await render();
    const valid = cells(0);

    await set('unit-cost', '');
    expect(input('unit-cost').getAttribute('aria-invalid')).toBe('true');
    expect(input('unit-cost').getAttribute('aria-describedby')).toBe('unit-cost-error');
    expect(el.querySelector('#unit-cost-error')!.textContent).toContain('Enter a unit cost.');
    expect(cells(0)).toEqual(valid);

    await set('unit-cost', '9999');
    expect(el.querySelector('#unit-cost-error')!.textContent).toContain('at most $500');
    expect(cells(0)).toEqual(valid);

    await set('unit-cost', '10');
    expect(el.querySelector('#unit-cost-error')).toBeNull();
    expect(cells(0)).not.toEqual(valid);
  });
});
