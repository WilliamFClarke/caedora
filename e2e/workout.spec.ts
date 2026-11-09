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

const tracker = (page: Page) => page.getByTestId('workout-tracker')
const exercise = (page: Page, name: string) =>
  tracker(page).getByRole('listitem').filter({ has: page.getByRole('heading', { name, exact: true }) })
const squashed = (github: FakeGitHub) => github.read(LOG).replace(/ +/g, ' ')
// Only the training log matters here; the open welcome note may autosave on its own.
const logCommits = (github: FakeGitHub) => github.commits.filter((commit) => commit.path === LOG)

async function startUpperA(page: Page) {
  await page.getByRole('button', { name: 'Start workout' }).first().click()
  await tracker(page).getByLabel('Date').fill('2026-11-10')
  await tracker(page).getByRole('button', { name: 'Start Upper A' }).click()
  await expect(tracker(page).getByRole('heading', { name: 'Upper A' })).toBeVisible()
}

async function logSet(page: Page, name: string, values: { kg?: string; reps: string; rir?: string }, set: number) {
  const card = exercise(page, name)
  if (values.kg !== undefined) await card.getByLabel(`${name} kg`).fill(values.kg)
  await card.getByLabel(`${name} reps`, { exact: true }).fill(values.reps)
  if (values.rir !== undefined) await card.getByLabel(`${name} reps in reserve`).fill(values.rir)
  await card.getByRole('button', { name: `Log set ${set} of ${name}` }).click()
}

test('logs sets on the device, starts the rest timer and saves the workout after a check', async ({ page }) => {
  const github = vault()
  await openGitHubVault(page, github, 'welcome.md')
  await startUpperA(page)

  const press = exercise(page, 'Incline dumbbell press')
  await expect(press).toContainText('Find a load for 6 to 10 reps')
  await expect(press).toContainText('Rest 3:00')
  // The load carries over from last time, so only the reps need typing.
  await expect(press.getByLabel('Incline dumbbell press kg')).toHaveValue('30')

  await logSet(page, 'Incline dumbbell press', { kg: '32.5', reps: '9', rir: '2' }, 1)
  await expect(press.getByRole('button', { name: 'Edit set 1 of Incline dumbbell press: 32.5 kg × 9 @ 2 RIR' })).toBeVisible()
  const timer = tracker(page).getByRole('region', { name: 'Rest timer' })
  await expect(timer).toContainText('Rest after Incline dumbbell press')
  await expect(timer.getByRole('timer')).toHaveText(/^(3:00|2:5\d)$/)
  await timer.getByRole('button', { name: 'Skip' }).click()
  await expect(timer).toBeHidden()

  // Nothing reaches the vault until the workout is finished and checked.
  expect(logCommits(github)).toHaveLength(0)

  await logSet(page, 'Incline dumbbell press', { reps: '8' }, 2)
  await logSet(page, 'Chest supported row', { kg: '40', reps: '10' }, 1)

  await tracker(page).getByRole('button', { name: 'Finish workout' }).click()
  await expect(tracker(page).getByRole('heading', { name: 'Check your workout' })).toBeVisible()
  const rows = tracker(page).getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Chest supported row', exact: true }) })
  await expect(rows).toContainText('1 of 3 sets')

  // A slip can be fixed on the review screen before saving.
  await rows.getByRole('button', { name: /Edit set 1 of Chest supported row/ }).click()
  await rows.getByLabel('Set 1 reps', { exact: true }).fill('11')
  await rows.getByRole('button', { name: 'Save set 1 of Chest supported row' }).click()
  await expect(rows).toContainText('40 kg × 11')

  await tracker(page).getByRole('button', { name: 'Save 3 sets to Training log' }).click()
  await expect(tracker(page).getByRole('heading', { name: 'Upper A saved' })).toBeVisible()
  expect(logCommits(github).map((commit) => commit.message)).toEqual(['Log Upper A on 2026-11-10: 3 sets'])
  expect(squashed(github)).toContain('| 2026-11-10 | Incline dumbbell press | 1 | 32.5 | 9 | 2 | | upper-a | chest | 44.4 |')
  expect(squashed(github)).toContain('| 2026-11-10 | Incline dumbbell press | 2 | 32.5 | 8 | 2 |')
  expect(squashed(github)).toContain('| 2026-11-10 | Chest supported row | 1 | 40 | 11 |')
})

test('a workout in progress survives a reload', async ({ page }) => {
  const github = vault()
  await openGitHubVault(page, github, 'welcome.md')
  await startUpperA(page)
  await logSet(page, 'Incline dumbbell press', { kg: '30', reps: '10' }, 1)
  await expect(exercise(page, 'Incline dumbbell press').getByRole('button', { name: /Edit set 1 of Incline dumbbell press/ })).toBeVisible()

  await page.reload()
  await page.getByRole('button', { name: 'Start workout' }).first().click()
  await expect(tracker(page).getByRole('heading', { name: 'Upper A' })).toBeVisible()
  const press = exercise(page, 'Incline dumbbell press')
  await expect(press.getByRole('button', { name: /Edit set 1 of Incline dumbbell press: 30 kg × 10/ })).toBeVisible()

  // A set can be removed before it is ever saved.
  await press.getByRole('button', { name: /Edit set 1 of Incline dumbbell press/ }).click()
  await press.getByRole('button', { name: 'Delete set 1 of Incline dumbbell press' }).click()
  await expect(press.getByRole('button', { name: 'Log set 1 of Incline dumbbell press' })).toBeVisible()
  expect(logCommits(github)).toHaveLength(0)
})

test('with no signal the workout waits on the device and saves when the connection is back', async ({ page, context }) => {
  const github = vault()
  await openGitHubVault(page, github, LOG)
  await expect(page.getByTestId('dataset-view')).toBeVisible({ timeout: 15_000 })

  await page.getByTestId('dataset-view').getByRole('button', { name: 'Start workout' }).click()
  await tracker(page).getByLabel('Date').fill('2026-11-10')
  await tracker(page).getByRole('button', { name: 'Start empty workout' }).click()
  await tracker(page).getByLabel('Exercise to add').fill('romanian deadlift')
  await tracker(page).getByRole('button', { name: 'Add', exact: true }).click()

  await context.setOffline(true)
  await expect(tracker(page)).toContainText('Offline, saved on this device')
  await logSet(page, 'Romanian deadlift', { kg: '80', reps: '8' }, 1)
  await tracker(page).getByRole('button', { name: 'Finish workout' }).click()
  await expect(tracker(page).getByRole('status')).toContainText('No connection')
  await expect(tracker(page).getByRole('button', { name: 'Waiting for connection' })).toBeDisabled()

  await context.setOffline(false)
  await tracker(page).getByRole('button', { name: 'Save 1 set to Training log' }).click()
  await expect(tracker(page).getByRole('heading', { name: 'Workout saved' })).toBeVisible()
  expect(squashed(github)).toContain('| 2026-11-10 | Romanian deadlift | 1 | 80 | 8 | | | other |')
})
