import { test, expect } from '@playwright/test'

test('home shows the product landing with primary CTAs', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: /Try in browser/i }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Download for/i }).first()).toBeVisible()
})

test('Try in browser opens the connect dialog with Local and GitHub options', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Try in browser/i }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('tab', { name: /On this computer/i })).toBeVisible()
  await expect(page.getByRole('tab', { name: /GitHub/i })).toBeVisible()
})

test('Download page lists all platforms', async ({ page }) => {
  await page.goto('/download')
  await expect(page.getByText('macOS', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Windows', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Linux', { exact: true }).first()).toBeVisible()
})

test('vault page redirects home when no vault connected', async ({ page }) => {
  await page.goto('/vault')
  await page.waitForURL('**/')
  await expect(page).toHaveURL(/\/$/)
})
