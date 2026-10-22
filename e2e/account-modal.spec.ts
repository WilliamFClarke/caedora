import { expect, test } from '@playwright/test'
import { createBrowserVault } from './helpers'

test('account opens as a modal over the vault on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await createBrowserVault(page, 'Account modal vault')

  await page.getByRole('button', { name: 'Account', exact: true }).click()

  const dialog = page.getByRole('dialog', { name: 'Account settings' })
  await expect(dialog).toBeVisible()
  await expect(page).toHaveURL(/\/account$/)
  // The app stays mounted behind the modal, so the note is still open underneath.
  await expect(
    page.getByRole('textbox', { name: 'Concept title', includeHidden: true })
  ).toHaveValue('Welcome to Caedora')

  await dialog.getByRole('button', { name: 'GitHub access' }).click()
  await expect(dialog.getByRole('heading', { level: 2, name: 'GitHub access' })).toBeVisible()

  await dialog.getByRole('button', { name: 'Close' }).click()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/\/vault\/welcome\.md$/)
})

test('escape closes the account modal', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await createBrowserVault(page, 'Account escape vault')

  await page.getByRole('button', { name: 'Account', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Account settings' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page).toHaveURL(/\/vault\/welcome\.md$/)
})

test('account page opens full screen on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await createBrowserVault(page, 'Account mobile vault')

  await page.goto('/account')
  await expect(page.getByRole('heading', { level: 1, name: 'Account settings' })).toBeVisible()
})

test('direct account link still renders the full page', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/account')

  await expect(page.getByRole('heading', { level: 1, name: 'Account settings' })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
