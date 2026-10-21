import { PlanResult, SimResult } from '../model/reorder';

/*
 * Turns simulation results into the words and rows the page shows. Pure, so
 * the phrasing of every case is table-tested rather than eyeballed.
 */

const units = new Intl.NumberFormat('en-US');
const dollars = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const formatUnits = (n: number): string => units.format(n);
export const formatDollars = (n: number): string => dollars.format(n);

/** "2012-03-05" -> "Mar 5", without going through a Date or a time zone. */
export function weekLabel(isoDate: string): string {
  const [, month, day] = isoDate.split('-').map(Number);
  return `${MONTHS[month - 1]} ${day}`;
}

function count(n: number, noun: string): string {
  return `${formatUnits(n)} ${noun}${n === 1 ? '' : 's'}`;
}

/** Two plain sentences on how the weather-adjusted plan differed. */
export function comparisonSentence(normal: PlanResult, adjusted: PlanResult): string {
  // Weeks alone can hide the story (1 week short each, but 13 lost sales
  // against 2), so each plan states both.
  const shortfall = (p: PlanResult) =>
    p.weeksShort === 0
      ? 'never ran short'
      : `ran short in ${count(p.weeksShort, 'week')}, losing ${count(p.unitsShort, 'sale')}`;
  const shortage =
    normal.weeksShort === 0 && adjusted.weeksShort === 0
      ? 'Neither plan ran short.'
      : `The normal plan ${shortfall(normal)}; the weather-adjusted plan ${shortfall(adjusted)}.`;

  const cash = adjusted.cashCommitted - normal.cashCommitted;
  const cashPart =
    cash === 0
      ? 'the same cash'
      : `${formatDollars(Math.abs(cash))} ${cash > 0 ? 'more' : 'less'} cash`;
  const excess = adjusted.excessUnits - normal.excessUnits;
  const excessPart =
    excess === 0
      ? 'the same stock left over'
      : `${count(Math.abs(excess), 'unit')} ${excess > 0 ? 'more' : 'fewer'} left over`;

  return `${shortage} The weather-adjusted plan committed ${cashPart} and ended the season with ${excessPart}.`;
}

export interface SummaryRow {
  readonly label: string;
  readonly normal: string;
  readonly adjusted: string;
}

/** The season-totals table, normal plan against weather-adjusted plan. */
export function summaryRows({ normal, adjusted }: SimResult): SummaryRow[] {
  const row = (label: string, value: (p: PlanResult) => string): SummaryRow => ({
    label,
    normal: value(normal),
    adjusted: value(adjusted),
  });
  return [
    row('Units ordered', (p) => formatUnits(p.unitsOrdered)),
    row('Cash committed', (p) => formatDollars(p.cashCommitted)),
    row('Weeks with unmet demand', (p) => formatUnits(p.weeksShort)),
    row('Units short (lost sales)', (p) => formatUnits(p.unitsShort)),
    row(
      'Left over at season end',
      (p) => `${count(p.excessUnits, 'unit')}, ${formatDollars(p.excessValue)}`,
    ),
  ];
}

export interface WeekLine {
  readonly week: string;
  readonly demand: string;
  readonly normalOrdered: string;
  readonly normalCash: string;
  readonly adjustedOrdered: string;
  readonly adjustedCash: string;
}

/** One line per season week for the cash-by-week table. */
export function weekLines(
  { demand, normal, adjusted }: SimResult,
  mondays: readonly string[],
): WeekLine[] {
  return demand.map((units, week) => ({
    week: weekLabel(mondays[week]),
    demand: formatUnits(units),
    normalOrdered: formatUnits(normal.weeks[week].ordered),
    normalCash: formatDollars(normal.weeks[week].cash),
    adjustedOrdered: formatUnits(adjusted.weeks[week].ordered),
    adjustedCash: formatDollars(adjusted.weeks[week].cash),
  }));
}
