/*
 * The seasonal baseline: expected units per season week before weather, for
 * one hypothetical flea/tick SKU.
 *
 * HYPOTHETICAL. The shape follows a typical flea/tick season (rising from
 * March, peaking June–July, tapering through October) and the scale is a
 * round 100 units at peak, chosen for readability. It is not taken from any
 * real orders or sales.
 *
 * One value per season week, in season order (see SEASON_WEEKS in weather.ts).
 */
// prettier-ignore
export const BASELINE: readonly number[] = [
  15, 20, 30, 40,           // Mar
  50, 60, 65, 75, 80,       // Apr
  85, 90, 95, 95,           // May
  100, 100, 100, 100, 100,  // Jun
  100, 100, 95, 95,         // Jul
  90, 85, 80, 75, 70,       // Aug
  60, 50, 45, 40,           // Sep
  30, 25, 20, 15,           // Oct
];
