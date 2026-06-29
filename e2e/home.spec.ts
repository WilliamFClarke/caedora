import { expect, test } from '@playwright/test'

test('landing page renders the main product shell', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { level: 1, name: /Your knowledge,\s*open and entirely yours\./i })
  ).toBeVisible()
  await expect(page.getByRole('link', { name: /^Caedora$/ })).toBeVisible()
  const nav = page.getByRole('navigation')
  await expect(nav.getByRole('link', { name: 'Download' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Pricing' })).toBeVisible()
})

test('start now opens the browser vault dialog', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: /Start now/i }).first().click()

  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Start a new vault' })).toBeVisible()
  await expect(page.getByLabel('Vault name')).toBeVisible()
  await expect(page.getByRole('button', { name: /Create browser vault/i })).toBeVisible()
})

test('account route opens account settings as a modal', async ({ page }) => {
  await page.goto('/account')

  const dialog = page.getByRole('dialog', { name: 'Settings' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('main').getByRole('heading', { level: 2, name: 'Account' })).toBeVisible()
  await expect(dialog.getByRole('tab', { name: 'GitHub' })).toBeVisible()
  await expect(dialog.getByRole('tab', { name: 'Pricing' })).toBeVisible()
})

test('download page links to GitHub Release assets', async ({ page }) => {
  await page.goto('/download')

  await expect(page.getByRole('link', { name: /Apple Silicon/i })).toHaveAttribute(
    'href',
    'https://github.com/WilliamFClarke/caedora/releases/latest/download/Caedora-macOS-arm64.dmg'
  )
  await expect(page.getByRole('link', { name: /Windows installer/i })).toHaveAttribute(
    'href',
    'https://github.com/WilliamFClarke/caedora/releases/latest/download/Caedora-Windows-x64-Setup.exe'
  )
  await expect(page.getByRole('link', { name: /AppImage/i })).toHaveAttribute(
    'href',
    'https://github.com/WilliamFClarke/caedora/releases/latest/download/Caedora-Linux-x64.AppImage'
  )
})
