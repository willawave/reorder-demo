import { Component, computed, input } from '@angular/core';
import { Field } from '@angular/forms/signals';

/*
 * A labelled native range input with its value shown in an <output>.
 *
 * Native, so keyboard (arrows, Home/End, Page Up/Down) and screen-reader
 * behaviour come from the browser. aria-valuetext announces the formatted
 * value ("2 weeks", "+30%") instead of the bare number.
 *
 * Bound by hand to the Signal Forms field rather than with [formField]: the
 * directive sets the value only as a DOM property, so the prerendered HTML has
 * no value attribute and every thumb sits at its midpoint until hydration.
 * Angular forbids [attr.value] next to [formField] (NG8022). The field, its
 * schema and its validity are unchanged; only the DOM binding is manual.
 */
@Component({
  selector: 'app-slider',
  template: `
    <div class="flex items-baseline justify-between gap-4">
      <label [for]="controlId()" class="font-medium">{{ label() }}</label>
      <output [attr.for]="controlId()" class="font-semibold tabular-nums">{{ display() }}</output>
    </div>
    <input
      type="range"
      class="w-full accent-brand-fill"
      [id]="controlId()"
      [attr.min]="min()"
      [attr.max]="max()"
      [attr.step]="step()"
      [attr.value]="value()"
      [value]="value()"
      [attr.aria-valuetext]="display()"
      [attr.aria-describedby]="hint() ? controlId() + '-hint' : null"
      (input)="update($event)"
    />
    @if (hint()) {
      <p [id]="controlId() + '-hint'" class="text-sm text-ink-muted">{{ hint() }}</p>
    }
  `,
  host: { class: 'flex flex-col gap-1' },
})
export class Slider {
  readonly field = input.required<Field<number>>();
  readonly controlId = input.required<string>();
  readonly label = input.required<string>();
  readonly min = input.required<number>();
  readonly max = input.required<number>();
  readonly step = input(1);
  readonly format = input<(value: number) => string>(String);
  readonly hint = input<string>();

  protected readonly value = computed(() => this.field()().value());
  protected readonly display = computed(() => this.format()(this.value()));

  protected update(event: Event): void {
    // A range input's value is always a valid number string, clamped to min/max.
    this.field()().value.set(Number((event.target as HTMLInputElement).value));
  }
}
