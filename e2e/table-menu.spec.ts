import { expect, test } from '@playwright/test'
import { createBrowserVault, editorBody } from './helpers'

test('table rows and columns are added and deleted from the table tools bar', async ({ page }) => {
  await createBrowserVault(page, 'Tables vault')

  await page.getByRole('button', { name: 'New concept' }).click()
  const dialog = page.getByRole('dialog', { name: 'New concept' })
  await dialog.getByLabel('Concept title').fill('Lifts')
  await dialog.getByRole('button', { name: 'Create concept' }).click()
  await expect(page).toHaveURL(/\/vault\/lifts\.md$/)

  const tableTools = page.getByRole('toolbar', { name: 'Table tools' })
  await expect(tableTools).toBeHidden()

  await editorBody(page).click()
  await page.keyboard.press('Control+End')
  await page.getByRole('button', { name: 'Insert table' }).click()

  const table = editorBody(page).locator('table')
  const rows = table.getByRole('row')
  await expect(rows).toHaveCount(3)
  await expect(rows.first().getByRole('columnheader')).toHaveCount(3)
  await expect(tableTools).toBeVisible()

  // Fill the header row so each column can be told apart: Exercise, Sets, Reps.
  await page.keyboard.type('Exercise')
  await page.keyboard.press('Tab')
  await page.keyboard.type('Sets')
  await page.keyboard.press('Tab')
  await page.keyboard.type('Reps')
  await page.keyboard.press('Tab')
  await page.keyboard.type('Squat')

  await tableTools.getByRole('button', { name: 'Add row below' }).click()
  await expect(rows).toHaveCount(4)

  await tableTools.getByRole('button', { name: 'Delete row' }).click()
  await expect(rows).toHaveCount(3)
  await tableTools.getByRole('button', { name: 'Delete row' }).click()
  await expect(rows).toHaveCount(2)
  await expect(table).not.toContainText('Squat')

  await table.getByRole('columnheader', { name: 'Sets' }).click()
  await tableTools.getByRole('button', { name: 'Delete column' }).click()
  await expect(rows.first().getByRole('columnheader')).toHaveText(['Exercise', 'Reps'])

  await tableTools.getByRole('button', { name: 'Add column right' }).click()
  await expect(rows.first().getByRole('columnheader')).toHaveCount(3)

  await expect(page.getByRole('main').getByText('Saved', { exact: true })).toBeVisible()
  await page.reload()
  await expect(editorBody(page).locator('table').getByRole('row')).toHaveCount(2)
  await expect(
    editorBody(page).locator('table').getByRole('row').first().getByRole('columnheader'),
  ).toHaveCount(3)

  await editorBody(page).locator('table').getByRole('columnheader').first().click()
  await tableTools.getByRole('button', { name: 'Delete table' }).click()
  await expect(editorBody(page).locator('table')).toHaveCount(0)
  await expect(tableTools).toBeHidden()
})
