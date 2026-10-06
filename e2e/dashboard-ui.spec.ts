import { expect, test, type Locator, type Page } from '@playwright/test'

// Headless Chromium here does not start native drags from mouse events, so dispatch them.
async function dragRow(page: Page, from: Locator, to: Locator) {
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer())
  await from.dispatchEvent('dragstart', { dataTransfer })
  await to.dispatchEvent('dragover', { dataTransfer })
  await to.dispatchEvent('drop', { dataTransfer })
  await from.dispatchEvent('dragend', { dataTransfer })
}

test('UK personal finance template opens on a working dashboard', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Start now/i }).first().click()
  await page.getByLabel('Vault name').fill('Finance')
  await page.getByRole('button', { name: /Create browser vault/i }).click()
  await page.waitForURL(/\/vault/, { waitUntil: 'commit' })

  await page.getByRole('button', { name: 'Templates' }).first().click()
  await page.getByRole('button', { name: 'Import UK personal finance' }).first().click()
  // AGENTS.md is the last file the template writes.
  await expect(page.getByText('UK personal finance guidance').first()).toBeAttached({ timeout: 15_000 })
  await page.keyboard.press('Escape')

  await page.goto('/vault/finance/dashboard.md')
  const dashboard = page.getByTestId('dashboard-view')
  await expect(dashboard.getByText('Net worth', { exact: true })).toBeVisible({ timeout: 15_000 })
  await expect(dashboard.locator('[data-slot="dashboard-stat"]').first()).toContainText('£186,705')
  await expect(dashboard.getByText('Net worth over time')).toBeVisible()
  await expect(dashboard.locator('[data-slot="chart"]').first()).toBeVisible()
  await expect(dashboard.locator('[data-slot="dashboard-error"]')).toHaveCount(0)

  await page.getByRole('button', { name: 'Edit layout' }).click()
  const cards = page.getByTestId('dashboard-edit-item')
  await expect(cards.first()).toHaveAttribute('aria-label', 'Net worth')
  await page.getByRole('button', { name: 'Move Net worth forward' }).click()
  await expect(cards.nth(1)).toHaveAttribute('aria-label', 'Net worth')
  await expect(cards.first()).toHaveAttribute('aria-label', 'Cash')
  const rows = page.getByTestId('dashboard-edit-row')
  await dragRow(page, rows.nth(1), rows.first())
  await expect(cards.first()).toHaveAttribute('aria-label', 'Net worth over time')
  await dragRow(page, rows.nth(1), rows.first())
  await expect(cards.first()).toHaveAttribute('aria-label', 'Cash')
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(dashboard.locator('[data-slot="dashboard-stat"]').first()).toContainText('Cash')

  await page.getByRole('button', { name: 'Add element' }).click()
  const builder = page.getByTestId('element-builder')
  await builder.getByRole('radio', { name: 'Donut chart' }).click()
  await builder.getByLabel('Title').fill('Where my money is')
  await builder.getByLabel('Data file').selectOption('finance/balances.md')
  await builder.getByLabel('Slice for each').selectOption('account.category')
  await expect(builder.getByTestId('element-preview').locator('[data-slot="dashboard-pie"]')).toContainText('Property')
  await builder.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(dashboard.locator('[data-slot="dashboard-pie"]')).toContainText('Where my money is')

  await page.getByRole('radio', { name: 'Source' }).click()
  await expect(page.getByText('caedora-dashboard').or(page.getByText('rows:')).first()).toBeVisible()
  await expect(page.getByText(/pie: \{ title: Where my money is/)).toBeVisible()

  await page.goto('/vault/finance/balances.md')
  await expect(page.getByTestId('dataset-view').getByText('54 rows')).toBeVisible()
})
