/*
 * The three replayable seasons, one per rule the model encodes (warmth,
 * cool weather, frost). Every weather fact in a note was checked against NOAA
 * daily summaries for USW00014942 on 2026-10-21. The sales the page shows for
 * any season are hypothetical; only the weather is real.
 */
export interface Season {
  readonly year: number;
  readonly title: string;
  readonly note: string;
}

export const SEASONS: readonly Season[] = [
  {
    year: 2012,
    title: 'An early warm March',
    note: 'Omaha hit 91 °F on March 31. Demand arrived weeks before the usual curve.',
  },
  {
    year: 2015,
    title: 'A cool summer',
    note:
      'Only 21 days reached 90 °F, against a typical 30, and the rain could not make up ' +
      'for the cool. Demand ran under the usual curve.',
  },
  {
    year: 2022,
    title: 'An early frost',
    note:
      'Omaha dropped to 30 °F on October 8, about 11 days before the usual first frost. ' +
      'Demand fell off with weeks of the season left.',
  },
];

export const DEFAULT_SEASON: Season = SEASONS[0];
