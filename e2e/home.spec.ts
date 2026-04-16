import { test, expect } from '@playwright/test'

test('home shows Create vault and Open vault buttons', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: /Create vault/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Open vault/i })).toBeVisible()
})

test('Create vault opens a dialog with Local and GitHub options', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Create vault/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('tab', { name: /On this computer/i })).toBeVisible()
  await expect(page.getByRole('tab', { name: /GitHub/i })).toBeVisible()
})

test('vault page redirects home when no vault connected', async ({ page }) => {
  await page.goto('/vault')
  await page.waitForURL('**/')
  await expect(page).toHaveURL(/\/$/)
})
