import { defineConfig } from 'vitest/config';

/*
 * Coverage gate for `pnpm test:coverage` (CI runs it). Loaded by the Angular
 * unit-test builder through `runnerConfig: true` in angular.json.
 *
 * The builder's own coverageThresholds option is global only; per-folder
 * thresholds for the model need this file. See CLAUDE.md, "Testing & coverage".
 * Never lower a threshold to make a run pass.
 */
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
      thresholds: {
        lines: 80,
        statements: 80,
        branches: 80,
        functions: 80,
        // Critical business logic: the numbers the page states as results.
        'src/app/model/**': {
          lines: 95,
          statements: 95,
          branches: 90,
          functions: 100,
        },
      },
    },
  },
});
