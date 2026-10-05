import { expect, test } from '@playwright/test'

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

  await page.getByRole('radio', { name: 'Source' }).click()
  await expect(page.getByText('caedora-dashboard').or(page.getByText('rows:')).first()).toBeVisible()

  await page.goto('/vault/finance/balances.md')
  await expect(page.getByTestId('dataset-view').getByText('54 rows')).toBeVisible()
})
