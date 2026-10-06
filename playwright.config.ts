import { defineConfig, devices } from '@playwright/test'

const port = process.env.PLAYWRIGHT_PORT ?? '3100'
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/desktop/**'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One retry so a flake still shows up as "flaky" in the report rather than
  // being hidden, while not failing the run outright.
  retries: process.env.CI ? 1 : 0,
  // Each test gets its own browser context and IndexedDB, so tests are safe to
  // run side by side. GitHub's Linux runners have four cores.
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['github'], ['list'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    channel: process.env.PLAYWRIGHT_CHANNEL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: 'node scripts/run-e2e-server.mjs',
        env: {
          HOSTNAME: '127.0.0.1',
          PORT: port,
        },
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
})
