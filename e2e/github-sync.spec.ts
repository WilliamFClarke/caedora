import { expect, test } from '@playwright/test'
import { FakeGitHub, openGitHubVault, pollVault } from './github'
import { editorBody } from './helpers'

const PLAN = `---
type: Note
title: ISA plan
description: How the ISA is run.
---

# ISA plan

Keep VWRP above its floor.

## Rules

No company above 15 percent.
`

const holdings = (googl: number) => `---
type: Dataset
title: Holdings
description: Positions in the ISA.
dataset:
  key: [ticker]
  columns:
    ticker: { type: text, required: true }
    value: { type: currency }
generated: { by: t212-sync, at: 2026-10-19T18:28:40Z }
---

# Holdings

| ticker | value |
| --- | --- |
| VWRPl_EQ | 570.57 |
| GOOGL_US_EQ | ${googl} |
`

const DASHBOARD = `---
type: Dashboard
title: ISA dashboard
description: Value of the ISA.
---

# ISA dashboard

Reads [Holdings](holdings.md).

\`\`\`caedora-dashboard
data:
  holdings: holdings.md
rows:
  - columns: 1
    items:
      - stat: { label: ISA value, source: holdings, value: sum(value) }
\`\`\`
`

function vault() {
  return new FakeGitHub('will', 'trading-vault', {
    'welcome.md': '---\ntype: Note\ntitle: Welcome\ndescription: Start here.\n---\n\n# Welcome\n',
    'strategy/plan.md': PLAN,
    'isa/holdings.md': holdings(347.79),
    'isa/dashboard.md': DASHBOARD,
  })
}

const saved = (page: import('@playwright/test').Page) =>
  page.getByRole('main').getByText('Saved', { exact: true })

test('a save merges a commit someone else made to another part of the note', async ({ page }) => {
  const github = vault()
  await openGitHubVault(page, github, 'strategy/plan.md')
  await expect(editorBody(page).getByText('Keep VWRP above its floor.')).toBeVisible()

  github.commit('strategy/plan.md', PLAN.replace('No company above 15 percent.', 'No company above 12 percent.'))

  await editorBody(page).getByText('Keep VWRP above its floor.').click()
  await page.keyboard.press('End')
  await page.keyboard.type(' Review in April.')

  await expect.poll(() => github.read('strategy/plan.md')).toContain('Keep VWRP above its floor. Review in April.')
  expect(github.read('strategy/plan.md')).toContain('No company above 12 percent.')
  await expect(editorBody(page).getByText('No company above 12 percent.')).toBeVisible()
  await expect(saved(page)).toBeVisible()
  await expect(page.getByRole('alert').filter({ hasText: 'Changed on GitHub' })).toHaveCount(0)
})

test('an overlapping change asks whether to reload or keep mine', async ({ page }) => {
  const github = vault()
  await openGitHubVault(page, github, 'strategy/plan.md')
  await expect(editorBody(page).getByText('Keep VWRP above its floor.')).toBeVisible()

  const theirs = PLAN.replace('Keep VWRP above its floor.', 'Keep VWRP at 25 percent or more.')
  github.commit('strategy/plan.md', theirs)

  await editorBody(page).getByText('Keep VWRP above its floor.').click()
  await page.keyboard.press('End')
  await page.keyboard.type(' Mine.')

  const banner = page.getByRole('alert').filter({ hasText: 'Changed on GitHub' })
  await expect(banner).toBeVisible()
  await expect(page.getByRole('main').getByText('Not saved', { exact: true })).toBeVisible()
  // Nothing is written while the banner waits.
  expect(github.read('strategy/plan.md')).toBe(theirs)

  await banner.getByRole('button', { name: 'Keep mine' }).click()
  await expect(banner).toHaveCount(0)
  await expect.poll(() => github.read('strategy/plan.md')).toContain('Keep VWRP above its floor. Mine.')
  await expect(saved(page)).toBeVisible()
})

test('Reload drops my edit and shows the version on GitHub', async ({ page }) => {
  const github = vault()
  await openGitHubVault(page, github, 'strategy/plan.md')
  await expect(editorBody(page).getByText('Keep VWRP above its floor.')).toBeVisible()

  const theirs = PLAN.replace('Keep VWRP above its floor.', 'Keep VWRP at 25 percent or more.')
  github.commit('strategy/plan.md', theirs)

  await editorBody(page).getByText('Keep VWRP above its floor.').click()
  await page.keyboard.press('End')
  await page.keyboard.type(' Mine.')

  const banner = page.getByRole('alert').filter({ hasText: 'Changed on GitHub' })
  await banner.getByRole('button', { name: 'Reload' }).click()
  await expect(banner).toHaveCount(0)
  await expect(editorBody(page).getByText('Keep VWRP at 25 percent or more.')).toBeVisible()
  await expect(editorBody(page).getByText('Mine.')).toHaveCount(0)
  await expect(saved(page)).toBeVisible()
  expect(github.read('strategy/plan.md')).toBe(theirs)
})

test('an open note shows a new commit without an edit or a click on Sync', async ({ page }) => {
  const github = vault()
  await openGitHubVault(page, github, 'strategy/plan.md')
  await expect(editorBody(page).getByText('Keep VWRP above its floor.')).toBeVisible()

  github.commit('strategy/plan.md', PLAN.replace('No company above 15 percent.', 'No company above 12 percent.'))
  await pollVault(page)

  await expect(editorBody(page).getByText('No company above 12 percent.')).toBeVisible()
  // Reading the new version is not an edit, so Caedora commits nothing back.
  await expect(saved(page)).toBeVisible()
  expect(github.commits.filter((commit) => commit.path === 'strategy/plan.md')).toHaveLength(1)
})

test('a dashboard updates when the sync rewrites a Dataset it reads', async ({ page }) => {
  const github = vault()
  await openGitHubVault(page, github, 'isa/dashboard.md')
  const stat = page.getByTestId('dashboard-view').locator('[data-slot="dashboard-stat"]').first()
  await expect(stat).toContainText('£918.36', { timeout: 15_000 })

  github.commit('isa/holdings.md', holdings(400), 'Sync ISA')
  await pollVault(page)

  await expect(stat).toContainText('£970.57')
})
