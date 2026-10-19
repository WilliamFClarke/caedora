import { expect, test } from '@playwright/test'
import { FakeGitHub, openGitHubVault } from './github'

const decisions = (key: string) => `---
type: Dataset
title: Decisions
description: Every trade Claude proposes and whether Will approved it.
generated: { by: claude, at: 2026-10-18T20:45:00Z }
dataset:
${key}  columns:
    date: { type: date, required: true }
    ticker: { type: text, required: true }
    action: { type: enum, values: [buy, sell, hold] }
    amount: { type: currency }
    status: { type: enum, values: [proposed, approved, placed, rejected] }
---

# Decisions

| date | ticker | action | amount | status |
| --- | --- | --- | --- | --- |
| 2026-10-19 | GOOGL_US_EQ | buy | 45.00 | proposed |
| 2026-10-19 | TSM_US_EQ | buy | 97.00 | proposed |
`

const DASHBOARD = `---
type: Dashboard
title: Strategy dashboard
description: Planned moves awaiting approval.
---

# Strategy dashboard

Reads [Decisions](decisions.md).

\`\`\`caedora-dashboard
data:
  decisions: decisions.md
rows:
  - columns: 1
    items:
      - table: { title: Planned moves, source: decisions, columns: [date, ticker, action, amount, status], edit: { status: [approved, rejected] } }
\`\`\`
`

function vault(key: string) {
  return new FakeGitHub('will', 'trading-vault', {
    'welcome.md': '---\ntype: Note\ntitle: Welcome\ndescription: Start here.\n---\n\n# Welcome\n',
    'strategy/decisions.md': decisions(key),
    'strategy/dashboard.md': DASHBOARD,
  })
}

const KEY = '  key: [date, ticker, action]\n'

test('a row is approved from a dashboard table as a one cell commit', async ({ page }) => {
  const github = vault(KEY)
  const before = github.read('strategy/decisions.md')
  await openGitHubVault(page, github, 'strategy/dashboard.md')
  const table = page.getByTestId('dashboard-view').locator('[data-slot="dashboard-table"]')
  await expect(table.getByRole('cell', { name: 'GOOGL_US_EQ', exact: true })).toBeVisible({ timeout: 15_000 })

  await table.getByRole('button', { name: 'Set status for buy GOOGL_US_EQ on 2026-10-19' }).click()
  await page.getByRole('menuitem', { name: 'approved' }).click()

  await expect(table.getByRole('button', { name: 'Set status for buy GOOGL_US_EQ on 2026-10-19' })).toHaveText('approved')
  await expect(table.getByRole('button', { name: 'Set status for buy TSM_US_EQ on 2026-10-19' })).toHaveText('proposed')
  const commit = github.commits.find((entry) => entry.path === 'strategy/decisions.md')
  expect(commit?.message).toBe('Set status to approved for buy GOOGL_US_EQ on 2026-10-19')
  expect(commit?.content).toBe(
    before.replace('| GOOGL_US_EQ | buy | 45.00 | proposed |', '| GOOGL_US_EQ | buy | 45.00 | approved |')
  )
})

test('an approval lands on top of a commit made since the dashboard loaded', async ({ page }) => {
  const github = vault(KEY)
  await openGitHubVault(page, github, 'strategy/dashboard.md')
  const table = page.getByTestId('dashboard-view').locator('[data-slot="dashboard-table"]')
  await expect(table.getByRole('cell', { name: 'GOOGL_US_EQ', exact: true })).toBeVisible({ timeout: 15_000 })

  // Claude adds a row before Will clicks.
  const theirs = `${github.read('strategy/decisions.md')}| 2026-10-19 | AMD_US_EQ | sell | 20.00 | proposed |\n`
  github.commit('strategy/decisions.md', theirs)

  await table.getByRole('button', { name: 'Set status for buy TSM_US_EQ on 2026-10-19' }).click()
  await page.getByRole('menuitem', { name: 'rejected' }).click()

  await expect(table.getByRole('button', { name: 'Set status for buy TSM_US_EQ on 2026-10-19' })).toHaveText('rejected')
  await expect(table.getByRole('cell', { name: 'AMD_US_EQ', exact: true })).toBeVisible()
  expect(github.read('strategy/decisions.md')).toBe(
    theirs.replace('| TSM_US_EQ | buy | 97.00 | proposed |', '| TSM_US_EQ | buy | 97.00 | rejected |')
  )
})

test('a Dataset without a key cannot be edited from the table', async ({ page }) => {
  const github = vault('')
  await openGitHubVault(page, github, 'strategy/dashboard.md')
  const table = page.getByTestId('dashboard-view').locator('[data-slot="dashboard-table"]')
  await expect(table.getByRole('cell', { name: 'GOOGL_US_EQ', exact: true })).toBeVisible({ timeout: 15_000 })
  await expect(table.getByText('Add a key to Decisions so its rows can be edited here.')).toBeVisible()
  await expect(table.getByRole('button', { name: /Set status/ })).toHaveCount(0)
})
