import { expect, type Page } from '@playwright/test'

/**
 * Creates a fresh browser vault from the landing page and waits until the
 * welcome concept is open. Each test gets its own browser context, so vaults
 * never leak between tests.
 */
export async function createBrowserVault(page: Page, name: string) {
  await page.goto('/')
  await page.getByRole('button', { name: /Start now/i }).first().click()
  await page.getByLabel('Vault name').fill(name)
  await page.getByRole('button', { name: /Create browser vault/i }).click()
  await expect(page).toHaveURL(/\/vault\/welcome\.md$/, { timeout: 30_000 })
  await expect(conceptTitle(page)).toHaveValue('Welcome to Caedora')
}

export function conceptTitle(page: Page) {
  return page.getByRole('main').getByRole('textbox', { name: 'Concept title' })
}

export function editorBody(page: Page) {
  return page.getByRole('main').locator('.ProseMirror')
}

export function sidebarConcept(page: Page, title: string) {
  return page.getByRole('listitem').getByRole('button', { name: title, exact: true })
}
