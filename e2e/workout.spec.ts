import { expect, test, type Page } from '@playwright/test'
import { FakeGitHub, openGitHubVault } from './github'
import { PROGRAMME, WORKOUT_FILES } from '../tests/fixtures/workout'

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

test('shows how long the workout has been going', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-10T18:00:00') })
  const github = vault()
  await openGitHubVault(page, github, 'welcome.md')
  await startUpperA(page)

  const elapsed = tracker(page).getByRole('timer', { name: 'Workout time' })
  await expect(elapsed).toHaveText(/^0:0\d$/)
  await page.clock.fastForward('12:00')
  await expect(elapsed).toHaveText(/^12:0\d$/)
  await page.clock.fastForward('01:00:00')
  await expect(elapsed).toHaveText(/^1:12:0\d$/)

  // The clock keeps counting from the start of the workout after a reload.
  await page.reload()
  await page.getByRole('button', { name: 'Start workout' }).first().click()
  await expect(tracker(page).getByRole('timer', { name: 'Workout time' })).toHaveText(/^1:12:\d\d$/)
})

test('rest alerts can be turned on and stay on', async ({ page, context }) => {
  await context.grantPermissions(['notifications'])
  const github = vault()
  await openGitHubVault(page, github, 'welcome.md')
  await startUpperA(page)

  await tracker(page).getByRole('button', { name: 'Turn on rest alerts' }).click()
  await expect(tracker(page).getByRole('status')).toContainText('Rest alerts are on')
  await expect(tracker(page).getByRole('button', { name: 'Turn off rest alerts' })).toHaveAttribute('aria-pressed', 'true')
  const worker = await page.evaluate(async () => (await navigator.serviceWorker.ready).active?.scriptURL)
  expect(worker).toMatch(/\/rest-alerts-sw\.js$/)

  // Logging a set still starts the on screen timer as before.
  await logSet(page, 'Incline dumbbell press', { kg: '30', reps: '10' }, 1)
  await expect(tracker(page).getByRole('region', { name: 'Rest timer' })).toBeVisible()

  await page.reload()
  await page.getByRole('button', { name: 'Start workout' }).first().click()
  const off = tracker(page).getByRole('button', { name: 'Turn off rest alerts' })
  await expect(off).toBeVisible()
  await off.click()
  await expect(tracker(page).getByRole('button', { name: 'Turn on rest alerts' })).toHaveAttribute('aria-pressed', 'false')
})

test.describe('on an iPhone in Safari', () => {
  test.use({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  })

  test('rest alerts explain how to add Caedora to the Home Screen', async ({ page }) => {
    // Safari only offers notifications to web apps opened from the Home Screen.
    await page.addInitScript(() => {
      delete (window as { Notification?: unknown }).Notification
    })
    const github = vault()
    await openGitHubVault(page, github, 'welcome.md')
    await startUpperA(page)

    await tracker(page).getByRole('button', { name: 'Turn on rest alerts' }).click()
    await expect(tracker(page).getByRole('status')).toContainText('Add to Home Screen')
    await tracker(page).getByRole('button', { name: 'OK' }).click()
    await expect(tracker(page).getByRole('status')).toBeHidden()
  })
})

const CONDITIONING = 'health/conditioning-log.md'

test('logs a treadmill run on its own and adds it to the top of the conditioning log', async ({ page }) => {
  const github = vault()
  await openGitHubVault(page, github, 'welcome.md')
  await page.getByRole('button', { name: 'Start workout' }).first().click()
  await tracker(page).getByLabel('Date').fill('2026-11-17')
  await tracker(page).getByRole('button', { name: 'Log a run' }).click()

  const form = tracker(page).getByRole('form', { name: 'Log a run' })
  await form.getByRole('button', { name: 'Treadmill' }).click()
  await expect(form.getByRole('button', { name: 'Treadmill' })).toHaveAttribute('aria-pressed', 'true')
  await form.getByLabel('Run minutes').fill('30')
  await form.getByLabel('Run distance in km').fill('5')
  await form.getByLabel('Run average heart rate').fill('152')
  await form.getByLabel('Run notes').fill('1% incline')
  await expect(form).toContainText('Pace 6:00 min/km')
  await form.getByRole('button', { name: 'Log run' }).click()

  const runs = tracker(page).getByRole('region', { name: 'Runs' })
  await expect(runs).toContainText('Treadmill · 5 km in 30 min · 6:00 min/km · 152 bpm')
  expect(github.commits.filter((commit) => commit.path === CONDITIONING)).toHaveLength(0)

  await tracker(page).getByRole('button', { name: 'Finish workout' }).click()
  await expect(tracker(page).getByRole('region', { name: 'Runs to save' })).toContainText('5 km in 30 min')
  await tracker(page).getByRole('button', { name: 'Save 1 run to Conditioning log' }).click()
  await expect(tracker(page).getByRole('heading', { name: 'Run saved' })).toBeVisible()
  await expect(tracker(page)).toContainText('1 run added to Conditioning log.')

  expect(github.commits.map((commit) => commit.message)).toContain('Log run on 2026-11-17: 5 km in 30 min')
  const table = github.read(CONDITIONING).replace(/ +/g, ' ')
  expect(table).toContain(
    '| --- | --- | --- | --- | --- | --- |\n| 2026-11-17 | run | 30 | 152 | 5 | Treadmill. Average pace: 6:00 min/km. 1% incline |\n| 2026-11-13 | run | 12 |'
  )
})

