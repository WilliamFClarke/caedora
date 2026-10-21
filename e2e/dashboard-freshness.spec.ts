import { expect, test } from '@playwright/test'
import { FakeGitHub, openGitHubVault, pollVault } from './github'

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString().replace(/\.\d+Z$/, 'Z')

function holdings({ at, staleAfter }: { at: string; staleAfter?: string }) {
  return `---
type: Dataset
title: Holdings
description: Positions in the ISA.
dataset:
  key: [ticker]
  columns:
    ticker: { type: text, required: true }
    value: { type: currency }
generated: { by: t212-sync, at: ${at} }
${staleAfter ? `stale_after: ${staleAfter}\n` : ''}---

# Holdings

| ticker | value |
| --- | --- |
| VWRPl_EQ | 570.57 |
| GOOGL_US_EQ | 347.79 |
`
}

const DASHBOARD = `---
type: Dashboard
title: ISA dashboard
description: Value of the ISA.
---

# ISA dashboard

\`\`\`caedora-dashboard
data:
  holdings: holdings.md
rows:
  - columns: 1
    items:
      - stat: { label: ISA value, source: holdings, value: sum(value) }
\`\`\`
`

function vault(holdingsFile: string) {
  return new FakeGitHub('will', 'trading-vault', {
    'welcome.md': '---\ntype: Note\ntitle: Welcome\ndescription: Start here.\n---\n\n# Welcome\n',
    'isa/holdings.md': holdingsFile,
    'isa/dashboard.md': DASHBOARD,
  })
}

const synced = (page: import('@playwright/test').Page) =>
  page.getByTestId('dashboard-view').getByRole('status').filter({ hasText: 'Data from' })

test('a dashboard says how old its data is', async ({ page }) => {
  await openGitHubVault(page, vault(holdings({ at: hoursAgo(2) })), 'isa/dashboard.md')
  await expect(synced(page)).toHaveText('Data from 2 hours ago.', { timeout: 15_000 })
  await expect(synced(page)).not.toHaveAttribute('data-stale')
})

test('a Dataset past stale_after shows a warning until the sync catches up', async ({ page }) => {
  const github = vault(holdings({ at: hoursAgo(30), staleAfter: hoursAgo(6) }))
  await openGitHubVault(page, github, 'isa/dashboard.md')
  await expect(synced(page)).toHaveText('Data from yesterday. Holdings is out of date.', { timeout: 15_000 })
  await expect(synced(page)).toHaveAttribute('data-stale', 'true')

  github.commit('isa/holdings.md', holdings({ at: hoursAgo(0), staleAfter: hoursAgo(-24) }), 'Sync ISA')
  await pollVault(page)

  await expect(synced(page)).toHaveText('Data from just now.')
  await expect(synced(page)).not.toHaveAttribute('data-stale')
})
