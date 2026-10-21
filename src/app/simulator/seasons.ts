/*
 * The three replayable seasons. Every weather fact in a note was checked
 * against NOAA daily summaries for USW00014942 on 2026-10-21. The sales the
 * page shows for any season are hypothetical; only the weather is real.
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
    title: 'A cool, wet summer',
    note:
      'Only 21 days reached 90 °F, against a typical 30. The cool spells came and went, ' +
      'so reacting to them is not always a win.',
  },
  {
    year: 2024,
    title: 'A warm fall',
    note: 'Omaha hit 96 °F on October 5. The season ran late into October.',
  },
];

export const DEFAULT_SEASON: Season = SEASONS[0];
