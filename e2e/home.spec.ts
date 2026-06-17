import { test, expect } from '@playwright/test'

test('home shows the product landing with primary CTAs', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { level: 1, name: /Your knowledge, open and entirely yours/i })
  ).toBeVisible()
  await expect(page.getByText('OKF v0.1 workspace with visual linking')).toBeVisible()
  await expect(page.getByRole('button', { name: /Try in browser/i }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Download for/i }).first()).toBeVisible()
})

test('Try in browser opens the connect dialog with Local and GitHub options', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Try in browser/i }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Create a new bundle' })).toBeVisible()
  await expect(page.getByText(/Your OKF concepts live on your own computer/i)).toBeVisible()
  await expect(page.getByRole('tab', { name: /On this computer/i })).toBeVisible()
  await expect(page.getByRole('tab', { name: /GitHub/i })).toBeVisible()
})

test('Download page lists all platforms', async ({ page }) => {
  await page.goto('/download')
  await expect(page.getByText('macOS', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: /Apple Silicon/i })).toHaveAttribute(
    'href',
    'https://github.com/WilliamFClarke/caedora/releases/latest/download/Caedora-macOS-arm64.dmg'
  )
  await expect(page.getByText('Windows', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Linux', { exact: true }).first()).toBeVisible()
})

test('vault page redirects home when no vault connected', async ({ page }) => {
  await page.goto('/vault')
  await page.waitForURL('**/')
  await expect(page).toHaveURL(/\/$/)
})
