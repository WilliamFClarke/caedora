import { test, expect } from '@playwright/test'

test('landing page loads with hero heading', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toContainText('Your life')
})

test('connect page shows GitHub option', async ({ page }) => {
  await page.goto('/connect')
  await expect(page.locator('h1')).toContainText('Connect your vault')
  await expect(page.getByRole('link', { name: /Continue with GitHub/i })).toBeVisible()
})

test('vault page redirects to connect when not authenticated', async ({ page }) => {
  await page.goto('/vault')
  await page.waitForURL('**/connect')
  await expect(page).toHaveURL(/\/connect/)
})
