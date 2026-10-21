import { Component, computed, input } from '@angular/core';
import { SimResult } from '../model/reorder';
import { weekLines } from './summary';

/*
 * Cash committed by week. The wrapper scrolls sideways on a phone, so it is a
 * focusable, labelled region: keyboard users can scroll it, and AXE's
 * scrollable-region-focusable rule passes.
 */
@Component({
  selector: 'app-cash-table',
  template: `
    <div
      class="overflow-x-auto rounded-md border border-line"
      role="region"
      aria-labelledby="cash-table-caption"
      tabindex="0"
    >
      <table class="w-full min-w-[40rem] border-collapse text-left text-sm">
        <caption id="cash-table-caption" class="p-3 text-left font-semibold">
          Week by week: demand, units ordered and cash committed
        </caption>
        <thead>
          <tr class="border-b border-line bg-surface-raised">
            <th scope="col" class="p-2">Week of</th>
            <th scope="col" class="p-2 text-right">Demand</th>
            <th scope="col" class="p-2 text-right">Normal: ordered</th>
            <th scope="col" class="p-2 text-right">Normal: cash</th>
            <th scope="col" class="p-2 text-right">Adjusted: ordered</th>
            <th scope="col" class="p-2 text-right">Adjusted: cash</th>
          </tr>
        </thead>
        <tbody>
          @for (line of lines(); track line.week) {
            <tr class="border-b border-divider">
              <th scope="row" class="p-2 font-normal">{{ line.week }}</th>
              <td class="p-2 text-right tabular-nums">{{ line.demand }}</td>
              <td class="p-2 text-right tabular-nums">{{ line.normalOrdered }}</td>
              <td class="p-2 text-right tabular-nums">{{ line.normalCash }}</td>
              <td class="p-2 text-right tabular-nums">{{ line.adjustedOrdered }}</td>
              <td class="p-2 text-right tabular-nums">{{ line.adjustedCash }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class CashTable {
  readonly result = input.required<SimResult>();
  readonly mondays = input.required<readonly string[]>();

  protected readonly lines = computed(() => weekLines(this.result(), this.mondays()));
}
