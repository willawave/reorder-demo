import { Component, input, model } from '@angular/core';
import { Season } from './seasons';

/** Native radio group: arrow keys move between seasons, as a visitor expects. */
@Component({
  selector: 'app-season-picker',
  template: `
    <fieldset>
      <legend class="mb-3 text-lg font-semibold">Pick a season to replay</legend>
      <div class="grid gap-3 sm:grid-cols-3">
        @for (season of seasons(); track season.year) {
          <label
            class="flex cursor-pointer gap-3 rounded-md border border-line bg-surface-raised p-3 has-[:checked]:border-brand has-[:checked]:bg-surface-elevated"
          >
            <input
              type="radio"
              name="season"
              class="accent-brand-fill"
              [value]="season.year"
              [checked]="season === selected()"
              (change)="selected.set(season)"
            />
            <span>
              <span class="block font-semibold">{{ season.year }}: {{ season.title }}</span>
              <span class="block text-sm text-ink-muted">{{ season.note }}</span>
            </span>
          </label>
        }
      </div>
    </fieldset>
  `,
})
export class SeasonPicker {
  readonly seasons = input.required<readonly Season[]>();
  readonly selected = model.required<Season>();
}
