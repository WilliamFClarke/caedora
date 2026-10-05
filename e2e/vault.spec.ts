import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { conceptTitle, createBrowserVault, editorBody, sidebarConcept } from './helpers'

test('a new concept is created, edited and still there after a reload', async ({ page }) => {
  await createBrowserVault(page, 'Editing vault')

  await page.getByRole('button', { name: 'New concept' }).click()
  const dialog = page.getByRole('dialog', { name: 'New concept' })
  await dialog.getByLabel('Concept title').fill('Garden plans')
  await dialog.getByLabel('Description').fill('What to plant this spring.')
  await dialog.getByRole('button', { name: 'Create concept' }).click()
  await expect(dialog).toBeHidden()

  await expect(page).toHaveURL(/\/vault\/garden-plans\.md$/)
  await expect(conceptTitle(page)).toHaveValue('Garden plans')
  await expect(sidebarConcept(page, 'Garden plans')).toBeVisible()

  await editorBody(page).click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type('Plant tomatoes near the fence.')
  await expect(page.getByRole('main').getByText('Saved', { exact: true })).toBeVisible()

  await page.reload()
  await expect(conceptTitle(page)).toHaveValue('Garden plans')
  await expect(editorBody(page)).toContainText('Plant tomatoes near the fence.')
})

test('a concept is renamed and deleted from the sidebar', async ({ page }) => {
  await createBrowserVault(page, 'Tidy vault')

  await page.getByRole('button', { name: 'New concept' }).click()
  const dialog = page.getByRole('dialog', { name: 'New concept' })
  await dialog.getByLabel('Concept title').fill('Scratch')
  await dialog.getByRole('button', { name: 'Create concept' }).click()
  await expect(page).toHaveURL(/\/vault\/scratch\.md$/)

  await sidebarConcept(page, 'Scratch').click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Rename' }).click()
  const renameInput = page.getByRole('listitem').getByRole('textbox')
  await expect(renameInput).toBeFocused()
  await renameInput.fill('Kept notes')
  await renameInput.press('Enter')
  await expect(page).toHaveURL(/\/vault\/kept-notes\.md$/)

  await sidebarConcept(page, 'Scratch').click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await expect(sidebarConcept(page, 'Scratch')).toBeHidden()
  await expect(page).toHaveURL(/\/vault$/)

  await page.reload()
  await expect(sidebarConcept(page, 'Welcome to Caedora').first()).toBeVisible()
  await expect(sidebarConcept(page, 'Scratch')).toBeHidden()
})

test('a concept link in the editor opens the linked concept in the vault', async ({ page }) => {
  await createBrowserVault(page, 'Links vault')

  await editorBody(page).getByRole('link', { name: 'Home Base' }).click()
  await expect(page).toHaveURL(/\/vault\/personal\/home-base\.md$/)
  await expect(conceptTitle(page)).toHaveValue('Home Base')
})

test('Ctrl+K searches note content and opens the matching concept', async ({ page }) => {
  await createBrowserVault(page, 'Search vault')

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
