import { max, min, required, schema } from '@angular/forms/signals';

/** The buyer's controls. Everything else the simulation needs is fixed data. */
export interface Settings {
  readonly leadTimeWeeks: number;
  readonly moq: number;
  readonly startingInventory: number;
  readonly trueSensitivity: number;
  readonly assumedSensitivity: number;
  /** Null while the field is empty. */
  readonly unitCost: number | null;
}

/*
 * Defaults chosen so each preset shows its story without touching a slider
 * (weather model v2): in 2012 the normal plan loses 76 sales, 56 of them in
 * March and April, and the adjusted plan none; in 2015 both plans cope with a
 * cool summer; in 2022 the adjusted plan sees the early frost and ends with
 * 14 units left over against 33. premise.spec.ts checks that across all 16
 * seasons the adjusted plan comes out ahead at these values.
 */
export const DEFAULT_SETTINGS: Settings = {
  leadTimeWeeks: 2,
  moq: 0,
  startingInventory: 100,
  trueSensitivity: 0.3,
  assumedSensitivity: 0.3,
  unitCost: 25,
};

export const LIMITS = {
  leadTimeWeeks: { min: 1, max: 6, step: 1 },
  moq: { min: 0, max: 300, step: 25 },
  startingInventory: { min: 0, max: 500, step: 25 },
  sensitivity: { min: -0.5, max: 0.5, step: 0.05 },
  unitCost: { min: 1, max: 500 },
} as const;

export const settingsSchema = schema<Settings>((s) => {
  min(s.leadTimeWeeks, LIMITS.leadTimeWeeks.min);
  max(s.leadTimeWeeks, LIMITS.leadTimeWeeks.max);
  min(s.moq, LIMITS.moq.min);
  max(s.moq, LIMITS.moq.max);
  min(s.startingInventory, LIMITS.startingInventory.min);
  max(s.startingInventory, LIMITS.startingInventory.max);
  for (const sensitivity of [s.trueSensitivity, s.assumedSensitivity]) {
    min(sensitivity, LIMITS.sensitivity.min);
    max(sensitivity, LIMITS.sensitivity.max);
  }
  required(s.unitCost, { message: 'Enter a unit cost.' });
  min(s.unitCost, LIMITS.unitCost.min, { message: 'Unit cost must be at least $1.' });
  max(s.unitCost, LIMITS.unitCost.max, { message: 'Unit cost can be at most $500.' });
});
