import { expect, test } from '@playwright/test'
import { parseDataset } from '@/lib/dataset'
import { cellSpans, describeCellEdit, setDatasetCell } from '@/lib/dataset-edit'
import { evaluateItem } from '@/lib/dashboard/evaluate'
import { parseDashboard } from '@/lib/dashboard/spec'

const decisions = (key: string) => `---
type: Dataset
title: Decisions
description: Every trade Claude proposes, with its reasoning and whether Will approved it.
generated: { by: claude, at: 2026-10-18T20:45:00Z }
dataset:
${key}  columns:
    date: { type: date, required: true }
    ticker: { type: text, required: true }
    action: { type: enum, values: [buy, sell, hold, watch] }
    amount: { type: currency }
    status: { type: enum, values: [proposed, approved, placed, rejected] }
    rationale: { type: text }
---

# Decisions

Add a row before any order is placed.

| date | ticker | action | amount | status | rationale |
| --- | --- | --- | --- | --- | --- |
| 2026-10-19 | GOOGL_US_EQ | buy | 45.00 | proposed | Results due 28 October \\| trim first. Uses \`a|b\` notation. |
| 2026-10-19 | GOOGL_US_EQ | sell | 30.00 | proposed | A sell on the same day. |
| 2026-10-18 | AAPL_US_EQ | hold |  | proposed | Under the 15% cap. |
`

const KEYED = decisions('  key: [date, ticker, action]\n')
const GOOGL_BUY = { key: { date: '2026-10-19', ticker: 'GOOGL_US_EQ', action: 'buy' }, column: 'status', value: 'approved' }

function changedLines(before: string, after: string): string[] {
  const a = before.split('\n')
  const b = after.split('\n')
  expect(b).toHaveLength(a.length)
  return b.filter((line, i) => line !== a[i])
}

test('changes only the one cell, found by key', () => {
  const next = setDatasetCell('strategy/decisions.md', KEYED, GOOGL_BUY)
  expect(changedLines(KEYED, next)).toEqual([
    '| 2026-10-19 | GOOGL_US_EQ | buy | 45.00 | approved | Results due 28 October \\| trim first. Uses `a|b` notation. |',
  ])
  expect(parseDataset('strategy/decisions.md', next).rows.map((row) => row.status)).toEqual([
    'approved',
    'proposed',
    'proposed',
  ])
})

test('keeps an aligned table aligned when the new value fits', () => {
  const aligned = KEYED.replace(
    '| 2026-10-18 | AAPL_US_EQ | hold |  | proposed | Under the 15% cap. |',
    '| 2026-10-18 | AAPL_US_EQ  | hold |       | proposed   | Under the 15% cap. |'
  )
  const next = setDatasetCell('strategy/decisions.md', aligned, {
    key: { date: '2026-10-18', ticker: 'AAPL_US_EQ', action: 'hold' },
    column: 'status',
    value: 'rejected',
  })
  expect(changedLines(aligned, next)).toEqual([
    '| 2026-10-18 | AAPL_US_EQ  | hold |       | rejected   | Under the 15% cap. |',
  ])
})

test('refuses when the Dataset has no key', () => {
  const unkeyed = decisions('')
  expect(() => setDatasetCell('strategy/decisions.md', unkeyed, GOOGL_BUY)).toThrow(/has no key/)
})

test('refuses when the key matches more than one row', () => {
  const byDate = decisions('  key: [date]\n')
  expect(() =>
    setDatasetCell('strategy/decisions.md', byDate, { key: { date: '2026-10-19' }, column: 'status', value: 'approved' })
  ).toThrow(/More than one row/)
})

test('refuses values the enum does not allow and rows that have gone', () => {
  expect(() => setDatasetCell('strategy/decisions.md', KEYED, { ...GOOGL_BUY, value: 'maybe' })).toThrow(/not one of/)
  expect(() =>
    setDatasetCell('strategy/decisions.md', KEYED, { ...GOOGL_BUY, key: { ...GOOGL_BUY.key, date: '2026-10-01' } })
  ).toThrow(/no longer in/)
})

test('describes the change as a commit message', () => {
  expect(describeCellEdit(parseDataset('strategy/decisions.md', KEYED), GOOGL_BUY)).toBe(
    'Set status to approved for buy GOOGL_US_EQ on 2026-10-19'
  )
})

test('splits table cells on pipes outside code and escapes', () => {
  const line = '| a | b \\| c | `d|e` |'
  expect(cellSpans(line).map(([from, to]) => line.slice(from, to).trim())).toEqual(['a', 'b \\| c', '`d|e`'])
  const bare = 'a | b'
  expect(cellSpans(bare).map(([from, to]) => bare.slice(from, to).trim())).toEqual(['a', 'b'])
})

test('a table card offers the edit only for keyed rows it can find again', () => {
  const spec = parseDashboard(`\`\`\`caedora-dashboard
data:
  decisions: decisions.md
rows:
  - columns: 1
    items:
      - table: { title: Planned moves, source: decisions, columns: [date, ticker, action, amount, status], edit: { status: [approved, rejected] } }
\`\`\``)
  expect(spec.issues).toEqual([])
  const item = spec.rows[0].items[0]
  const data = (raw: string) => {
    const dataset = parseDataset('strategy/decisions.md', raw)
    return { sources: { decisions: dataset }, byPath: { 'strategy/decisions.md': dataset }, today: new Date('2026-10-19') }
  }

  const keyed = evaluateItem(item, data(KEYED))
  if (keyed.kind !== 'table') throw new Error(keyed.kind)
  expect(keyed.edit?.problem).toBeUndefined()
  expect(keyed.edit?.columns).toEqual([{ index: 4, column: 'status', values: ['approved', 'rejected'] }])
  expect(keyed.edit?.labels[0]).toBe('buy GOOGL_US_EQ on 2026-10-19')

  const unkeyed = evaluateItem(item, data(decisions('')))
  if (unkeyed.kind !== 'table') throw new Error(unkeyed.kind)
  expect(unkeyed.edit?.columns).toEqual([])
  expect(unkeyed.edit?.problem).toBe('Add a key to Decisions so its rows can be edited here.')
})
