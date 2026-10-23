import { expect, test } from '@playwright/test'
import { createBrowserVault } from './helpers'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

test('dashboard fits a phone screen without sideways scrolling', async ({ page }) => {
  await createBrowserVault(page, 'Finance')

  // On a phone the sidebar lives in a drawer.
  await page.getByRole('button', { name: 'Toggle Sidebar' }).first().click()
  await page.getByRole('button', { name: 'Templates' }).first().click()
  await page.getByRole('button', { name: 'Import UK personal finance' }).first().click()
  await expect(page.getByText('UK personal finance guidance').first()).toBeAttached({ timeout: 15_000 })
  await page.keyboard.press('Escape')

  await page.goto('/vault/finance/dashboard.md')
  const dashboard = page.getByTestId('dashboard-view')
  await expect(dashboard.locator('[data-slot="dashboard-stat"]').first()).toBeVisible({ timeout: 15_000 })

  const title = dashboard.getByRole('heading', { level: 1 })
  const addElement = dashboard.getByRole('button', { name: 'Add element' })
  const editLayout = dashboard.getByRole('button', { name: 'Edit layout' })
  await expect(addElement).toBeVisible()
  await expect(editLayout).toBeVisible()

  // The toolbar sits below the title instead of colliding with it, and every button is on screen.
  const titleBox = (await title.boundingBox())!
  for (const button of [addElement, editLayout]) {
    const box = (await button.boundingBox())!
    expect(box.y).toBeGreaterThanOrEqual(titleBox.y + titleBox.height - 1)
    expect(box.x + box.width).toBeLessThanOrEqual(390)
  }
  // The title keeps a readable width rather than wrapping a word per line.
  expect(titleBox.width).toBeGreaterThan(200)

  const overflow = await dashboard.evaluate((el) => ({
    scroll: el.scrollWidth - el.clientWidth,
    page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }))
  expect(overflow.scroll).toBeLessThanOrEqual(0)
  expect(overflow.page).toBeLessThanOrEqual(0)
})
