import { expect, test, type Page } from '@playwright/test'
import { FakeGitHub, openGitHubVault } from './github'
import { WORKOUT_FILES } from '../tests/fixtures/workout'

const LOG = 'health/training-log.md'

function vault() {
  return new FakeGitHub('will', 'health-vault', {
    'welcome.md': '---\ntype: Note\ntitle: Welcome\ndescription: Start here.\n---\n\n# Welcome\n',
    ...WORKOUT_FILES,
  })
}

const dialog = (page: Page) => page.getByRole('dialog')
const exercise = (page: Page, name: string) =>
  dialog(page).getByRole('listitem').filter({ has: page.getByRole('heading', { name, exact: true }) })

async function startUpperA(page: Page) {
  await page.getByRole('button', { name: 'Start workout' }).first().click()
  await dialog(page).getByLabel('Date').fill('2026-11-10')
  await dialog(page).getByRole('button', { name: 'Start Upper A' }).click()
  await expect(dialog(page).getByRole('heading', { name: 'Upper A' })).toBeVisible()
}

test('picks a programme day and logs sets straight to the training log', async ({ page }) => {
  const github = vault()
  await openGitHubVault(page, github, 'welcome.md')
  await startUpperA(page)

  const press = exercise(page, 'Incline dumbbell press')
  await expect(press).toContainText('Find a load for 6 to 10 reps')
  await expect(press).toContainText('30 kg × 10, 9')

  // The load carries over from last time, so only the reps need typing.
  await expect(press.getByLabel('Incline dumbbell press kg')).toHaveValue('30')
  await press.getByLabel('Incline dumbbell press kg').fill('32.5')
  await press.getByLabel('Incline dumbbell press reps', { exact: true }).fill('9')
  await press.getByLabel('Incline dumbbell press reps in reserve').fill('2')
  await press.getByRole('button', { name: 'Log set 1 of Incline dumbbell press' }).click()

  await expect(press.getByRole('list', { name: 'Incline dumbbell press sets' })).toContainText('32.5 kg × 9 @ 2 RIR')
  await expect(press.getByRole('button', { name: 'Log set 2 of Incline dumbbell press' })).toBeVisible()
  await expect.poll(() => github.read(LOG).replace(/ +/g, ' ')).toContain(
    '| 2026-11-10 | Incline dumbbell press | 1 | 32.5 | 9 | 2 | | upper-a | chest | 44.4 |'
  )
  expect(github.commits.at(-1)?.message).toBe('Log Incline dumbbell press set 1: 32.5 kg × 9 @ 2 RIR')

  await press.getByLabel('Incline dumbbell press reps', { exact: true }).fill('8')
  await press.getByRole('button', { name: 'Log set 2 of Incline dumbbell press' }).click()
  await expect(press.getByRole('list', { name: 'Incline dumbbell press sets' }).getByRole('listitem')).toHaveCount(2)

  await dialog(page).getByRole('button', { name: 'Finish workout' }).click()
  await expect(dialog(page)).toContainText('2 sets across 1 exercise saved to your training log.')
})

test('edits and deletes a logged set', async ({ page }) => {
  const github = vault()
  await openGitHubVault(page, github, 'welcome.md')
  await startUpperA(page)

  const row = exercise(page, 'Chest supported row')
  await row.getByLabel('Chest supported row kg').fill('40')
  await row.getByLabel('Chest supported row reps', { exact: true }).fill('10')
  await row.getByRole('button', { name: 'Log set 1 of Chest supported row' }).click()
  const sets = row.getByRole('list', { name: 'Chest supported row sets' })
  await expect(sets).toContainText('40 kg × 10')

  await row.getByRole('button', { name: 'Edit set 1 of Chest supported row' }).click()
  await row.getByLabel('Set 1 reps', { exact: true }).fill('11')
  await row.getByRole('button', { name: 'Save' }).click()
  await expect(sets).toContainText('40 kg × 11')
  await expect.poll(() => github.read(LOG).replace(/ +/g, ' ')).toContain('| Chest supported row | 1 | 40 | 11 |')

  await row.getByRole('button', { name: 'Delete set 1 of Chest supported row' }).click()
  await expect(sets).toHaveCount(0)
  await expect.poll(() => github.read(LOG)).not.toContain('Chest supported row | 1')
})

test('starts an empty workout and adds an exercise from a button', async ({ page }) => {
  const github = vault()
  await openGitHubVault(page, github, LOG)
  await expect(page.getByTestId('dataset-view')).toBeVisible({ timeout: 15_000 })

  await page.getByTestId('dataset-view').getByRole('button', { name: 'Start workout' }).click()
  await dialog(page).getByLabel('Date').fill('2026-11-10')
  await dialog(page).getByRole('button', { name: 'Start empty workout' }).click()
  await dialog(page).getByLabel('Exercise to add').fill('romanian deadlift')
  await dialog(page).getByRole('button', { name: 'Add', exact: true }).click()

  const rdl = exercise(page, 'Romanian deadlift')
  await rdl.getByLabel('Romanian deadlift kg').fill('80')
  await rdl.getByLabel('Romanian deadlift reps', { exact: true }).fill('8')
  await rdl.getByRole('button', { name: 'Log set 1 of Romanian deadlift' }).click()
  await expect(rdl.getByRole('list', { name: 'Romanian deadlift sets' })).toContainText('80 kg × 8')
  await expect.poll(() => github.read(LOG).replace(/ +/g, ' ')).toContain(
    '| 2026-11-10 | Romanian deadlift | 1 | 80 | 8 | | | other |'
  )

  // Closing and reopening offers to carry on with the same day.
  await page.keyboard.press('Escape')
  await page.getByTestId('dataset-view').getByRole('button', { name: 'Start workout' }).click()
  await dialog(page).getByLabel('Date').fill('2026-11-10')
  await dialog(page).getByRole('button', { name: /Continue this session/ }).click()
  await expect(exercise(page, 'Romanian deadlift').getByRole('button', { name: 'Log set 2 of Romanian deadlift' })).toBeVisible()
})
