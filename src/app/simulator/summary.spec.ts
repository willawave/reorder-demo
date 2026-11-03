import { PlanResult, SimResult } from '../model/reorder';
import { comparisonSentence, formatDollars, summaryRows, weekLabel, weekLines } from './summary';

const plan = (overrides: Partial<PlanResult> = {}): PlanResult => ({
  weeks: [],
  unitsOrdered: 0,
  cashCommitted: 0,
  weeksShort: 0,
  unitsShort: 0,
  excessUnits: 0,
  excessValue: 0,
  ...overrides,
});

/*
 * Value: protects=the sentence a visitor reads first says the right thing in
 * every case; fails_when=a direction (more/less, more/fewer) flips, a plural
 * breaks, or a tie reads as a difference; why_new=new page copy; seam=none
 */
describe('comparisonSentence', () => {
  // Weekly orders decide whether the plans match, so each case spells them.
  const orders = (...ordered: number[]): PlanResult['weeks'] =>
    ordered.map((units) => ({
      arrived: 0,
      demand: 0,
      sold: 0,
      short: 0,
      ordered: units,
      cash: 0,
      onHandEnd: 0,
    }));
  const same = orders(40, 60);
  const other = orders(40, 70);

  const cases: [
    name: string,
    normal: PlanResult,
    adjusted: PlanResult,
    assumedSensitivity: number,
    expected: string,
  ][] = [
    [
      // 2012 at a 0% estimate: the case a visitor found confusing.
      'the same orders at a 0% estimate, both short',
      plan({ weeks: same, weeksShort: 6, unitsShort: 76 }),
      plan({ weeks: same, weeksShort: 6, unitsShort: 76 }),
      0,
      "At a 0% buyer's estimate the weather-adjusted plan ignores the weather. Both plans placed the same orders, so each ran short in 6 weeks, losing 76 sales.",
    ],
    [
      'the same orders at a 0% estimate, neither short',
      plan({ weeks: same }),
      plan({ weeks: same }),
      0,
      "At a 0% buyer's estimate the weather-adjusted plan ignores the weather. Both plans placed the same orders, and neither ran short.",
    ],
    [
      // A nonzero estimate can still round to the same orders; no reason is claimed then.
      'the same orders at a nonzero estimate',
      plan({ weeks: same, weeksShort: 1, unitsShort: 1 }),
      plan({ weeks: same, weeksShort: 1, unitsShort: 1 }),
      0.1,
      'Both plans placed the same orders, so each ran short in 1 week, losing 1 sale.',
    ],
    [
      'different orders, neither short, equal totals',
      plan({ weeks: same }),
      plan({ weeks: other }),
      0.3,
      'Neither plan ran short. The weather-adjusted plan committed the same cash and ended the season with the same stock left over.',
    ],
    [
      // The 2024 case: equal weeks, very different lost sales.
      'the same weeks short but different lost sales',
      plan({ weeks: same, weeksShort: 1, unitsShort: 13 }),
      plan({ weeks: other, weeksShort: 1, unitsShort: 2 }),
      0.3,
      'The normal plan ran short in 1 week, losing 13 sales; the weather-adjusted plan ran short in 1 week, losing 2 sales. The weather-adjusted plan committed the same cash and ended the season with the same stock left over.',
    ],
    [
      'only the normal plan short, adjusted spends more and keeps more',
      plan({ weeks: same, weeksShort: 7, unitsShort: 217, cashCommitted: 60_000, excessUnits: 10 }),
      plan({ weeks: other, cashCommitted: 62_100, excessUnits: 11 }),
      0.3,
      'The normal plan ran short in 7 weeks, losing 217 sales; the weather-adjusted plan never ran short. The weather-adjusted plan committed $2,100 more cash and ended the season with 1 unit more left over.',
    ],
    [
      'only the adjusted plan short, adjusted spends less and keeps less',
      plan({ weeks: same, cashCommitted: 51_625, excessUnits: 7 }),
      plan({ weeks: other, weeksShort: 1, unitsShort: 1, cashCommitted: 51_025, excessUnits: 4 }),
      0.3,
      'The normal plan never ran short; the weather-adjusted plan ran short in 1 week, losing 1 sale. The weather-adjusted plan committed $600 less cash and ended the season with 3 units fewer left over.',
    ],
  ];

  for (const [name, normal, adjusted, assumedSensitivity, expected] of cases) {
    it(`should describe ${name}`, () => {
      expect(comparisonSentence(normal, adjusted, assumedSensitivity)).toBe(expected);
    });
  }
});

/*
 * Value: protects=table labels and number formats on the page; fails_when=a
 * date shifts by a time zone, a dollar loses its separator, or a row is
 * dropped; why_new=new page copy; seam=none
 */
describe('formatting', () => {
  const cases: [iso: string, label: string][] = [
    ['2012-03-05', 'Mar 5'],
    ['2024-10-28', 'Oct 28'],
    ['2015-12-31', 'Dec 31'],
    ['2010-01-01', 'Jan 1'],
  ];
  for (const [iso, label] of cases) {
    it(`should label ${iso} as ${label}`, () => {
      expect(weekLabel(iso)).toBe(label);
    });
  }

  it('should format whole dollars with separators', () => {
    expect(formatDollars(68_625)).toBe('$68,625');
    expect(formatDollars(0)).toBe('$0');
  });

  const result: SimResult = {
    demand: [12, 1_500],
    normal: plan({
      weeks: [
        { arrived: 0, demand: 12, sold: 12, short: 0, ordered: 40, cash: 1_000, onHandEnd: 0 },
        { arrived: 0, demand: 1_500, sold: 0, short: 1_500, ordered: 0, cash: 0, onHandEnd: 0 },
      ],
      unitsOrdered: 40,
      cashCommitted: 1_000,
      weeksShort: 1,
      unitsShort: 1_500,
      excessUnits: 1,
      excessValue: 25,
    }),
    adjusted: plan({
      weeks: [
        { arrived: 0, demand: 12, sold: 12, short: 0, ordered: 2_000, cash: 50_000, onHandEnd: 0 },
        { arrived: 0, demand: 1_500, sold: 1_500, short: 0, ordered: 0, cash: 0, onHandEnd: 0 },
      ],
      unitsOrdered: 2_000,
      cashCommitted: 50_000,
      excessUnits: 488,
      excessValue: 12_200,
    }),
  };

  it('should build the season-totals rows', () => {
    expect(summaryRows(result)).toEqual([
      { label: 'Units ordered', normal: '40', adjusted: '2,000' },
      { label: 'Cash committed', normal: '$1,000', adjusted: '$50,000' },
      { label: 'Weeks with unmet demand', normal: '1', adjusted: '0' },
      { label: 'Units short (lost sales)', normal: '1,500', adjusted: '0' },
      { label: 'Left over at season end', normal: '1 unit, $25', adjusted: '488 units, $12,200' },
    ]);
  });

  it('should build one cash-table line per week', () => {
    expect(weekLines(result, ['2012-03-05', '2012-03-12'])).toEqual([
      {
        week: 'Mar 5',
        demand: '12',
        normalOrdered: '40',
        normalCash: '$1,000',
        adjustedOrdered: '2,000',
        adjustedCash: '$50,000',
      },
      {
        week: 'Mar 12',
        demand: '1,500',
        normalOrdered: '0',
        normalCash: '$0',
        adjustedOrdered: '0',
        adjustedCash: '$0',
      },
    ]);
  });
});
