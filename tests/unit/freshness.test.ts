import { expect, test } from '@playwright/test'
import { parseDataset } from '@/lib/dataset'
import { dataFreshness, timeAgo } from '@/lib/dashboard/freshness'
import type { DashboardData } from '@/lib/dashboard/evaluate'

const NOW = new Date('2026-10-19T20:30:00Z')

function dataset(path: string, title: string, frontmatter: string) {
  return parseDataset(
    path,
    `---\ntype: Dataset\ntitle: ${title}\n${frontmatter}---\n\n| ticker | value |\n| --- | --- |\n| VWRP | 1 |\n`
  )
}

function data(...datasets: ReturnType<typeof dataset>[]): DashboardData {
  return {
    sources: Object.fromEntries(datasets.map((item) => [item.title, item])),
    byPath: Object.fromEntries(datasets.map((item) => [item.path, item])),
    today: NOW,
  }
}

test('the oldest generated.at is the time a dashboard shows', () => {
  const freshness = dataFreshness(
    data(
      dataset('isa/holdings.md', 'Holdings', 'generated: { by: t212-sync, at: 2026-10-19T18:28:40Z }\n'),
      dataset('isa/orders.md', 'Orders', 'generated: { by: t212-order, at: 2026-10-19T13:43:09Z }\n'),
      dataset('strategy/targets.md', 'Targets', '')
    ),
    NOW
  )
  expect(freshness.oldest?.title).toBe('Orders')
  expect(freshness.datasets.map((item) => item.title)).toEqual(['Orders', 'Holdings'])
  expect(freshness.stale).toEqual([])
})

test('a Dataset past stale_after is reported as stale', () => {
  const freshness = dataFreshness(
    data(
      dataset(
        'isa/holdings.md',
        'Holdings',
        'generated: { by: t212-sync, at: 2026-10-17T18:28:40Z }\nstale_after: 2026-10-18T18:28:40Z\n'
      ),
      dataset('isa/account.md', 'Account', 'generated: { by: t212-sync, at: 2026-10-19T18:28:40Z }\nstale_after: 2026-10-20T18:28:40Z\n')
    ),
    NOW
  )
  expect(freshness.stale).toEqual([{ path: 'isa/holdings.md', title: 'Holdings', staleAfter: '2026-10-18T18:28:40Z' }])
  expect(freshness.oldest).toMatchObject({ title: 'Holdings', stale: true })
})

test('times read as British English relative times', () => {
  expect(timeAgo('2026-10-19T20:29:30Z', NOW)).toBe('just now')
  expect(timeAgo('2026-10-19T20:25:00Z', NOW)).toBe('5 minutes ago')
  expect(timeAgo('2026-10-19T18:28:40Z', NOW)).toBe('2 hours ago')
  expect(timeAgo('2026-10-18T19:00:00Z', NOW)).toBe('yesterday')
  expect(timeAgo('2026-10-05T19:00:00Z', NOW)).toBe('2 weeks ago')
})
