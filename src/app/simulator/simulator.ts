import { Component, inject, linkedSignal, signal } from '@angular/core';
import { form } from '@angular/forms/signals';
import { SiteFooter } from '../chrome/site-footer';
import { SiteHeader } from '../chrome/site-header';
import weather from '../data/omaha-weather.json';
import { Seo } from '../seo/seo';
import { BOOKING_URL } from '../site';
import { BASELINE } from '../model/baseline';
import { SimResult, simulate } from '../model/reorder';
import { seasonMondays, weatherIndex } from '../model/weather';
import { CashTable } from './cash-table';
import { PlanComparison } from './plan-comparison';
import { SeasonPicker } from './season-picker';
import { DEFAULT_SEASON, SEASONS, Season } from './seasons';
import { DEFAULT_SETTINGS, LIMITS, Settings, settingsSchema } from './settings';
import { Slider } from './slider';
import { formatDollars } from './summary';

const sensitivityFormat = (value: number): string =>
  `${value > 0 ? '+' : ''}${value.toFixed(2)} per SD`;

/*
 * The demo page: one season of real Omaha weather replayed against two
 * ordering plans. All state is signals; everything shown is computed from them.
 *
 * The weather JSON is a static import, bundled into this lazy chunk, so the
 * prerendered page already carries the default season's results.
 */
@Component({
  selector: 'app-simulator',
  imports: [CashTable, PlanComparison, SeasonPicker, SiteFooter, SiteHeader, Slider],
  templateUrl: './simulator.html',
})
export class Simulator {
  constructor() {
    // In the constructor, not a lifecycle hook: it must run during prerender so
    // the tags are in the static HTML a link-preview scraper reads.
    inject(Seo).apply({
      title: 'Weather-adjusted reorder demo · WillaWave',
      description:
        'Replay a real Omaha flea and tick season and see when weather-adjusted ordering ' +
        'beats the usual curve. Real NOAA weather, hypothetical sales.',
      path: '/',
      index: true,
    });
  }

  protected readonly bookingUrl = BOOKING_URL;
  protected readonly seasons = SEASONS;
  protected readonly limits = LIMITS;
  protected readonly season = signal(DEFAULT_SEASON);
  protected readonly settings = signal<Settings>({ ...DEFAULT_SETTINGS });
  protected readonly form = form(this.settings, settingsSchema);

  /*
   * Recomputed whenever the inputs are valid. While unit cost is empty or out
   * of range, the last valid result stays on screen instead of NaN or $0, and
   * it keeps the season it was computed for: picking another season meanwhile
   * must not relabel old numbers with the new season's heading and dates.
   */
  protected readonly shown = linkedSignal<
    { valid: boolean; settings: Settings; season: Season },
    { season: Season; mondays: string[]; frostWeek: number | null; result: SimResult }
  >({
    source: () => ({
      valid: this.form().valid(),
      settings: this.settings(),
      season: this.season(),
    }),
    computation: ({ valid, settings, season }, previous) =>
      !valid && previous
        ? previous.value
        : {
            season,
            mondays: seasonMondays(season.year),
            frostWeek: (weather.frostWeek as Record<number, number | null>)[season.year],
            result: simulate({
              ...settings,
              // Valid implies a number here; the form only lets null through as invalid.
              unitCost: Number(settings.unitCost),
              baseline: BASELINE,
              weatherIndex: weatherIndex(weather, season.year),
            }),
          },
  });

  /** Empty or unparseable reads as null, which the schema reports as required. */
  protected setUnitCost(event: Event): void {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    this.form.unitCost().value.set(Number.isNaN(value) ? null : value);
  }

  protected readonly formatWeeks = (value: number): string =>
    `${value} week${value === 1 ? '' : 's'}`;
  protected readonly formatUnitsPlain = (value: number): string => `${value} units`;
  protected readonly sensitivityFormat = sensitivityFormat;
  protected readonly formatDollars = formatDollars;
}
