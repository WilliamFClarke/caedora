import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'

async function createBrowserVault(page: Page, name: string) {
  await page.goto('/')
  await page.getByRole('button', { name: /Start now/i }).first().click()
  await page.getByLabel('Vault name').fill(name)
  await page.getByRole('button', { name: /Create browser vault/i }).click()
  await expect(page).toHaveURL(/\/vault\/welcome\.md$/, { timeout: 30_000 })
}

test('Ctrl+K searches note content and opens the matching concept', async ({ page }) => {
  await createBrowserVault(page, 'Search vault')
  await page.goto('/vault')

  await page.keyboard.press('Control+k')
  const dialog = page.getByRole('dialog', { name: 'Search vault' })
  await expect(dialog).toBeVisible()

  // "portable" only appears in the body of the welcome concept.
  await dialog.getByRole('combobox', { name: 'Search vault' }).fill('portable')
  const result = dialog.getByRole('option', { name: /Welcome to Caedora/ })
  await expect(result).toBeVisible()
  await expect(result.locator('mark')).toHaveText(['portable'])

  await page.keyboard.press('Enter')
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/\/vault\/welcome\.md$/)
})

test('browser vault exports as a zipped OKF folder', async ({ page }) => {
  await createBrowserVault(page, 'Export vault')

  await page.getByRole('button', { name: 'Switch vault' }).click()
  await page.getByRole('menuitem', { name: 'Manage vaults' }).click()
  await page.getByRole('button', { name: 'Options for Export vault' }).click()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Export OKF folder' }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('export-vault.zip')
  const zip = await readFile(await download.path())
  const listing = zip.toString('latin1')
  expect(zip.readUInt32LE(0)).toBe(0x04034b50)
  expect(listing).toContain('export-vault/index.md')
  expect(listing).toContain('export-vault/welcome.md')
  expect(listing).toContain('okf_version')
})
