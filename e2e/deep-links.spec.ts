import { expect, test, type Page } from '@playwright/test'
import { FakeGitHub, openGitHubVault, saveGitHubVault } from './github'
import { sidebarConcept } from './helpers'
import { WORKOUT_FILES } from '../tests/fixtures/workout'

function vault() {
  return new FakeGitHub('will', 'health-vault', {
    'welcome.md': '---\ntype: Note\ntitle: Welcome\ndescription: Start here.\n---\n\n# Welcome\n',
    ...WORKOUT_FILES,
  })
}

const tracker = (page: Page) => page.getByTestId('workout-tracker')

test('a link to a note opens it on a fresh load, with or without .md', async ({ page }) => {
  const github = vault()
  await openGitHubVault(page, github, 'health/training-log')
  await expect(page.getByTestId('dataset-view')).toBeVisible({ timeout: 15_000 })
  await expect(page).toHaveURL(/\/vault\/health\/training-log\.md$/)

  // Opening another note updates the link in the address bar.
  await sidebarConcept(page, 'Welcome').click()
  await expect(page).toHaveURL(/\/vault\/welcome\.md$/)
})

test('a workout link opens the tracker on that workout and the address bar follows it', async ({ page }) => {
  const github = vault()
  await openGitHubVault(page, github, 'welcome.md?workout=Upper%20A')

  const linked = tracker(page).getByRole('region', { name: 'Linked workout: Upper A' })
  await expect(linked).toBeVisible({ timeout: 15_000 })
  await expect(linked).toContainText('Incline dumbbell press')
  // Upper A is not listed twice.
  await expect(tracker(page).getByRole('button', { name: 'Start Upper A' })).toHaveCount(1)

  await linked.getByRole('button', { name: 'Start Upper A' }).click()
  await expect(tracker(page).getByRole('heading', { name: 'Upper A' })).toBeVisible()
  await expect(page).toHaveURL(/\/vault\/welcome\.md\?workout=upper-a$/)

  // Reloading the link carries on with the same workout.
  await page.reload()
  await expect(tracker(page).getByRole('heading', { name: 'Upper A' })).toBeVisible({ timeout: 30_000 })

  await page.keyboard.press('Escape')
  await expect(tracker(page)).toBeHidden()
  await expect(page).toHaveURL(/\/vault\/welcome\.md$/)
})

test('a link to the tracker with no workout, or an unknown one, opens the picker', async ({ page }) => {
  const github = vault()
  await openGitHubVault(page, github, 'welcome.md?workout')
  await expect(tracker(page).getByRole('heading', { name: 'What are you training?' })).toBeVisible({ timeout: 15_000 })

  await page.goto('/vault/welcome.md?workout=leg-day')
  await expect(tracker(page)).toContainText('There is no workout called leg-day in your programme', { timeout: 30_000 })
  await expect(tracker(page).getByRole('button', { name: 'Start Upper A' })).toBeVisible()
})

test('a link opened before a vault is connected opens once one is', async ({ page }) => {
  const github = vault()
  await github.install(page)
  await page.goto('/vault/health/training-log.md?workout=upper-a')
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 })

  await saveGitHubVault(page, github)
  await page.goto('/vault')
  await expect(tracker(page).getByRole('region', { name: 'Linked workout: Upper A' })).toBeVisible({ timeout: 30_000 })
  await expect(page).toHaveURL(/\/vault\/health\/training-log\.md\?workout=upper-a$/)

  // The link opens only once.
  await page.goto('/vault')
  await expect(page).toHaveURL(/\/vault\/welcome\.md$/, { timeout: 30_000 })
  await expect(tracker(page)).toBeHidden()
})