test('a gym workout can include a run, saved to each log', async ({ page }) => {
  const github = vault()
  await openGitHubVault(page, github, 'welcome.md')
  await startUpperA(page)
  await logSet(page, 'Incline dumbbell press', { kg: '30', reps: '10' }, 1)

  await tracker(page).getByRole('button', { name: 'Add a run' }).click()
  const form = tracker(page).getByRole('form', { name: 'Log a run' })
  await form.getByLabel('Run minutes').fill('10')
  await form.getByRole('button', { name: 'Log run' }).click()
  await expect(tracker(page).getByRole('region', { name: 'Runs' })).toContainText('Outdoor · 10 min')
  await expect(tracker(page).getByRole('heading', { name: 'Upper A' })).toBeVisible()

  await tracker(page).getByRole('button', { name: 'Finish workout' }).click()
  await tracker(page).getByRole('button', { name: 'Save 1 set and 1 run to your vault' }).click()
  await expect(tracker(page).getByRole('heading', { name: 'Upper A saved' })).toBeVisible()
  expect(logCommits(github).map((commit) => commit.message)).toEqual(['Log Upper A on 2026-11-10: 1 set'])
  expect(github.commits.filter((commit) => commit.path === CONDITIONING).map((commit) => commit.message)).toEqual([
    'Log run on 2026-11-10: 10 min',
  ])
})

test('a bike warm up in the programme is logged as cardio, with no reps to enter', async ({ page }) => {
  const github = new FakeGitHub('will', 'health-vault', {
    'welcome.md': '---\ntype: Note\ntitle: Welcome\ndescription: Start here.\n---\n\n# Welcome\n',
    ...WORKOUT_FILES,
    'health/programme.md': PROGRAMME.replace(
      '| upper-a | 1 |',
      '| upper-a | 0 | Warm up |  | 1 | 5 min | easy | 60 s | Bike or cross trainer, then a light set of incline press |\n| upper-a | 1 |'
    ),
  })
  await openGitHubVault(page, github, 'welcome.md')
  await startUpperA(page)

  const warmUp = exercise(page, 'Warm up')
  await expect(warmUp).toContainText('5 min')
  await expect(warmUp.getByLabel('Warm up reps', { exact: true })).toHaveCount(0)
  const form = warmUp.getByRole('form', { name: 'Log a bike session' })
  await expect(form.getByRole('button', { name: 'Bike', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await form.getByLabel('Bike minutes').fill('5')
  await form.getByLabel('Bike distance in km').fill('2')
  await form.getByLabel('Bike level').fill('6')
  await expect(form).toContainText('Speed 24 km/h')
  await form.getByRole('button', { name: 'Log bike' }).click()

  await expect(warmUp).toContainText('Bike · 2 km in 5 min · 24 km/h · level 6')
  await expect(warmUp.getByRole('form')).toHaveCount(0)
  await expect(tracker(page).getByRole('region', { name: 'Rest timer' })).toContainText('Rest after Warm up')
  await tracker(page).getByRole('region', { name: 'Rest timer' }).getByRole('button', { name: 'Skip' }).click()

  await logSet(page, 'Incline dumbbell press', { kg: '30', reps: '10' }, 1)
  await tracker(page).getByRole('button', { name: 'Finish workout' }).click()
  await tracker(page).getByRole('button', { name: 'Save 1 set and 1 cardio session to your vault' }).click()
  await expect(tracker(page).getByRole('heading', { name: 'Upper A saved' })).toBeVisible()
  await expect(tracker(page)).toContainText('1 cardio session added to Conditioning log.')

  expect(logCommits(github).map((commit) => commit.message)).toEqual(['Log Upper A on 2026-11-10: 1 set'])
  expect(github.commits.filter((commit) => commit.path === CONDITIONING).map((commit) => commit.message)).toEqual([
    'Log bike on 2026-11-10: 2 km in 5 min',
  ])
  expect(github.read(CONDITIONING).replace(/ +/g, ' ')).toContain('| 2026-11-10 | cycle | 5 | | 2 | Bike, level 6. Average speed: 24 km/h. |')
})
