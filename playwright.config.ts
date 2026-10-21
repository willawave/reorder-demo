import { defineConfig, devices } from '@playwright/test';

/*
 * End-to-end checks against the BUILT site, served as static files, the way
 * Firebase Hosting serves it. Build first (`pnpm verify:build` or
 * `pnpm build:hosting`); these specs grade dist/reorder-demo/browser, not the
 * dev server.
 */
const port = 4321;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `python3 -m http.server ${port} --bind 127.0.0.1 --directory dist/reorder-demo/browser`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: !process.env['CI'],
    // http.server logs every request to stderr; keep test output readable.
    stderr: 'ignore',
  },
});
