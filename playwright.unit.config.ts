import { defineConfig } from '@playwright/test'

// Pure logic tests that need no browser or server. They use the Playwright
// runner for its TypeScript and path alias support, so there is one test API.
export default defineConfig({
  testDir: './tests/unit',
  testMatch: '**/*.test.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
})
