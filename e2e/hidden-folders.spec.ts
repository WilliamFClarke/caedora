import { expect, test, type Page } from '@playwright/test'
import { createBrowserVault, sidebarConcept } from './helpers'
import { FakeGitHub, openGitHubVault } from './github'

const sidebarFolder = (page: Page, name: string) =>
  page.getByRole('listitem').getByRole('button', { name, exact: true })

const showHiddenToggle = (page: Page) => page.getByRole('switch', { name: /Show hidden folders/ })

test('a folder is hidden from the sidebar and can be shown again', async ({ page }) => {
  await createBrowserVault(page, 'Hiding vault')
  await expect(sidebarConcept(page, 'Home Base')).toBeVisible()

  await sidebarFolder(page, 'personal').click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Hide folder' }).click()
  await expect(sidebarFolder(page, 'personal')).toBeHidden()
  await expect(sidebarConcept(page, 'Home Base')).toBeHidden()

  // Hidden folders can be reached from the toggle at the bottom of the sidebar, dimmed.
  await expect(showHiddenToggle(page)).toHaveAttribute('aria-checked', 'false')
  await showHiddenToggle(page).click()
  await expect(showHiddenToggle(page)).toHaveAttribute('aria-checked', 'true')
  await expect(sidebarFolder(page, 'personal')).toHaveAttribute('data-hidden', 'true')
  await expect(sidebarConcept(page, 'Home Base')).toBeVisible()

  // The choice is kept for this vault.
  await page.reload()
  await expect(sidebarFolder(page, 'personal')).toHaveAttribute('data-hidden', 'true')
  await showHiddenToggle(page).click()
  await expect(sidebarFolder(page, 'personal')).toBeHidden()

  await showHiddenToggle(page).click()
  await sidebarFolder(page, 'personal').click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Show folder' }).click()
  await expect(sidebarFolder(page, 'personal')).not.toHaveAttribute('data-hidden')
  await expect(showHiddenToggle(page)).toBeHidden()
})

test('hidden folders stay in search unless the setting leaves them out', async ({ page }) => {
  await createBrowserVault(page, 'Search hidden vault')
  await sidebarFolder(page, 'personal').click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Hide folder' }).click()
  await expect(sidebarConcept(page, 'Home Base')).toBeHidden()

  await page.keyboard.press('Control+k')
  const search = page.getByRole('dialog', { name: 'Search vault' })
  await search.getByRole('combobox', { name: 'Search vault' }).fill('Home Base')
  await expect(search.getByRole('option', { name: /personal\/home-base\.md/ })).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Settings' }).click()
  const settings = page.getByRole('dialog')
  await settings.getByRole('switch', { name: 'Search hidden folders' }).click()
  await expect(settings.getByRole('switch', { name: 'Search hidden folders' })).toHaveAttribute('aria-checked', 'false')
  await page.keyboard.press('Escape')

  await page.keyboard.press('Control+k')
  await search.getByRole('combobox', { name: 'Search vault' }).fill('Home Base')
  await expect(search.getByRole('option', { name: /personal\/home-base\.md/ })).toHaveCount(0)
})

test('dot folders such as .github are hidden by default and hiding writes nothing', async ({ page }) => {
  const workflow = '---\ntype: Note\ntitle: Sync workflow\ndescription: How the sync runs.\n---\n\n# Sync workflow\n'
  const github = new FakeGitHub('will', 'trading-vault', {
    'welcome.md': '---\ntype: Note\ntitle: Welcome\ndescription: Start here.\n---\n\n# Welcome\n',
    '.github/workflow.md': workflow,
    'research/review.md': '---\ntype: Note\ntitle: October review\ndescription: Market notes.\n---\n\n# October review\n',
  })
  await openGitHubVault(page, github, 'welcome.md')
  await expect(sidebarFolder(page, 'research')).toBeVisible()
  await expect(sidebarFolder(page, '.github')).toBeHidden()

  await showHiddenToggle(page).click()
  await expect(sidebarFolder(page, '.github')).toHaveAttribute('data-hidden', 'true')
  await expect(sidebarConcept(page, 'Sync workflow')).toBeVisible()

  await sidebarFolder(page, 'research').click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Hide folder' }).click()
  await expect(sidebarFolder(page, 'research')).toHaveAttribute('data-hidden', 'true')
  await expect(showHiddenToggle(page)).toContainText('2')

  // Hiding is a display choice only: nothing in those folders is committed.
  expect(github.commits.filter((commit) => /^(\.github|research)\//.test(commit.path))).toHaveLength(0)
  expect(github.read('.github/workflow.md')).toBe(workflow)
})
