import { Component, computed, input } from '@angular/core';
import { SimResult } from '../model/reorder';
import { comparisonSentence, summaryRows } from './summary';

@Component({
  selector: 'app-plan-comparison',
  template: `
    <p class="mb-4 text-lg" aria-live="polite">{{ sentence() }}</p>
    <table class="w-full border-collapse text-left">
      <caption class="mb-2 text-left font-semibold">
        Season totals for both plans
      </caption>
      <thead>
        <tr class="border-b border-line">
          <th scope="col" class="py-2 pr-4">Outcome</th>
          <th scope="col" class="py-2 pr-4 text-right">Normal plan</th>
          <th scope="col" class="py-2 text-right">Weather-adjusted plan</th>
        </tr>
      </thead>
      <tbody>
        @for (row of rows(); track row.label) {
          <tr class="border-b border-divider">
            <th scope="row" class="py-2 pr-4 font-normal">{{ row.label }}</th>
            <td class="py-2 pr-4 text-right tabular-nums">{{ row.normal }}</td>
            <td class="py-2 text-right tabular-nums">{{ row.adjusted }}</td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class PlanComparison {
  readonly result = input.required<SimResult>();

  protected readonly rows = computed(() => summaryRows(this.result()));
  protected readonly sentence = computed(() =>
    comparisonSentence(this.result().normal, this.result().adjusted),
  );
}
