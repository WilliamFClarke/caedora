import { expect, test } from '@playwright/test'
import { conceptTitle, createBrowserVault, editorBody } from './helpers'

test('a concept can be marked as a draft and reviewed, and both survive a reload', async ({ page }) => {
  await createBrowserVault(page, 'Trust vault')
  const main = page.getByRole('main')

  await main.getByRole('button', { name: 'Details' }).click()
  await expect(main.getByLabel('Trust tier')).toHaveText('Unverified')

  await main.getByLabel('Status').selectOption('draft')
  await expect(main.getByLabel('Lifecycle').getByText('Draft', { exact: true })).toBeVisible()

  await main.getByRole('button', { name: 'Mark as reviewed' }).click()
  await expect(main.getByLabel('Trust tier')).toHaveText('Human reviewed')
  await expect(main.getByText(/Last confirmed/)).toBeVisible()
  await expect(main.getByText('Saved', { exact: true })).toBeVisible()

  await page.reload()
  await expect(conceptTitle(page)).toHaveValue('Welcome to Caedora')
  await expect(main.getByLabel('Lifecycle').getByText('Draft', { exact: true })).toBeVisible()
  await main.getByRole('button', { name: 'Details' }).click()
  await expect(main.getByLabel('Status')).toHaveValue('draft')
  await expect(main.getByLabel('Trust tier')).toHaveText('Human reviewed')
})

test('editing a concept records the person as its author', async ({ page }) => {
  await createBrowserVault(page, 'Author vault')
  const main = page.getByRole('main')

  await main.getByRole('button', { name: 'Details' }).click()
  await expect(main.getByLabel('Written by')).toHaveValue('caedora/app')

  await editorBody(page).click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type('A note of my own.')
  await expect(main.getByLabel('Written by')).toHaveValue('human:owner')
  await expect(main.getByLabel('Last meaningful change')).toHaveValue(/^\d{4}-\d{2}-\d{2}T.*Z$/)
  await expect(main.getByText('Saved', { exact: true })).toBeVisible()

  await page.reload()
  await main.getByRole('button', { name: 'Details' }).click()
  await expect(main.getByLabel('Written by')).toHaveValue('human:owner')
})

test('a concept past its stale after date is flagged as stale', async ({ page }) => {
  await createBrowserVault(page, 'Stale vault')
  const main = page.getByRole('main')

  await main.getByRole('button', { name: 'Details' }).click()
  await main.getByLabel('Stale after').fill('2020-01-01T00:00:00Z')
  await expect(main.getByLabel('Lifecycle').getByText('Stale', { exact: true })).toBeVisible()
})
